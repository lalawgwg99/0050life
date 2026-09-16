import type { ProjectionResult } from "../domain/types";
import { buildIncomeRelay } from "../engine/income-relay";
import { formatMoney, formatMonth } from "../lib/format";

export function IncomeRelay({ result }: { result: ProjectionResult }) {
  const phases = buildIncomeRelay(result);
  return <section className="result-section income-relay" aria-label="收入接力表">
    <div className="result-heading"><div><span>收入怎麼接上</span><h2>退休後，各階段靠哪些錢生活</h2></div></div>
    <p className="section-footnote">金額為每個階段開始時的每月估算，換算成今天的錢。期間內仍會隨物價、收入調整而變動。</p>
    <ol className="relay-list">{phases.map((phase, index) => <li key={phase.start}>
      <div className="relay-stage"><span className="relay-number" aria-hidden="true">{index + 1}</span><div><strong>{phase.sources.length ? phase.sources.join("＋") : "先靠自己的資產"}</strong><p>{formatMonth(phase.start)}～{formatMonth(phase.end - 1)}</p>{phase.care && <small>已加入長照預算</small>}</div></div>
      <dl><div><dt>每月支出</dt><dd>{formatMoney(phase.expense)}</dd></div><div><dt>每月可用收入</dt><dd>{formatMoney(phase.income)}</dd></div><div><dt>需由資產支應</dt><dd>{formatMoney(phase.fromAssets)}</dd></div></dl>
      {result.input.laborPension.mode === "lump" && result.laborPension.claimMonth >= phase.start && result.laborPension.claimMonth < phase.end && <p className="section-footnote">{formatMonth(result.laborPension.claimMonth)} 領取勞退一次金，按設定分入投資與保留現金。</p>}
      {!result.laborInsurance.eligibleForAnnuity && result.laborInsurance.lumpSumNominal > 0 && result.laborInsurance.claimMonth >= phase.start && result.laborInsurance.claimMonth < phase.end && <p className="section-footnote">{formatMonth(result.laborInsurance.claimMonth)} 領取勞保一次金，加入保留現金。</p>}
    </li>)}</ol>
    <p className="section-footnote">「需由資產支應」是生活費的來源分配，能否付得出來請看上方總結及壓力測試。</p>
  </section>;
}
