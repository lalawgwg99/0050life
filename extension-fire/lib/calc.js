/* FI countdown math — monthly simulation in today's money.
 *
 * FI number = annualSpending / withdrawalRate (the 4% rule: 25x spending).
 * Each month the portfolio compounds at the real return and monthlySaving
 * is added, until it reaches the FI number. Years-to-FI is the month count
 * divided by 12. This is the standard FI simplification: constant real
 * return, no taxes/fees. An estimate, not advice.
 */

const MAX_MONTHS = 1200; // 100 years — beyond this we call it "not on track"

function monthsToFI(p, extraMonthly = 0) {
  const fiNumber = p.annualSpending / (p.withdrawalRate / 100);
  if (!(fiNumber > 0)) return { months: 0, fiNumber: 0 };
  if (p.netWorth >= fiNumber) return { months: 0, fiNumber };
  const r = Math.pow(1 + p.realReturn / 100, 1 / 12) - 1;
  const save = p.monthlySaving + extraMonthly;
  let balance = p.netWorth;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    balance = balance * (1 + r) + save;
    if (balance >= fiNumber) return { months: m, fiNumber };
  }
  return { months: null, fiNumber }; // not reachable within 100 years
}

export function projectFI(p) {
  const { months, fiNumber } = monthsToFI(p);
  const alreadyFI = p.netWorth >= fiNumber && fiNumber > 0;
  const yearsToFI = months === null ? null : months / 12;
  const progress = fiNumber > 0 ? Math.min(1, p.netWorth / fiNumber) : 1;

  const annualSaving = p.monthlySaving * 12;
  const impliedIncome = annualSaving + p.annualSpending;
  const savingsRate = impliedIncome > 0 ? annualSaving / impliedIncome : 0;

  // What would an extra $200/mo buy? (for the motivational tip)
  let yearsSavedByBoost = 0;
  if (!alreadyFI && months !== null) {
    const boosted = monthsToFI(p, 200);
    if (boosted.months !== null) yearsSavedByBoost = months / 12 - boosted.months / 12;
  }

  return {
    fiNumber,
    progress,
    alreadyFI,
    yearsToFI,
    savingsRate,
    yearsSavedByBoost,
  };
}
