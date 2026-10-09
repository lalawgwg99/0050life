import { birthSerial, monthAtAge } from "../domain/time";
import type { PlanningInput, ProjectionResult, ScenarioResult } from "../domain/types";
import { zhTW, type Strings } from "../i18n/zh-TW";
import { validateInput } from "../domain/validation";
import { projectLaborInsurance } from "../modules/labor-insurance";
import { projectLaborPension } from "../modules/labor-pension";
import { projectInvestmentHoldingsAtRetirement } from "../modules/investment";
import { projectNationalPension } from "../modules/national-pension";
import { simulateRetirement } from "./simulate";

function solveRequiredInvestment(
  input: PlanningInput,
  laborInsurance: ReturnType<typeof projectLaborInsurance>,
  nationalPension: ReturnType<typeof projectNationalPension>,
  laborPension: ReturnType<typeof projectLaborPension>,
  solveError: string = zhTW.project.solveError
): number {
  const succeeds = (balance: number) => simulateRetirement(input, laborInsurance, nationalPension, laborPension, balance).depletedMonth === null;
  if (succeeds(0)) return 0;

  let low = 0;
  let high = Math.max(1_000_000, input.spending.monthlyToday * 12 * 10);
  while (!succeeds(high) && high < 1_000_000_000_000) high *= 2;
  if (!succeeds(high)) throw new Error(solveError);

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    if (succeeds(middle)) high = middle;
    else low = middle;
  }
  return high;
}

export function projectPlan(input: PlanningInput, options?: { retirementReturnPath?: (monthIndex: number, normalMonthlyReturn: number) => number }, w: Strings["project"]["warnings"] = zhTW.project.warnings): ProjectionResult {
  const errors = validateInput(input);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  // 各年金模組自己看 enabled 決定算不算（勞保／勞退／國保各自獨立開關）
  const input_ = input;

  const birth = birthSerial(input_.profile.birthYearROC, input_.profile.birthMonth);
  const endMonth = monthAtAge(birth, input_.profile.longevityAge);
  const laborInsurance = projectLaborInsurance(input_, endMonth);
  const nationalPension = projectNationalPension(input_, endMonth, laborInsurance.eligibleForAnnuity);
  const laborPension = projectLaborPension(input_, endMonth);
  const investmentHoldings = projectInvestmentHoldingsAtRetirement(input_);
  const projectedInvestmentAtRetirement = investmentHoldings.reduce((sum, holding) => sum + holding.projectedValueNominal, 0);
  const lumpPensionAmountAtRetirement = input_.laborPension.mode === "lump" && laborPension.claimMonth === monthAtAge(birth, input_.profile.retirementAge)
    ? laborPension.balanceAtClaim
    : 0;
  const lumpPensionReinvestedAtRetirement = lumpPensionAmountAtRetirement * (input_.laborPension.lumpReinvestRate ?? 1);
  const lumpPensionCashAtRetirement = lumpPensionAmountAtRetirement - lumpPensionReinvestedAtRetirement;
  const projectedRetirementAssetsAtRetirement = projectedInvestmentAtRetirement + lumpPensionAmountAtRetirement;
  const requiredInvestmentAtRetirement = solveRequiredInvestment(input_, laborInsurance, nationalPension, laborPension);
  const requiredRetirementAssetsAtRetirement = requiredInvestmentAtRetirement + lumpPensionAmountAtRetirement;
  const simulation = simulateRetirement(input_, laborInsurance, nationalPension, laborPension, projectedInvestmentAtRetirement, options?.retirementReturnPath);
  const investmentGapAtRetirement = Math.max(0, requiredRetirementAssetsAtRetirement - projectedRetirementAssetsAtRetirement);
  const readiness = requiredInvestmentAtRetirement === 0
    ? 1
    : Math.min(1, projectedRetirementAssetsAtRetirement / requiredRetirementAssetsAtRetirement);
  const warnings = [w.general];
  if (input_.laborPension.enabled !== false && input_.laborPension.mode === "monthly") {
    warnings.push(w.pensionMonthly);
  }
  if (input_.laborInsurance.enabled !== false && input_.laborInsurance.indexation === "threshold") {
    warnings.push(w.laborIndexation);
  }
  if (nationalPension.enabled) {
    warnings.push(w.nationalEstimate);
    if (nationalPension.claimMonth >= endMonth) warnings.push(w.nationalNotStarted);
  }
  if (input_.laborInsurance.enabled !== false && laborInsurance.eligibleByCombinedYears) {
    warnings.push(w.laborCombined);
  }

  return {
    input,
    investmentHoldings,
    projectedInvestmentAtRetirement,
    lumpPensionAmountAtRetirement,
    lumpPensionReinvestedAtRetirement,
    lumpPensionCashAtRetirement,
    projectedRetirementAssetsAtRetirement,
    requiredInvestmentAtRetirement,
    requiredRetirementAssetsAtRetirement,
    investmentGapAtRetirement,
    readiness,
    laborInsurance,
    nationalPension,
    laborPension,
    records: simulation.records,
    depletedMonth: simulation.depletedMonth,
    endingPortfolioReal: simulation.endingPortfolioReal,
    initialRetirementWithdrawalRate: projectedInvestmentAtRetirement + lumpPensionReinvestedAtRetirement > 0
      ? simulation.firstYearWithdrawals / (projectedInvestmentAtRetirement + lumpPensionReinvestedAtRetirement)
      : 0,
    warnings
  };
}

export function projectScenarios(input: PlanningInput, names: [string, string, string] = [zhTW.project.scenarioLow, zhTW.project.scenarioBase, zhTW.project.scenarioHigh]): ScenarioResult[] {
  const cases: Array<{ name: ScenarioResult["name"]; delta: number }> = [
    { name: names[0], delta: -0.02 },
    { name: names[1], delta: 0 },
    { name: names[2], delta: 0.02 }
  ];
  return cases.map(({ name, delta }) => {
    const retirementReturnRate = Math.max(-0.99, input.investment.retirementGrossReturnRate + delta);
    const scenarioInput: PlanningInput = {
      ...input,
      investment: {
        ...input.investment,
        retirementGrossReturnRate: retirementReturnRate,
        holdings: input.investment.holdings.map((holding) => ({
          ...holding,
          grossReturnRate: Math.max(-0.99, holding.grossReturnRate + delta)
        }))
      }
    };
    return { name, retirementReturnRate, result: projectPlan(scenarioInput) };
  });
}
