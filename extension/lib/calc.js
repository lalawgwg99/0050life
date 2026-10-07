/* Simplified retirement projection (monthly steps, nominal money).
 *
 * Accumulation: current savings compound at `annualReturn`, monthly
 * contributions added, until retireAge.
 * Decumulation: balance compounds at `retireReturn`, each month pays
 * (monthlySpending - monthlyPension) inflated from today, until longevityAge.
 * The first month the balance can't cover the need is the depletion month.
 * `required` = starting balance at retirement that would last exactly to
 * longevityAge (binary search). Progress = projected / required.
 *
 * This is a deliberately simple model: constant returns, constant
 * inflation, no taxes/fees/glide-path. It is an estimate, not advice.
 */

const monthlyRate = (annualPct) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

export function projectPlan(p) {
  const rAcc = monthlyRate(p.annualReturn);
  const rRet = monthlyRate(p.retireReturn);
  const rInf = monthlyRate(p.inflation);

  const monthsToRetire = Math.max(0, Math.round((p.retireAge - p.currentAge) * 12));
  const monthsRetired = Math.max(0, Math.round((p.longevityAge - p.retireAge) * 12));

  // --- accumulation ---
  let balance = p.currentSavings;
  for (let i = 0; i < monthsToRetire; i++) {
    balance = balance * (1 + rAcc) + p.monthlySaving;
  }
  const atRetirement = Math.max(0, balance);

  // monthly need at retired-month i, inflated from today
  const needAt = (i) => {
    const infl = Math.pow(1 + rInf, monthsToRetire + i);
    return Math.max(0, (p.monthlySpending - p.monthlyPension) * infl);
  };

  // --- decumulation with projected balance: find depletion month ---
  let depletedMonth = null;
  {
    let b = atRetirement;
    for (let i = 0; i < monthsRetired; i++) {
      b = b * (1 + rRet) - needAt(i);
      if (b < 0) {
        depletedMonth = i;
        break;
      }
    }
  }

  // --- required balance at retirement to last through longevityAge ---
  const lastsTo = (start) => {
    let b = start;
    for (let i = 0; i < monthsRetired; i++) {
      b = b * (1 + rRet) - needAt(i);
      if (b < 0) return false;
    }
    return true;
  };

  let required = 0;
  const totalNeed = monthsRetired > 0 ? needAt(monthsRetired - 1) * monthsRetired : 0;
  if (totalNeed > 0) {
    let lo = 0;
    let hi = Math.max(atRetirement * 4, totalNeed, 1);
    let guard = 0;
    while (!lastsTo(hi) && guard++ < 60) hi *= 2;
    for (let k = 0; k < 64; k++) {
      const mid = (lo + hi) / 2;
      if (lastsTo(mid)) hi = mid;
      else lo = mid;
    }
    required = hi;
  }

  const funded = depletedMonth === null;
  const depletionAge = funded ? null : p.retireAge + depletedMonth / 12;
  const progress = required > 0 ? Math.min(1, atRetirement / required) : 1;
  const gap = Math.max(0, required - atRetirement);

  return {
    atRetirement,
    required,
    progress,
    gap,
    funded,
    depletionAge,
    monthsToRetire,
    yearsToRetire: monthsToRetire / 12,
  };
}
