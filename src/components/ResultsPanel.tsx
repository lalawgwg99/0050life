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

interface ResultsPanelProps {
  result: ProjectionResult;
  scenarios: ScenarioResult[];
  onChange: (input: ProjectionResult["input"]) => void;
  comparison?: ReactNode;
}

export function ResultsPanel({ result, scenarios, onChange, comparison }: ResultsPanelProps) {
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
  const chartData = result.records
    .filter((_, index) => index % 12 === 0 || index === result.records.length - 1)
    .map((record) => ({ age: Number(record.age.toFixed(1)), assets: Math.round(toToday(record.totalRetirementAssetsNominal, record.month)) }));
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
  const includedIncome = ["勞保", "勞退"];
  if (result.nationalPension.enabled) includedIncome.splice(1, 0, "國保");
  if (input.partTime.enabled) includedIncome.push("兼職收入");
  const extraMonthly = useMemo(() => estimateAdditionalMonthlyInvestment(input, result), [input, result]);
  const affordableSpending = useMemo(() => estimateAffordableMonthlySpending(input, result), [input, result]);
  const roundedExtraMonthly = Math.ceil(extraMonthly / 100) * 100;
  const roundedAffordableSpending = Math.floor(affordableSpending / 100) * 100;
  const earlyCrashResult = useMemo(() => projectPlan(input, { retirementReturnPath: (monthIndex, normalRate) => monthIndex < 12 ? Math.pow(0.7, 1 / 12) - 1 : monthIndex < 24 ? Math.pow(0.9, 1 / 12) - 1 : normalRate }).depletedMonth, [input]);
  const longevity95 = useMemo(() => input.profile.longevityAge >= 95 ? result : projectPlan({ ...input, profile: { ...input.profile, longevityAge: 95 } }), [input, result]);
  const longevity100 = useMemo(() => input.profile.longevityAge >= 100 ? result : projectPlan({ ...input, profile: { ...input.profile, longevityAge: 100 } }), [input, result]);
  const fiveYearBalances = result.records.filter(record => (record.month - retirementMonth) % 60 === 0);
  const outcomeText = (depletedMonth: number | null, targetAge: number) => depletedMonth === null ? `可支撐到 ${targetAge} 歲` : `約 ${ageAtMonth(birth, depletedMonth).toFixed(0)} 歲用完`;
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
    { id: "retirement", month: retirementMonth, title: "開始退休", detail: `${input.profile.retirementAge} 歲`, kind: "retirement" },
    { id: "labor-pension", month: result.laborPension.claimMonth, title: input.laborPension.mode === "monthly" ? "開始領勞退" : "勞退一次領", detail: `${input.laborPension.claimAge} 歲`, kind: "pension" },
    { id: "labor-insurance", month: result.laborInsurance.claimMonth, title: "開始領勞保", detail: `${input.laborInsurance.claimAge} 歲`, kind: "labor" },
    ...(result.nationalPension.enabled ? [{ id: "national", month: result.nationalPension.claimMonth, title: "開始領國保", detail: "65 歲", kind: "national" }] : []),
    ...(input.partTime.enabled ? [{ id: "part-time", month: partTimeStartMonth, title: "開始兼職", detail: `${input.partTime.startAge} 歲`, kind: "work" }] : []),
    { id: "end", month: monthAtAge(birth, input.profile.longevityAge), title: "規劃終點", detail: `${input.profile.longevityAge} 歲`, kind: "end" }
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
    if (offset === 0) return "退休同月";
    if (offset < 0) return `退休前 ${Math.max(1, Math.round(Math.abs(offset) / 12))} 年`;
    if (offset < 12) return `退休後 ${offset} 個月`;
    return `退休後約 ${(offset / 12).toFixed(offset % 12 === 0 ? 0 : 1)} 年`;
  };
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
          <h1>{statusGood ? `目前準備可支應到 ${input.profile.longevityAge} 歲` : `退休準備還差 ${formatCompactMoney(gapToday)} 元`}</h1>
          <p>{input.profile.retirementAge} 歲退休・規劃到 {input.profile.longevityAge} 歲・距離退休約 {yearsToRetirement.toFixed(1)} 年</p>
        </div>
        <div className={`status-mark ${statusGood ? "good" : "attention"}`}>
          {statusGood ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <span>{statusGood ? "依目前條件估算" : "需要調整"}</span>
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card primary"><span>退休時可運用資產</span><strong>{formatMoney(projectedTotalToday)}</strong><small>自己的投資 {formatMoney(projectedToday)} ＋勞退一次領 {formatMoney(toToday(result.lumpPensionAmountAtRetirement, retirementMonth))}</small></article>
        <article className="metric-card"><span>依目前計畫需要的資產</span><strong>{formatMoney(requiredToday)}</strong></article>
        <article className="metric-card"><span>{statusGood ? "超過目標" : "距離目標還差"}</span><strong>{formatMoney(statusGood ? summary.surplus : gapToday)}</strong></article>
      </div>

      <p className="result-caution">{statusGood ? "這是每年照設定報酬計算的結果，不保證市場下跌時也足夠。" : `約 ${depletedRecord?.age.toFixed(1)} 歲開始不足，可先比較下方的調整建議。`} <a href="#retirement-stress">查看不利情況 ↓</a></p>

      <section className="result-section cashflow-section">
        <div className="result-heading"><div><span>先看每個月</span><h2>退休第一個月，錢夠不夠用</h2></div><small>換算成今天的物價</small></div>
        <div className="cashflow-grid">
          <article className="cashflow-card"><span>每月生活費</span><strong>{formatMoney(retirementExpenseToday)}</strong><small>包含已設定的醫療與長照費</small></article>
          <article className="cashflow-card"><span>每月可用收入</span><strong>{formatMoney(recurringIncomeToday)}</strong><small>每月領取的收入，已扣估計稅額</small></article>
          <article className="cashflow-card covered"><span>{monthlyCashflowGapToday > 0 ? "每月由投資支付" : "需動用投資"}</span><strong>{monthlyCashflowGapToday > 0 ? formatMoney(monthlyCashflowGapToday) : "$0"}</strong><small>{monthlyCashflowGapToday > 0 ? "從投資或保留現金支付，不是另外要存的錢" : "每月收入已足夠支付生活費"}</small></article>
        </div>
        <p className="section-footnote">一次領的勞保或勞退會放進退休資產，不會被誤算成每月固定收入。</p>
      </section>

      <details className="result-details money-explanation">
        <summary>想看退休當年的金額？</summary>
        <p>主要結果統一換算今天的物價，方便比較。退休第一個月支出約 {formatMoney(retirementRecord?.expenseNominal ?? 0)}，每月可用收入約 {formatMoney(netRecurringIncomeNominal)}；這裡才是未扣除物價上漲的當年金額。</p>
      </details>

      {comparison}

      {!statusGood && gapToday > 0 && (
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

      <IncomeRelay result={result} />

      <section className="result-section chart-section">
        <div className="result-heading"><div><span>退休以後</span><h2>投資與保留現金還剩多少</h2></div><small>今天的物價・每月收支後</small></div>
        <BalanceChart data={chartData} />
        <div className="balance-milestones">{fiveYearBalances.map((record) => <div key={record.month}><span>{record.age.toFixed(0)} 歲</span><strong>{formatMoney(record.portfolioReal + toToday(record.cashReserveNominal, record.month))}</strong></div>)}</div>
      </section>

      <section className="result-section stress-section" id="retirement-stress">
        <div className="result-heading"><div><span>先看不順利的情況</span><h2>退休壓力測試</h2></div><small>不是成功機率</small></div>
        <div className="stress-grid">
          <article><strong>退休後頭兩年遇到大跌</strong><span>第 1 年 -30%、第 2 年 -10%</span><b>{outcomeText(earlyCrashResult, input.profile.longevityAge)}</b></article>
          <article><strong>如果活到 95 歲</strong><span>沿用目前收入、支出與報酬假設</span><b>{outcomeText(longevity95.depletedMonth, 95)}</b></article>
          <article><strong>如果活到 100 歲</strong><span>沿用目前收入、支出與報酬假設</span><b>{outcomeText(longevity100.depletedMonth, 100)}</b></article>
        </div>
        <p className="section-footnote">壓力測試是用不利條件檢查承受力，不代表未來一定發生；若顯示資產用完，會列出大約年齡。</p>
      </section>

      <section className="result-section">
        <div className="result-heading"><div><span>分開看</span><h2>退休準備分開看</h2></div></div>
        <div className="source-list">
          <article className="source-row"><span className="source-icon labor"><Landmark aria-hidden="true" /></span><div><h3>勞保</h3><p>{formatMonth(result.laborInsurance.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(laborValue)}</strong><span>{result.laborInsurance.eligibleByCombinedYears ? "勞保＋國保合計後每月" : result.laborInsurance.eligibleForAnnuity ? "開始時每月金額" : "一次領估算"}</span></div></article>
          {result.nationalPension.enabled && <article className="source-row"><span className="source-icon national"><ShieldCheck aria-hidden="true" /></span><div><h3>國民年金</h3><p>{formatMonth(result.nationalPension.claimMonth)} 開始</p></div><div className="source-value"><strong>{formatMoney(nationalPensionValue)}</strong><span>{result.nationalPension.formulaUsed} 式每月估算</span></div></article>}
          <article className="source-row"><span className="source-icon pension"><PiggyBank aria-hidden="true" /></span><div><h3>勞退</h3><p>{formatMonth(result.laborPension.claimMonth)} 開始</p>{input.laborPension.mode === "lump" && <small className="source-note">一次領約 {formatMoney(lumpAmountToday)}；投入 {formatMoney(lumpInvestedToday)}，保留現金 {formatMoney(lumpCashToday)}</small>}</div><div className="source-value"><strong>{formatMoney(pensionValue)}</strong><span>{input.laborPension.mode === "monthly" ? "開始時每月估算" : "一次領估算"}</span></div></article>
          <article className="source-row"><span className="source-icon invest"><TrendingUp aria-hidden="true" /></span><div><h3>自己的投資</h3><p>{formatMonth(retirementMonth)} 退休時</p></div><div className="source-value"><strong>{formatMoney(projectedToday)}</strong><span>退休時預計金額</span></div></article>
          {input.partTime.enabled && <article className="source-row"><span className="source-icon work"><BriefcaseBusiness aria-hidden="true" /></span><div><h3>兼職收入</h3><p>{input.partTime.startAge} 至 {input.partTime.endAge} 歲</p></div><div className="source-value"><strong>{formatMoney(partTimeValue)}</strong><span>開始時每月金額</span></div></article>}
        </div>
        {result.investmentHoldings.length > 0 && <details className="holding-results">
          <summary>查看每筆投資的退休時估算</summary>
          <div>{result.investmentHoldings.map((holding) => <div className="holding-result-row" key={holding.id}><span>{holding.name}</span><strong>{formatMoney(toToday(holding.projectedValueNominal, retirementMonth))}</strong></div>)}</div>
        </details>}
      </section>

      {(withdrawalRule?.enabled || pledge?.enabled) && <section className="result-section optional-analysis"><div className="result-heading"><div><span>選用比較</span><h2>提領與借款試算</h2></div><small>不會改變主要結果</small></div><div className="analysis-grid">{withdrawalRule?.enabled && <article><strong>固定比例提領參考</strong><span>每年 {formatPercent(withdrawalRule.annualRate)}</span><b>{formatMoney(fourPercentMonthly)}／月</b><small>以退休時預計投資資產估算；只是提領情境，不代表本金不會減少，也不是保證。</small></article>}{pledge?.enabled && <article><strong>股票質押估算</strong><span>約可借 {formatMoney(pledgeLoanToday)}</span><b>每月利息約 {formatMoney(pledgeInterestMonthlyToday)}</b><small>以退休時投資市值、借款 {formatPercent(pledge.loanToValue)}、年利率 {formatPercent(pledge.annualInterestRate)} 估算；股價下跌可能被追繳或賣出。</small></article>}</div></section>}

      {withdrawalRule?.enabled && <p className="section-footnote">提領計算本金 {formatMoney(investedAtRetirementToday)}：自己的投資加上退休當月勞退再投入部分，不含保留現金或以後才領到的款項。這是起始每月參考，不是整段退休期的固定保證收入。</p>}

      <details className="result-details"><summary>進階分析：市場波動、稅額與勞退領法</summary>
      <section className="result-section professional-section">
        <div className="result-heading"><div><span>進階風險</span><h2>不要只看平均報酬</h2></div><small>規劃工具，不是預測</small></div>
        <div className="professional-grid">
          <article><strong>假設市場波動的通過比例</strong><b>{formatPercent(monteCarlo.successRate, 0)}</b><span>{monteCarlo.trials} 次模擬中，{Math.round(monteCarlo.successRate * monteCarlo.trials)} 次可支應到目標年齡</span><small>固定退休起始資產，只模擬退休後；波動是假設值，未用歷史資料校準。此比例不能解讀為你的真實退休成功機率。</small></article>
          <article><strong>稅後第一個月</strong><b>估計稅額 {formatMoney(firstMonthTaxToday)}</b><span>使用你填的有效稅率，投資費用已從報酬扣除</span><small>這是簡化估算，不是報稅結果。</small></article>
          <article><strong>勞退一次領／月領比較</strong><b>{pensionBreakevenAge ? `約 ${pensionBreakevenAge.toFixed(1)} 歲累計月領追平` : "規劃期間內未追平"}</b><span>以月領累計金額和一次領專戶金額比較</span><small>未計入一次領再投資報酬與個人稅務。</small></article>
        </div>
        <div className="historical-range"><strong>長期報酬不要只填一個數字</strong><span>規劃可同時查看較低、目前、較高三種報酬；歷史表現只適合用來設定範圍，不代表未來會重演。</span></div>
      </section>

      </details>

      {pledge?.enabled && <section className="result-section pledge-risk"><div className="result-heading"><div><span>負債風險</span><h2>股票質押追繳距離</h2></div><small>借款不是資產</small></div><div className="pledge-risk-summary"><strong>股價約下跌 {formatPercent(pledgeCallDrop, 0)} 會碰到 {formatPercent(pledge.maintenanceRate, 0)} 警戒線</strong><span>未計利息滾入本金、券商提前調整擔保品或個別股票折扣。</span></div><div className="pledge-bars">{[0.1, 0.2, 0.3, 0.4].map((drop) => { const ratio = pledge.loanToValue > 0 ? (1 - drop) / pledge.loanToValue : 99; return <div key={drop} className={ratio <= pledge.maintenanceRate ? "danger" : "safe"}><span>下跌 {formatPercent(drop, 0)}</span><b>維持率 {formatPercent(ratio, 0)}</b></div>; })}</div></section>}

      <details className="result-details"><summary>比較不同報酬假設</summary>
      <section className="result-section">
        <div className="result-heading"><div><span>不同市場狀況</span><h2>結果可能差多少</h2></div></div>
        <div className="scenario-table-wrap">
          <table className="scenario-table">
            <thead><tr><th>情況</th><th>退休後報酬</th><th>退休可用資產</th><th>能否撐到目標</th></tr></thead>
            <tbody>{scenarios.map((scenario) => {
              const scenarioProjected = toToday(scenario.result.projectedRetirementAssetsAtRetirement, retirementMonth);
              const depletedAge = scenario.result.records.find((record) => record.month === scenario.result.depletedMonth)?.age;
              return <tr key={scenario.name}><td><strong>{scenario.name}</strong></td><td>{formatPercent(scenario.retirementReturnRate)}</td><td>{formatMoney(scenarioProjected)}</td><td className={scenario.result.depletedMonth === null ? "ok" : "not-ok"}>{scenario.result.depletedMonth === null ? "可以" : `約 ${depletedAge?.toFixed(0)} 歲不足`}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="section-footnote">這三種情況只是把退休前後的投資報酬上下調整 2%，用來看差距，不是成功機率或保證。</p>
      </section>

      </details>

      <details className="result-details"><summary>查看所有領取日期</summary>
      <section className="result-section timeline-section">
        <div className="result-heading"><div><span>重要時間</span><h2>退休後，收入什麼時候進來</h2></div><small>依日期排列</small></div>
        <div className="timeline timeline-detailed">
          {timelineItems.map((item) => <article key={item.id} className={item.kind === "retirement" ? "current" : ""}>
            <div className="timeline-marker">{timelineIcon(item.kind)}</div>
            <div className="timeline-copy"><span>{relativeTime(item.month)}</span><strong>{item.title}</strong><small>{formatMonth(item.month)}・{item.detail}</small></div>
          </article>)}
        </div>
      </section>

      </details>

      <details className="calculation-notes">
        <summary>這份結果怎麼算的</summary>
        <div><p>系統從退休月份開始逐月計算。每月收入不足生活費時，差額會從投資資產拿出；有多的收入則放回投資資產。</p><ul><li>退休前共有 {retirementOffset} 個月可以準備，各筆投資會分開複利後再加總。</li><li>勞保、國保、勞退與選用的兼職收入，會分開計算，再從可領取的月份加入。</li><li>退休後投資依所選的資產配置報酬繼續計算。</li><li>法規資料版本：{TAIWAN_RULES_2026.version}，核對日期 {TAIWAN_RULES_2026.verifiedAt}。</li></ul></div>
      </details>

      <div className="warning-list">{result.warnings.map((warning) => <p key={warning}><CircleAlert aria-hidden="true" />{warning}</p>)}</div>
    </div>
  );
}
