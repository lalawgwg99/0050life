import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectPlan, projectScenarios } from "./project";
import { yearsUntilRetirement } from "../domain/coverage";
import { additionalContributionWeights, allocateMonthlyAmount, estimateAdditionalMonthlyInvestment } from "./actions";
import { runMonteCarlo } from "./monte-carlo";

describe("integrated monthly projection", () => {
  it("does not use future pension income before its claim month", () => {
    const input = makeInput({
      profile: { birthYearROC: 60, birthMonth: 9, retirementAge: 55, longevityAge: 75 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 50_000 },
      laborInsurance: {
        insuredYearsNow: 30,
        insuredYearsFuture: 0,
        averageSalaryToday: 45_800,
        salaryGrowthRate: 0,
        claimAge: 65,
        indexation: "none"
      },
      laborPension: {
        balanceNow: 2_000_000,
        seniorityYearsNow: 30,
        seniorityYearsFuture: 0,
        monthlyWageToday: 0,
        wageGrowthRate: 0,
        employerRate: 0.06,
        voluntaryRate: 0,
        returnRate: 0,
        claimAge: 60,
        mode: "monthly"
      },
      investment: {
        holdings: [{ id: "cash", name: "投資", valueNow: 1_000_000, monthlyContributionToday: 0, grossReturnRate: 0, feeRate: 0 }],
        contributionGrowthRate: 0,
        retirementAllocation: "custom",
        retirementGrossReturnRate: 0,
        retirementFeeRate: 0
      },
      partTime: { monthlyToday: 0, startAge: 55, endAge: 55, growthRate: 0 }
    });
    const result = projectPlan(input);
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const age55 = result.records.find((record) => record.month === monthAtAge(birth, 55))!;
    const age60 = result.records.find((record) => record.month === monthAtAge(birth, 60))!;
    const age65 = result.records.find((record) => record.month === monthAtAge(birth, 65))!;
    expect(age55.laborPensionNominal).toBe(0);
    expect(age55.laborInsuranceNominal).toBe(0);
    expect(age60.laborPensionNominal).toBeGreaterThan(0);
    expect(age60.laborInsuranceNominal).toBe(0);
    expect(age65.laborInsuranceNominal).toBeGreaterThan(0);
  });

  it("maintains the monthly portfolio accounting identity", () => {
    const result = projectPlan(makeInput());
    let opening = result.projectedInvestmentAtRetirement;
    for (const record of result.records) {
      const income = record.laborInsuranceNominal + record.nationalPensionNominal + record.laborPensionNominal + record.partTimeNominal;
      const surplus = Math.max(0, income - record.expenseNominal);
      const lumpReinvested = record.month === result.laborPension.claimMonth && result.input.laborPension.mode === "lump"
        ? result.laborPension.balanceAtClaim * (result.input.laborPension.lumpReinvestRate ?? 1)
        : 0;
      const expected = Math.max(0, opening + lumpReinvested + record.portfolioReturnNominal - record.portfolioWithdrawalNominal + surplus);
      expect(record.portfolioNominal).toBeCloseTo(expected, 6);
      opening = record.portfolioNominal;
    }
  });

  it("finds the exact required assets under a zero-rate, one-year case", () => {
    const input = makeInput({
      profile: { birthYearROC: 80, birthMonth: 4, retirementAge: 65, longevityAge: 66 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 10_000 },
      laborInsurance: { insuredYearsNow: 0, insuredYearsFuture: 0, averageSalaryToday: 0, salaryGrowthRate: 0, claimAge: 65, indexation: "none" },
      laborPension: { balanceNow: 0, seniorityYearsNow: 0, seniorityYearsFuture: 0, monthlyWageToday: 0, wageGrowthRate: 0, employerRate: 0.06, voluntaryRate: 0, returnRate: 0, claimAge: 65, mode: "lump" },
      investment: { holdings: [], contributionGrowthRate: 0, retirementAllocation: "custom", retirementGrossReturnRate: 0, retirementFeeRate: 0 },
      partTime: { monthlyToday: 0, startAge: 65, endAge: 65, growthRate: 0 }
    });
    const result = projectPlan(input);
    expect(result.requiredInvestmentAtRetirement).toBeCloseTo(120_000, 2);
  });

  it("keeps negative stress returns in scenario calculations", () => {
    const input = makeInput({ investment: {
      holdings: [{ id: "fund", name: "投資", valueNow: 1_000_000, monthlyContributionToday: 0, grossReturnRate: 0.01, feeRate: 0 }],
      retirementGrossReturnRate: 0.01
    } });
    const scenarios = projectScenarios(input);
    expect(scenarios[0].retirementReturnRate).toBeCloseTo(-0.01, 10);
    expect(scenarios[0].result.projectedInvestmentAtRetirement).toBeLessThan(scenarios[1].result.projectedInvestmentAtRetirement);
  });

  it("counts part-time income only when the user turns it on", () => {
    const base = makeInput({
      profile: { retirementAge: 65, longevityAge: 66 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 10_000 },
      laborInsurance: { insuredYearsNow: 0, insuredYearsFuture: 0, averageSalaryToday: 0, salaryGrowthRate: 0, claimAge: 65, indexation: "none" },
      laborPension: { balanceNow: 0, seniorityYearsNow: 0, seniorityYearsFuture: 0, monthlyWageToday: 0, wageGrowthRate: 0, employerRate: 0.06, voluntaryRate: 0, returnRate: 0, claimAge: 65, mode: "lump" },
      investment: { holdings: [], contributionGrowthRate: 0, retirementAllocation: "custom", retirementGrossReturnRate: 0, retirementFeeRate: 0 },
      partTime: { enabled: false, monthlyToday: 10_000, startAge: 65, endAge: 66, growthRate: 0 }
    });
    expect(projectPlan(base).requiredInvestmentAtRetirement).toBeCloseTo(120_000, 2);
    expect(projectPlan({ ...base, partTime: { ...base.partTime, enabled: true } }).requiredInvestmentAtRetirement).toBe(0);
  });

  it("automatically counts coverage through the selected retirement age", () => {
    const input = makeInput({
      laborInsurance: { futureYearsMode: "until-retirement" },
      laborPension: { futureYearsMode: "until-retirement" }
    });
    const result = projectPlan(input);
    expect(result.laborInsurance.insuredYearsAtClaim).toBeCloseTo(input.laborInsurance.insuredYearsNow + yearsUntilRetirement(input), 8);
  });

  it("can qualify labor insurance through combined labor and national pension years", () => {
    const input = makeInput({
      laborInsurance: {
        insuredYearsNow: 10,
        insuredYearsFuture: 0,
        futureYearsMode: "custom",
        claimAge: 65
      },
      nationalPension: { enabled: true, insuredYears: 5, aFormulaEligible: true }
    });
    const result = projectPlan(input);
    expect(result.laborInsurance.eligibleByCombinedYears).toBe(true);
    expect(result.laborInsurance.eligibleForAnnuity).toBe(true);
    expect(result.nationalPension.formulaUsed).toBe("B");
  });

  it("bases the extra-saving suggestion on every holding's return", () => {
    const input = makeInput({
      spending: { monthlyToday: 100_000 },
      investment: {
        holdings: [
          { id: "a", name: "A", valueNow: 0, monthlyContributionToday: 5_000, grossReturnRate: 0, feeRate: 0 },
          { id: "b", name: "B", valueNow: 0, monthlyContributionToday: 5_000, grossReturnRate: 0, feeRate: 0 }
        ],
        contributionGrowthRate: 0,
        retirementAllocation: "custom",
        retirementGrossReturnRate: 0,
        retirementFeeRate: 0
      }
    });
    const result = projectPlan(input);
    expect(additionalContributionWeights(input)).toEqual([0.5, 0.5]);
    expect(estimateAdditionalMonthlyInvestment(input, result)).toBeGreaterThan(0);
  });

  it("keeps extra saving in whole hundreds while preserving the total", () => {
    const allocation = allocateMonthlyAmount(3_400, [0.5, 0.3, 0.2]);
    expect(allocation).toEqual([1_700, 1_000, 700]);
    expect(allocation.reduce((sum, value) => sum + value, 0)).toBe(3_400);
  });

  it("treats the non-reinvested lump pension as cash before investments", () => {
    const base = makeInput({
      profile: { retirementAge: 65, longevityAge: 66 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 100_000 },
      laborInsurance: { insuredYearsNow: 0, insuredYearsFuture: 0, averageSalaryToday: 0, salaryGrowthRate: 0, claimAge: 65, indexation: "none" },
      laborPension: { balanceNow: 1_200_000, seniorityYearsNow: 20, seniorityYearsFuture: 0, monthlyWageToday: 0, wageGrowthRate: 0, employerRate: 0, voluntaryRate: 0, returnRate: 0, claimAge: 65, mode: "lump" },
      investment: { holdings: [], contributionGrowthRate: 0, retirementAllocation: "custom", retirementGrossReturnRate: 0, retirementFeeRate: 0 },
      partTime: { monthlyToday: 0, startAge: 65, endAge: 65, growthRate: 0 }
    });
    const allInvested = projectPlan({ ...base, laborPension: { ...base.laborPension, lumpReinvestRate: 1 } });
    const allCash = projectPlan({ ...base, laborPension: { ...base.laborPension, lumpReinvestRate: 0 } });
    expect(allInvested.records[0].portfolioNominal).toBe(1_100_000);
    expect(allCash.records[0].portfolioNominal).toBe(0);
    expect(allCash.records[0].cashReserveNominal).toBe(1_100_000);
    expect(allCash.records[0].totalRetirementAssetsNominal).toBe(1_100_000);
    expect(allInvested.projectedRetirementAssetsAtRetirement).toBe(1_200_000);
    expect(allInvested.lumpPensionReinvestedAtRetirement).toBe(1_200_000);
    expect(allCash.depletedMonth).toBeNull();
  });

  it("adds a reinvested lump pension before applying the monthly investment return", () => {
    const input = makeInput({
      profile: { retirementAge: 65, longevityAge: 66 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 0 },
      laborInsurance: { insuredYearsNow: 0, insuredYearsFuture: 0, averageSalaryToday: 0, salaryGrowthRate: 0, claimAge: 65, indexation: "none" },
      laborPension: { balanceNow: 1_200_000, seniorityYearsNow: 20, seniorityYearsFuture: 0, monthlyWageToday: 0, wageGrowthRate: 0, employerRate: 0, voluntaryRate: 0, returnRate: 0, claimAge: 65, mode: "lump", lumpReinvestRate: 1 },
      investment: { holdings: [], contributionGrowthRate: 0, retirementAllocation: "custom", retirementGrossReturnRate: 0.12, retirementFeeRate: 0 },
      partTime: { monthlyToday: 0, startAge: 65, endAge: 65, growthRate: 0 }
    });
    const result = projectPlan(input);
    expect(result.records[0].portfolioReturnNominal).toBeGreaterThan(0);
    expect(result.records[0].portfolioNominal).toBeGreaterThan(1_200_000);
  });

  it("adds medical and long-term care budgets to retirement expenses", () => {
    const input = makeInput({
      profile: { retirementAge: 65, longevityAge: 90 },
      economy: { inflationRate: 0 },
      spending: { monthlyToday: 30_000, medicalMonthlyToday: 5_000, medicalInflationRate: 0, longTermCareEnabled: true, longTermCareStartAge: 80, longTermCareMonthlyToday: 20_000 }
    });
    const result = projectPlan(input);
    const age65 = result.records.find((record) => Math.abs(record.age - 65) < 0.01)!;
    const age80 = result.records.find((record) => Math.abs(record.age - 80) < 0.01)!;
    expect(age65.expenseNominal).toBe(35_000);
    expect(age80.expenseNominal).toBe(55_000);
    expect(age80.longTermCareExpenseNominal).toBe(20_000);
  });

  it("supports an early-retirement crash return path", () => {
    const input = makeInput({ spending: { monthlyToday: 80_000 } });
    const normal = projectPlan(input);
    const crash = projectPlan(input, { retirementReturnPath: (monthIndex, normalRate) => monthIndex < 12 ? Math.pow(0.6, 1 / 12) - 1 : normalRate });
    expect(crash.endingPortfolioReal).toBeLessThan(normal.endingPortfolioReal);
  });

  it("deducts the selected effective tax rate from retirement income", () => {
    const untaxed = projectPlan(makeInput({ investment: { retirementEffectiveTaxRate: 0 } }));
    const taxed = projectPlan(makeInput({ investment: { retirementEffectiveTaxRate: 0.1 } }));
    expect(taxed.records[0].taxNominal).toBeGreaterThan(0);
    expect(taxed.endingPortfolioReal).toBeLessThan(untaxed.endingPortfolioReal);
  });

  it("runs deterministic Monte Carlo paths for an auditable result", () => {
    const result = projectPlan(makeInput());
    expect(runMonteCarlo(result, 30, 50)).toEqual(runMonteCarlo(result, 30, 50));
  });
});
