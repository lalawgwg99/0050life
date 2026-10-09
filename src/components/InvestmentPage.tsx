import { useEffect, useMemo, useState } from "react";
import type { PlanningInput } from "../domain/types";
import { applyMonthlyInvestment, calculateInvestment, solveMonthlyInvestment } from "../engine/investment-tool";
import { formatMoney } from "../lib/format";
import { toSerial } from "../domain/time";
import { useLocale } from "../i18n";

export function InvestmentPage({ input, onImport }: { input: PlanningInput; onImport: (holdings: PlanningInput["investment"]["holdings"], growth: number) => void }) {
  const { t } = useLocale();
  const it = t.investTool;
  const [holdings, setHoldings] = useState(() => input.investment.holdings.length ? input.investment.holdings.map(h => ({ ...h })) : [{ id: "first", name: it.defaultHolding, valueNow: 0, monthlyContributionToday: 0, grossReturnRate: 0.05, feeRate: 0 }]);
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
      const result = calculateInvestment(plan, 0, it);
      const suggested = mode === "target" ? applyMonthlyInvestment(holdings, solveMonthlyInvestment(plan, target, it), it) : null;
      return { result, scenarios: [-0.02, 0, 0.02].map(delta => calculateInvestment(plan, delta, it)), suggested, monthly: suggested?.reduce((sum, h) => sum + h.monthlyContributionToday, 0) ?? null };
    } catch (error) { return { error: error instanceof Error ? error.message : it.checkInput }; }
  }, [holdings, years, inflation, growth, lump, lumpDate, mode, target, withdrawal]);
  const importHoldings = confirm === "suggested" && !("error" in calculation) ? calculation.suggested ?? holdings : holdings;
  const field = (label: string, value: number, change: (value: number) => void, step = 1000) => <label className="investment-field">{label}<input type="number" value={Number.isFinite(value) ? value : ""} step={step} onChange={e => change(e.target.value === "" ? NaN : Number(e.target.value))} /></label>;
  return <main className="investment-page">
    <header><span className="eyebrow">{it.eyebrow}</span><h1>{it.title}</h1><p>{it.intro}</p></header>
    <div className="investment-modes" role="group" aria-label={it.modesLabel}>{[["grow", it.modeGrow], ["target", it.modeTarget], ["draw", it.modeDraw]].map(([key, name]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{name}</button>)}</div>
    <button type="button" className="investment-result-jump" onClick={() => document.getElementById("investment-result")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{it.jumpToResult}</button>
    <div className="investment-layout"><section aria-label={it.conditionsLabel}>
      {field(it.years, years, setYears, 1)}
      {mode === "target" && field(it.targetAmount, target, setTarget)}
      {mode === "draw" && <>{field(it.monthlyWithdrawal, withdrawal, setWithdrawal)}<p>{it.drawNote}</p></>}
      {holdings.map((h, index) => <fieldset key={h.id}><legend>{it.holdingLegend(index + 1)}</legend>
        <label className="investment-field">{it.nameLabel}<input value={h.name} onChange={e => setHoldings(holdings.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} /></label>
        {([["valueNow", it.valueNow, 1000], ["monthlyContributionToday", it.monthly, 1000], ["grossReturnRate", it.returnAssumption, 0.5] ] as const).map(([key, label, step]) => <div key={key}>{field(label, h[key] * (key === "grossReturnRate" ? 100 : 1), value => setHoldings(holdings.map((item, i) => i === index ? { ...item, [key]: value / (key === "grossReturnRate" ? 100 : 1) } : item)), step)}</div>)}
        <details><summary>{it.feeSummary}</summary>{field(it.yearlyFee, h.feeRate * 100, value => setHoldings(holdings.map((item, i) => i === index ? { ...item, feeRate: value / 100 } : item)), 0.1)}<p>{it.feeNote}</p></details>
        {holdings.length > 1 && <button type="button" onClick={() => setHoldings(holdings.filter((_, i) => i !== index))}>{it.removeHolding}</button>}
      </fieldset>)}
      <button type="button" onClick={() => setHoldings([...holdings, { id: crypto.randomUUID(), name: it.newHoldingName, valueNow: 0, monthlyContributionToday: 0, grossReturnRate: 0.05, feeRate: 0 }])}>{it.addHolding}</button>
      <details className="result-details"><summary>{it.adjustSummary}</summary>
        {field(it.inflation, inflation * 100, value => setInflation(value / 100), 0.5)}
        {field(it.growth, growth * 100, value => setGrowth(value / 100), 0.5)}
        {field(it.lumpAmount, lump, setLump)}
        {lump > 0 && <label className="investment-field">{it.lumpDate}<input type="month" value={lumpDate} onChange={e => setLumpDate(e.target.value)} /></label>}
        <p>{it.lumpNote}</p>
      </details>
    </section><section id="investment-result" aria-label={it.resultLabel} aria-live="polite">
      {"error" in calculation ? <p role="alert">{calculation.error}</p> : <>
        <div className="investment-answer"><span>{it.answerPrefix(years)}</span><h2>{formatMoney(calculation.result.final.today)}</h2><p>{it.answerNote}</p>
          {calculation.monthly !== null && <><p><strong>{it.reachTarget(formatMoney(calculation.monthly))}</strong><br />{it.reachTargetNote}</p><button type="button" onClick={() => setHoldings(calculation.suggested!)}>{it.applySuggestion}</button><p>{it.applySuggestionNote}</p></>}
          {mode === "draw" && <p>{calculation.result.depletedMonth === null ? it.drawOk : it.drawShort(calculation.result.depletedMonth)}</p>}
        </div>
        <h2>{it.scenarioTitle}</h2><div className="investment-scenarios">{calculation.scenarios.map((s, i) => <article key={i}><span>{[it.scenarioLow, it.scenarioBase, it.scenarioHigh][i]}</span><strong>{formatMoney(s.final.today)}</strong>{mode === "draw" && <small>{s.depletedMonth ? it.scenarioDrawShort(s.depletedMonth) : it.scenarioDrawOk}</small>}</article>)}</div>
        <p>{it.scenarioNote}</p>
        <details className="result-details"><summary>{it.splitSummary}</summary><p>{it.splitNote}</p><dl><dt>{it.principal}</dt><dd>{formatMoney(calculation.result.final.principal)}</dd><dt>{it.gain}</dt><dd>{formatMoney(calculation.result.final.gain)}</dd><dt>{it.withdrawn}</dt><dd>{formatMoney(calculation.result.withdrawn)}</dd><dt>{it.finalBalance}</dt><dd>{formatMoney(calculation.result.final.nominal)}</dd></dl><p>{it.splitFormula}</p></details>
        <details className="result-details"><summary>{it.yearlySummary}</summary><table className="scenario-table"><thead><tr><th>{it.colTime}</th><th>{it.colBalance}</th></tr></thead><tbody>{calculation.result.records.filter(r => r.month % 12 === 0 || r.month === plan.months).map(r => <tr key={r.month}><td>{it.yearRow(r.month / 12)}</td><td>{formatMoney(r.today)}</td></tr>)}</tbody></table></details>
        <section className="investment-handoff"><h2>{it.handoffTitle}</h2><p>{it.handoffNote}</p>
          {calculation.suggested && <button type="button" onClick={() => setConfirm("suggested")}>{it.importSuggested(formatMoney(calculation.monthly!))}</button>}
          <button type="button" onClick={() => setConfirm("current")}>{mode === "target" ? it.importCurrent(formatMoney(holdings.reduce((sum, h) => sum + h.monthlyContributionToday, 0))) : it.importPlan}</button>
          {confirm && <section aria-label={it.confirmLabel} className="investment-import-review"><h3>{confirm === "suggested" ? it.confirmSuggested : it.confirmCurrent}</h3><p>{it.confirmReplace(input.investment.holdings.length)}</p><p>{it.confirmTotals(formatMoney(importHoldings.reduce((sum, h) => sum + h.valueNow, 0)), formatMoney(importHoldings.reduce((sum, h) => sum + h.monthlyContributionToday, 0)))}</p><ul>{importHoldings.map((h, i) => <li key={h.id}>{it.confirmRow(i + 1, h.name, formatMoney(h.valueNow), formatMoney(h.monthlyContributionToday))}</li>)}</ul><p>{it.confirmGrowth((growth * 100).toFixed(1))}{lump > 0 && it.confirmLumpNote}</p><button type="button" onClick={() => onImport(importHoldings.map(h => ({ ...h })), growth)}>{it.confirmImport}</button><button type="button" onClick={() => setConfirm(null)}>{it.cancel}</button></section>}
        </section>
      </>}
      <p className="section-footnote">{it.footnote}</p>
    </section></div>
  </main>;
}
