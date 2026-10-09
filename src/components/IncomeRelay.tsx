import type { ProjectionResult } from "../domain/types";
import { buildIncomeRelay } from "../engine/income-relay";
import { formatMoney, formatMonth } from "../lib/format";
import { useLocale } from "../i18n";

export function IncomeRelay({ result }: { result: ProjectionResult }) {
  const { t } = useLocale();
  const ir = t.incomeRelay;
  const phases = buildIncomeRelay(result, { labor: ir.sourceLabor, national: ir.sourceNational, pensionMonthly: ir.sourcePensionMonthly, work: ir.sourceWork });
  return <section className="result-section income-relay" aria-label={ir.label}>
    <div className="result-heading"><div><span>{ir.eyebrow}</span><h2>{ir.title}</h2></div></div>
    <p className="section-footnote">{ir.footnote}</p>
    <ol className="relay-list">{phases.map((phase, index) => <li key={phase.start}>
      <div className="relay-stage"><span className="relay-number" aria-hidden="true">{index + 1}</span><div><strong>{phase.sources.length ? phase.sources.join(" + ") : ir.ownAssets}</strong><p>{formatMonth(phase.start)}～{formatMonth(phase.end - 1)}</p>{phase.care && <small>{ir.careNote}</small>}</div></div>
      <dl><div><dt>{ir.monthlyExpense}</dt><dd>{formatMoney(phase.expense)}</dd></div><div><dt>{ir.monthlyIncome}</dt><dd>{formatMoney(phase.income)}</dd></div><div><dt>{ir.fromAssets}</dt><dd>{formatMoney(phase.fromAssets)}</dd></div></dl>
      {result.input.laborPension.mode === "lump" && result.laborPension.claimMonth >= phase.start && result.laborPension.claimMonth < phase.end && <p className="section-footnote">{ir.pensionLumpNote(formatMonth(result.laborPension.claimMonth))}</p>}
      {!result.laborInsurance.eligibleForAnnuity && result.laborInsurance.lumpSumNominal > 0 && result.laborInsurance.claimMonth >= phase.start && result.laborInsurance.claimMonth < phase.end && <p className="section-footnote">{ir.laborLumpNote(formatMonth(result.laborInsurance.claimMonth))}</p>}
    </li>)}</ol>
    <p className="section-footnote">{ir.closing}</p>
  </section>;
}
