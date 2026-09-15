import { growthFactor } from "../domain/rates";
import { birthSerial, fromSerial, monthAtAge, toSerial } from "../domain/time";
import type { NationalPensionProjection, PlanningInput } from "../domain/types";
import { TAIWAN_RULES_2026 } from "../rules/taiwan-2026";

export function projectNationalPension(
  input: PlanningInput,
  endMonth: number,
  receivesLaborAnnuity: boolean
): NationalPensionProjection {
  const rules = TAIWAN_RULES_2026.nationalPension;
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const claimMonth = monthAtAge(birth, rules.eligibleAge);
  const enabled = input.nationalPension.enabled && input.nationalPension.insuredYears > 0;
  let monthlyInsuredAmountAtClaim = rules.monthlyInsuredAmount;
  let cpiAtLastAdjustment = 1;
  // The announced monthly insured amount can be adjusted before age 65.
  // Carry those threshold adjustments into the formula used at the claim date.
  for (let month = asOf; month <= claimMonth; month += 1) {
    if (input.nationalPension.indexation === "threshold" && fromSerial(month).month === 5) {
      const currentCpi = growthFactor(input.economy.inflationRate, Math.max(0, month - asOf));
      const cumulativeInflation = currentCpi / cpiAtLastAdjustment - 1;
      if (cumulativeInflation + 1e-12 >= rules.cpiAdjustmentThreshold) {
        monthlyInsuredAmountAtClaim *= 1 + cumulativeInflation;
        cpiAtLastAdjustment = currentCpi;
      }
    }
  }
  const formulaAAmountNominal = monthlyInsuredAmountAtClaim * input.nationalPension.insuredYears * rules.formulaARate
    + rules.formulaAAddition;
  const formulaBAmountNominal = monthlyInsuredAmountAtClaim * input.nationalPension.insuredYears * rules.formulaBRate;
  const aFormulaEligible = enabled && input.nationalPension.aFormulaEligible && !receivesLaborAnnuity;
  const useFormulaA = aFormulaEligible && formulaAAmountNominal >= formulaBAmountNominal;
  const formulaUsed = enabled ? (useFormulaA ? "A" : "B") : "none";
  const initialMonthlyNominal = enabled
    ? (formulaUsed === "A" ? formulaAAmountNominal : formulaBAmountNominal)
    : 0;
  const events = new Map<number, number>();

  if (enabled) {
    let currentBenefit = initialMonthlyNominal;
    let benefitCpiAtLastAdjustment = growthFactor(input.economy.inflationRate, Math.max(0, claimMonth - asOf));

    for (let month = claimMonth; month < endMonth; month += 1) {
      if (input.nationalPension.indexation === "threshold" && fromSerial(month).month === 5) {
        const currentCpi = growthFactor(input.economy.inflationRate, Math.max(0, month - asOf));
        const cumulativeInflation = currentCpi / benefitCpiAtLastAdjustment - 1;
        if (cumulativeInflation + 1e-12 >= rules.cpiAdjustmentThreshold) {
          currentBenefit *= 1 + cumulativeInflation;
          benefitCpiAtLastAdjustment = currentCpi;
        }
      }
      events.set(month, currentBenefit);
    }
  }

  return {
    enabled,
    claimMonth,
    insuredYears: input.nationalPension.insuredYears,
    formulaUsed,
    aFormulaEligible,
    initialMonthlyNominal,
    formulaAAmountNominal,
    formulaBAmountNominal,
    events,
    ruleVersion: TAIWAN_RULES_2026.version
  };
}
