import { birthSerial, monthAtAge } from "../domain/time";
import type { PlanningInput, ProjectionResult, ScenarioResult } from "../domain/types";
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
  laborPension: ReturnType<typeof projectLaborPension>
): number {
  const succeeds = (balance: number) => simulateRetirement(input, laborInsurance, nationalPension, laborPension, balance).depletedMonth === null;
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

export function projectPlan(input: PlanningInput, options?: { retirementReturnPath?: (monthIndex: number, normalMonthlyReturn: number) => number }): ProjectionResult {
  const errors = validateInput(input);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const endMonth = monthAtAge(birth, input.profile.longevityAge);
  const laborInsurance = projectLaborInsurance(input, endMonth);
  const nationalPension = projectNationalPension(input, endMonth, laborInsurance.eligibleForAnnuity);
  const laborPension = projectLaborPension(input, endMonth);
  const investmentHoldings = projectInvestmentHoldingsAtRetirement(input);
  const projectedInvestmentAtRetirement = investmentHoldings.reduce((sum, holding) => sum + holding.projectedValueNominal, 0);
  const lumpPensionAmountAtRetirement = input.laborPension.mode === "lump" && laborPension.claimMonth === monthAtAge(birth, input.profile.retirementAge)
    ? laborPension.balanceAtClaim
    : 0;
  const lumpPensionReinvestedAtRetirement = lumpPensionAmountAtRetirement * (input.laborPension.lumpReinvestRate ?? 1);
  const lumpPensionCashAtRetirement = lumpPensionAmountAtRetirement - lumpPensionReinvestedAtRetirement;
  const projectedRetirementAssetsAtRetirement = projectedInvestmentAtRetirement + lumpPensionAmountAtRetirement;
  const requiredInvestmentAtRetirement = solveRequiredInvestment(input, laborInsurance, nationalPension, laborPension);
  const requiredRetirementAssetsAtRetirement = requiredInvestmentAtRetirement + lumpPensionAmountAtRetirement;
  const simulation = simulateRetirement(input, laborInsurance, nationalPension, laborPension, projectedInvestmentAtRetirement, options?.retirementReturnPath);
  const investmentGapAtRetirement = Math.max(0, requiredRetirementAssetsAtRetirement - projectedRetirementAssetsAtRetirement);
  const readiness = requiredInvestmentAtRetirement === 0
    ? 1
    : Math.min(1, projectedRetirementAssetsAtRetirement / requiredRetirementAssetsAtRetirement);
  const warnings = [
    "未來規定、物價與投資表現可能改變；這是依目前資料做的規劃，不是給付保證。"
  ];
  if (input.laborPension.mode === "monthly") {
    warnings.push("勞退按月領依請領年齡、目前公告的平均餘命與利率估算；實際按季發給，申請前請再用勞保局資料核對。");
  }
  if (input.laborInsurance.indexation === "threshold") {
    warnings.push("勞保年金依假設物價模擬累計達 5% 才調整，實際金額仍依未來公告。");
  }
  if (nationalPension.enabled) {
    warnings.push("國保金額依目前月投保金額與已繳年資估算；欠費、曾領其他社會保險給付等情況，可能影響 A 式資格，請以勞保局核定為準。");
    if (nationalPension.claimMonth >= endMonth) warnings.push("目前規劃終點早於 65 歲，國保尚未開始領取，因此沒有放進這段退休現金流。");
  }
  if (laborInsurance.eligibleByCombinedYears) {
    warnings.push("勞保年資未滿 15 年，本次依勞保與國保合計年資滿 15 年的條件估算勞保年金；實際資格請以勞保局核定為準。");
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

export function projectScenarios(input: PlanningInput): ScenarioResult[] {
  const cases: Array<{ name: ScenarioResult["name"]; delta: number }> = [
    { name: "報酬較低", delta: -0.02 },
    { name: "照目前填寫", delta: 0 },
    { name: "報酬較高", delta: 0.02 }
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
