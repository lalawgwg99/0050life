import { useMemo } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarClock, Check, CircleAlert, Landmark, PiggyBank, ShieldCheck, TrendingUp } from "lucide-react";
import { growthFactor, realValue } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { ProjectionResult, ScenarioResult } from "../domain/types";
import { formatCompactMoney, formatMoney, formatMonth, formatPercent } from "../lib/format";
import { TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { BalanceChart } from "./BalanceChart";
import { additionalContributionWeights, allocateMonthlyAmount, estimateAdditionalMonthlyInvestment, estimateAffordableMonthlySpending } from "../engine/actions";

interface ResultsPanelProps {
  result: ProjectionResult;
  scenarios: ScenarioResult[];
  onChange: (input: ProjectionResult["input"]) => void;
}

export function ResultsPanel({ result, scenarios, onChange }: ResultsPanelProps) {
  const { input } = result;
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const retirementOffset = retirementMonth - asOf;
  const toToday = (amount: number, month: number) => realValue(amount, input.economy.inflationRate, month - asOf);
  const projectedToday = toToday(result.projectedInvestmentAtRetirement, retirementMonth);
  const requiredToday = toToday(result.requiredInvestmentAtRetirement, retirementMonth);
  const gapToday = Math.max(0, requiredToday - projectedToday);
  const retirementRecord = result.records[0];
  const retirementExpenseToday = retirementRecord ? toToday(retirementRecord.expenseNominal, retirementRecord.month) : 0;
  const recurringIncomeNominal = retirementRecord
    ? (result.laborInsurance.eligibleForAnnuity ? retirementRecord.laborInsuranceNominal : 0)
      + (result.nationalPension.enabled ? retirementRecord.nationalPensionNominal : 0)
      + (input.laborPension.mode === "monthly" ? retirementRecord.laborPensionNominal : 0)
      + (input.partTime.enabled ? retirementRecord.partTimeNominal : 0)
    : 0;
  const recurringIncomeToday = retirementRecord ? toToday(recurringIncomeNominal, retirementRecord.month) : 0;
  const monthlyCashflowGapToday = Math.max(0, retirementExpenseToday - recurringIncomeToday);
  const depletedRecord = result.depletedMonth === null ? null : result.records.find((record) => record.month === result.depletedMonth) ?? null;
  const chartData = result.records
    .filter((_, index) => index % 12 === 0 || index === result.records.length - 1)
    .map((record) => ({ age: Number(record.age.toFixed(1)), assets: Math.round(record.portfolioReal) }));
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
  const statusGood = result.depletedMonth === null;
  const includedIncome = ["勞保", "勞退"];
  if (result.nationalPension.enabled) includedIncome.splice(1, 0, "國保");
  if (input.partTime.enabled) includedIncome.push("兼職收入");
  const extraMonthly = useMemo(() => estimateAdditionalMonthlyInvestment(input, result), [input, result]);
  const affordableSpending = useMemo(() => estimateAffordableMonthlySpending(input, result), [input, result]);
  const roundedExtraMonthly = Math.ceil(extraMonthly / 100) * 100;
  const roundedAffordableSpending = Math.floor(affordableSpending / 100) * 100;
  const applyExtraMonthly = () => {
    const firstHolding = input.investment.holdings[0];
    if (firstHolding) {
      const weights = additionalContributionWeights(input);
      const extraByHolding = allocateMonthlyAmount(roundedExtraMonthly, weights);
      onChange({ ...input, investment: { ...input.investment, holdings: input.investment.holdings.map((holding, index) => ({ ...holding, monthlyContributionToday: holding.monthlyContributionToday + (extraByHolding[index] ?? 0) })) } });
    } else {
      onChange({ ...input, investment: { ...input.investment, holdings: [{ id: `holding-${Date.now()}`, name: "退休準備", valueNow: 0, monthlyContributionToday: roundedExtraMonthly, grossReturnRate: input.investment.retirementGrossReturnRate, feeRate: input.investment.retirementFeeRate }] } });
    }
  };
  const applyAffordableSpending = () => onChange({ ...input, spending: { ...input.spending, monthlyToday: roundedAffordableSpending } });

  return (
    <div className="results-panel" aria-live="polite">
      <section className="result-overview">
        <div className="overview-copy">
          <span className="eyebrow">全部換成今天的物價</span>
          <h1>{gapToday <= 1 ? "目前準備足夠" : `退休準備還差 ${formatCompactMoney(gapToday)} 元`}</h1>
          <p>{statusGood ? `照目前填寫的條件，投資資產可支撐到 ${input.profile.longevityAge} 歲。` : `照目前填寫的條件，大約在 ${depletedRecord?.age.toFixed(1)} 歲開始不夠支付生活費。`}</p>
        </div>
        <div className={`status-mark ${statusGood ? "good" : "attention"}`}>
          {statusGood ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <span>{statusGood ? "通過目前目標" : "需要調整"}</span>
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card primary"><span>退休時預計投資資產</span><strong>{formatMoney(projectedToday)}</strong><small>包含現在資產與退休前持續投入</small></article>
        <article className="metric-card"><span>建議準備的投資資產</span><strong>{formatMoney(requiredToday)}</strong><small>已把{includedIncome.join("、")}算進去</small></article>
        <article className="metric-card"><span>第一年從投資拿出的比例</span><strong>{formatPercent(result.initialRetirementWithdrawalRate)}</strong><small>這是結果，不是預設套用 4% 法則</small></article>
      </div>

      <section className="readiness-band" aria-label={`退休準備完成 ${Math.round(result.readiness * 100)}%`}>
        <div><span>目前準備程度</span><strong>{Math.round(result.readiness * 100)}%</strong></div>
        <div className="progress-track"><span style={{ width: `${result.readiness * 100}%` }} /></div>
      </section>

      {gapToday > 1 && (
        <section className="action-plan" aria-label="改善建議">
          <div className="action-plan-heading"><div><span>現在可以怎麼做</span><h2>先選一個改變，結果會立刻更新</h2></div><CircleAlert aria-hidden="true" /></div>
          <p className="action-plan-lead">這不是要一次做到完美，而是把差距拆成今天做得到的下一步。</p>
          <div className="action-list">
            <article className="action-item">
              <div><strong>每月多存 {formatMoney(roundedExtraMonthly)}</strong><p>依目前投資報酬與距離退休的時間估算，會照目前各筆投入比例分配。</p></div>
              <button type="button" onClick={applyExtraMonthly}>套用 <ArrowRight aria-hidden="true" /></button>
            </article>
            {result.depletedMonth !== null && <article className="action-item">
              <div><strong>退休後每月生活費抓 {formatMoney(roundedAffordableSpending)}</strong><p>以現在的資產和收入，這個金額較有機會支撐到規劃年齡。</p></div>
              <button type="button" onClick={applyAffordableSpending}>套用 <ArrowRight aria-hidden="true" /></button>
            </article>}
          </div>
          <p className="action-plan-footnote">也可以把退休年齡往後調 1 年再比較；延後時間會同時增加準備期、減少支出期。</p>
        </section>
      )}

      <section className="result-section cashflow-section">
        <div className="result-heading"><div><span>先看每個月</span><h2>退休第一個月，錢夠不夠用</h2></div><small>換算成今天的物價</small></div>
        <div className="cashflow-grid">
          <article className="cashflow-card"><span>每月生活費</span><strong>{formatMoney(retirementExpenseToday)}</strong><small>退休後第一個月的預估支出</small></article>
          <article className="cashflow-card"><span>每月收入</span><strong>{formatMoney(recurringIncomeToday)}</strong><small>只算按月進來的勞保、國保、勞退與兼職</small></article>
          <article className={`cashflow-card ${monthlyCashflowGapToday > 0 ? "attention" : "covered"}`}><span>{monthlyCashflowGapToday > 0 ? "每月還要補" : "固定收入狀態"}</span><strong>{monthlyCashflowGapToday > 0 ? formatMoney(monthlyCashflowGapToday) : "已足夠"}</strong><small>{monthlyCashflowGapToday > 0 ? "需要從投資資產補上的金額" : "固定收入已蓋過第一個月生活費"}</small></article>
        </div>
        <p className="section-footnote">一次領的勞保或勞退會放進退休資產，不會被誤算成每月固定收入。</p>
      </section>

      <section className="result-section chart-section">
        <div className="result-heading"><div><span>退休以後</span><h2>投資資產還剩多少</h2></div><small>今天的物價</small></div>
        <BalanceChart data={chartData} />
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>分開看</span><h2>退休準備分開看</h2></div></div>
        <div className="source-list">
          <article className="source-row"><span className="source-icon labor"><Landmark aria-hidden="true" /></span><div><h3>勞保</h3><p>{formatMonth(result.laborInsurance.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(laborValue)}</strong><span>{result.laborInsurance.eligibleByCombinedYears ? "勞保＋國保合計後每月" : result.laborInsurance.eligibleForAnnuity ? "開始時每月金額" : "一次領估算"}</span></div></article>
          {result.nationalPension.enabled && <article className="source-row"><span className="source-icon national"><ShieldCheck aria-hidden="true" /></span><div><h3>國民年金</h3><p>{formatMonth(result.nationalPension.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(nationalPensionValue)}</strong><span>{result.nationalPension.formulaUsed} 式每月估算</span></div></article>}
          <article className="source-row"><span className="source-icon pension"><PiggyBank aria-hidden="true" /></span><div><h3>勞退</h3><p>{formatMonth(result.laborPension.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(pensionValue)}</strong><span>{input.laborPension.mode === "monthly" ? "開始時每月估算" : "一次領估算"}</span></div></article>
          <article className="source-row"><span className="source-icon invest"><TrendingUp aria-hidden="true" /></span><div><h3>自己的投資</h3><p>{formatMonth(retirementMonth)} 退休時</p></div><div className="source-value"><strong>{formatMoney(projectedToday)}</strong><span>退休時預計金額</span></div></article>
          {input.partTime.enabled && <article className="source-row"><span className="source-icon work"><BriefcaseBusiness aria-hidden="true" /></span><div><h3>兼職收入</h3><p>{input.partTime.startAge} 至 {input.partTime.endAge} 歲</p></div><div className="source-value"><strong>{formatMoney(partTimeValue)}</strong><span>開始時每月金額</span></div></article>}
        </div>
        {result.investmentHoldings.length > 0 && <details className="holding-results">
          <summary>查看每筆投資的退休時估算</summary>
          <div>{result.investmentHoldings.map((holding) => <div className="holding-result-row" key={holding.id}><span>{holding.name}</span><strong>{formatMoney(toToday(holding.projectedValueNominal, retirementMonth))}</strong></div>)}</div>
        </details>}
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>不同市場狀況</span><h2>結果可能差多少</h2></div></div>
        <div className="scenario-table-wrap">
          <table className="scenario-table">
            <thead><tr><th>情況</th><th>退休後報酬</th><th>退休時投資</th><th>能否撐到目標</th></tr></thead>
            <tbody>{scenarios.map((scenario) => {
              const scenarioProjected = toToday(scenario.result.projectedInvestmentAtRetirement, retirementMonth);
              const depletedAge = scenario.result.records.find((record) => record.month === scenario.result.depletedMonth)?.age;
              return <tr key={scenario.name}><td><strong>{scenario.name}</strong></td><td>{formatPercent(scenario.retirementReturnRate)}</td><td>{formatMoney(scenarioProjected)}</td><td className={scenario.result.depletedMonth === null ? "ok" : "not-ok"}>{scenario.result.depletedMonth === null ? "可以" : `約 ${depletedAge?.toFixed(0)} 歲不足`}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="section-footnote">這三種情況只是把投資報酬上下調整 2%，不是成功機率。</p>
      </section>

      <section className="result-section timeline-section">
        <div className="result-heading"><div><span>重要時間</span><h2>退休收入何時進來</h2></div></div>
        <div className="timeline">
          <div><CalendarClock aria-hidden="true" /><span>{formatMonth(retirementMonth)}</span><strong>開始退休</strong></div>
          <div><PiggyBank aria-hidden="true" /><span>{formatMonth(result.laborPension.claimMonth)}</span><strong>開始領勞退</strong></div>
          <div><Landmark aria-hidden="true" /><span>{formatMonth(result.laborInsurance.claimMonth)}</span><strong>開始領勞保</strong></div>
          {result.nationalPension.enabled && <div><ShieldCheck aria-hidden="true" /><span>{formatMonth(result.nationalPension.claimMonth)}</span><strong>開始領國保</strong></div>}
          {input.partTime.enabled && <div><BriefcaseBusiness aria-hidden="true" /><span>{formatMonth(partTimeStartMonth)}</span><strong>開始兼職</strong></div>}
          <div><Check aria-hidden="true" /><span>{input.profile.longevityAge} 歲</span><strong>規劃終點</strong></div>
        </div>
      </section>

      <details className="calculation-notes">
        <summary>這份結果怎麼算的</summary>
        <div><p>系統從退休月份開始逐月計算。每月收入不足生活費時，差額會從投資資產拿出；有多的收入則放回投資資產。</p><ul><li>退休前共有 {retirementOffset} 個月可以準備，各筆投資會分開複利後再加總。</li><li>勞保、國保、勞退與選用的兼職收入，會分開計算，再從可領取的月份加入。</li><li>退休後投資依所選的資產配置報酬繼續計算。</li><li>法規資料版本：{TAIWAN_RULES_2026.version}，核對日期 {TAIWAN_RULES_2026.verifiedAt}。</li></ul></div>
      </details>

      <div className="warning-list">{result.warnings.map((warning) => <p key={warning}><CircleAlert aria-hidden="true" />{warning}</p>)}</div>
    </div>
  );
}
