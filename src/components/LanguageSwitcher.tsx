import { LOCALES } from "../i18n/types";
import { useLocale } from "../i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className="language-switcher" aria-label={t.app.languageLabel} title={t.app.languageLabel}>
      <span className="language-switcher-label" aria-hidden="true">{t.app.languageLabel}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        aria-label={t.app.languageLabel}
      >
        {LOCALES.map((item) => (
          <option key={item.code} value={item.code}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}
