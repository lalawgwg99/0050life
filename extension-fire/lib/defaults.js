/* Default plan settings. Money is in the user's chosen currency.
 * Percentages are whole numbers (5 = 5%). All math is done in today's
 * money using a real (inflation-adjusted) return. */
export const DEFAULTS = {
  netWorth: 100000,
  monthlySaving: 2000,
  annualSpending: 40000,
  realReturn: 5,
  withdrawalRate: 4,
  currency: "USD",
};

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "TWD", "AUD", "CAD", "SGD", "HKD", "KRW"];

const NUM_KEYS = ["netWorth", "monthlySaving", "annualSpending", "realReturn", "withdrawalRate"];

export function sanitize(raw) {
  const p = { ...DEFAULTS, ...(raw || {}) };
  for (const k of NUM_KEYS) {
    const v = Number(p[k]);
    p[k] = Number.isFinite(v) ? v : DEFAULTS[k];
  }
  p.netWorth = Math.max(0, p.netWorth);
  p.monthlySaving = Math.max(0, p.monthlySaving);
  p.annualSpending = Math.max(0, p.annualSpending);
  p.realReturn = clamp(p.realReturn, -20, 30);
  p.withdrawalRate = clamp(p.withdrawalRate, 0.5, 20);
  if (!CURRENCIES.includes(p.currency)) p.currency = DEFAULTS.currency;
  return p;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
