import type { PlanningInput } from "./types";
import { birthSerial, monthAtAge, toSerial } from "./time";

export function yearsUntilRetirement(input: PlanningInput): number {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  return Math.max(0, monthAtAge(birth, input.profile.retirementAge) - asOf) / 12;
}

export function laborInsuranceFutureYears(input: PlanningInput): number {
  return input.laborInsurance.futureYearsMode === "until-retirement"
    ? yearsUntilRetirement(input)
    : input.laborInsurance.insuredYearsFuture;
}

export function laborPensionFutureYears(input: PlanningInput): number {
  return input.laborPension.futureYearsMode === "until-retirement"
    ? yearsUntilRetirement(input)
    : input.laborPension.seniorityYearsFuture;
}
