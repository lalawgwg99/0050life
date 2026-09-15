import { effectiveMonthlyRate, growthFactor, netAnnualReturn } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { InvestmentHoldingProjection, PlanningInput } from "../domain/types";

export function projectInvestmentHoldingsAtRetirement(input: PlanningInput): InvestmentHoldingProjection[] {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const balances = input.investment.holdings.map((holding) => ({
    id: holding.id,
    name: holding.name,
    balance: holding.valueNow,
    monthlyContributionToday: holding.monthlyContributionToday,
    monthlyReturn: effectiveMonthlyRate(netAnnualReturn(holding.grossReturnRate, holding.feeRate))
  }));

  for (let month = asOf; month < retirementMonth; month += 1) {
    const contributionGrowth = growthFactor(input.investment.contributionGrowthRate, month - asOf);
    for (const holding of balances) {
      holding.balance *= 1 + holding.monthlyReturn;
      holding.balance += holding.monthlyContributionToday * contributionGrowth;
    }
  }

  return balances.map(({ id, name, balance }) => ({ id, name, projectedValueNominal: balance }));
}

export function projectInvestmentAtRetirement(input: PlanningInput): number {
  return projectInvestmentHoldingsAtRetirement(input)
    .reduce((sum, holding) => sum + holding.projectedValueNominal, 0);
}
