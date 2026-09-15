import { effectiveMonthlyRate, growthFactor, netAnnualReturn } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { PlanningInput, ProjectionResult } from "../domain/types";
import { simulateRetirement } from "./simulate";

function holdingContributionFactor(input: PlanningInput, holding: PlanningInput["investment"]["holdings"][number]): number {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const monthlyReturn = effectiveMonthlyRate(netAnnualReturn(
    holding.grossReturnRate,
    holding.feeRate
  ));
  let factor = 0;
  for (let month = asOf; month < retirementMonth; month += 1) {
    factor = factor * (1 + monthlyReturn) + growthFactor(input.investment.contributionGrowthRate, month - asOf);
  }
  return factor;
}

export function additionalContributionWeights(input: PlanningInput): number[] {
  const holdings = input.investment.holdings;
  if (holdings.length === 0) return [];
  const contributions = holdings.map((holding) => Math.max(0, holding.monthlyContributionToday));
  const contributionTotal = contributions.reduce((sum, value) => sum + value, 0);
  if (contributionTotal > 0) return contributions.map((value) => value / contributionTotal);
  const balances = holdings.map((holding) => Math.max(0, holding.valueNow));
  const balanceTotal = balances.reduce((sum, value) => sum + value, 0);
  if (balanceTotal > 0) return balances.map((value) => value / balanceTotal);
  return holdings.map((_, index) => index === 0 ? 1 : 0);
}

/** Keep the suggested monthly amount in whole hundreds while preserving its total. */
export function allocateMonthlyAmount(amount: number, weights: number[]): number[] {
  if (weights.length === 0 || !Number.isFinite(amount) || amount <= 0) return weights.map(() => 0);
  const totalUnits = Math.max(0, Math.round(amount / 100));
  const positiveWeights = weights.map((weight) => Math.max(0, Number.isFinite(weight) ? weight : 0));
  const weightTotal = positiveWeights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) return positiveWeights.map((_, index) => index === 0 ? totalUnits * 100 : 0);

  const rawUnits = positiveWeights.map((weight) => totalUnits * weight / weightTotal);
  const units = rawUnits.map(Math.floor);
  let remaining = totalUnits - units.reduce((sum, value) => sum + value, 0);
  const order = rawUnits
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction)
    .map(({ index }) => index);
  let cursor = 0;
  while (remaining > 0 && order.length > 0) {
    units[order[cursor % order.length]] += 1;
    remaining -= 1;
    cursor += 1;
  }
  return units.map((unit) => unit * 100);
}

export function estimateAdditionalMonthlyInvestment(input: PlanningInput, result: ProjectionResult): number {
  const gap = Math.max(0, result.requiredInvestmentAtRetirement - result.projectedInvestmentAtRetirement);
  if (gap <= 0) return 0;

  const weights = additionalContributionWeights(input);
  const factors = input.investment.holdings.map((holding) => holdingContributionFactor(input, holding));
  const factor = factors.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0);
  return factor > 0 ? gap / factor : gap;
}

export function estimateAffordableMonthlySpending(input: PlanningInput, result: ProjectionResult): number {
  if (result.depletedMonth === null) return input.spending.monthlyToday;
  let low = 0;
  let high = input.spending.monthlyToday;
  for (let iteration = 0; iteration < 28; iteration += 1) {
    const middle = (low + high) / 2;
    const simulation = simulateRetirement(
      { ...input, spending: { ...input.spending, monthlyToday: middle } },
      result.laborInsurance,
      result.nationalPension,
      result.laborPension,
      result.projectedInvestmentAtRetirement
    );
    if (simulation.depletedMonth === null) low = middle;
    else high = middle;
  }
  return low;
}
