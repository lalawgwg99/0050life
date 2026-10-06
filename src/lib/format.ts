import { fromSerial } from "../domain/time";

interface DisplaySettings {
  currency: string;
  locale: string;
}

let settings: DisplaySettings = { currency: "TWD", locale: "zh-TW" };

export function setDisplaySettings(next: Partial<DisplaySettings>) {
  settings = { ...settings, ...next };
}

export function getDisplaySettings(): DisplaySettings {
  return settings;
}

export const CURRENCIES = [
  { code: "TWD", label: "TWD 新台幣" },
  { code: "USD", label: "USD 美元" },
  { code: "EUR", label: "EUR 歐元" },
  { code: "JPY", label: "JPY 日圓" },
  { code: "GBP", label: "GBP 英鎊" },
  { code: "CNY", label: "CNY 人民幣" },
  { code: "HKD", label: "HKD 港幣" },
  { code: "SGD", label: "SGD 新加坡幣" },
  { code: "AUD", label: "AUD 澳幣" }
];

export function formatMoney(value: number, currency?: string): string {
  if (!Number.isFinite(value)) return "--";
  const code = currency ?? settings.currency;
  return new Intl.NumberFormat(settings.locale === "en" ? "en-US" : "zh-TW", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

export function formatCompactMoney(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (settings.currency === "TWD" || settings.currency === "CNY") {
    if (Math.abs(value) >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} 千萬`;
    if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000)} 萬`;
    return `${Math.round(value).toLocaleString("zh-TW")}`;
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value).toLocaleString("en-US")}`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(serial: number): string {
  const { year, month } = fromSerial(serial);
  if (settings.locale === "en") return `${MONTH_NAMES_EN[month - 1]} ${year}`;
  return `${year} 年 ${month} 月`;
}
