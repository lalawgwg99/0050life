import type { PlanningInput } from "./types";
import { zhTW, type Strings } from "../i18n/zh-TW";
import { laborInsuranceNormalAge, TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { birthSerial, monthAtAge, toSerial } from "./time";
import { laborInsuranceFutureYears, laborPensionFutureYears, yearsUntilRetirement } from "./coverage";

export interface InputError {
  message: string;
  /** 填寫步驟：0 退休時間・1 勞保・2 國民年金・3 勞退・4 投資 */
  step: number;
  /** 對應欄位的顯示文字，點擊錯誤時會跳到該欄位 */
  field?: string;
  /** 多筆投資時，指出是哪一筆的欄位出錯 */
  holdingId?: string;
}

export function validateInput(input: PlanningInput, t: Strings = zhTW): InputError[] {
  const v = t.validation;
  const L = v.labels;
  const errors: InputError[] = [];
  const fail = (step: number, message: string, field?: string, holdingId?: string) => {
    errors.push({ message, step, field, holdingId });
  };
  const stepOn = [true, input.laborInsurance.enabled !== false, input.nationalPension.enabled, input.laborPension.enabled !== false, true];
  const useCE = input.profile.calendar === "ce";
  const birthYearLabel = useCE ? t.pensionSetup.birthYearCE : t.pensionSetup.birthYearROC;
  const values: Array<[number, string, number, string?, string?]> = [
    [input.profile.birthYearROC, L.birthYear, 0, birthYearLabel],
    [input.profile.birthMonth, L.birthMonth, 0, t.inputProfile.birthMonth],
    [input.profile.retirementAge, L.retirementAge, 0, t.inputProfile.retirementAge],
    [input.profile.longevityAge, L.longevityAge, 0, t.inputProfile.longevityAge],
    [input.spending.monthlyToday, L.monthlySpending, 0, t.inputProfile.monthlySpending],
    [input.spending.rentMonthlyToday ?? 0, L.rent, 0, t.inputProfile.rentMonthly],
    [input.spending.rentInflationRate ?? input.economy.inflationRate, L.rentGrowth, 0, t.inputProfile.rentInflation],
    [input.spending.medicalMonthlyToday ?? 0, L.medical, 0, t.inputProfile.medicalMonthly],
    [input.spending.medicalInflationRate ?? input.economy.inflationRate, L.medicalGrowth, 0, t.inputProfile.medicalInflation],
    [input.economy.inflationRate, L.inflation, 0, t.inputProfile.inflation],
    [input.laborInsurance.insuredYearsNow, L.laborYearsNow, 1, t.inputLabor.insuredYearsNow],
    [input.laborInsurance.averageSalaryToday, L.laborAvgSalary, 1, t.inputLabor.averageSalary],
    [input.laborInsurance.salaryGrowthRate, L.laborSalaryGrowth, 1, t.inputLabor.salaryGrowth],
    [input.laborInsurance.claimAge, L.laborClaimAge, 1, t.inputLabor.claimAge],
    [input.laborPension.balanceNow, L.pensionBalance, 3, t.inputPension.balanceNow],
    [input.laborPension.seniorityYearsNow, L.pensionSeniority, 3, t.inputPension.seniorityNow],
    [input.laborPension.monthlyWageToday, L.pensionWage, 3, t.inputPension.monthlyWage],
    [input.laborPension.wageGrowthRate, L.pensionWageGrowth, 3, t.inputPension.wageGrowth],
    [input.laborPension.employerRate, L.pensionEmployer, 3, t.inputPension.employerRate],
    [input.laborPension.voluntaryRate, L.pensionVoluntary, 3, t.inputPension.voluntaryRate],
    [input.laborPension.returnRate, L.pensionReturn, 3, t.inputPension.returnRate],
    [input.laborPension.claimAge, L.pensionClaimAge, 3, t.inputPension.claimAge],
    [input.laborPension.lumpReinvestRate ?? 1, L.pensionLumpReinvest, 3, t.inputPension.lumpReinvest],
    [input.investment.contributionGrowthRate, L.investContribGrowth, 4, t.inputInvest.contributionGrowth],
    [input.investment.retirementGrossReturnRate, L.investReturn, 4, t.inputInvest.customReturn],
    [input.investment.retirementFeeRate, L.investFee, 4, t.inputInvest.customFee]
  ];
  if (input.laborInsurance.futureYearsMode !== "until-retirement") values.push([input.laborInsurance.insuredYearsFuture, L.futureLaborYears, 1, t.inputLabor.futureYears]);
  if (input.laborPension.futureYearsMode !== "until-retirement") values.push([input.laborPension.seniorityYearsFuture, L.futurePensionYears, 3, t.inputPension.futureYears]);
  input.investment.holdings.forEach((holding, index) => {
    const name = holding.name.trim() || t.inputInvest.removeHoldingFallback(index + 1);
    values.push(
      [holding.valueNow, `${name}${t.inputInvest.valueNow}`, 4, t.inputInvest.valueNow, holding.id],
      [holding.monthlyContributionToday, `${name}${t.inputInvest.monthly}`, 4, t.inputInvest.monthly, holding.id],
      [holding.grossReturnRate, `${name}${L.investReturn}`, 4, t.inputInvest.grossReturn, holding.id],
      [holding.feeRate, `${name}${L.investFee}`, 4, t.inputInvest.fee, holding.id]
    );
  });
  if (input.partTime.enabled) {
    values.push(
      [input.partTime.monthlyToday, L.partTimeMonthly, 0, t.inputProfile.partTimeMonthly],
      [input.partTime.startAge, L.partTimeStartAge, 0, t.inputProfile.partTimeStartAge],
      [input.partTime.endAge, L.partTimeEndAge, 0, t.inputProfile.partTimeEndAge],
      [input.partTime.growthRate, L.partTimeGrowth, 0, t.inputProfile.partTimeGrowth]
    );
  }
  if (input.spending.longTermCareEnabled) values.push([input.spending.longTermCareStartAge ?? 80, L.ltcStartAge, 0, t.inputProfile.longTermCareStartAge], [input.spending.longTermCareMonthlyToday ?? 0, L.ltcMonthly, 0, t.inputProfile.longTermCareMonthly]);
  if (input.nationalPension.enabled) values.push([input.nationalPension.insuredYears, L.nationalYears, 2, t.inputNational.insuredYears]);
  for (const [value, label, step, field, holdingId] of values) {
    if (!Number.isFinite(value)) fail(step, v.needNumber(label), field, holdingId);
  }
  if (errors.length > 0) return errors;
  if (input.investment.holdings.some((holding) => holding.name.trim() === "")) fail(4, v.holdingNameRequired);
  const holdingNames = input.investment.holdings.map((holding) => holding.name.trim()).filter((name) => name !== "");
  if (new Set(holdingNames).size !== holdingNames.length) fail(4, v.holdingNameDup);

  if (input.profile.birthYearROC < 1 || input.profile.birthYearROC > 140) fail(0, useCE ? v.birthYearCE(1 + 1911, 140 + 1911) : v.birthYearROC, birthYearLabel);
  if (input.profile.birthMonth < 1 || input.profile.birthMonth > 12) fail(0, v.birthMonth, t.inputProfile.birthMonth);
  if (input.profile.retirementAge < 18 || input.profile.retirementAge > 100) fail(0, v.retirementAge, t.inputProfile.retirementAge);
  if (input.profile.longevityAge > 120) fail(0, v.longevityMax, t.inputProfile.longevityAge);
  const ages = [input.profile.retirementAge, input.profile.longevityAge, input.laborInsurance.claimAge, input.laborPension.claimAge];
  if (input.partTime.enabled) ages.push(input.partTime.startAge, input.partTime.endAge);
  if (!Number.isInteger(input.profile.birthYearROC) || !Number.isInteger(input.profile.birthMonth) || ages.some((age) => !Number.isInteger(age))) fail(0, v.integerAges);
  if (input.profile.longevityAge <= input.profile.retirementAge) fail(0, v.longevityAfterRetirement, t.inputProfile.longevityAge);
  if (input.spending.monthlyToday < 0) fail(0, v.negative(L.monthlySpending), t.inputProfile.monthlySpending);
  if ((input.spending.rentMonthlyToday ?? 0) < 0) fail(0, v.negative(L.rent), t.inputProfile.rentMonthly);
  if ((input.spending.medicalMonthlyToday ?? 0) < 0 || (input.spending.longTermCareMonthlyToday ?? 0) < 0) fail(0, v.negative(L.medical), t.inputProfile.medicalMonthly);
  if (input.spending.longTermCareEnabled && (input.spending.longTermCareStartAge ?? 80) < input.profile.retirementAge) fail(0, v.ltcBeforeRetirement, t.inputProfile.longTermCareStartAge);
  if (input.spending.longTermCareEnabled && (input.spending.longTermCareStartAge ?? 80) > input.profile.longevityAge) fail(0, v.ltcAfterLongevity, t.inputProfile.longTermCareStartAge);
  input.investment.holdings.forEach((holding, index) => {
    const name = holding.name.trim() || t.inputInvest.removeHoldingFallback(index + 1);
    if (holding.valueNow < 0) fail(4, v.negative(`${name}${t.inputInvest.valueNow}`), t.inputInvest.valueNow, holding.id);
    if (holding.monthlyContributionToday < 0) fail(4, v.negative(`${name}${t.inputInvest.monthly}`), t.inputInvest.monthly, holding.id);
  });
  if (input.partTime.enabled && input.partTime.monthlyToday < 0) fail(0, v.negative(L.partTimeMonthly), t.inputProfile.partTimeMonthly);
  if (input.laborInsurance.insuredYearsNow < 0 || laborInsuranceFutureYears(input) < 0 || input.laborInsurance.averageSalaryToday < 0) fail(1, v.laborNegative, t.inputLabor.insuredYearsNow);
  if (input.nationalPension.enabled && (input.nationalPension.insuredYears <= 0 || input.nationalPension.insuredYears > 40)) fail(2, v.nationalYears, t.inputNational.insuredYears);
  if (input.laborPension.balanceNow < 0 || input.laborPension.monthlyWageToday < 0 || input.laborPension.seniorityYearsNow < 0 || laborPensionFutureYears(input) < 0) fail(3, v.pensionNegative, t.inputPension.balanceNow);
  const annualRates = [input.economy.inflationRate, input.spending.rentInflationRate ?? input.economy.inflationRate, input.laborInsurance.salaryGrowthRate, input.laborPension.wageGrowthRate, input.laborPension.returnRate, input.investment.contributionGrowthRate, input.investment.retirementGrossReturnRate, ...input.investment.holdings.map((holding) => holding.grossReturnRate)];
  if (input.partTime.enabled) annualRates.push(input.partTime.growthRate);
  if (annualRates.some((rate) => rate <= -1)) fail(0, v.rateFloor);
  const investmentFees = [input.investment.retirementFeeRate, ...input.investment.holdings.map((holding) => holding.feeRate)];
  if (investmentFees.some((fee) => fee < 0 || fee >= 1)) fail(4, v.feeRange, t.inputInvest.fee);
  if (input.laborPension.employerRate < 0 || input.laborPension.employerRate > 1) fail(3, v.employerRange, t.inputPension.employerRate);
  if (input.laborPension.voluntaryRate < 0 || input.laborPension.voluntaryRate > 0.06) fail(3, v.voluntaryMax, t.inputPension.voluntaryRate);
  if (input.investment.withdrawalRule?.enabled && (input.investment.withdrawalRule.annualRate <= 0 || input.investment.withdrawalRule.annualRate >= 1)) fail(4, v.withdrawRange, t.inputInvest.withdrawRate);
  if (input.investment.stockPledge?.enabled) {
    const pledge = input.investment.stockPledge;
    if (pledge.loanToValue < 0 || pledge.loanToValue > 0.8) fail(4, v.pledgeLTV, t.inputInvest.pledgeLTV);
    if (pledge.annualInterestRate < 0 || pledge.annualInterestRate >= 1) fail(4, v.pledgeRate, t.inputInvest.pledgeRate);
    if (pledge.maintenanceRate < 1 || pledge.maintenanceRate > 10) fail(4, v.pledgeMaintenance, t.inputInvest.pledgeMaintenance);
  }
  const mix = input.investment.assetAllocation;
  if (mix && Math.abs(mix.stockRate + mix.bondRate + mix.cashRate - 1) > 0.001) fail(4, v.mixSum);
  if ((input.investment.retirementEffectiveTaxRate ?? 0) < 0 || (input.investment.retirementEffectiveTaxRate ?? 0) > 0.5) fail(4, v.taxRange, t.inputInvest.taxRate);
  const lumpReinvestRate = input.laborPension.lumpReinvestRate ?? 1;
  if (lumpReinvestRate < 0 || lumpReinvestRate > 1) fail(3, v.lumpReinvestRange, t.inputPension.lumpReinvest);
  if (input.partTime.enabled) {
    if (input.partTime.startAge < input.profile.retirementAge) fail(0, v.partTimeStart, t.inputProfile.partTimeStartAge);
    if (input.partTime.endAge < input.partTime.startAge) fail(0, v.partTimeEnd, t.inputProfile.partTimeEndAge);
    if (input.partTime.endAge > input.profile.longevityAge) fail(0, v.partTimeEndLongevity, t.inputProfile.partTimeEndAge);
  }

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirement = monthAtAge(birth, input.profile.retirementAge);
  if (retirement < asOf) fail(0, v.retirementBeforeAsOf, t.inputProfile.retirementAge);

  const yearsToRetirement = yearsUntilRetirement(input);
  if (laborInsuranceFutureYears(input) > yearsToRetirement + 1 / 12) fail(1, v.futureLaborYears, t.inputLabor.futureYears);
  if (laborPensionFutureYears(input) > yearsToRetirement + 1 / 12) fail(3, v.futurePensionYears, t.inputPension.futureYears);

  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  if (input.laborInsurance.claimAge < normalAge - 5) fail(1, v.laborClaimEarly(normalAge - 5), t.inputLabor.claimAge);
  if (input.laborInsurance.claimAge < input.profile.retirementAge) fail(1, v.laborClaimBeforeRetirement, t.inputLabor.claimAge);
  if (input.laborInsurance.claimAge > input.profile.longevityAge) fail(1, v.laborClaimAfterLongevity, t.inputLabor.claimAge);
  const laborYearsAtClaim = input.laborInsurance.insuredYearsNow + laborInsuranceFutureYears(input);
  if (input.nationalPension.enabled && input.laborInsurance.claimAge > TAIWAN_RULES_2026.nationalPension.eligibleAge && laborYearsAtClaim > 0 && laborYearsAtClaim < 15 && laborYearsAtClaim + input.nationalPension.insuredYears >= 15) {
    fail(1, v.laborCombined65, t.inputLabor.claimAge);
  }
  if (input.laborPension.claimAge < TAIWAN_RULES_2026.laborPension.eligibleAge) fail(3, v.pensionClaimMin, t.inputPension.claimAge);
  if (input.laborPension.claimAge < input.profile.retirementAge) fail(3, v.pensionClaimBeforeRetirement, t.inputPension.claimAge);
  if (input.laborPension.claimAge > input.profile.longevityAge) fail(3, v.pensionClaimAfterLongevity, t.inputPension.claimAge);

  const pensionYears = input.laborPension.seniorityYearsNow + laborPensionFutureYears(input);
  if (input.laborPension.mode === "monthly" && pensionYears < TAIWAN_RULES_2026.laborPension.minimumMonthlyYears) {
    fail(3, v.pensionMonthlyMinYears);
  }

  // 關掉的年金模組不驗證（步驟也會隱藏）
  return errors.filter((error) => stepOn[error.step] !== false);
}
