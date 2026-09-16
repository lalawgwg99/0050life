import type { PlanningInput } from "./domain/types";

const today = new Date();

export const defaultInput: PlanningInput = {
  asOf: { year: today.getFullYear(), month: today.getMonth() + 1 },
  profile: { birthYearROC: 80, birthMonth: 4, retirementAge: 65, longevityAge: 90 },
  spending: { monthlyToday: 50_000 },
  economy: { inflationRate: 0.02 },
  laborInsurance: {
    insuredYearsNow: 10,
    insuredYearsFuture: 29,
    futureYearsMode: "until-retirement",
    averageSalaryToday: 45_800,
    salaryGrowthRate: 0.02,
    claimAge: 65,
    indexation: "threshold"
  },
  nationalPension: {
    enabled: false,
    insuredYears: 0,
    aFormulaEligible: false,
    indexation: "threshold"
  },
  laborPension: {
    balanceNow: 300_000,
    seniorityYearsNow: 10,
    seniorityYearsFuture: 29,
    futureYearsMode: "until-retirement",
    monthlyWageToday: 45_800,
    wageGrowthRate: 0.02,
    employerRate: 0.06,
    voluntaryRate: 0.06,
    returnRate: 0.03,
    claimAge: 65,
    mode: "lump",
    lumpReinvestRate: 1
  },
  investment: {
    holdings: [{
      id: "core",
      name: "0050",
      valueNow: 1_000_000,
      monthlyContributionToday: 20_000,
      grossReturnRate: 0.08,
      feeRate: 0.003
    }],
    contributionGrowthRate: 0.02,
    retirementAllocation: "balanced",
    retirementGrossReturnRate: 0.05,
    retirementFeeRate: 0.003
  },
  partTime: { enabled: false, monthlyToday: 0, startAge: 65, endAge: 70, growthRate: 0.02 }
};
