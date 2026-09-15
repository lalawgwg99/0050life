import { effectiveMonthlyRate, growthFactor, netAnnualReturn } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { PlanningInput } from "../domain/types";

export function projectInvestmentAtRetirement(input: PlanningInput): number {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const monthlyReturn = effectiveMonthlyRate(netAnnualReturn(
    input.investment.grossReturnRate,
    input.investment.feeRate
  ));
  let balance = input.investment.assetsNow;

  for (let month = asOf; month < retirementMonth; month += 1) {
    balance *= 1 + monthlyReturn;
    const contribution = input.investment.monthlyContributionToday * growthFactor(
      input.investment.contributionGrowthRate,
      month - asOf
    );
    balance += contribution;
  }

  return balance;
}
