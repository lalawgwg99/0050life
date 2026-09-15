import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectPlan, projectScenarios } from "./project";

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
        assetsNow: 1_000_000,
        monthlyContributionToday: 0,
        contributionGrowthRate: 0,
        grossReturnRate: 0,
        feeRate: 0
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
      const income = record.laborInsuranceNominal + record.laborPensionNominal + record.partTimeNominal;
      const surplus = Math.max(0, income - record.expenseNominal);
      const expected = Math.max(0, opening + record.portfolioReturnNominal - record.portfolioWithdrawalNominal + surplus);
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
      investment: { assetsNow: 0, monthlyContributionToday: 0, contributionGrowthRate: 0, grossReturnRate: 0, feeRate: 0 },
      partTime: { monthlyToday: 0, startAge: 65, endAge: 65, growthRate: 0 }
    });
    const result = projectPlan(input);
    expect(result.requiredInvestmentAtRetirement).toBeCloseTo(120_000, 2);
  });

  it("keeps negative stress returns in scenario calculations", () => {
    const input = makeInput({ investment: { grossReturnRate: 0.01 } });
    const scenarios = projectScenarios(input);
    expect(scenarios[0].stockReturnRate).toBeCloseTo(-0.01, 10);
    expect(scenarios[0].result.projectedInvestmentAtRetirement).toBeLessThan(scenarios[1].result.projectedInvestmentAtRetirement);
  });
});
