import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Landmark, PiggyBank, Plus, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import type { PlanningInput, RetirementAllocation } from "../domain/types";
import type { InputError } from "../domain/validation";
import { laborInsuranceFutureYears, laborPensionFutureYears } from "../domain/coverage";
import { formatMoney } from "../lib/format";
import { laborInsuranceNormalAge } from "../rules/taiwan-2026";
import { Field } from "./Field";
import { useLocale } from "../i18n";
import { CURRENCIES } from "../lib/format";

interface InputPanelProps {
  input: PlanningInput;
  errors: InputError[];
  onChange: (input: PlanningInput) => void;
  onViewResults: () => void;
}


const stepIcons = [UserRound, Landmark, ShieldCheck, PiggyBank, BriefcaseBusiness];
const stepIds = ["profile", "labor", "national", "pension", "invest"];

export function InputPanel({ input, errors, onChange, onViewResults }: InputPanelProps) {
  const { t, locale } = useLocale();
  const ic = t.inputCommon;
  const il = t.inputLabor;
  const ina = t.inputNational;
  const ipe = t.inputPension;
  const iv = t.inputInvest;
  const allocationOptions: Array<{ id: RetirementAllocation; name: string; mix: string; rate?: number; weights?: [number, number, number] }> = [
    { id: "steady", name: iv.allocationSteady, mix: iv.allocationSteadyMix, rate: 0.04, weights: [0.3, 0.6, 0.1] },
    { id: "balanced", name: iv.allocationBalanced, mix: iv.allocationBalancedMix, rate: 0.05, weights: [0.6, 0.35, 0.05] },
    { id: "growth", name: iv.allocationGrowth, mix: iv.allocationGrowthMix, rate: 0.06, weights: [0.8, 0.2, 0] },
    { id: "custom", name: iv.allocationCustom, mix: iv.allocationCustomMix }
  ];
  const ip = t.inputProfile;
  const u = t.common.units;
  // 步驟顯示跟著年金模組開關走：關掉的模組不計算、步驟也隱藏
  const stepOn: Record<string, boolean> = {
    profile: true,
    labor: input.laborInsurance.enabled !== false,
    national: input.nationalPension.enabled,
    pension: input.laborPension.enabled !== false,
    invest: true
  };
  const visibleStepIds = stepIds.filter((id) => stepOn[id]);
  const steps = visibleStepIds.map((id, visibleIndex) => {
    const index = stepIds.indexOf(id);
    return {
      id,
      step: t.steps.stepWord[visibleIndex] ?? t.steps.stepWord[index],
      title: t.steps.titles[index],
      icon: stepIcons[index]
    };
  });
  const update = (section: keyof PlanningInput, field: string, value: number | string | boolean) => {
    onChange({
      ...input,
      [section]: { ...(input[section] as object), [field]: value }
    });
  };
  const updateInvestment = (changes: Partial<PlanningInput["investment"]>) => {
    onChange({ ...input, investment: { ...input.investment, ...changes } });
  };
  const updateHolding = (id: string, field: string, value: number | string) => {
    updateInvestment({ holdings: input.investment.holdings.map((holding) => holding.id === id ? { ...holding, [field]: value } : holding) });
  };
  const addHolding = () => {
    updateInvestment({
      holdings: [...input.investment.holdings, {
        id: `holding-${Date.now()}`,
        name: iv.newHoldingName(input.investment.holdings.length + 1),
        valueNow: 0,
        monthlyContributionToday: 0,
        grossReturnRate: 0.06,
        feeRate: 0.003
      }]
    });
  };
  const removeHolding = (id: string) => {
    updateInvestment({ holdings: input.investment.holdings.filter((holding) => holding.id !== id) });
  };
  const setAllocation = (allocation: RetirementAllocation) => {
    const option = allocationOptions.find((item) => item.id === allocation);
    updateInvestment({
      retirementAllocation: allocation,
      ...(option?.weights ? { assetAllocation: { ...(input.investment.assetAllocation ?? { glidePathEnabled: false, targetStockRate: 0.4 }), stockRate: option.weights[0], bondRate: option.weights[1], cashRate: option.weights[2] } } : {}),
      ...(option?.rate === undefined ? {} : { retirementGrossReturnRate: option.rate, retirementFeeRate: 0.003 })
    });
  };
  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  // 快捷預設：一次設好三個年金開關＋年曆（＋台灣預設台幣）；之後仍可單獨微調
  const applyPreset = (preset: "taiwan" | "other") => {
    if (preset === "taiwan") {
      onChange({
        ...input,
        profile: { ...input.profile, calendar: "roc", currency: "TWD" },
        laborInsurance: { ...input.laborInsurance, enabled: true },
        laborPension: { ...input.laborPension, enabled: true }
      });
    } else {
      onChange({
        ...input,
        profile: { ...input.profile, calendar: "ce" },
        laborInsurance: { ...input.laborInsurance, enabled: false },
        nationalPension: { ...input.nationalPension, enabled: false },
        laborPension: { ...input.laborPension, enabled: false }
      });
    }
  };
  const isTaiwanPreset = input.laborInsurance.enabled !== false && input.laborPension.enabled !== false && input.profile.calendar === "roc";
  const isOtherPreset = input.laborInsurance.enabled === false && !input.nationalPension.enabled && input.laborPension.enabled === false && input.profile.calendar === "ce";
  const useCE = input.profile.calendar === "ce";
  const futureLaborYears = laborInsuranceFutureYears(input);
  const futurePensionYears = laborPensionFutureYears(input);
  const laborYears = input.laborInsurance.insuredYearsNow + futureLaborYears;
  const showYears = (years: number) => Number.isInteger(years) ? years.toFixed(0) : years.toFixed(1);
  const receivesLaborAnnuity = laborYears >= 15 || (
    input.nationalPension.enabled
    && input.laborInsurance.claimAge === 65
    && laborYears > 0
    && laborYears + input.nationalPension.insuredYears >= 15
  );
  const investmentTotal = input.investment.holdings.reduce((sum, holding) => sum + (Number.isFinite(holding.valueNow) ? holding.valueNow : 0), 0);
  const monthlyInvestmentTotal = input.investment.holdings.reduce((sum, holding) => sum + (Number.isFinite(holding.monthlyContributionToday) ? holding.monthlyContributionToday : 0), 0);

  const [activeStep, setActiveStep] = useState(0);
  const visibleIndexByKey: Record<string, number> = {};
  visibleStepIds.forEach((id, index) => { visibleIndexByKey[id] = index; });
  // 步驟標題的「第幾步」跟著實際可見步驟走（年金開關會隱藏步驟）
  const StepNum = ({ stepKey }: { stepKey: string }) => {
    const idx = visibleIndexByKey[stepKey] ?? 0;
    return <span>{t.steps.stepWord[idx] ?? `${idx + 1}`}</span>;
  };
  const panelTopRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const goToStep = (index: number) => setActiveStep(Math.max(0, Math.min(steps.length - 1, index)));
  // 原始步驟編號（0-4）對應到目前可見步驟的位置
  const visibleIndexOf = (originalStep: number): number => {
    const id = stepIds[originalStep];
    const visible = visibleStepIds.indexOf(id);
    return visible >= 0 ? visible : 0;
  };
  const jumpToError = (error: InputError) => {
    goToStep(visibleIndexOf(error.step));
    if (!error.field) return;
    window.setTimeout(() => {
      const root = panelTopRef.current;
      if (!root) return;
      const scope = error.holdingId
        ? root.querySelector(`[data-holding-id="${CSS.escape(error.holdingId)}"]`)
        : root.querySelector(".step-body");
      const fields = Array.from((scope ?? root).querySelectorAll(".field"));
      const target = fields.find((element) => element.querySelector(".field-label")?.textContent?.trim() === error.field);
      const details = target?.closest("details");
      if (details && !details.open) details.open = true;
      const control = target?.querySelector("input, select") as HTMLElement | null;
      if (control) {
        control.focus({ preventScroll: true });
        control.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 80);
  };
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    activeSectionRef.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 820px)").matches) {
      panelTopRef.current?.scrollIntoView();
    } else {
      panelTopRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [activeStep]);

  const stepSections = [
    <section className="input-section" key="profile">
      <div className="section-heading">
        <UserRound aria-hidden="true" />
        <div><StepNum stepKey="profile" /><h2>{t.steps.titles[0]}</h2></div>
      </div>
      <p className="step-why">{ipe.why}</p>
      <div className="region-control">
        <span className="region-label">{t.pensionSetup.label}</span>
        <div className="mode-control" role="group" aria-label={t.pensionSetup.label}>
          <button type="button" className={isTaiwanPreset ? "active" : ""} onClick={() => applyPreset("taiwan")}>{t.pensionSetup.taiwanPreset}</button>
          <button type="button" className={isOtherPreset ? "active" : ""} onClick={() => applyPreset("other")}>{t.pensionSetup.otherPreset}</button>
        </div>
        <p className="field-hint">{t.pensionSetup.hint}</p>
        <div className="pension-toggles">
          <label className="toggle-field compact-toggle">
            <input type="checkbox" role="switch" checked={input.laborInsurance.enabled !== false} onChange={(event) => update("laborInsurance", "enabled", event.target.checked)} />
            <span className="toggle-control" aria-hidden="true" />
            <span>{t.pensionSetup.labor}<small>{t.pensionSetup.laborDesc}</small></span>
          </label>
          <label className="toggle-field compact-toggle">
            <input type="checkbox" role="switch" checked={input.nationalPension.enabled} onChange={(event) => update("nationalPension", "enabled", event.target.checked)} />
            <span className="toggle-control" aria-hidden="true" />
            <span>{t.pensionSetup.national}<small>{t.pensionSetup.nationalDesc}</small></span>
          </label>
          <label className="toggle-field compact-toggle">
            <input type="checkbox" role="switch" checked={input.laborPension.enabled !== false} onChange={(event) => update("laborPension", "enabled", event.target.checked)} />
            <span className="toggle-control" aria-hidden="true" />
            <span>{t.pensionSetup.pension}<small>{t.pensionSetup.pensionDesc}</small></span>
          </label>
        </div>
        <label className="currency-field">
          <span>{t.pensionSetup.currencyLabel}</span>
          <select value={input.profile.currency ?? "TWD"} onChange={(event) => update("profile", "currency", event.target.value)}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{locale === "en" ? c.labelEn : c.label}</option>)}
          </select>
        </label>
      </div>
      <div className="field-grid two">
        <div className="birth-year-field">
          <div className="calendar-toggle" role="group" aria-label={t.pensionSetup.calendarLabel}>
            <button type="button" className={!useCE ? "active" : ""} onClick={() => update("profile", "calendar", "roc")}>{t.pensionSetup.calendarROC}</button>
            <button type="button" className={useCE ? "active" : ""} onClick={() => update("profile", "calendar", "ce")}>{t.pensionSetup.calendarCE}</button>
          </div>
          {useCE ? (
            <Field label={t.pensionSetup.birthYearCE} value={input.profile.birthYearROC + 1911} onChange={(value) => update("profile", "birthYearROC", Math.round(value - 1911))} suffix={u.year} min={1941} max={2021} />
          ) : (
            <Field label={t.pensionSetup.birthYearROC} value={input.profile.birthYearROC} onChange={(value) => update("profile", "birthYearROC", value)} suffix={u.year} min={30} max={110} />
          )}
        </div>
        <Field label={ip.birthMonth} value={input.profile.birthMonth} onChange={(value) => update("profile", "birthMonth", value)} suffix={u.month} min={1} max={12} />
        <Field label={ip.retirementAge} value={input.profile.retirementAge} onChange={(value) => update("profile", "retirementAge", value)} suffix={u.age} min={40} max={85} />
        <Field label={ip.longevityAge} value={input.profile.longevityAge} onChange={(value) => update("profile", "longevityAge", value)} suffix={u.age} min={60} max={110} hint={ip.longevityHint} />
      </div>
      <Field label={ip.monthlySpending} value={input.spending.monthlyToday} onChange={(value) => update("spending", "monthlyToday", value)} suffix={u.money} step={1000} hint={ip.monthlySpendingHint} />
      <div className="field-grid two">
        <Field label={ip.rentMonthly} value={input.spending.rentMonthlyToday ?? 0} onChange={(value) => update("spending", "rentMonthlyToday", value)} suffix={u.money} step={500} hint={ip.rentMonthlyHint} />
        <Field label={ip.rentInflation} value={(input.spending.rentInflationRate ?? 0.02) * 100} onChange={(value) => update("spending", "rentInflationRate", value / 100)} suffix={u.percent} step={0.1} hint={ip.rentInflationHint} />
      </div>
      <details>
        <summary><SlidersHorizontal aria-hidden="true" /> {ipe.moreAssumptions}</summary>
        <div className="details-body">
          <Field label={ip.inflation} value={input.economy.inflationRate * 100} onChange={(value) => update("economy", "inflationRate", value / 100)} suffix={u.percent} step={0.1} />
          <div className="subsection-label">{ip.medicalSection}</div>
          <div className="field-grid two">
            <Field label={ip.medicalMonthly} value={input.spending.medicalMonthlyToday ?? 0} onChange={(value) => update("spending", "medicalMonthlyToday", value)} suffix={u.money} step={500} hint={ip.medicalMonthlyHint} />
            <Field label={ip.medicalInflation} value={(input.spending.medicalInflationRate ?? 0.03) * 100} onChange={(value) => update("spending", "medicalInflationRate", value / 100)} suffix={u.percent} step={0.1} />
          </div>
          <label className="toggle-field">
            <input type="checkbox" role="switch" checked={input.spending.longTermCareEnabled ?? false} onChange={(event) => update("spending", "longTermCareEnabled", event.target.checked)} />
            <span className="toggle-control" aria-hidden="true" /><span>{ip.longTermCareEnabled}</span>
          </label>
          {input.spending.longTermCareEnabled && <div className="field-grid two optional-fields">
            <Field label={ip.longTermCareStartAge} value={input.spending.longTermCareStartAge ?? 80} onChange={(value) => update("spending", "longTermCareStartAge", value)} suffix={u.age} />
            <Field label={ip.longTermCareMonthly} value={input.spending.longTermCareMonthlyToday ?? 0} onChange={(value) => update("spending", "longTermCareMonthlyToday", value)} suffix={u.money} step={1000} hint={ip.longTermCareMonthlyHint} />
          </div>}
          <label className="toggle-field">
            <input type="checkbox" role="switch" checked={input.partTime.enabled} onChange={(event) => update("partTime", "enabled", event.target.checked)} />
            <span className="toggle-control" aria-hidden="true" />
            <span>{ip.partTimeEnabled}</span>
          </label>
          {input.partTime.enabled && (
            <div className="field-grid two optional-fields">
              <Field label={ip.partTimeMonthly} value={input.partTime.monthlyToday} onChange={(value) => update("partTime", "monthlyToday", value)} suffix={u.money} step={1000} hint={ip.partTimeMonthlyHint} />
              <Field label={ip.partTimeStartAge} value={input.partTime.startAge} onChange={(value) => update("partTime", "startAge", value)} suffix={u.age} />
              <Field label={ip.partTimeEndAge} value={input.partTime.endAge} onChange={(value) => update("partTime", "endAge", value)} suffix={u.age} />
              <Field label={ip.partTimeGrowth} value={input.partTime.growthRate * 100} onChange={(value) => update("partTime", "growthRate", value / 100)} suffix={u.percent} step={0.1} />
            </div>
          )}
        </div>
      </details>
    </section>,
    <section className="input-section" key="labor">
      <div className="section-heading">
        <Landmark aria-hidden="true" />
        <div><StepNum stepKey="labor" /><h2>{t.steps.titles[1]}</h2></div>
      </div>
      <p className="step-why">{il.why}</p>
      <div className="inline-note">{il.normalAgePrefix}<strong>{il.normalAgeValue(normalAge)}</strong>{il.normalAgeSuffix(normalAge - 5)}</div>
      <div className="field-grid two">
        <Field label={il.insuredYearsNow} value={input.laborInsurance.insuredYearsNow} onChange={(value) => update("laborInsurance", "insuredYearsNow", value)} suffix={u.year} step={0.1} />
        <Field label={il.claimAge} value={input.laborInsurance.claimAge} onChange={(value) => update("laborInsurance", "claimAge", value)} suffix={u.age} min={normalAge - 5} />
        <Field label={il.averageSalary} value={input.laborInsurance.averageSalaryToday} onChange={(value) => update("laborInsurance", "averageSalaryToday", value)} suffix={u.money} step={100} hint={il.averageSalaryHint} />
      </div>
      <label className="toggle-field compact-toggle">
        <input type="checkbox" role="switch" checked={input.laborInsurance.futureYearsMode === "until-retirement"} onChange={(event) => update("laborInsurance", "futureYearsMode", event.target.checked ? "until-retirement" : "custom")} />
        <span className="toggle-control" aria-hidden="true" />
        <span>{il.untilRetirement}</span>
      </label>
      {input.laborInsurance.futureYearsMode === "until-retirement"
        ? <div className="auto-value">{ic.autoPrefix}<strong>{ic.autoYears(showYears(futureLaborYears))}</strong></div>
        : <Field label={il.futureYears} value={input.laborInsurance.insuredYearsFuture} onChange={(value) => update("laborInsurance", "insuredYearsFuture", value)} suffix={u.year} step={0.1} hint={il.futureYearsHint} />}
      <details>
        <summary><SlidersHorizontal aria-hidden="true" /> {il.moreAssumptions}</summary>
        <div className="details-body">
          <Field label={il.salaryGrowth} value={input.laborInsurance.salaryGrowthRate * 100} onChange={(value) => update("laborInsurance", "salaryGrowthRate", value / 100)} suffix="%" step={0.1} />
          <label className="select-field">
            <span>{il.indexationLabel}</span>
            <select value={input.laborInsurance.indexation} onChange={(event) => update("laborInsurance", "indexation", event.target.value)}>
              <option value="threshold">{il.indexationThreshold}</option>
              <option value="none">{il.indexationNone}</option>
            </select>
          </label>
        </div>
      </details>
      <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">{il.sourceLink}</a>
    </section>,
    <section className="input-section" key="national">
      <div className="section-heading">
        <ShieldCheck aria-hidden="true" />
        <div><StepNum stepKey="national" /><h2>{t.steps.titles[2]}</h2></div>
      </div>
      <p className="step-why">{ina.why}</p>
      <label className="toggle-field section-toggle">
        <input type="checkbox" role="switch" checked={input.nationalPension.enabled} onChange={(event) => update("nationalPension", "enabled", event.target.checked)} />
        <span className="toggle-control" aria-hidden="true" />
        <span>{ina.enabled}</span>
      </label>
      {input.nationalPension.enabled && (
        <div className="optional-section">
          <div className="inline-note">{ina.notePrefix}<strong>{ina.noteStrong}</strong>{ina.noteSuffix}</div>
          <Field label={ina.insuredYears} value={input.nationalPension.insuredYears} onChange={(value) => update("nationalPension", "insuredYears", value)} suffix={u.year} step={0.1} min={0} max={40} />
          {receivesLaborAnnuity ? (
            <div className="plain-explanation">{ina.bFormulaNote}</div>
          ) : (
            <>
              <label className="toggle-field nested-toggle">
                <input type="checkbox" role="switch" checked={input.nationalPension.aFormulaEligible} onChange={(event) => update("nationalPension", "aFormulaEligible", event.target.checked)} />
                <span className="toggle-control" aria-hidden="true" />
                <span>{ina.aFormula}</span>
              </label>
              <p className="field-help">{ina.aFormulaHelp}</p>
            </>
          )}
          {laborYears > 0 && laborYears < 15 && laborYears + input.nationalPension.insuredYears >= 15 && (
            <div className="plain-explanation">{ina.combinedNote}</div>
          )}
        </div>
      )}
      <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">{ina.sourceLink}</a>
    </section>,
    <section className="input-section" key="pension">
      <div className="section-heading">
        <PiggyBank aria-hidden="true" />
        <div><StepNum stepKey="pension" /><h2>{t.steps.titles[3]}</h2></div>
      </div>
      <p className="step-why">{ipe.why}</p>
      <div className="mode-control" role="group" aria-label={ipe.modeLabel}>
        <button type="button" className={(input.laborPension.mode ?? "lump") === "lump" ? "active" : ""} onClick={() => update("laborPension", "mode", "lump")}>{ipe.modeLump}</button>
        <button type="button" className={input.laborPension.mode === "monthly" ? "active" : ""} onClick={() => update("laborPension", "mode", "monthly")}>{ipe.modeMonthly}</button>
      </div>
      {(input.laborPension.mode ?? "lump") === "lump" && <div className="lump-reinvest-control">
        <Field label={ipe.lumpReinvest} value={(input.laborPension.lumpReinvestRate ?? 1) * 100} onChange={(value) => update("laborPension", "lumpReinvestRate", value / 100)} suffix="%" min={0} max={100} step={10} hint={ipe.lumpReinvestHint} />
        <div className="quick-rate" role="group" aria-label={ipe.quickLabel}>
          {[{ label: ipe.quickAll, value: 100 }, { label: ipe.quickHalf, value: 50 }, { label: ipe.quickCash, value: 0 }].map((option) => <button type="button" className={Math.round((input.laborPension.lumpReinvestRate ?? 1) * 100) === option.value ? "active" : ""} onClick={() => update("laborPension", "lumpReinvestRate", option.value / 100)} key={option.value}>{option.label}</button>)}
        </div>
      </div>}
      <div className="field-grid two">
        <Field label={ipe.balanceNow} value={input.laborPension.balanceNow} onChange={(value) => update("laborPension", "balanceNow", value)} suffix={u.money} step={10_000} />
        <Field label={ipe.monthlyWage} value={input.laborPension.monthlyWageToday} onChange={(value) => update("laborPension", "monthlyWageToday", value)} suffix={u.money} step={100} hint={ipe.monthlyWageHint} />
        <Field label={ipe.seniorityNow} value={input.laborPension.seniorityYearsNow} onChange={(value) => update("laborPension", "seniorityYearsNow", value)} suffix={u.year} step={0.1} />
        <Field label={ipe.claimAge} value={input.laborPension.claimAge} onChange={(value) => update("laborPension", "claimAge", value)} suffix={u.age} min={60} />
      </div>
      <label className="toggle-field compact-toggle self-contribution-toggle">
        <input type="checkbox" role="switch" checked={input.laborPension.voluntaryRate > 0} onChange={(event) => update("laborPension", "voluntaryRate", event.target.checked ? 0.06 : 0)} />
        <span className="toggle-control" aria-hidden="true" />
        <span>{ipe.voluntary}</span>
      </label>
      {input.laborPension.voluntaryRate > 0 && <Field label={ipe.voluntaryRate} value={input.laborPension.voluntaryRate * 100} onChange={(value) => update("laborPension", "voluntaryRate", value / 100)} suffix="%" min={0} max={6} step={1} hint={ipe.voluntaryRateHint} />}
      <label className="toggle-field compact-toggle">
        <input type="checkbox" role="switch" checked={input.laborPension.futureYearsMode === "until-retirement"} onChange={(event) => update("laborPension", "futureYearsMode", event.target.checked ? "until-retirement" : "custom")} />
        <span className="toggle-control" aria-hidden="true" />
        <span>{ipe.untilRetirement}</span>
      </label>
      {input.laborPension.futureYearsMode === "until-retirement"
        ? <div className="auto-value">{ic.autoPrefix}<strong>{ic.autoYears(showYears(futurePensionYears))}</strong></div>
        : <Field label={ipe.futureYears} value={input.laborPension.seniorityYearsFuture} onChange={(value) => update("laborPension", "seniorityYearsFuture", value)} suffix={u.year} step={0.1} hint={ipe.futureYearsHint} />}
      <details>
        <summary><SlidersHorizontal aria-hidden="true" /> {ipe.moreAssumptions}</summary>
        <div className="details-body field-grid two">
          <Field label={ipe.employerRate} value={input.laborPension.employerRate * 100} onChange={(value) => update("laborPension", "employerRate", value / 100)} suffix="%" step={0.1} hint={ipe.employerRateHint} />
          <Field label={ipe.returnRate} value={input.laborPension.returnRate * 100} onChange={(value) => update("laborPension", "returnRate", value / 100)} suffix="%" step={0.1} hint={ipe.returnRateHint} />
          <Field label={ipe.wageGrowth} value={input.laborPension.wageGrowthRate * 100} onChange={(value) => update("laborPension", "wageGrowthRate", value / 100)} suffix="%" step={0.1} />
        </div>
      </details>
      <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">{ipe.sourceLink}</a>
    </section>,
    <section className="input-section" key="invest">
      <div className="section-heading">
        <BriefcaseBusiness aria-hidden="true" />
        <div><StepNum stepKey="invest" /><h2>{t.steps.titles[4]}</h2></div>
      </div>
      <p className="step-why">{iv.why}</p>
      <p className="brand-note"><strong>0050 Life</strong> {iv.brandSuffix}<a href="/blog/investment-calculator-guide.html" target="_blank" rel="noreferrer">{iv.tutorial}</a></p>
      <div className="holding-list">
        {input.investment.holdings.map((holding, index) => (
          <article className="holding-item" key={holding.id} data-holding-id={holding.id}>
            <div className="holding-header">
              <label>
                <span className="sr-only">{iv.holdingNameAria(index + 1)}</span>
                <input className="holding-name" value={holding.name} onChange={(event) => updateHolding(holding.id, "name", event.target.value)} aria-label={iv.holdingNameAria(index + 1)} />
              </label>
              <button type="button" className="remove-holding" onClick={() => removeHolding(holding.id)} aria-label={iv.removeHoldingAria(holding.name || iv.removeHoldingFallback(index + 1))} title={iv.removeTitle}><Trash2 aria-hidden="true" /></button>
            </div>
            <div className="field-grid two">
              <Field label={iv.valueNow} value={holding.valueNow} onChange={(value) => updateHolding(holding.id, "valueNow", value)} suffix={u.money} step={10_000} />
              <Field label={iv.monthly} value={holding.monthlyContributionToday} onChange={(value) => updateHolding(holding.id, "monthlyContributionToday", value)} suffix={u.money} step={1000} />
            </div>
            <details className="holding-assumptions">
              <summary>{iv.assumptionsSummary((holding.grossReturnRate * 100).toFixed(1), (holding.feeRate * 100).toFixed(2))}</summary>
              <div className="details-body field-grid two">
                <Field label={iv.grossReturn} value={holding.grossReturnRate * 100} onChange={(value) => updateHolding(holding.id, "grossReturnRate", value / 100)} suffix="%" step={0.1} hint={iv.grossReturnHint} />
                <Field label={iv.fee} value={holding.feeRate * 100} onChange={(value) => updateHolding(holding.id, "feeRate", value / 100)} suffix="%" step={0.01} hint={iv.feeHint} />
              </div>
            </details>
          </article>
        ))}
        {input.investment.holdings.length === 0 && <p className="holding-empty">{iv.empty}</p>}
        <button type="button" className="add-holding" onClick={addHolding}><Plus aria-hidden="true" />{iv.addHolding}</button>
      </div>
      <div className="investment-total">
        <span>{iv.countLabel} <strong>{iv.countUnit(input.investment.holdings.length)}</strong></span>
        <span>{iv.totalValue} <strong>{formatMoney(investmentTotal)}</strong></span>
        <span>{iv.totalMonthly} <strong>{formatMoney(monthlyInvestmentTotal)}</strong></span>
      </div>
      <details>
        <summary><SlidersHorizontal aria-hidden="true" /> {iv.advancedTitle}</summary>
        <div className="details-body">
          <div className="assumption-help"><strong>{iv.assumptionHelpTitle}</strong><p>{iv.assumptionHelpBody}</p></div>
          <Field label={iv.contributionGrowth} value={input.investment.contributionGrowthRate * 100} onChange={(value) => update("investment", "contributionGrowthRate", value / 100)} suffix="%" step={0.1} hint={iv.contributionGrowthHint} />
          <div className="subsection-label">{iv.allocationLabel}</div>
          <div className="allocation-options" role="radiogroup" aria-label={iv.allocationGroupLabel}>
            {allocationOptions.map((option) => (
              <button type="button" role="radio" aria-checked={input.investment.retirementAllocation === option.id} className={input.investment.retirementAllocation === option.id ? "active" : ""} onClick={() => setAllocation(option.id)} key={option.id}>
              <strong>{option.name}</strong><span>{option.mix}</span>{option.rate !== undefined && <small>{iv.allocationRateNote((option.rate * 100).toFixed(0))}</small>}
              </button>
            ))}
          </div>
          {input.investment.retirementAllocation === "custom" && (
            <div className="field-grid two allocation-custom">
              <Field label={iv.customReturn} value={input.investment.retirementGrossReturnRate * 100} onChange={(value) => updateInvestment({ retirementGrossReturnRate: value / 100 })} suffix="%" step={0.1} hint={iv.customReturnHint} />
              <Field label={iv.customFee} value={input.investment.retirementFeeRate * 100} onChange={(value) => updateInvestment({ retirementFeeRate: value / 100 })} suffix="%" step={0.01} hint={iv.customFeeHint} />
              <Field label={iv.stockRate} value={(input.investment.assetAllocation?.stockRate ?? 0.6) * 100} onChange={(value) => updateInvestment({ assetAllocation: { ...(input.investment.assetAllocation ?? { bondRate: 0.35, cashRate: 0.05, glidePathEnabled: false, targetStockRate: 0.4 }), stockRate: value / 100 } })} suffix="%" />
              <Field label={iv.bondRate} value={(input.investment.assetAllocation?.bondRate ?? 0.35) * 100} onChange={(value) => updateInvestment({ assetAllocation: { ...(input.investment.assetAllocation ?? { stockRate: 0.6, bondRate: 0.35, cashRate: 0.05, glidePathEnabled: false, targetStockRate: 0.4 }), bondRate: value / 100 } })} suffix="%" />
              <Field label={iv.cashRate} value={(input.investment.assetAllocation?.cashRate ?? 0.05) * 100} onChange={(value) => updateInvestment({ assetAllocation: { ...(input.investment.assetAllocation ?? { stockRate: 0.6, bondRate: 0.35, glidePathEnabled: false, targetStockRate: 0.4 }), cashRate: value / 100 } })} suffix="%" />
            </div>
          )}
          <label className="toggle-field compact-toggle"><input type="checkbox" role="switch" checked={input.investment.assetAllocation?.glidePathEnabled ?? false} onChange={(event) => updateInvestment({ assetAllocation: { ...(input.investment.assetAllocation ?? { stockRate: 0.6, bondRate: 0.35, cashRate: 0.05, targetStockRate: 0.4 }), glidePathEnabled: event.target.checked } })} /><span className="toggle-control" aria-hidden="true" /><span>{iv.glidePath}</span></label>
          {input.investment.assetAllocation?.glidePathEnabled && <Field label={iv.glideTarget} value={(input.investment.assetAllocation.targetStockRate ?? 0.4) * 100} onChange={(value) => updateInvestment({ assetAllocation: { ...input.investment.assetAllocation!, targetStockRate: value / 100 } })} suffix="%" min={0} max={100} hint={iv.glideTargetHint} />}
          <Field label={iv.taxRate} value={(input.investment.retirementEffectiveTaxRate ?? 0) * 100} onChange={(value) => updateInvestment({ retirementEffectiveTaxRate: value / 100 })} suffix="%" min={0} max={50} step={0.5} hint={iv.taxRateHint} />
          <div className="analysis-options">
            <div className="subsection-label">{iv.withdrawSection}</div>
            <label className="toggle-field compact-toggle">
              <input type="checkbox" role="switch" checked={input.investment.withdrawalRule?.enabled ?? false} onChange={(event) => updateInvestment({ withdrawalRule: { ...(input.investment.withdrawalRule ?? { annualRate: 0.04 }), enabled: event.target.checked } })} />
              <span className="toggle-control" aria-hidden="true" /><span>{iv.withdrawToggle}</span>
            </label>
            {input.investment.withdrawalRule?.enabled && <Field label={iv.withdrawRate} value={(input.investment.withdrawalRule.annualRate ?? 0.04) * 100} onChange={(value) => updateInvestment({ withdrawalRule: { ...(input.investment.withdrawalRule ?? { enabled: true }), annualRate: value / 100 } })} suffix="%" min={0.1} max={20} step={0.1} hint={iv.withdrawRateHint} />}
            <div className="subsection-label">{iv.pledgeSection}</div>
            <label className="toggle-field compact-toggle">
              <input type="checkbox" role="switch" checked={input.investment.stockPledge?.enabled ?? false} onChange={(event) => updateInvestment({ stockPledge: { ...(input.investment.stockPledge ?? { loanToValue: 0.3, annualInterestRate: 0.025, maintenanceRate: 1.3 }), enabled: event.target.checked } })} />
              <span className="toggle-control" aria-hidden="true" /><span>{iv.pledgeToggle}</span>
            </label>
            {input.investment.stockPledge?.enabled && <div className="field-grid two allocation-custom">
              <Field label={iv.pledgeLTV} value={(input.investment.stockPledge.loanToValue ?? 0.3) * 100} onChange={(value) => updateInvestment({ stockPledge: { ...(input.investment.stockPledge ?? { enabled: true, annualInterestRate: 0.025, maintenanceRate: 1.3 }), loanToValue: value / 100 } })} suffix="%" min={0} max={80} step={5} />
              <Field label={iv.pledgeRate} value={(input.investment.stockPledge.annualInterestRate ?? 0.025) * 100} onChange={(value) => updateInvestment({ stockPledge: { ...(input.investment.stockPledge ?? { enabled: true, loanToValue: 0.3, maintenanceRate: 1.3 }), annualInterestRate: value / 100 } })} suffix="%" step={0.1} />
              <Field label={iv.pledgeMaintenance} value={(input.investment.stockPledge.maintenanceRate ?? 1.3) * 100} onChange={(value) => updateInvestment({ stockPledge: { ...(input.investment.stockPledge ?? { enabled: true, loanToValue: 0.3, annualInterestRate: 0.025 }), maintenanceRate: value / 100 } })} suffix="%" min={100} max={1000} step={10} hint={iv.pledgeMaintenanceHint} />
            </div>}
          </div>
        </div>
      </details>
    </section>
  ];

  const allStepSections = stepSections;
  const visibleStepSections = allStepSections.filter((section) => {
    const key = section.key as string | null;
    return key === null || (stepOn[key] ?? true);
  });

  useEffect(() => {
    if (activeStep >= visibleStepSections.length) {
      setActiveStep(visibleStepSections.length - 1);
    }
  }, [activeStep, visibleStepSections.length]);

  return (
    <div className="input-panel" ref={panelTopRef}>
      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <strong>{ic.errorBox}</strong>
          <ul>{errors.map((error) => <li key={error.message}><button type="button" className="error-jump" onClick={() => jumpToError(error)}>{error.message}</button></li>)}</ul>
        </div>
      )}

      <nav className="step-nav" aria-label={t.steps.label}>
        {steps.map((item, index) => {
          const Icon = item.icon;
          const state = index === activeStep ? "active" : index < activeStep ? "done" : "";
          return (
            <button
              key={item.id}
              type="button"
              className={`step-nav-item ${state}`.trim()}
              aria-current={index === activeStep ? "step" : undefined}
              onClick={() => goToStep(index)}
            >
              <span className="step-nav-marker">{index < activeStep ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              <span className="step-nav-text"><small>{item.step}</small><strong>{item.title}</strong></span>
            </button>
          );
        })}
      </nav>

      <div ref={activeSectionRef} tabIndex={-1} className="step-body">
        {visibleStepSections[activeStep]}
      </div>

      <div className="step-actions">
        {activeStep > 0 && (
          <button type="button" className="step-button secondary" onClick={() => goToStep(activeStep - 1)}>
            <ArrowLeft aria-hidden="true" />{t.steps.prev}
          </button>
        )}
        {activeStep < steps.length - 1 ? (
          <button type="button" className="step-button primary" onClick={() => goToStep(activeStep + 1)}>
            {t.steps.nextPrefix}{steps[activeStep + 1].title}<ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="step-button primary" onClick={onViewResults}>
            {t.steps.viewResultsFull}<ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
