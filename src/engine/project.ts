import { birthSerial, monthAtAge } from "../domain/time";
import type { PlanningInput, ProjectionResult, ScenarioResult } from "../domain/types";
import { validateInput } from "../domain/validation";
import { projectLaborInsurance } from "../modules/labor-insurance";
import { projectLaborPension } from "../modules/labor-pension";
import { projectInvestmentAtRetirement } from "../modules/investment";
import { simulateRetirement } from "./simulate";

function solveRequiredInvestment(
  input: PlanningInput,
  laborInsurance: ReturnType<typeof projectLaborInsurance>,
  laborPension: ReturnType<typeof projectLaborPension>
): number {
  const succeeds = (balance: number) => simulateRetirement(input, laborInsurance, laborPension, balance).depletedMonth === null;
  if (succeeds(0)) return 0;

  let low = 0;
  let high = Math.max(1_000_000, input.spending.monthlyToday * 12 * 10);
  while (!succeeds(high) && high < 1_000_000_000_000) high *= 2;
  if (!succeeds(high)) throw new Error("在可支援的計算範圍內找不到足夠退休本金。");

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    if (succeeds(middle)) high = middle;
    else low = middle;
  }
  return high;
}

export function projectPlan(input: PlanningInput): ProjectionResult {
  const errors = validateInput(input);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const endMonth = monthAtAge(birth, input.profile.longevityAge);
  const laborInsurance = projectLaborInsurance(input, endMonth);
  const laborPension = projectLaborPension(input, endMonth);
  const projectedInvestmentAtRetirement = projectInvestmentAtRetirement(input);
  const requiredInvestmentAtRetirement = solveRequiredInvestment(input, laborInsurance, laborPension);
  const simulation = simulateRetirement(input, laborInsurance, laborPension, projectedInvestmentAtRetirement);
  const investmentGapAtRetirement = Math.max(0, requiredInvestmentAtRetirement - projectedInvestmentAtRetirement);
  const readiness = requiredInvestmentAtRetirement === 0
    ? 1
    : Math.min(1, projectedInvestmentAtRetirement / requiredInvestmentAtRetirement);
  const warnings = [
    "未來法規、通膨與投資報酬可能改變；本結果是規劃情境，不是給付保證。"
  ];
  if (input.laborPension.mode === "monthly") {
    warnings.push("勞退月退休金採現行利率與自訂領取年數估算，申請前應以勞保局試算結果覆核。");
  }
  if (input.laborInsurance.indexation === "threshold") {
    warnings.push("勞保年金依假設通膨模擬 CPI 累計達 5% 才調整，實際調整依未來公告。");
  }

  return {
    input,
    projectedInvestmentAtRetirement,
    requiredInvestmentAtRetirement,
    investmentGapAtRetirement,
    readiness,
    laborInsurance,
    laborPension,
    records: simulation.records,
    depletedMonth: simulation.depletedMonth,
    endingPortfolioReal: simulation.endingPortfolioReal,
    initialRetirementWithdrawalRate: projectedInvestmentAtRetirement > 0
      ? simulation.firstYearWithdrawals / projectedInvestmentAtRetirement
      : 0,
    warnings
  };
}

export function projectScenarios(input: PlanningInput): ScenarioResult[] {
  const cases: Array<{ name: ScenarioResult["name"]; delta: number }> = [
    { name: "壓力", delta: -0.02 },
    { name: "基準", delta: 0 },
    { name: "成長", delta: 0.02 }
  ];
  return cases.map(({ name, delta }) => {
    const stockReturnRate = Math.max(-0.99, input.investment.grossReturnRate + delta);
    const scenarioInput: PlanningInput = {
      ...input,
      investment: { ...input.investment, grossReturnRate: stockReturnRate }
    };
    return { name, stockReturnRate, result: projectPlan(scenarioInput) };
  });
}
