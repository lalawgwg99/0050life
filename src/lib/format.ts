import { fromSerial } from "../domain/time";

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

export function formatCompactMoney(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} 千萬`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000)} 萬`;
  return `${Math.round(value).toLocaleString("zh-TW")}`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMonth(serial: number): string {
  const { year, month } = fromSerial(serial);
  return `${year} 年 ${month} 月`;
}
