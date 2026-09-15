import { describe, expect, it } from "vitest";
import type { PlanningInput } from "./types";
import { validateInput } from "./validation";

const validInput: PlanningInput = {
  asOf: { year: 2026, month: 9 },
  profile: { birthYearROC: 80, birthMonth: 4, retirementAge: 65, longevityAge: 90 },
  spending: { monthlyToday: 50_000 },
  economy: { inflationRate: 0.02 },
  laborInsurance: {
    insuredYearsNow: 10,
    insuredYearsFuture: 29,
    averageSalaryToday: 45_800,
    salaryGrowthRate: 0.02,
    claimAge: 65,
    indexation: "threshold"
  },
  laborPension: {
    balanceNow: 300_000,
    seniorityYearsNow: 10,
    seniorityYearsFuture: 29,
    monthlyWageToday: 45_800,
    wageGrowthRate: 0.02,
    employerRate: 0.06,
    voluntaryRate: 0.06,
    returnRate: 0.03,
    claimAge: 65,
    mode: "lump"
  },
  investment: {
    assetsNow: 1_000_000,
    monthlyContributionToday: 20_000,
    contributionGrowthRate: 0.02,
    grossReturnRate: 0.08,
    feeRate: 0.003
  },
  partTime: { monthlyToday: 0, startAge: 65, endAge: 70, growthRate: 0.02 }
};

describe("input validation", () => {
  it("accepts a coherent planning case", () => {
    expect(validateInput(validInput)).toEqual([]);
  });

  it("rejects invalid timing and monthly pension eligibility", () => {
    const invalid: PlanningInput = {
      ...validInput,
      profile: { ...validInput.profile, retirementAge: 50, longevityAge: 49 },
      laborInsurance: { ...validInput.laborInsurance, claimAge: 59 },
      laborPension: {
        ...validInput.laborPension,
        seniorityYearsNow: 2,
        seniorityYearsFuture: 3,
        claimAge: 50,
        mode: "monthly"
      }
    };
    const errors = validateInput(invalid);
    expect(errors.some((error) => error.includes("規劃年齡"))).toBe(true);
    expect(errors.some((error) => error.includes("勞保最早"))).toBe(true);
    expect(errors.some((error) => error.includes("勞退請領年齡"))).toBe(true);
    expect(errors.some((error) => error.includes("未滿 15 年"))).toBe(true);
  });

  it("rejects missing values before attempting date calculations", () => {
    const invalid = {
      ...validInput,
      profile: { ...validInput.profile, birthMonth: Number.NaN },
      investment: { ...validInput.investment, monthlyContributionToday: Number.NaN }
    };
    expect(validateInput(invalid)).toEqual([
      "出生月份需要填入數字。",
      "每月投資金額需要填入數字。"
    ]);
  });

  it("rejects negative years, impossible ranges, and rates outside the rules", () => {
    const invalid: PlanningInput = {
      ...validInput,
      laborInsurance: { ...validInput.laborInsurance, insuredYearsNow: -1 },
      laborPension: { ...validInput.laborPension, voluntaryRate: 0.07 },
      partTime: { ...validInput.partTime, startAge: 70, endAge: 60 }
    };
    const errors = validateInput(invalid);
    expect(errors.some((error) => error.includes("勞保年資"))).toBe(true);
    expect(errors.some((error) => error.includes("最多為 6%"))).toBe(true);
    expect(errors.some((error) => error.includes("兼職結束年齡"))).toBe(true);
  });
});
