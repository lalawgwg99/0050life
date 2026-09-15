export type PensionMode = "lump" | "monthly";
export type LaborIndexation = "threshold" | "none";

export interface PlanningInput {
  asOf: { year: number; month: number };
  profile: {
    birthYearROC: number;
    birthMonth: number;
    retirementAge: number;
    longevityAge: number;
  };
  spending: {
    monthlyToday: number;
  };
  economy: {
    inflationRate: number;
  };
  laborInsurance: {
    insuredYearsNow: number;
    insuredYearsFuture: number;
    averageSalaryToday: number;
    salaryGrowthRate: number;
    claimAge: number;
    indexation: LaborIndexation;
  };
  laborPension: {
    balanceNow: number;
    seniorityYearsNow: number;
    seniorityYearsFuture: number;
    monthlyWageToday: number;
    wageGrowthRate: number;
    employerRate: number;
    voluntaryRate: number;
    returnRate: number;
    claimAge: number;
    mode: PensionMode;
    payoutYears: number;
  };
  investment: {
    assetsNow: number;
    monthlyContributionToday: number;
    contributionGrowthRate: number;
    grossReturnRate: number;
    feeRate: number;
  };
  partTime: {
    monthlyToday: number;
    startAge: number;
    endAge: number;
    growthRate: number;
  };
}

export interface MonthlyEvent {
  month: number;
  amountNominal: number;
}

export interface LaborInsuranceProjection {
  eligibleForAnnuity: boolean;
  normalAge: number;
  minimumClaimAge: number;
  claimMonth: number;
  insuredYearsAtClaim: number;
  initialMonthlyNominal: number;
  lumpSumNominal: number;
  events: Map<number, number>;
  ruleVersion: string;
}

export interface LaborPensionProjection {
  eligibleForMonthly: boolean;
  claimMonth: number;
  balanceAtRetirement: number;
  balanceAtClaim: number;
  initialMonthlyNominal: number;
  events: Map<number, number>;
  accountByMonth: Map<number, number>;
  ruleVersion: string;
}

export interface MonthlyRecord {
  month: number;
  age: number;
  expenseNominal: number;
  laborInsuranceNominal: number;
  laborPensionNominal: number;
  partTimeNominal: number;
  portfolioReturnNominal: number;
  portfolioWithdrawalNominal: number;
  unmetNeedNominal: number;
  portfolioNominal: number;
  portfolioReal: number;
  pensionAccountNominal: number;
}

export interface ProjectionResult {
  input: PlanningInput;
  projectedInvestmentAtRetirement: number;
  requiredInvestmentAtRetirement: number;
  investmentGapAtRetirement: number;
  readiness: number;
  laborInsurance: LaborInsuranceProjection;
  laborPension: LaborPensionProjection;
  records: MonthlyRecord[];
  depletedMonth: number | null;
  endingPortfolioReal: number;
  initialRetirementWithdrawalRate: number;
  warnings: string[];
}

export interface ScenarioResult {
  name: "壓力" | "基準" | "成長";
  stockReturnRate: number;
  result: ProjectionResult;
}
