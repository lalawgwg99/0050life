import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { detectLocale, LOCALE_STORAGE_KEY } from "./types";
import type { Locale } from "./types";
import { zhTW } from "./zh-TW";
import type { Strings } from "./zh-TW";
import { en } from "./en";

const DICTS: Record<Locale, Strings> = { "zh-TW": zhTW, en };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Strings;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh-TW",
  setLocale: () => {},
  t: zhTW
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = next === "en" ? "en" : "zh-Hant";
  }, []);
  const value = useMemo(
    () => ({ locale, setLocale, t: DICTS[locale] }),
    [locale, setLocale]
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
