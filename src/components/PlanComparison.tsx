import type { ProjectionResult } from "../domain/types";
import { summarizeResult } from "../engine/result-summary";
import { formatMoney } from "../lib/format";
import { useLocale } from "../i18n";

interface Props {
  current: ProjectionResult;
  saved: ProjectionResult | null;
  onSave: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export function PlanComparison({ current, saved, onSave, onRestore, onClear }: Props) {
  const { t } = useLocale();
  const c = t.comparison;
  const now = summarizeResult(current);
  const before = saved ? summarizeResult(saved) : null;
  const groups = [
    ["profile", c.groupProfile], ["spending", c.groupSpending], ["economy", c.groupEconomy],
    ["laborInsurance", c.groupLabor], ["nationalPension", c.groupNational], ["laborPension", c.groupPension],
    ["investment", c.groupInvestment], ["partTime", c.groupPartTime], ["asOf", c.groupAsOf]
  ] as const;
  const changes = saved ? groups.filter(([key]) => JSON.stringify(saved.input[key]) !== JSON.stringify(current.input[key])).map(([, label]) => label) : [];
  const marginChange = before ? (now.available - now.target) - (before.available - before.target) : 0;
  const contribution = (plan: ProjectionResult) => plan.input.investment.holdings.reduce((sum, holding) => sum + holding.monthlyContributionToday, 0);
  const outcome = (plan: ProjectionResult) => plan.depletedMonth === null ? c.outcomeOk(plan.input.profile.longevityAge) : c.outcomeDepleted(plan.records.find(record => record.month === plan.depletedMonth)?.age.toFixed(1) ?? "");
  return <section className="plan-comparison" aria-label={c.label}>
    <div className="comparison-heading"><div><strong>{c.title}</strong><p>{saved ? c.introSaved : c.introNew}</p></div>
      {!saved && <button type="button" onClick={onSave}>{c.save}</button>}
    </div>
    {saved && before && <>
      <p className="comparison-change">{changes.length ? c.changed(changes.join("、")) : c.unchanged}{changes.length > 0 && (Math.round(marginChange) === 0 ? c.noMarginChange : c.marginChange(marginChange > 0 ? c.better : c.worse, formatMoney(Math.abs(marginChange))))}</p>
      <div className="scenario-table-wrap"><table className="scenario-table"><caption className="sr-only">{c.caption}</caption><thead><tr><th>{c.colItem}</th><th>{c.colBefore}</th><th>{c.colNow}</th></tr></thead><tbody>
        <tr><th>{c.rowAges}</th><td>{c.ageRange(saved.input.profile.retirementAge, saved.input.profile.longevityAge)}</td><td>{c.ageRange(current.input.profile.retirementAge, current.input.profile.longevityAge)}</td></tr>
        <tr><th>{c.rowSpending}</th><td>{formatMoney(saved.input.spending.monthlyToday)}</td><td>{formatMoney(current.input.spending.monthlyToday)}</td></tr>
        <tr><th>{c.rowContribution}</th><td>{formatMoney(contribution(saved))}</td><td>{formatMoney(contribution(current))}</td></tr>
        <tr><th>{c.rowAssets}</th><td>{formatMoney(before.available)}</td><td>{formatMoney(now.available)}</td></tr>
        <tr><th>{c.rowGap}</th><td>{before.meetsPlan ? c.over : c.short} {formatMoney(before.meetsPlan ? before.surplus : before.gap)}</td><td>{now.meetsPlan ? c.over : c.short} {formatMoney(now.meetsPlan ? now.surplus : now.gap)}</td></tr>
        <tr><th>{c.rowOutcome}</th><td>{outcome(saved)}</td><td>{outcome(current)}</td></tr>
      </tbody></table></div>
      <p className="section-footnote">{c.footnote}</p>
      <div className="comparison-actions"><button type="button" onClick={onRestore}>{c.restore}</button><button type="button" onClick={onSave}>{c.recompare}</button><button type="button" onClick={onClear}>{c.clear}</button></div>
    </>}
  </section>;
}
