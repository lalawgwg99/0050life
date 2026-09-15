import { effectiveMonthlyRate, growthFactor } from "../domain/rates";
import { birthSerial, fromSerial, monthAtAge, toSerial } from "../domain/time";
import type { LaborInsuranceProjection, PlanningInput } from "../domain/types";
import { laborInsuranceFutureYears } from "../domain/coverage";
import { laborInsuranceNormalAge, TAIWAN_RULES_2026 } from "../rules/taiwan-2026";

export function projectLaborInsurance(input: PlanningInput, endMonth: number): LaborInsuranceProjection {
  const rules = TAIWAN_RULES_2026.laborInsurance;
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const claimMonth = monthAtAge(birth, input.laborInsurance.claimAge);
  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  const insuredYearsAtClaim = input.laborInsurance.insuredYearsNow + laborInsuranceFutureYears(input);
  const salaryAtClaim = input.laborInsurance.averageSalaryToday * growthFactor(
    input.laborInsurance.salaryGrowthRate,
    Math.max(0, claimMonth - asOf)
  );
  const adjustmentYears = Math.max(-5, Math.min(5, input.laborInsurance.claimAge - normalAge));
  const baseBenefit = Math.max(
    salaryAtClaim * insuredYearsAtClaim * rules.formulaOneRate + rules.formulaOneAddition,
    salaryAtClaim * insuredYearsAtClaim * rules.formulaTwoRate
  );
  const combinedYears = insuredYearsAtClaim + (input.nationalPension.enabled ? input.nationalPension.insuredYears : 0);
  const eligibleByCombinedYears = input.laborInsurance.claimAge >= TAIWAN_RULES_2026.nationalPension.eligibleAge
    && insuredYearsAtClaim > 0
    && insuredYearsAtClaim < rules.minimumAnnuityYears
    && combinedYears >= rules.minimumAnnuityYears;
  const eligibleForAnnuity = insuredYearsAtClaim >= rules.minimumAnnuityYears || eligibleByCombinedYears;
  const adjustment = eligibleByCombinedYears ? 1 : 1 + adjustmentYears * rules.earlyLateRatePerYear;
  const initialMonthlyNominal = eligibleForAnnuity ? baseBenefit * adjustment : 0;
  const lumpSumNominal = eligibleForAnnuity ? 0 : salaryAtClaim * insuredYearsAtClaim;
  const events = new Map<number, number>();

  if (!eligibleForAnnuity) {
    if (claimMonth < endMonth) events.set(claimMonth, lumpSumNominal);
  } else {
    let currentBenefit = initialMonthlyNominal;
    let cpiAtLastAdjustment = growthFactor(input.economy.inflationRate, Math.max(0, claimMonth - asOf));

    for (let month = claimMonth; month < endMonth; month += 1) {
      if (input.laborInsurance.indexation === "threshold" && fromSerial(month).month === 5) {
        const currentCpi = growthFactor(input.economy.inflationRate, Math.max(0, month - asOf));
        const cumulativeInflation = currentCpi / cpiAtLastAdjustment - 1;
        if (cumulativeInflation + 1e-12 >= rules.cpiAdjustmentThreshold) {
          currentBenefit *= 1 + cumulativeInflation;
          cpiAtLastAdjustment = currentCpi;
        }
      }
      events.set(month, currentBenefit);
    }
  }

  effectiveMonthlyRate(input.economy.inflationRate);

  return {
    eligibleForAnnuity,
    eligibleByCombinedYears,
    normalAge,
    minimumClaimAge: normalAge - 5,
    claimMonth,
    insuredYearsAtClaim,
    initialMonthlyNominal,
    lumpSumNominal,
    events,
    ruleVersion: TAIWAN_RULES_2026.version
  };
}
