import { useMemo } from "react";
import type { PlanningInput } from "../domain/types";
import { projectPlan } from "../engine/project";
import { buildIncomeRelay } from "../engine/income-relay";
import { formatMoney, formatMonth } from "../lib/format";
import { useLocale } from "../i18n";

export function IncomeTool({ input }: { input: PlanningInput }) {
  const { t } = useLocale();
  const it = t.incomeTool;
  const ir = t.incomeRelay;
  const result = useMemo(() => projectPlan(input), [input]);
  const phases = buildIncomeRelay(result, { labor: ir.sourceLabor, national: ir.sourceNational, pensionMonthly: ir.sourcePensionMonthly, work: ir.sourceWork });
  return <main className="standalone-tool"><header><span className="eyebrow">{it.eyebrow}</span><h1>{it.title}</h1><p>{it.intro}</p></header><section className="tool-notice"><strong>{it.noticeTitle}</strong><span>{it.noticeBody}</span></section><section className="income-summary"><article><span>{it.firstMonth}</span><strong>{formatMoney(phases[0]?.income ?? 0)}</strong></article><article><span>{it.maxSources}</span><strong>{it.sourceUnit(Math.max(0, ...phases.map(p => p.sources.length)))}</strong></article></section><h2>{it.relayTitle}</h2><ol className="standalone-list">{phases.map((phase, index) => <li key={phase.start}><div><b>{index + 1}. {phase.sources.length ? phase.sources.join(" + ") : it.noIncome}</b><small>{ir.dateRange(formatMonth(phase.start), formatMonth(phase.end - 1))}</small></div><strong>{it.monthlyPrefix}{formatMoney(phase.income)}</strong><span>{it.shortfall(formatMoney(phase.fromAssets))}</span></li>)}</ol><p className="section-footnote">{it.footnote}</p></main>;
}
