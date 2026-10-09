import { useMemo } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarClock, Check, CircleAlert, Landmark, PiggyBank, ShieldCheck, TrendingUp } from "lucide-react";
import { growthFactor, realValue } from "../domain/rates";
import { ageAtMonth, birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { ProjectionResult, ScenarioResult } from "../domain/types";
import { formatCompactMoney, formatMoney, formatMonth, formatPercent } from "../lib/format";
import { TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { BalanceChart } from "./BalanceChart";
import { additionalContributionWeights, allocateMonthlyAmount, estimateAdditionalMonthlyInvestment, estimateAffordableMonthlySpending } from "../engine/actions";
import { projectPlan } from "../engine/project";
import { runMonteCarlo } from "../engine/monte-carlo";
import { projectLaborPension } from "../modules/labor-pension";
import { summarizeResult } from "../engine/result-summary";
import { IncomeRelay } from "./IncomeRelay";
import { useLocale } from "../i18n";

interface ResultsPanelProps {
  result: ProjectionResult;
  scenarios: ScenarioResult[];
  onChange: (input: ProjectionResult["input"]) => void;
  comparison?: ReactNode;
}

export function ResultsPanel({ result, scenarios, onChange, comparison }: ResultsPanelProps) {
  const { t } = useLocale();
  const r = t.results;
  const { input } = result;
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const retirementOffset = retirementMonth - asOf;
  const toToday = (amount: number, month: number) => realValue(amount, input.economy.inflationRate, month - asOf);
  const projectedToday = toToday(result.projectedInvestmentAtRetirement, retirementMonth);
  const summary = summarizeResult(result);
  const projectedTotalToday = summary.available;
  const requiredToday = summary.target;
  const gapToday = summary.gap;
  const retirementRecord = result.records[0];
  const retirementExpenseToday = retirementRecord ? toToday(retirementRecord.expenseNominal, retirementRecord.month) : 0;
  const retirementRentToday = retirementRecord ? toToday(retirementRecord.rentExpenseNominal, retirementRecord.month) : 0;
  const recurringIncomeNominal = retirementRecord
    ? (result.laborInsurance.eligibleForAnnuity ? retirementRecord.laborInsuranceNominal : 0)
      + (result.nationalPension.enabled ? retirementRecord.nationalPensionNominal : 0)
      + (input.laborPension.mode === "monthly" ? retirementRecord.laborPensionNominal : 0)
      + (input.partTime.enabled ? retirementRecord.partTimeNominal : 0)
    : 0;
  const netRecurringIncomeNominal = Math.max(0, recurringIncomeNominal - (retirementRecord?.taxNominal ?? 0));
  const recurringIncomeToday = retirementRecord ? toToday(netRecurringIncomeNominal, retirementRecord.month) : 0;
  const monthlyCashflowGapToday = Math.max(0, retirementExpenseToday - recurringIncomeToday);
  const withdrawalRule = input.investment.withdrawalRule;
  const investedAtRetirementToday = toToday(result.projectedInvestmentAtRetirement + result.lumpPensionReinvestedAtRetirement, retirementMonth);
  const fourPercentMonthly = investedAtRetirementToday * (withdrawalRule?.annualRate ?? 0.04) / 12;
  const lumpAmountToday = toToday(result.laborPension.balanceAtClaim, result.laborPension.claimMonth);
  const lumpInvestedToday = lumpAmountToday * (input.laborPension.lumpReinvestRate ?? 1);
  const lumpCashToday = lumpAmountToday - lumpInvestedToday;
  const pledge = input.investment.stockPledge;
  const pledgeLoanToday = pledge?.enabled ? projectedToday * (pledge.loanToValue ?? 0) : 0;
  const pledgeInterestMonthlyToday = pledgeLoanToday * (pledge?.annualInterestRate ?? 0) / 12;
  const pledgeCallDrop = pledge?.enabled && pledge.loanToValue > 0 ? Math.max(0, 1 - pledge.maintenanceRate * pledge.loanToValue) : 0;
  const yearsToRetirement = Math.max(0, retirementOffset / 12);
  const depletedRecord = result.depletedMonth === null ? null : result.records.find((record) => record.month === result.depletedMonth) ?? null;
  // 五國研究共同結論：「錢幾歲用完」是第一指標，放首屏
  const depletedAge = depletedRecord ? depletedRecord.age : result.depletedMonth === null ? null : ageAtMonth(birth, result.depletedMonth);
  const chartData = result.records
    .filter((_, index) => index % 12 === 0 || index === result.records.length - 1)
    .map((record) => ({ age: Number(record.age.toFixed(1)), assets: Math.round(toToday(record.totalRetirementAssetsNominal, record.month)) }));
  const laborOn = input.laborInsurance.enabled !== false;
  const pensionOn = input.laborPension.enabled !== false;
  const chartMarkers = [
    ...(pensionOn ? [{ age: ageAtMonth(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), result.laborPension.claimMonth), label: input.laborPension.mode === "lump" ? r.markerPensionLump : r.markerPensionStart }] : []),
    ...(laborOn && result.laborInsurance.eligibleForAnnuity ? [{ age: ageAtMonth(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), result.laborInsurance.claimMonth), label: r.markerLaborStart }] : [])
  ].filter((marker, index, all) => all.findIndex((m) => Math.abs(m.age - marker.age) < 0.6) === index);
  const laborValue = result.laborInsurance.eligibleForAnnuity
    ? toToday(result.laborInsurance.initialMonthlyNominal, result.laborInsurance.claimMonth)
    : toToday(result.laborInsurance.lumpSumNominal, result.laborInsurance.claimMonth);
  const nationalPensionValue = toToday(result.nationalPension.initialMonthlyNominal, result.nationalPension.claimMonth);
  const pensionValue = input.laborPension.mode === "monthly"
    ? toToday(result.laborPension.initialMonthlyNominal, result.laborPension.claimMonth)
    : toToday(result.laborPension.balanceAtClaim, result.laborPension.claimMonth);
  const partTimeStartMonth = monthAtAge(birth, input.partTime.startAge);
  const partTimeStartNominal = input.partTime.monthlyToday * growthFactor(input.partTime.growthRate, partTimeStartMonth - asOf);
  const partTimeValue = toToday(partTimeStartNominal, partTimeStartMonth);
  const statusGood = summary.meetsPlan;
  const includedIncome: string[] = [];
  if (laborOn) includedIncome.push(r.incomeLabor);
  if (result.nationalPension.enabled) includedIncome.push(r.incomeNational);
  if (pensionOn) includedIncome.push(r.incomePension);
  if (input.partTime.enabled) includedIncome.push(r.incomeWork);
  const extraMonthly = useMemo(() => estimateAdditionalMonthlyInvestment(input, result), [input, result]);
  const affordableSpending = useMemo(() => estimateAffordableMonthlySpending(input, result), [input, result]);
  const roundedExtraMonthly = Math.ceil(extraMonthly / 100) * 100;
  const roundedAffordableSpending = Math.floor(affordableSpending / 100) * 100;
  const earlyCrashResult = useMemo(() => projectPlan(input, { retirementReturnPath: (monthIndex, normalRate) => monthIndex < 12 ? Math.pow(0.7, 1 / 12) - 1 : monthIndex < 24 ? Math.pow(0.9, 1 / 12) - 1 : normalRate }).depletedMonth, [input]);
  const longevity95 = useMemo(() => input.profile.longevityAge >= 95 ? result : projectPlan({ ...input, profile: { ...input.profile, longevityAge: 95 } }), [input, result]);
  const longevity100 = useMemo(() => input.profile.longevityAge >= 100 ? result : projectPlan({ ...input, profile: { ...input.profile, longevityAge: 100 } }), [input, result]);
  const fiveYearBalances = result.records.filter(record => (record.month - retirementMonth) % 60 === 0);
  const outcomeText = (depletedMonth: number | null, targetAge: number) => depletedMonth === null ? r.outcomeOk(targetAge) : r.outcomeDepleted(ageAtMonth(birth, depletedMonth).toFixed(0));
  const monteCarlo = useMemo(() => runMonteCarlo(result), [result]);
  const pensionBreakevenAge = useMemo(() => {
    const endMonth = monthAtAge(birth, input.profile.longevityAge);
    const monthly = projectLaborPension({ ...input, laborPension: { ...input.laborPension, mode: "monthly" } }, endMonth);
    if (!monthly.eligibleForMonthly || monthly.initialMonthlyNominal <= 0) return null;
    let total = 0;
    for (let month = monthly.claimMonth; month < endMonth; month += 1) {
      total += monthly.events.get(month) ?? 0;
      if (total >= monthly.balanceAtClaim) return ageAtMonth(birth, month);
    }
    return null;
  }, [birth, input]);
  const firstMonthTaxToday = retirementRecord ? toToday(retirementRecord.taxNominal, retirementRecord.month) : 0;
  const timelineItems = [
    { id: "retirement", month: retirementMonth, title: r.timelineRetire, detail: r.timelineClaimAge(input.profile.retirementAge), kind: "retirement" },
    ...(pensionOn ? [{ id: "labor-pension", month: result.laborPension.claimMonth, title: input.laborPension.mode === "monthly" ? r.timelinePensionMonthly : r.timelinePensionLump, detail: r.timelineClaimAge(input.laborPension.claimAge), kind: "pension" }] : []),
    ...(laborOn ? [{ id: "labor-insurance", month: result.laborInsurance.claimMonth, title: r.timelineLabor, detail: r.timelineClaimAge(input.laborInsurance.claimAge), kind: "labor" }] : []),
    ...(result.nationalPension.enabled ? [{ id: "national", month: result.nationalPension.claimMonth, title: r.timelineNational, detail: r.timelineClaimAge(65), kind: "national" }] : []),
    ...(input.partTime.enabled ? [{ id: "part-time", month: partTimeStartMonth, title: r.timelineWork, detail: r.timelineClaimAge(input.partTime.startAge), kind: "work" }] : []),
    { id: "end", month: monthAtAge(birth, input.profile.longevityAge), title: r.timelineEnd, detail: r.timelineClaimAge(input.profile.longevityAge), kind: "end" }
  ].sort((left, right) => left.month - right.month || left.id.localeCompare(right.id));
  const timelineIcon = (kind: string) => {
    if (kind === "pension") return <PiggyBank aria-hidden="true" />;
    if (kind === "labor") return <Landmark aria-hidden="true" />;
    if (kind === "national") return <ShieldCheck aria-hidden="true" />;
    if (kind === "work") return <BriefcaseBusiness aria-hidden="true" />;
    if (kind === "end") return <Check aria-hidden="true" />;
    return <CalendarClock aria-hidden="true" />;
  };
  const relativeTime = (month: number) => {
    const offset = month - retirementMonth;
    if (offset === 0) return r.relativeNow;
    if (offset < 0) return r.relativeBefore(Math.max(1, Math.round(Math.abs(offset) / 12)));
    if (offset < 12) return r.relativeAfterMonths(offset);
    return r.relativeAfterYears((offset / 12).toFixed(offset % 12 === 0 ? 0 : 1));
  };
  const applyExtraMonthly = () => {
    const firstHolding = input.investment.holdings[0];
    if (firstHolding) {
      const weights = additionalContributionWeights(input);
      const extraByHolding = allocateMonthlyAmount(roundedExtraMonthly, weights);
      onChange({ ...input, investment: { ...input.investment, holdings: input.investment.holdings.map((holding, index) => ({ ...holding, monthlyContributionToday: holding.monthlyContributionToday + (extraByHolding[index] ?? 0) })) } });
    } else {
      onChange({ ...input, investment: { ...input.investment, holdings: [{ id: `holding-${Date.now()}`, name: r.fallbackHoldingName, valueNow: 0, monthlyContributionToday: roundedExtraMonthly, grossReturnRate: input.investment.retirementGrossReturnRate, feeRate: input.investment.retirementFeeRate }] } });
    }
  };
  const applyAffordableSpending = () => onChange({ ...input, spending: { ...input.spending, monthlyToday: roundedAffordableSpending } });

  return (
    <div className="results-panel" aria-live="polite">
      <section className="result-overview">
        <div className="overview-copy">
          <span className="eyebrow">{r.eyebrow}</span>
          <h1>{statusGood ? r.h1Good(input.profile.longevityAge) : depletedAge !== null ? r.h1Depleted(depletedAge.toFixed(0)) : r.h1Gap(formatCompactMoney(gapToday))}</h1>
          <p>{r.overviewSub(input.profile.retirementAge, input.profile.longevityAge, yearsToRetirement.toFixed(1), !statusGood ? r.gapSuffix(formatCompactMoney(gapToday)) : "")}</p>
        </div>
        <div className={`status-mark ${statusGood ? "good" : "attention"}`}>
          {statusGood ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <span>{statusGood ? r.statusGood : r.statusBad}</span>
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card primary"><span>{r.metricAssets}</span><strong>{formatMoney(projectedTotalToday)}</strong><small>{(() => {
          const lumpToday = toToday(result.lumpPensionAmountAtRetirement, retirementMonth);
          const base = r.metricAssetsOwn(formatMoney(projectedToday));
          if (lumpToday > 0) return `${base} ${r.metricAssetsLump(formatMoney(lumpToday))}`;
          if (input.laborPension.mode === "lump") return `${base}${r.metricAssetsLumpNote(formatMoney(lumpAmountToday), input.laborPension.claimAge)}`;
          return base;
        })()}</small></article>
        <article className="metric-card"><span>{r.metricRequired}</span><strong>{formatMoney(requiredToday)}</strong></article>
        <article className="metric-card"><span>{statusGood ? r.metricOver : r.metricShort}</span><strong>{formatMoney(statusGood ? summary.surplus : gapToday)}</strong></article>
      </div>

      <p className="result-caution">{statusGood ? r.cautionGood : r.cautionBad} <a href="#retirement-stress">{r.cautionLink}</a></p>

      <section className="result-section cashflow-section">
        <div className="result-heading"><div><span>{r.monthlyEyebrow}</span><h2>{r.monthlyTitle}</h2></div><small>{r.monthlyNote}</small></div>
        <div className="cashflow-grid">
          <article className="cashflow-card"><span>{r.monthlyExpense}</span><strong>{formatMoney(retirementExpenseToday)}</strong><small>{retirementRentToday > 0 ? r.monthlyExpenseRent(formatMoney(retirementRentToday)) : ""}{r.monthlyExpenseNote}</small></article>
          <article className="cashflow-card"><span>{r.monthlyIncome}</span><strong>{formatMoney(recurringIncomeToday)}</strong><small>{r.monthlyIncomeNote}</small></article>
          <article className="cashflow-card covered"><span>{r.monthlyGap}</span><strong>{monthlyCashflowGapToday > 0 ? formatMoney(monthlyCashflowGapToday) : "$0"}</strong><small>{monthlyCashflowGapToday > 0 ? r.monthlyGapNote : r.monthlyGapCovered}</small></article>
        </div>
        <p className="section-footnote">{r.lumpFootnote}</p>
      </section>

      <details className="result-details money-explanation">
        <summary>{r.nominalTitle}</summary>
        <p>{r.nominalBody(formatMoney(retirementRecord?.expenseNominal ?? 0), formatMoney(netRecurringIncomeNominal))}</p>
      </details>

      {comparison}

      {!statusGood && gapToday > 0 && (
        <section className="action-plan" aria-label={r.actionLabel}>
          <div className="action-plan-heading"><div><span>{r.actionEyebrow}</span><h2>{r.actionTitle}</h2></div><CircleAlert aria-hidden="true" /></div>
          <p className="action-plan-lead">{r.actionLead}</p>
          <div className="action-list">
            <article className="action-item">
              <div><strong>{r.actionSave(formatMoney(roundedExtraMonthly))}</strong><p>{r.actionSaveNote}</p></div>
              <button type="button" onClick={applyExtraMonthly}>{r.actionApply} <ArrowRight aria-hidden="true" /></button>
            </article>
            {result.depletedMonth !== null && <article className="action-item">
              <div><strong>{r.actionSpend(formatMoney(roundedAffordableSpending))}</strong><p>{r.actionSpendNote}</p></div>
              <button type="button" onClick={applyAffordableSpending}>{r.actionApply} <ArrowRight aria-hidden="true" /></button>
            </article>}
          </div>
          <p className="action-plan-footnote">{r.actionFootnote}</p>
        </section>
      )}

      <IncomeRelay result={result} />

      <section className="result-section chart-section">
        <div className="result-heading"><div><span>{r.chartEyebrow}</span><h2>{r.chartTitle}</h2></div><small>{r.chartNote}</small></div>
        <BalanceChart data={chartData} markers={chartMarkers} />
        <div className="balance-milestones">{fiveYearBalances.map((record) => <div key={record.month}><span>{r.milestoneAge(record.age.toFixed(0))}</span><strong>{formatMoney(record.portfolioReal + toToday(record.cashReserveNominal, record.month))}</strong></div>)}</div>
      </section>

      <section className="result-section stress-section" id="retirement-stress">
        <div className="result-heading"><div><span>{r.stressEyebrow}</span><h2>{r.stressTitle}</h2></div><small>{r.stressNote}</small></div>
        <div className="stress-grid">
          <article><strong>{r.stressCrash}</strong><span>{r.stressCrashDetail}</span><b>{outcomeText(earlyCrashResult, input.profile.longevityAge)}</b></article>
          <article><strong>{r.stress95}</strong><span>{r.stressLongDetail}</span><b>{outcomeText(longevity95.depletedMonth, 95)}</b></article>
          <article><strong>{r.stress100}</strong><span>{r.stressLongDetail}</span><b>{outcomeText(longevity100.depletedMonth, 100)}</b></article>
        </div>
        <p className="section-footnote">{r.stressFootnote}</p>
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>{r.sourcesEyebrow}</span><h2>{r.sourcesTitle}</h2></div></div>
        <div className="source-list">
          {laborOn && <article className="source-row"><span className="source-icon labor"><Landmark aria-hidden="true" /></span><div><h3>{r.sourceLabor}</h3><p>{r.startedAt(formatMonth(result.laborInsurance.claimMonth))}</p></div><div className="source-value"><strong>{formatMoney(laborValue)}</strong><span>{result.laborInsurance.eligibleByCombinedYears ? r.laborCombined : result.laborInsurance.eligibleForAnnuity ? r.monthlyEstimate : r.lumpEstimate}</span></div></article>}
          {result.nationalPension.enabled && <article className="source-row"><span className="source-icon national"><ShieldCheck aria-hidden="true" /></span><div><h3>{r.sourceNational}</h3><p>{r.startedAt(formatMonth(result.nationalPension.claimMonth))}</p></div><div className="source-value"><strong>{formatMoney(nationalPensionValue)}</strong><span>{r.nationalFormula(result.nationalPension.formulaUsed)}</span></div></article>}
          {pensionOn && <article className="source-row"><span className="source-icon pension"><PiggyBank aria-hidden="true" /></span><div><h3>{r.sourcePension}</h3><p>{r.startedAt(formatMonth(result.laborPension.claimMonth))}</p>{input.laborPension.mode === "lump" && <small className="source-note">{r.pensionLumpNote(formatMoney(lumpAmountToday), formatMoney(lumpInvestedToday), formatMoney(lumpCashToday))}</small>}</div><div className="source-value"><strong>{formatMoney(pensionValue)}</strong><span>{input.laborPension.mode === "monthly" ? r.monthlyEstimate : r.lumpEstimate}</span></div></article>}
          <article className="source-row"><span className="source-icon invest"><TrendingUp aria-hidden="true" /></span><div><h3>{r.sourceInvest}</h3><p>{r.investAtRetirement(formatMonth(retirementMonth))}</p></div><div className="source-value"><strong>{formatMoney(projectedToday)}</strong><span>{r.investEstimate}</span></div></article>
          {input.partTime.enabled && <article className="source-row"><span className="source-icon work"><BriefcaseBusiness aria-hidden="true" /></span><div><h3>{r.sourceWork}</h3><p>{r.workPeriod(input.partTime.startAge, input.partTime.endAge)}</p></div><div className="source-value"><strong>{formatMoney(partTimeValue)}</strong><span>{r.monthlyEstimate}</span></div></article>}
        </div>
        {result.investmentHoldings.length > 0 && <details className="holding-results">
          <summary>{r.holdingDetails}</summary>
          <div>{result.investmentHoldings.map((holding) => <div className="holding-result-row" key={holding.id}><span>{holding.name}</span><strong>{formatMoney(toToday(holding.projectedValueNominal, retirementMonth))}</strong></div>)}</div>
        </details>}
      </section>

      {(withdrawalRule?.enabled || pledge?.enabled) && <section className="result-section optional-analysis"><div className="result-heading"><div><span>{r.optionalEyebrow}</span><h2>{r.optionalTitle}</h2></div><small>{r.optionalNote}</small></div><div className="analysis-grid">{withdrawalRule?.enabled && <article><strong>{r.withdrawTitle}</strong><span>{r.withdrawRate(formatPercent(withdrawalRule.annualRate))}</span><b>{r.withdrawMonthly(formatMoney(fourPercentMonthly))}</b><small>{r.withdrawNote}</small></article>}{pledge?.enabled && <article><strong>{r.pledgeTitle}</strong><span>{r.pledgeLoan(formatMoney(pledgeLoanToday))}</span><b>{r.pledgeInterest(formatMoney(pledgeInterestMonthlyToday))}</b><small>{r.pledgeNote(formatPercent(pledge.loanToValue), formatPercent(pledge.annualInterestRate))}</small></article>}</div></section>}

      {withdrawalRule?.enabled && <p className="section-footnote">{r.withdrawFootnote(formatMoney(investedAtRetirementToday))}</p>}

      <details className="result-details"><summary>{r.advancedTitle}</summary>
      <section className="result-section professional-section">
        <div className="result-heading"><div><span>{r.advancedEyebrow}</span><h2>{r.advancedHeading}</h2></div><small>{r.advancedNote}</small></div>
        <div className="professional-grid">
          <article><strong>{r.mcTitle}</strong><b>{formatPercent(monteCarlo.successRate, 0)}</b><span>{r.mcDetail(monteCarlo.trials, Math.round(monteCarlo.successRate * monteCarlo.trials))}</span><small>{r.mcNote}</small></article>
          <article><strong>{r.taxTitle}</strong><b>{r.taxAmount(formatMoney(firstMonthTaxToday))}</b><span>{r.taxNote}</span><small>{r.taxFootnote}</small></article>
          <article><strong>{r.breakevenTitle}</strong><b>{pensionBreakevenAge ? r.breakevenYes(pensionBreakevenAge.toFixed(1)) : r.breakevenNo}</b><span>{r.breakevenNote}</span><small>{r.breakevenFootnote}</small></article>
        </div>
        <div className="historical-range"><strong>{r.rangeTitle}</strong><span>{r.rangeNote}</span></div>
      </section>

      </details>

      {pledge?.enabled && <section className="result-section pledge-risk"><div className="result-heading"><div><span>{r.pledgeRiskEyebrow}</span><h2>{r.pledgeRiskTitle}</h2></div><small>{r.pledgeRiskNote}</small></div><div className="pledge-risk-summary"><strong>{r.pledgeRiskDrop(formatPercent(pledgeCallDrop, 0), formatPercent(pledge.maintenanceRate, 0))}</strong><span>{r.pledgeRiskFootnote}</span></div><div className="pledge-bars">{[0.1, 0.2, 0.3, 0.4].map((drop) => { const ratio = pledge.loanToValue > 0 ? (1 - drop) / pledge.loanToValue : 99; return <div key={drop} className={ratio <= pledge.maintenanceRate ? "danger" : "safe"}><span>{r.pledgeDropLabel(formatPercent(drop, 0))}</span><b>{r.pledgeRatioLabel(formatPercent(ratio, 0))}</b></div>; })}</div></section>}

      <details className="result-details"><summary>{r.scenarioTitle}</summary>
      <section className="result-section">
        <div className="result-heading"><div><span>{r.scenarioEyebrow}</span><h2>{r.scenarioHeading}</h2></div></div>
        <div className="scenario-table-wrap">
          <table className="scenario-table">
            <thead><tr><th>{r.colCase}</th><th>{r.colReturn}</th><th>{r.colAssets}</th><th>{r.colSustain}</th></tr></thead>
            <tbody>{scenarios.map((scenario) => {
              const scenarioProjected = toToday(scenario.result.projectedRetirementAssetsAtRetirement, retirementMonth);
              const depletedAge = scenario.result.records.find((record) => record.month === scenario.result.depletedMonth)?.age;
              return <tr key={scenario.name}><td><strong>{scenario.name}</strong></td><td>{formatPercent(scenario.retirementReturnRate)}</td><td>{formatMoney(scenarioProjected)}</td><td className={scenario.result.depletedMonth === null ? "ok" : "not-ok"}>{scenario.result.depletedMonth === null ? r.scenarioOk : r.scenarioDepleted(depletedAge?.toFixed(0) ?? "")}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="section-footnote">{r.scenarioFootnote}</p>
      </section>

      </details>

      <details className="result-details"><summary>{r.timelineTitle}</summary>
      <section className="result-section timeline-section">
        <div className="result-heading"><div><span>{r.timelineEyebrow}</span><h2>{r.timelineHeading}</h2></div><small>{r.timelineNote}</small></div>
        <div className="timeline timeline-detailed">
          {timelineItems.map((item) => <article key={item.id} className={item.kind === "retirement" ? "current" : ""}>
            <div className="timeline-marker">{timelineIcon(item.kind)}</div>
            <div className="timeline-copy"><span>{relativeTime(item.month)}</span><strong>{item.title}</strong><small>{formatMonth(item.month)}・{item.detail}</small></div>
          </article>)}
        </div>
      </section>

      </details>

      <details className="calculation-notes">
        <summary>{r.calcTitle}</summary>
        <div><p>{r.calcIntro}</p><ul><li>{r.calcPrep(retirementOffset)}</li><li>{r.calcPensions}</li><li>{r.calcGrowth}</li><li>{r.calcRules(TAIWAN_RULES_2026.version, TAIWAN_RULES_2026.verifiedAt)}</li></ul></div>
      </details>

      <div className="warning-list">{result.warnings.map((warning) => <p key={warning}><CircleAlert aria-hidden="true" />{warning}</p>)}</div>
    </div>
  );
}
