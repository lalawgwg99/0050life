import { useEffect, useMemo, useState } from "react";
import type { PlanningInput } from "../domain/types";
import { applyMonthlyInvestment, calculateInvestment, solveMonthlyInvestment } from "../engine/investment-tool";
import { formatMoney } from "../lib/format";
import { toSerial } from "../domain/time";

export function InvestmentPage({ input, onImport }: { input: PlanningInput; onImport: (holdings: PlanningInput["investment"]["holdings"], growth: number) => void }) {
  const [holdings, setHoldings] = useState(() => input.investment.holdings.length ? input.investment.holdings.map(h => ({ ...h })) : [{ id: "first", name: "我的投資", valueNow: 0, monthlyContributionToday: 0, grossReturnRate: 0.05, feeRate: 0 }]);
  const [years, setYears] = useState(20);
  const [inflation, setInflation] = useState(input.economy.inflationRate);
  const [growth, setGrowth] = useState(input.investment.contributionGrowthRate);
  const [mode, setMode] = useState("grow");
  const [target, setTarget] = useState(10000000);
  const [withdrawal, setWithdrawal] = useState(20000);
  const [lump, setLump] = useState(0);
  const [lumpDate, setLumpDate] = useState(`${input.asOf.year}-${String(input.asOf.month).padStart(2, "0")}`);
  const [confirm, setConfirm] = useState<"current" | "suggested" | null>(null);
  useEffect(() => { setConfirm(null); }, [holdings, years, inflation, growth, mode, target, withdrawal, lump, lumpDate]);
  const [year, month] = lumpDate.split("-").map(Number);
  const plan = { holdings, months: Math.round(years * 12), inflation, contributionGrowth: growth, lumpMonth: lump > 0 ? toSerial(year, month) - toSerial(input.asOf.year, input.asOf.month) + 1 : 1, lumpAmount: lump, withdrawal: mode === "draw" ? withdrawal : 0 };
  const calculation = useMemo(() => {
    try {
      const result = calculateInvestment(plan);
      const suggested = mode === "target" ? applyMonthlyInvestment(holdings, solveMonthlyInvestment(plan, target)) : null;
      return { result, scenarios: [-0.02, 0, 0.02].map(delta => calculateInvestment(plan, delta)), suggested, monthly: suggested?.reduce((sum, h) => sum + h.monthlyContributionToday, 0) ?? null };
    } catch (error) { return { error: error instanceof Error ? error.message : "請檢查輸入" }; }
  }, [holdings, years, inflation, growth, lump, lumpDate, mode, target, withdrawal]);
  const importHoldings = confirm === "suggested" && !("error" in calculation) ? calculation.suggested ?? holdings : holdings;
  const field = (label: string, value: number, change: (value: number) => void, step = 1000) => <label className="investment-field">{label}<input type="number" value={Number.isFinite(value) ? value : ""} step={step} onChange={e => change(e.target.value === "" ? NaN : Number(e.target.value))} /></label>;
  return <main className="investment-page">
    <header><span className="eyebrow">0050 Life・獨立投資試算</span><h1>先把自己的投資算清楚</h1><p>不含勞保、勞退或國保。沿用退休頁的投資資料，這裡的修改不會自動覆蓋原方案。</p></header>
    <div className="investment-modes" role="group" aria-label="投資試算方式">{[["grow", "我能累積多少"], ["target", "目標需要每月投多少"], ["draw", "領錢後還剩多少"]].map(([key, name]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{name}</button>)}</div>
    <button type="button" className="investment-result-jump" onClick={() => document.getElementById("investment-result")?.scrollIntoView({ behavior: "smooth", block: "start" })}>查看下方試算結果 ↓</button>
    <div className="investment-layout"><section aria-label="投資條件">
      {field("試算年數", years, setYears, 1)}
      {mode === "target" && field("目標金額（今天物價）", target, setTarget)}
      {mode === "draw" && <>{field("每月領取（今天物價）", withdrawal, setWithdrawal)}<p>從第一個月開始領取，金額隨設定物價上漲；每月投入仍會計入，不再投入時請填 0。</p></>}
      {holdings.map((h, index) => <fieldset key={h.id}><legend>第 {index + 1} 筆投資</legend>
        <label className="investment-field">名稱<input value={h.name} onChange={e => setHoldings(holdings.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} /></label>
        {([ ["valueNow", "目前金額", 1000], ["monthlyContributionToday", "每月投入", 1000], ["grossReturnRate", "年報酬假設（%，含股息再投入）", 0.5] ] as const).map(([key, label, step]) => <div key={key}>{field(label, h[key] * (key === "grossReturnRate" ? 100 : 1), value => setHoldings(holdings.map((item, i) => i === index ? { ...item, [key]: value / (key === "grossReturnRate" ? 100 : 1) } : item)), step)}</div>)}
        <details><summary>這筆投資的費用</summary>{field("每年費用（%）", h.feeRate * 100, value => setHoldings(holdings.map((item, i) => i === index ? { ...item, feeRate: value / 100 } : item)), 0.1)}<p>若報酬已扣基金內扣費用，請勿重複扣除。此處不含個別交易稅費。</p></details>
        {holdings.length > 1 && <button type="button" onClick={() => setHoldings(holdings.filter((_, i) => i !== index))}>移除這筆</button>}
      </fieldset>)}
      <button type="button" onClick={() => setHoldings([...holdings, { id: crypto.randomUUID(), name: "新增投資", valueNow: 0, monthlyContributionToday: 0, grossReturnRate: 0.05, feeRate: 0 }])}>新增股票／ETF</button>
      <details className="result-details"><summary>物價、投入調整與單筆加碼</summary>
        {field("每年物價上漲（%）", inflation * 100, value => setInflation(value / 100), 0.5)}
        {field("每月投入每年增加（%）", growth * 100, value => setGrowth(value / 100), 0.5)}
        {field("單筆加碼金額（投入當年的金額）", lump, setLump)}
        {lump > 0 && <label className="investment-field">加碼年月<input type="month" value={lumpDate} onChange={e => setLumpDate(e.target.value)} /></label>}
        <p>單筆加碼在指定月底投入第一筆投資，從次月開始計息。</p>
      </details>
    </section><section id="investment-result" aria-label="投資試算結果" aria-live="polite">
      {"error" in calculation ? <p role="alert">{calculation.error}</p> : <>
        <div className="investment-answer"><span>以今天物價看，{years} 年後預計剩下</span><h2>{formatMoney(calculation.result.final.today)}</h2><p>依你填的報酬試算，不是保證收益。</p>
          {calculation.monthly !== null && <><p><strong>達到目標：現在每月共投入約 {formatMoney(calculation.monthly)}</strong><br />這是每月投入總額，不是額外加碼。按目前各筆投入比例分配，各筆向上取整元；都為 0 時放在第一筆，並沿用每年投入調整。</p><button type="button" onClick={() => setHoldings(calculation.suggested!)}>套用每月投入建議</button><p>套用會更新左側每筆投入與整份試算；也可以直接選擇下方「帶入建議投入」。</p></>}
          {mode === "draw" && <p>{calculation.result.depletedMonth === null ? "目前假設下，規劃期間每月都能領足。" : `第 ${calculation.result.depletedMonth} 個月開始無法領足設定金額。`}</p>}
        </div>
        <h2>換個報酬，差多少？</h2><div className="investment-scenarios">{calculation.scenarios.map((s, i) => <article key={i}><span>{["各筆報酬少 2%", "照目前填寫", "各筆報酬多 2%"][i]}</span><strong>{formatMoney(s.final.today)}</strong>{mode === "draw" && <small>{s.depletedMonth ? `第 ${s.depletedMonth} 個月領不足` : "期間內可領足"}</small>}</article>)}</div>
        <p>這是三組固定報酬假設，不是市場大跌測試或成功機率。</p>
        <details className="result-details"><summary>投入本金與收益怎麼分？</summary><p>以下採各年實際金額累加，未換算今天物價，才能核對帳目。</p><dl><dt>累計投入（含目前本金）</dt><dd>{formatMoney(calculation.result.final.principal)}</dd><dt>累計投資收益（已扣設定費用）</dt><dd>{formatMoney(calculation.result.final.gain)}</dd><dt>已領取</dt><dd>{formatMoney(calculation.result.withdrawn)}</dd><dt>最後餘額</dt><dd>{formatMoney(calculation.result.final.nominal)}</dd></dl><p>投入＋收益－已領取＝最後餘額。股息已包含在報酬，不再加一次。</p></details>
        <details className="result-details"><summary>每年資產餘額（今天物價）</summary><table className="scenario-table"><thead><tr><th>時間</th><th>預計餘額</th></tr></thead><tbody>{calculation.result.records.filter(r => r.month % 12 === 0 || r.month === plan.months).map(r => <tr key={r.month}><td>第 {r.month / 12} 年</td><td>{formatMoney(r.today)}</td></tr>)}</tbody></table></details>
        <section className="investment-handoff"><h2>接著看退休生活夠不夠</h2><p>只帶回目前本金、每月投入、報酬、費用與投入調整，不帶回期末金額，避免重複複利。試算年數、領取、物價與單筆加碼不覆蓋退休設定；勞退請在退休頁設定，避免重複加入。退休頁的期間與其他條件不同，帶入建議不代表退休計畫也已達標。</p>
          {calculation.suggested && <button type="button" onClick={() => setConfirm("suggested")}>帶入建議投入 {formatMoney(calculation.monthly!)}／月</button>}
          <button type="button" onClick={() => setConfirm("current")}>{mode === "target" ? `帶入目前輸入 ${formatMoney(holdings.reduce((sum, h) => sum + h.monthlyContributionToday, 0))}／月` : "帶入退休規劃"}</button>
          {confirm && <section aria-label="確認匯入內容" className="investment-import-review"><h3>{confirm === "suggested" ? "即將帶入倒推建議" : "即將帶入目前輸入"}</h3><p>將取代退休頁原有的 {input.investment.holdings.length} 筆投資，其他退休條件不變。</p><p>目前本金合計 {formatMoney(importHoldings.reduce((sum, h) => sum + h.valueNow, 0))}；每月投入合計 {formatMoney(importHoldings.reduce((sum, h) => sum + h.monthlyContributionToday, 0))}。</p><ul>{importHoldings.map((h, i) => <li key={h.id}>第 {i + 1} 筆 {h.name}：本金 {formatMoney(h.valueNow)}、每月投入 {formatMoney(h.monthlyContributionToday)}</li>)}</ul><p>年報酬與費用沿用各筆設定，每月投入每年增加 {(growth * 100).toFixed(1)}%。{lump > 0 && "注意：倒推已考慮單筆加碼，但該筆加碼不會帶入退休頁。"}</p><button type="button" onClick={() => onImport(importHoldings.map(h => ({ ...h })), growth)}>確認取代投資資料</button><button type="button" onClick={() => setConfirm(null)}>取消</button></section>}
        </section>
      </>}
      <p className="section-footnote">計算順序：月初資產計息 → 月底投入／加碼 → 領取。依明細順序領取，前一筆不足才領下一筆，不自動再平衡。不模擬股價波動、匯率與個人稅務。本頁試算修改僅保留至離開或重新整理。</p>
    </section></div>
  </main>;
}
