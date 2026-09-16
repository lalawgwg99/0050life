import { effectiveMonthlyRate } from "../domain/rates";
import type { ProjectionResult } from "../domain/types";
import { simulateRetirement } from "./simulate";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function runMonteCarlo(result: ProjectionResult, trials = 300, seed = 50): { successRate: number; trials: number } {
  const mean = result.input.investment.retirementGrossReturnRate - result.input.investment.retirementFeeRate;
  const stockRate = result.input.investment.assetAllocation?.stockRate ?? 0.6;
  const volatility = 0.04 + stockRate * 0.16;
  let successes = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const random = seededRandom(seed + trial * 7919);
    const annualReturns: number[] = [];
    const simulation = simulateRetirement(result.input, result.laborInsurance, result.nationalPension, result.laborPension, result.projectedInvestmentAtRetirement, (monthIndex) => {
      const year = Math.floor(monthIndex / 12);
      if (annualReturns[year] === undefined) {
        const u1 = Math.max(1e-9, random());
        const u2 = random();
        const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        annualReturns[year] = Math.max(-0.8, mean + normal * volatility);
      }
      return effectiveMonthlyRate(annualReturns[year]);
    });
    if (simulation.depletedMonth === null) successes += 1;
  }
  return { successRate: successes / trials, trials };
}
