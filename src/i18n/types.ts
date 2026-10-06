export type Locale = "zh-TW" | "en";

export const LOCALES: Array<{ code: Locale; label: string; shortLabel: string }> = [
  { code: "zh-TW", label: "繁體中文", shortLabel: "中文" },
  { code: "en", label: "English", shortLabel: "EN" }
];

export const LOCALE_STORAGE_KEY = "0050life-locale";

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "en" || saved === "zh-TW") return saved;
  } catch {
    // ignore storage errors
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  if (nav.startsWith("en")) return "en";
  return "zh-TW";
}
