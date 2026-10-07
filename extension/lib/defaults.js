/* Default plan settings (English-first, global). All money is in the
 * user's chosen currency. Percentages are entered as whole numbers (6 = 6%). */
export const DEFAULTS = {
  currentAge: 35,
  retireAge: 65,
  longevityAge: 90,
  currentSavings: 50000,
  monthlySaving: 1000,
  annualReturn: 6, // before retirement
  retireReturn: 4, // after retirement
  monthlySpending: 3000, // retirement spending, today's money
  monthlyPension: 0, // expected pension / social security, today's money
  inflation: 2,
  currency: "USD",
};

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "TWD", "AUD", "CAD", "SGD", "HKD", "KRW"];

const NUM_KEYS = [
  "currentAge", "retireAge", "longevityAge", "currentSavings",
  "monthlySaving", "annualReturn", "retireReturn",
  "monthlySpending", "monthlyPension", "inflation",
];

/** Merge stored values over defaults and clamp to sane ranges. */
export function sanitize(raw) {
  const p = { ...DEFAULTS, ...(raw || {}) };
  for (const k of NUM_KEYS) {
    const v = Number(p[k]);
    p[k] = Number.isFinite(v) ? v : DEFAULTS[k];
  }
  p.currentAge = clamp(p.currentAge, 18, 100);
  p.retireAge = clamp(p.retireAge, p.currentAge, 100);
  p.longevityAge = clamp(p.longevityAge, p.retireAge, 110);
  p.currentSavings = Math.max(0, p.currentSavings);
  p.monthlySaving = Math.max(0, p.monthlySaving);
  p.annualReturn = clamp(p.annualReturn, -20, 30);
  p.retireReturn = clamp(p.retireReturn, -20, 30);
  p.monthlySpending = Math.max(0, p.monthlySpending);
  p.monthlyPension = Math.max(0, p.monthlyPension);
  p.inflation = clamp(p.inflation, -5, 20);
  if (!CURRENCIES.includes(p.currency)) p.currency = DEFAULTS.currency;
  return p;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
