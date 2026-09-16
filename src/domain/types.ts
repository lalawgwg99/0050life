export type PensionMode = "lump" | "monthly";
export type LaborIndexation = "threshold" | "none";
export type RetirementAllocation = "steady" | "balanced" | "growth" | "custom";
export type FutureYearsMode = "until-retirement" | "custom";

export interface InvestmentHolding {
  id: string;
  name: string;
  valueNow: number;
  monthlyContributionToday: number;
  grossReturnRate: number;
  feeRate: number;
}

export interface InvestmentHoldingProjection {
  id: string;
  name: string;
  projectedValueNominal: number;
}

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
    futureYearsMode: FutureYearsMode;
    averageSalaryToday: number;
    salaryGrowthRate: number;
    claimAge: number;
    indexation: LaborIndexation;
  };
  nationalPension: {
    enabled: boolean;
    insuredYears: number;
    aFormulaEligible: boolean;
    indexation: LaborIndexation;
  };
  laborPension: {
    balanceNow: number;
    seniorityYearsNow: number;
    seniorityYearsFuture: number;
    futureYearsMode: FutureYearsMode;
    monthlyWageToday: number;
    wageGrowthRate: number;
    employerRate: number;
    voluntaryRate: number;
    returnRate: number;
    claimAge: number;
    mode: PensionMode;
    lumpReinvestRate?: number;
  };
  investment: {
    holdings: InvestmentHolding[];
    contributionGrowthRate: number;
    retirementAllocation: RetirementAllocation;
    retirementGrossReturnRate: number;
    retirementFeeRate: number;
  };
  partTime: {
    enabled: boolean;
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
  eligibleByCombinedYears: boolean;
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

export interface NationalPensionProjection {
  enabled: boolean;
  claimMonth: number;
  insuredYears: number;
  formulaUsed: "A" | "B" | "none";
  aFormulaEligible: boolean;
  initialMonthlyNominal: number;
  formulaAAmountNominal: number;
  formulaBAmountNominal: number;
  events: Map<number, number>;
  ruleVersion: string;
}

export interface MonthlyRecord {
  month: number;
  age: number;
  expenseNominal: number;
  laborInsuranceNominal: number;
  nationalPensionNominal: number;
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
  investmentHoldings: InvestmentHoldingProjection[];
  projectedInvestmentAtRetirement: number;
  requiredInvestmentAtRetirement: number;
  investmentGapAtRetirement: number;
  readiness: number;
  laborInsurance: LaborInsuranceProjection;
  nationalPension: NationalPensionProjection;
  laborPension: LaborPensionProjection;
  records: MonthlyRecord[];
  depletedMonth: number | null;
  endingPortfolioReal: number;
  initialRetirementWithdrawalRate: number;
  warnings: string[];
}

export interface ScenarioResult {
  name: "報酬較低" | "照目前填寫" | "報酬較高";
  retirementReturnRate: number;
  result: ProjectionResult;
}
