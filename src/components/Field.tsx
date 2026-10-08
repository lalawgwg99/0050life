import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { useLocale } from "../i18n";

interface FieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: ReactNode;
}

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value)) return value;
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rounded = Math.round(value / step) * step;
  return Number(rounded.toFixed(decimals));
}

export function Field({ label, value, onChange, suffix, min, max, step = 1, hint }: FieldProps) {
  const { t } = useLocale();
  const clamp = (next: number): number => {
    let result = next;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };
  const nudge = (direction: 1 | -1) => {
    const base = Number.isFinite(value) ? value : (min ?? 0);
    onChange(clamp(roundToStep(base + direction * step, step)));
  };
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control has-stepper">
        <button type="button" className="stepper-button" onClick={(event) => { event.preventDefault(); nudge(-1); }} aria-label={t.common.stepDown(label)} tabIndex={-1}><Minus aria-hidden="true" /></button>
        <input
          type="number"
          inputMode={step < 1 ? "decimal" : "numeric"}
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
        />
        <button type="button" className="stepper-button" onClick={(event) => { event.preventDefault(); nudge(1); }} aria-label={t.common.stepUp(label)} tabIndex={-1}><Plus aria-hidden="true" /></button>
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
