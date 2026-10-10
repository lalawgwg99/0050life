import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { ageAtMonth, birthSerial, monthAtAge, toSerial } from "../domain/time";
import { realValue } from "../domain/rates";
import type { PlanningInput, ProjectionResult } from "../domain/types";
import { summarizeResult } from "../engine/result-summary";
import { formatMoney } from "../lib/format";
import { isQuickInputComplete, type QuickInput } from "../domain/quick-calc";
import { Field } from "./Field";
import { useLocale } from "../i18n";

interface QuickCalcProps {
  quick: QuickInput;
  onChange: (quick: QuickInput) => void;
  /** 以快算映射後的有效輸入算出的結果（App 層已算好，直接沿用） */
  result: ProjectionResult | null;
  calcError: string | null;
  onExpand: () => void;
}

export function QuickCalc({ quick, onChange, result, calcError, onExpand }: QuickCalcProps) {
  const { t } = useLocale();
  const q = t.quick;
  const u = t.common.units;
  const set = (patch: Partial<QuickInput>) => onChange({ ...quick, ...patch });
  const complete = isQuickInputComplete(quick);

  let answer: { ok: boolean; title: string; sub: string } | null = null;
  if (result) {
    const input: PlanningInput = result.input;
    const asOf = toSerial(input.asOf.year, input.asOf.month);
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
    const toToday = (amount: number, month: number) => realValue(amount, input.economy.inflationRate, month - asOf);
    const summary = summarizeResult(result);
    if (result.depletedMonth !== null) {
      const depletedAge = ageAtMonth(birth, result.depletedMonth);
      answer = {
        ok: false,
        title: q.depleted(depletedAge.toFixed(0)),
        sub: q.depletedSub(formatMoney(toToday(result.projectedRetirementAssetsAtRetirement, retirementMonth)))
      };
    } else {
      answer = {
        ok: true,
        title: q.ok(input.profile.longevityAge.toFixed(0)),
        sub: q.okSub(formatMoney(summary.surplus))
      };
    }
  }

  return (
    <div className="quick-calc">
      <div className="quick-intro">
        <span className="eyebrow">{q.eyebrow}</span>
        <h2>{q.title}</h2>
        <p>{q.intro}</p>
      </div>

      <div className="field-grid two">
        <Field label={q.currentAge} value={quick.currentAge} onChange={(v) => set({ currentAge: v })} suffix={u.age} min={18} max={100} step={1} />
        <Field label={q.retirementAge} value={quick.retirementAge} onChange={(v) => set({ retirementAge: v })} suffix={u.age} min={quick.currentAge + 1} max={100} step={1} />
        <Field label={q.savings} value={quick.savings} onChange={(v) => set({ savings: v })} suffix={u.money} min={0} step={10000} />
        <Field label={q.monthlyInvestment} value={quick.monthlyInvestment} onChange={(v) => set({ monthlyInvestment: v })} suffix={`${u.money}/${u.month}`} min={0} step={1000} />
        <Field label={q.monthlySpending} value={quick.monthlySpending} onChange={(v) => set({ monthlySpending: v })} suffix={`${u.money}/${u.month}`} min={0} step={1000} />
        <Field label={q.returnRate} value={quick.returnRatePercent} onChange={(v) => set({ returnRatePercent: v })} suffix={u.percent} min={-20} max={30} step={0.5} />
      </div>

      <div className="quick-answer" aria-live="polite">
        {!complete ? (
          <p className="quick-hint">{q.needAll}</p>
        ) : calcError ? (
          <p className="quick-hint" role="alert">{calcError}</p>
        ) : answer ? (
          <>
            <div className={`quick-status ${answer.ok ? "good" : "attention"}`}>
              {answer.ok ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
            </div>
            <strong className="quick-headline">{answer.title}</strong>
            <span className="quick-sub">{answer.sub}</span>
          </>
        ) : null}
      </div>

      <button type="button" className="step-button primary quick-expand" onClick={onExpand}>
        {q.expand} <ArrowRight aria-hidden="true" />
      </button>
      <p className="quick-expand-note">{q.expandNote}</p>
      <p className="quick-footnote">{q.footnote}</p>
    </div>
  );
}
