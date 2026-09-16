import { BriefcaseBusiness, Landmark, PiggyBank, Plus, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import type { PlanningInput, RetirementAllocation } from "../domain/types";
import { laborInsuranceFutureYears, laborPensionFutureYears } from "../domain/coverage";
import { formatMoney } from "../lib/format";
import { laborInsuranceNormalAge } from "../rules/taiwan-2026";
import { Field } from "./Field";

interface InputPanelProps {
  input: PlanningInput;
  errors: string[];
  onChange: (input: PlanningInput) => void;
}

const allocationOptions: Array<{ id: RetirementAllocation; name: string; mix: string; rate?: number }> = [
  { id: "steady", name: "穩健", mix: "股票 30%・債券 60%・現金 10%", rate: 0.04 },
  { id: "balanced", name: "平衡", mix: "股票 60%・債券 35%・現金 5%", rate: 0.05 },
  { id: "growth", name: "成長", mix: "股票 80%・債券 20%", rate: 0.06 },
  { id: "custom", name: "自己設定", mix: "自行填寫報酬與費用" }
];

export function InputPanel({ input, errors, onChange }: InputPanelProps) {
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
        name: `投資 ${input.investment.holdings.length + 1}`,
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
      ...(option?.rate === undefined ? {} : { retirementGrossReturnRate: option.rate, retirementFeeRate: 0.003 })
    });
  };
  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
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

  return (
    <div className="input-panel">
      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <strong>有些資料需要調整</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}

      <section className="input-section">
        <div className="section-heading">
          <UserRound aria-hidden="true" />
          <div><span>第一步</span><h2>你的退休時間</h2></div>
        </div>
        <div className="field-grid two">
          <Field label="民國出生年" value={input.profile.birthYearROC} onChange={(value) => update("profile", "birthYearROC", value)} suffix="年" min={30} max={110} />
          <Field label="出生月份" value={input.profile.birthMonth} onChange={(value) => update("profile", "birthMonth", value)} suffix="月" min={1} max={12} />
          <Field label="想幾歲退休" value={input.profile.retirementAge} onChange={(value) => update("profile", "retirementAge", value)} suffix="歲" min={40} max={85} />
          <Field label="希望規劃到" value={input.profile.longevityAge} onChange={(value) => update("profile", "longevityAge", value)} suffix="歲" min={60} max={110} />
        </div>
        <Field label="退休後每月生活費" value={input.spending.monthlyToday} onChange={(value) => update("spending", "monthlyToday", value)} suffix="元" step={1000} hint="請填今天物價下需要的金額" />
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多生活假設</summary>
          <div className="details-body">
            <Field label="每年物價上漲" value={input.economy.inflationRate * 100} onChange={(value) => update("economy", "inflationRate", value / 100)} suffix="%" step={0.1} />
            <label className="toggle-field">
              <input type="checkbox" role="switch" checked={input.partTime.enabled} onChange={(event) => update("partTime", "enabled", event.target.checked)} />
              <span className="toggle-control" aria-hidden="true" />
              <span>退休後有兼職收入</span>
            </label>
            {input.partTime.enabled && (
              <div className="field-grid two optional-fields">
                <Field label="每月兼職收入" value={input.partTime.monthlyToday} onChange={(value) => update("partTime", "monthlyToday", value)} suffix="元" step={1000} hint="請填今天物價下的金額" />
                <Field label="兼職開始年齡" value={input.partTime.startAge} onChange={(value) => update("partTime", "startAge", value)} suffix="歲" />
                <Field label="兼職結束年齡" value={input.partTime.endAge} onChange={(value) => update("partTime", "endAge", value)} suffix="歲" />
                <Field label="收入每年增加" value={input.partTime.growthRate * 100} onChange={(value) => update("partTime", "growthRate", value / 100)} suffix="%" step={0.1} />
              </div>
            )}
          </div>
        </details>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <Landmark aria-hidden="true" />
          <div><span>第二步</span><h2>勞保老年給付</h2></div>
        </div>
        <div className="inline-note">你的法定年齡是 <strong>{normalAge} 歲</strong>，最早可從 {normalAge - 5} 歲開始領。</div>
        <div className="field-grid two">
          <Field label="目前勞保年資" value={input.laborInsurance.insuredYearsNow} onChange={(value) => update("laborInsurance", "insuredYearsNow", value)} suffix="年" step={0.1} />
          <Field label="預計開始領取" value={input.laborInsurance.claimAge} onChange={(value) => update("laborInsurance", "claimAge", value)} suffix="歲" min={normalAge - 5} />
          <Field label="最高 60 月平均薪資" value={input.laborInsurance.averageSalaryToday} onChange={(value) => update("laborInsurance", "averageSalaryToday", value)} suffix="元" step={100} hint="不知道時可先填目前投保薪資" />
        </div>
        <label className="toggle-field compact-toggle">
          <input type="checkbox" role="switch" checked={input.laborInsurance.futureYearsMode === "until-retirement"} onChange={(event) => update("laborInsurance", "futureYearsMode", event.target.checked ? "until-retirement" : "custom")} />
          <span className="toggle-control" aria-hidden="true" />
          <span>預計持續加保到退休</span>
        </label>
        {input.laborInsurance.futureYearsMode === "until-retirement"
          ? <div className="auto-value">已自動算入未來 <strong>{showYears(futureLaborYears)} 年</strong></div>
          : <Field label="未來還會加保" value={input.laborInsurance.insuredYearsFuture} onChange={(value) => update("laborInsurance", "insuredYearsFuture", value)} suffix="年" step={0.1} hint="只填實際預計有勞保的時間" />}
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多勞保假設</summary>
          <div className="details-body">
            <Field label="投保薪資每年成長" value={input.laborInsurance.salaryGrowthRate * 100} onChange={(value) => update("laborInsurance", "salaryGrowthRate", value / 100)} suffix="%" step={0.1} />
            <label className="select-field">
              <span>領取後的物價調整</span>
              <select value={input.laborInsurance.indexation} onChange={(event) => update("laborInsurance", "indexation", event.target.value)}>
                <option value="threshold">累計物價達 5% 時調整</option>
                <option value="none">先不估未來調整</option>
              </select>
            </label>
          </div>
        </details>
        <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">到勞保局查自己的勞保資料</a>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <ShieldCheck aria-hidden="true" />
          <div><span>第三步</span><h2>國民年金</h2></div>
        </div>
        <label className="toggle-field section-toggle">
          <input type="checkbox" role="switch" checked={input.nationalPension.enabled} onChange={(event) => update("nationalPension", "enabled", event.target.checked)} />
          <span className="toggle-control" aria-hidden="true" />
          <span>曾經參加國民年金</span>
        </label>
        {input.nationalPension.enabled && (
          <div className="optional-section">
            <div className="inline-note">只填<strong>實際已繳費的國保年資</strong>，不要把勞保年資重複加進來。</div>
            <Field label="已繳費的國保年資" value={input.nationalPension.insuredYears} onChange={(value) => update("nationalPension", "insuredYears", value)} suffix="年" step={0.1} min={0} max={40} />
            {receivesLaborAnnuity ? (
              <div className="plain-explanation">退休後會領勞保年金，因此國保會依 B 式估算。勞保和國保的金額仍各自計算。</div>
            ) : (
              <>
                <label className="toggle-field nested-toggle">
                  <input type="checkbox" role="switch" checked={input.nationalPension.aFormulaEligible} onChange={(event) => update("nationalPension", "aFormulaEligible", event.target.checked)} />
                  <span className="toggle-control" aria-hidden="true" />
                  <span>我確認可以使用 A 式</span>
                </label>
                <p className="field-help">若有欠費，或曾領其他社會保險老年給付，可能不能用 A 式；不確定時請先關閉。</p>
              </>
            )}
            {laborYears > 0 && laborYears < 15 && laborYears + input.nationalPension.insuredYears >= 15 && (
              <div className="plain-explanation">勞保加國保年資已滿 15 年，會用合併年資判斷勞保按月領資格，但兩筆金額不會混在一起算。</div>
            )}
          </div>
        )}
        <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">到勞保局查自己的國保資料</a>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <PiggyBank aria-hidden="true" />
          <div><span>第四步</span><h2>勞退個人專戶</h2></div>
        </div>
        <div className="mode-control" role="group" aria-label="勞退領取方式">
          <button type="button" className={(input.laborPension.mode ?? "lump") === "lump" ? "active" : ""} onClick={() => update("laborPension", "mode", "lump")}>一次領</button>
          <button type="button" className={input.laborPension.mode === "monthly" ? "active" : ""} onClick={() => update("laborPension", "mode", "monthly")}>按月領</button>
        </div>
        {(input.laborPension.mode ?? "lump") === "lump" && <div className="lump-reinvest-control">
          <Field label="一次領後投入股票的比例" value={(input.laborPension.lumpReinvestRate ?? 1) * 100} onChange={(value) => update("laborPension", "lumpReinvestRate", value / 100)} suffix="%" min={0} max={100} step={10} hint="未投入的部分會先當退休現金，有需要時再拿來支付生活費" />
          <div className="quick-rate" role="group" aria-label="一次領投入比例快速選擇">
            {[{ label: "全部投入", value: 100 }, { label: "投入一半", value: 50 }, { label: "先留現金", value: 0 }].map((option) => <button type="button" className={Math.round((input.laborPension.lumpReinvestRate ?? 1) * 100) === option.value ? "active" : ""} onClick={() => update("laborPension", "lumpReinvestRate", option.value / 100)} key={option.value}>{option.label}</button>)}
          </div>
        </div>}
        <div className="field-grid two">
          <Field label="目前專戶餘額" value={input.laborPension.balanceNow} onChange={(value) => update("laborPension", "balanceNow", value)} suffix="元" step={10_000} />
          <Field label="目前提繳工資" value={input.laborPension.monthlyWageToday} onChange={(value) => update("laborPension", "monthlyWageToday", value)} suffix="元" step={100} />
          <Field label="目前勞退年資" value={input.laborPension.seniorityYearsNow} onChange={(value) => update("laborPension", "seniorityYearsNow", value)} suffix="年" step={0.1} />
          <Field label="預計開始領取" value={input.laborPension.claimAge} onChange={(value) => update("laborPension", "claimAge", value)} suffix="歲" min={60} />
          <Field label="自己加碼提繳" value={input.laborPension.voluntaryRate * 100} onChange={(value) => update("laborPension", "voluntaryRate", value / 100)} suffix="%" min={0} max={6} step={1} />
        </div>
        <label className="toggle-field compact-toggle">
          <input type="checkbox" role="switch" checked={input.laborPension.futureYearsMode === "until-retirement"} onChange={(event) => update("laborPension", "futureYearsMode", event.target.checked ? "until-retirement" : "custom")} />
          <span className="toggle-control" aria-hidden="true" />
          <span>預計持續提繳到退休</span>
        </label>
        {input.laborPension.futureYearsMode === "until-retirement"
          ? <div className="auto-value">已自動算入未來 <strong>{showYears(futurePensionYears)} 年</strong></div>
          : <Field label="未來還會提繳" value={input.laborPension.seniorityYearsFuture} onChange={(value) => update("laborPension", "seniorityYearsFuture", value)} suffix="年" step={0.1} hint="只填實際預計有提繳的時間" />}
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多勞退假設</summary>
          <div className="details-body field-grid two">
            <Field label="雇主提繳比例" value={input.laborPension.employerRate * 100} onChange={(value) => update("laborPension", "employerRate", value / 100)} suffix="%" step={0.1} />
            <Field label="專戶每年成長" value={input.laborPension.returnRate * 100} onChange={(value) => update("laborPension", "returnRate", value / 100)} suffix="%" step={0.1} />
            <Field label="提繳工資每年成長" value={input.laborPension.wageGrowthRate * 100} onChange={(value) => update("laborPension", "wageGrowthRate", value / 100)} suffix="%" step={0.1} />
          </div>
        </details>
        <a className="source-link" href="https://edesk.bli.gov.tw/me/#/na/overview" target="_blank" rel="noreferrer">到勞保局查自己的勞退專戶</a>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <BriefcaseBusiness aria-hidden="true" />
          <div><span>第五步</span><h2>自己的投資</h2></div>
        </div>
        <p className="brand-note"><strong>0050 Life</strong> 可以從 0050 開始；有其他股票或基金，再逐筆加入。</p>
        <div className="holding-list">
          {input.investment.holdings.map((holding, index) => (
            <article className="holding-item" key={holding.id}>
              <div className="holding-header">
                <label>
                  <span className="sr-only">第 {index + 1} 筆投資名稱</span>
                  <input className="holding-name" value={holding.name} onChange={(event) => updateHolding(holding.id, "name", event.target.value)} aria-label={`第 ${index + 1} 筆投資名稱`} />
                </label>
                <button type="button" className="remove-holding" onClick={() => removeHolding(holding.id)} aria-label={`移除 ${holding.name || `第 ${index + 1} 筆投資`}`} title="移除這筆投資"><Trash2 aria-hidden="true" /></button>
              </div>
              <div className="field-grid two">
                <Field label="目前市值" value={holding.valueNow} onChange={(value) => updateHolding(holding.id, "valueNow", value)} suffix="元" step={10_000} />
                <Field label="每月投入" value={holding.monthlyContributionToday} onChange={(value) => updateHolding(holding.id, "monthlyContributionToday", value)} suffix="元" step={1000} />
              </div>
              <details className="holding-assumptions">
                <summary>報酬與費用：{(holding.grossReturnRate * 100).toFixed(1)}%／{(holding.feeRate * 100).toFixed(2)}%</summary>
                <div className="details-body field-grid two">
                  <Field label="每年總報酬" value={holding.grossReturnRate * 100} onChange={(value) => updateHolding(holding.id, "grossReturnRate", value / 100)} suffix="%" step={0.1} hint="包含股息再投入" />
                  <Field label="每年費用" value={holding.feeRate * 100} onChange={(value) => updateHolding(holding.id, "feeRate", value / 100)} suffix="%" step={0.01} />
                </div>
              </details>
            </article>
          ))}
          {input.investment.holdings.length === 0 && <p className="holding-empty">目前沒有投資，也可以直接進行退休試算。</p>}
          <button type="button" className="add-holding" onClick={addHolding}><Plus aria-hidden="true" />新增一筆投資</button>
        </div>
        <div className="investment-total">
          <span>目前合計 <strong>{formatMoney(investmentTotal)}</strong></span>
          <span>每月投入 <strong>{formatMoney(monthlyInvestmentTotal)}</strong></span>
        </div>
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多投資假設</summary>
          <div className="details-body">
            <Field label="每月投入每年增加" value={input.investment.contributionGrowthRate * 100} onChange={(value) => update("investment", "contributionGrowthRate", value / 100)} suffix="%" step={0.1} hint="若希望投入金額跟著物價提高，可填和物價相同" />
            <div className="subsection-label">退休後資產配置</div>
            <div className="allocation-options" role="radiogroup" aria-label="退休後資產配置">
              {allocationOptions.map((option) => (
                <button type="button" role="radio" aria-checked={input.investment.retirementAllocation === option.id} className={input.investment.retirementAllocation === option.id ? "active" : ""} onClick={() => setAllocation(option.id)} key={option.id}>
                  <strong>{option.name}</strong><span>{option.mix}</span>{option.rate !== undefined && <small>預估總報酬 {(option.rate * 100).toFixed(0)}%</small>}
                </button>
              ))}
            </div>
            {input.investment.retirementAllocation === "custom" && (
              <div className="field-grid two allocation-custom">
                <Field label="退休後每年總報酬" value={input.investment.retirementGrossReturnRate * 100} onChange={(value) => update("investment", "retirementGrossReturnRate", value / 100)} suffix="%" step={0.1} />
                <Field label="退休後每年費用" value={input.investment.retirementFeeRate * 100} onChange={(value) => update("investment", "retirementFeeRate", value / 100)} suffix="%" step={0.01} />
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
