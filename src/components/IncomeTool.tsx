import { useMemo } from "react";
import type { PlanningInput } from "../domain/types";
import { projectPlan } from "../engine/project";
import { buildIncomeRelay } from "../engine/income-relay";
import { formatMoney, formatMonth } from "../lib/format";

export function IncomeTool({ input }: { input: PlanningInput }) {
  const result = useMemo(() => projectPlan(input), [input]);
  const phases = buildIncomeRelay(result);
  return <main className="standalone-tool"><header><span className="eyebrow">0050 Life・退休收入</span><h1>只看退休後有哪些收入</h1><p>這一頁只計算勞保、國保、勞退月領和選用的兼職，不把投資資產算成固定收入。</p></header><section className="tool-notice"><strong>本頁不計算投資餘額</strong><span>一次領也不會自動變成每月收入。</span></section><section className="income-summary"><article><span>退休第一個月每月收入</span><strong>{formatMoney(phases[0]?.income ?? 0)}</strong></article><article><span>收入開始後最多來源</span><strong>{Math.max(0, ...phases.map(p => p.sources.length))} 種</strong></article></section><h2>收入接力</h2><ol className="standalone-list">{phases.map((phase, index) => <li key={phase.start}><div><b>{index + 1}. {phase.sources.length ? phase.sources.join("＋") : "沒有固定收入"}</b><small>{formatMonth(phase.start)}～{formatMonth(phase.end - 1)}</small></div><strong>每月 {formatMoney(phase.income)}</strong><span>生活費不足時，由其他資產補上 {formatMoney(phase.fromAssets)}</span></li>)}</ol><p className="section-footnote">金額為各階段開始時的今天購買力估算。實際資格與核定金額，請以勞保局資料為準。</p></main>;
}
