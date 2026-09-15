import { CalendarClock, Check, CircleAlert, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import { realValue } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { ProjectionResult, ScenarioResult } from "../domain/types";
import { formatCompactMoney, formatMoney, formatMonth, formatPercent } from "../lib/format";
import { TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { BalanceChart } from "./BalanceChart";

interface ResultsPanelProps {
  result: ProjectionResult;
  scenarios: ScenarioResult[];
}

export function ResultsPanel({ result, scenarios }: ResultsPanelProps) {
  const { input } = result;
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const retirementOffset = retirementMonth - asOf;
  const toToday = (amount: number, month: number) => realValue(amount, input.economy.inflationRate, month - asOf);
  const projectedToday = toToday(result.projectedInvestmentAtRetirement, retirementMonth);
  const requiredToday = toToday(result.requiredInvestmentAtRetirement, retirementMonth);
  const gapToday = Math.max(0, requiredToday - projectedToday);
  const depletedRecord = result.depletedMonth === null ? null : result.records.find((record) => record.month === result.depletedMonth) ?? null;
  const chartData = result.records
    .filter((_, index) => index % 12 === 0 || index === result.records.length - 1)
    .map((record) => ({ age: Number(record.age.toFixed(1)), assets: Math.round(record.portfolioReal) }));
  const laborValue = result.laborInsurance.eligibleForAnnuity
    ? toToday(result.laborInsurance.initialMonthlyNominal, result.laborInsurance.claimMonth)
    : toToday(result.laborInsurance.lumpSumNominal, result.laborInsurance.claimMonth);
  const pensionValue = input.laborPension.mode === "monthly"
    ? toToday(result.laborPension.initialMonthlyNominal, result.laborPension.claimMonth)
    : toToday(result.laborPension.balanceAtClaim, result.laborPension.claimMonth);
  const statusGood = result.depletedMonth === null;

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
        <article className="metric-card"><span>建議準備的投資資產</span><strong>{formatMoney(requiredToday)}</strong><small>已把未來勞保與勞退收入算進去</small></article>
        <article className="metric-card"><span>第一年從投資拿出的比例</span><strong>{formatPercent(result.initialRetirementWithdrawalRate)}</strong><small>這是結果，不是預設套用 4% 法則</small></article>
      </div>

      <section className="readiness-band" aria-label={`退休準備完成 ${Math.round(result.readiness * 100)}%`}>
        <div><span>目前準備程度</span><strong>{Math.round(result.readiness * 100)}%</strong></div>
        <div className="progress-track"><span style={{ width: `${result.readiness * 100}%` }} /></div>
      </section>

      <section className="result-section chart-section">
        <div className="result-heading"><div><span>退休以後</span><h2>投資資產還剩多少</h2></div><small>今天的物價</small></div>
        <BalanceChart data={chartData} />
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>分開看</span><h2>三筆退休來源</h2></div></div>
        <div className="source-list">
          <article className="source-row"><span className="source-icon labor"><Landmark aria-hidden="true" /></span><div><h3>勞保</h3><p>{formatMonth(result.laborInsurance.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(laborValue)}</strong><span>{result.laborInsurance.eligibleForAnnuity ? "開始時每月金額" : "一次領估算"}</span></div></article>
          <article className="source-row"><span className="source-icon pension"><PiggyBank aria-hidden="true" /></span><div><h3>勞退</h3><p>{formatMonth(result.laborPension.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(pensionValue)}</strong><span>{input.laborPension.mode === "monthly" ? "開始時每月估算" : "一次領估算"}</span></div></article>
          <article className="source-row"><span className="source-icon invest"><TrendingUp aria-hidden="true" /></span><div><h3>自己的投資</h3><p>{formatMonth(retirementMonth)} 退休時</p></div><div className="source-value"><strong>{formatMoney(projectedToday)}</strong><span>退休時預計金額</span></div></article>
        </div>
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>不同市場狀況</span><h2>結果可能差多少</h2></div></div>
        <div className="scenario-table-wrap">
          <table className="scenario-table">
            <thead><tr><th>情況</th><th>每年報酬</th><th>退休時投資</th><th>能否撐到目標</th></tr></thead>
            <tbody>{scenarios.map((scenario) => {
              const scenarioProjected = toToday(scenario.result.projectedInvestmentAtRetirement, retirementMonth);
              const depletedAge = scenario.result.records.find((record) => record.month === scenario.result.depletedMonth)?.age;
              return <tr key={scenario.name}><td><strong>{scenario.name}</strong></td><td>{formatPercent(scenario.stockReturnRate)}</td><td>{formatMoney(scenarioProjected)}</td><td className={scenario.result.depletedMonth === null ? "ok" : "not-ok"}>{scenario.result.depletedMonth === null ? "可以" : `約 ${depletedAge?.toFixed(0)} 歲不足`}</td></tr>;
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
          <div><Check aria-hidden="true" /><span>{input.profile.longevityAge} 歲</span><strong>規劃終點</strong></div>
        </div>
      </section>

      <details className="calculation-notes">
        <summary>這份結果怎麼算的</summary>
        <div><p>系統從退休月份開始逐月計算。每月收入不足生活費時，差額會從投資資產拿出；有多的收入則放回投資資產。</p><ul><li>退休前共有 {retirementOffset} 個月可以準備。</li><li>勞保與勞退只會從設定的領取月份開始計入。</li><li>物價、薪資與投資報酬都依目前填寫的比例持續計算。</li><li>法規資料版本：{TAIWAN_RULES_2026.version}，核對日期 {TAIWAN_RULES_2026.verifiedAt}。</li></ul></div>
      </details>

      <div className="warning-list">{result.warnings.map((warning) => <p key={warning}><CircleAlert aria-hidden="true" />{warning}</p>)}</div>
    </div>
  );
}
