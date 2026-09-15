import type { ReactNode } from "react";

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

export function Field({ label, value, onChange, suffix, min, max, step = 1, hint }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          type="number"
          inputMode={step < 1 ? "decimal" : "numeric"}
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
