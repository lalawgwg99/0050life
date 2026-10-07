/* Currency / number formatting helpers. */

export function money(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
  }
}

export function moneyCompact(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return money(value, currency);
  }
}

export function ageText(age) {
  if (age === null || age === undefined) return "—";
  const whole = Math.floor(age);
  const months = Math.round((age - whole) * 12);
  return months >= 12 ? `${whole + 1}` : `${whole}`;
}
