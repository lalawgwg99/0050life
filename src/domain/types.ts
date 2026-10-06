export type PensionMode = "lump" | "monthly";
export type LaborIndexation = "threshold" | "none";
export type RetirementAllocation = "steady" | "balanced" | "growth" | "custom";
export type FutureYearsMode = "until-retirement" | "custom";

export type Calendar = "roc" | "ce";

export interface WithdrawalRule {
  enabled: boolean;
  annualRate: number;
}

export interface StockPledgeAssumption {
  enabled: boolean;
  loanToValue: number;
  annualInterestRate: number;
  maintenanceRate: number;
}

export interface AssetAllocationAssumption {
  stockRate: number;
  bondRate: number;
  cashRate: number;
  glidePathEnabled: boolean;
  targetStockRate: number;
}

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
    /** 內部一律以「民國年」存放（西元 − 1911）；顯示時再依 calendar 轉換 */
    calendar: Calendar;
    birthMonth: number;
    retirementAge: number;
    longevityAge: number;
    currency: string;
  };
  spending: {
    monthlyToday: number;
    rentMonthlyToday?: number;
    rentInflationRate?: number;
    medicalMonthlyToday?: number;
    medicalInflationRate?: number;
    longTermCareEnabled?: boolean;
    longTermCareStartAge?: number;
    longTermCareMonthlyToday?: number;
  };
  economy: {
    inflationRate: number;
  };
  laborInsurance: {
    /** 關掉＝沒有勞保年資，整個模組不計算、步驟也隱藏 */
    enabled: boolean;
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
    /** 關掉＝沒有勞退專戶，整個模組不計算、步驟也隱藏 */
    enabled: boolean;
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
    withdrawalRule?: WithdrawalRule;
    stockPledge?: StockPledgeAssumption;
    assetAllocation?: AssetAllocationAssumption;
    retirementEffectiveTaxRate?: number;
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
  livingExpenseNominal: number;
  rentExpenseNominal: number;
  medicalExpenseNominal: number;
  longTermCareExpenseNominal: number;
  taxNominal: number;
  portfolioNominal: number;
  portfolioReal: number;
  pensionAccountNominal: number;
  cashReserveNominal: number;
  totalRetirementAssetsNominal: number;
}

export interface ProjectionResult {
  input: PlanningInput;
  investmentHoldings: InvestmentHoldingProjection[];
  projectedInvestmentAtRetirement: number;
  lumpPensionAmountAtRetirement: number;
  lumpPensionReinvestedAtRetirement: number;
  lumpPensionCashAtRetirement: number;
  projectedRetirementAssetsAtRetirement: number;
  requiredInvestmentAtRetirement: number;
  requiredRetirementAssetsAtRetirement: number;
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
