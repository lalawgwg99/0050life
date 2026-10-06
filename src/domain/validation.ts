import type { PlanningInput } from "./types";
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

export function validateInput(input: PlanningInput): InputError[] {
  const errors: InputError[] = [];
  const fail = (step: number, message: string, field?: string, holdingId?: string) => {
    errors.push({ message, step, field, holdingId });
  };
  const values: Array<[number, string, number, string?, string?]> = [
    [input.profile.birthYearROC, "出生年", 0, "民國出生年"],
    [input.profile.birthMonth, "出生月份", 0, "出生月份"],
    [input.profile.retirementAge, "退休年齡", 0, "想幾歲退休"],
    [input.profile.longevityAge, "規劃年齡", 0, "希望規劃到"],
    [input.spending.monthlyToday, "每月生活費", 0, "退休後每月生活費"],
    [input.spending.rentMonthlyToday ?? 0, "每月房租", 0, "每月房租"],
    [input.spending.rentInflationRate ?? input.economy.inflationRate, "房租成長率", 0, "房租每年上漲"],
    [input.spending.medicalMonthlyToday ?? 0, "每月醫療預算", 0, "每月醫療預算"],
    [input.spending.medicalInflationRate ?? input.economy.inflationRate, "醫療費成長率", 0, "醫療費每年增加"],
    [input.economy.inflationRate, "物價上漲率", 0, "每年物價上漲（通膨）"],
    [input.laborInsurance.insuredYearsNow, "目前勞保年資", 1, "目前勞保年資"],
    [input.laborInsurance.averageSalaryToday, "勞保平均薪資", 1, "最高 60 個月平均投保薪資"],
    [input.laborInsurance.salaryGrowthRate, "投保薪資成長率", 1, "投保薪資每年調漲"],
    [input.laborInsurance.claimAge, "勞保請領年齡", 1, "預計開始領取"],
    [input.laborPension.balanceNow, "勞退專戶餘額", 3, "目前專戶餘額"],
    [input.laborPension.seniorityYearsNow, "目前勞退年資", 3, "目前勞退年資"],
    [input.laborPension.monthlyWageToday, "勞退提繳工資", 3, "目前提繳工資"],
    [input.laborPension.wageGrowthRate, "提繳工資成長率", 3, "提繳工資每年調漲"],
    [input.laborPension.employerRate, "雇主提繳比例", 3, "公司提繳比例"],
    [input.laborPension.voluntaryRate, "自願提繳比例", 3, "自提比例"],
    [input.laborPension.returnRate, "勞退專戶成長率", 3, "專戶每年成長"],
    [input.laborPension.claimAge, "勞退請領年齡", 3, "預計開始領取"],
    [input.laborPension.lumpReinvestRate ?? 1, "勞退一次領投入比例", 3, "一次領後繼續投資的比例"],
    [input.investment.contributionGrowthRate, "每月投入成長率", 4, "每月投入每年增加"],
    [input.investment.retirementGrossReturnRate, "退休後投資報酬率", 4, "退休後每年總報酬（含股息）"],
    [input.investment.retirementFeeRate, "退休後投資費用率", 4, "退休後每年投資成本"]
  ];
  if (input.laborInsurance.futureYearsMode !== "until-retirement") values.push([input.laborInsurance.insuredYearsFuture, "未來勞保年資", 1, "未來還會加保"]);
  if (input.laborPension.futureYearsMode !== "until-retirement") values.push([input.laborPension.seniorityYearsFuture, "未來勞退年資", 3, "未來還會提繳"]);
  input.investment.holdings.forEach((holding, index) => {
    const name = holding.name.trim() || `第 ${index + 1} 筆投資`;
    values.push(
      [holding.valueNow, `${name}目前市值`, 4, "目前市值", holding.id],
      [holding.monthlyContributionToday, `${name}每月投入`, 4, "每月投入", holding.id],
      [holding.grossReturnRate, `${name}總報酬率`, 4, "每年總報酬（含股息）", holding.id],
      [holding.feeRate, `${name}費用率`, 4, "每年投資成本", holding.id]
    );
  });
  if (input.partTime.enabled) {
    values.push(
      [input.partTime.monthlyToday, "兼職收入", 0, "每月兼職收入"],
      [input.partTime.startAge, "兼職開始年齡", 0, "兼職開始年齡"],
      [input.partTime.endAge, "兼職結束年齡", 0, "兼職結束年齡"],
      [input.partTime.growthRate, "兼職收入成長率", 0, "收入每年增加"]
    );
  }
  if (input.spending.longTermCareEnabled) values.push([input.spending.longTermCareStartAge ?? 80, "長照開始年齡", 0, "從幾歲開始預留"], [input.spending.longTermCareMonthlyToday ?? 0, "每月長照預算", 0, "每月長照預算"]);
  if (input.nationalPension.enabled) values.push([input.nationalPension.insuredYears, "國保年資", 2, "已繳費的國保年資"]);
  for (const [value, label, step, field, holdingId] of values) {
    if (!Number.isFinite(value)) fail(step, `${label}需要填入數字。`, field, holdingId);
  }
  if (errors.length > 0) return errors;
  if (input.investment.holdings.some((holding) => holding.name.trim() === "")) fail(4, "每筆投資都需要填名稱。");
  const holdingNames = input.investment.holdings.map((holding) => holding.name.trim()).filter((name) => name !== "");
  if (new Set(holdingNames).size !== holdingNames.length) fail(4, "投資名稱不能重複，請幫每筆取不同的名字。");

  if (input.profile.birthYearROC < 1 || input.profile.birthYearROC > 140) fail(0, "出生年請填民國 1 至 140 年。", "民國出生年");
  if (input.profile.birthMonth < 1 || input.profile.birthMonth > 12) fail(0, "出生月份請填 1 至 12。", "出生月份");
  if (input.profile.retirementAge < 18 || input.profile.retirementAge > 100) fail(0, "退休年齡請填 18 至 100 歲。", "想幾歲退休");
  if (input.profile.longevityAge > 120) fail(0, "規劃年齡最多可填到 120 歲。", "希望規劃到");
  const ages = [input.profile.retirementAge, input.profile.longevityAge, input.laborInsurance.claimAge, input.laborPension.claimAge];
  if (input.partTime.enabled) ages.push(input.partTime.startAge, input.partTime.endAge);
  if (!Number.isInteger(input.profile.birthYearROC) || !Number.isInteger(input.profile.birthMonth) || ages.some((age) => !Number.isInteger(age))) fail(0, "出生年月與各項年齡請填整數。");
  if (input.profile.longevityAge <= input.profile.retirementAge) fail(0, "規劃年齡必須晚於退休年齡。", "希望規劃到");
  if (input.spending.monthlyToday < 0) fail(0, "生活費不可為負數。", "退休後每月生活費");
  if ((input.spending.rentMonthlyToday ?? 0) < 0) fail(0, "房租不可為負數。", "每月房租");
  if ((input.spending.medicalMonthlyToday ?? 0) < 0 || (input.spending.longTermCareMonthlyToday ?? 0) < 0) fail(0, "醫療與長照預算不可為負數。", "每月醫療預算");
  if (input.spending.longTermCareEnabled && (input.spending.longTermCareStartAge ?? 80) < input.profile.retirementAge) fail(0, "長照開始年齡不可早於退休年齡。", "從幾歲開始預留");
  if (input.spending.longTermCareEnabled && (input.spending.longTermCareStartAge ?? 80) > input.profile.longevityAge) fail(0, "長照開始年齡不可晚於規劃年齡。", "從幾歲開始預留");
  input.investment.holdings.forEach((holding, index) => {
    const name = holding.name.trim() || `第 ${index + 1} 筆投資`;
    if (holding.valueNow < 0) fail(4, `${name}目前市值不可為負數。`, "目前市值", holding.id);
    if (holding.monthlyContributionToday < 0) fail(4, `${name}每月投入不可為負數。`, "每月投入", holding.id);
  });
  if (input.partTime.enabled && input.partTime.monthlyToday < 0) fail(0, "兼職收入不可為負數。", "每月兼職收入");
  if (input.laborInsurance.insuredYearsNow < 0 || laborInsuranceFutureYears(input) < 0 || input.laborInsurance.averageSalaryToday < 0) fail(1, "勞保年資與平均薪資不可為負數。", "目前勞保年資");
  if (input.nationalPension.enabled && (input.nationalPension.insuredYears <= 0 || input.nationalPension.insuredYears > 40)) fail(2, "國保年資請填大於 0、最多 40 年。", "已繳費的國保年資");
  if (input.laborPension.balanceNow < 0 || input.laborPension.monthlyWageToday < 0 || input.laborPension.seniorityYearsNow < 0 || laborPensionFutureYears(input) < 0) fail(3, "勞退餘額、年資與提繳工資不可為負數。", "目前專戶餘額");
  const annualRates = [input.economy.inflationRate, input.spending.rentInflationRate ?? input.economy.inflationRate, input.laborInsurance.salaryGrowthRate, input.laborPension.wageGrowthRate, input.laborPension.returnRate, input.investment.contributionGrowthRate, input.investment.retirementGrossReturnRate, ...input.investment.holdings.map((holding) => holding.grossReturnRate)];
  if (input.partTime.enabled) annualRates.push(input.partTime.growthRate);
  if (annualRates.some((rate) => rate <= -1)) fail(0, "每年變動比例必須大於 -100%。");
  const investmentFees = [input.investment.retirementFeeRate, ...input.investment.holdings.map((holding) => holding.feeRate)];
  if (investmentFees.some((fee) => fee < 0 || fee >= 1)) fail(4, "投資費用率必須介於 0% 與 100% 之間。", "每年投資成本");
  if (input.laborPension.employerRate < 0 || input.laborPension.employerRate > 1) fail(3, "雇主提繳比例請填 0% 至 100%。", "公司提繳比例");
  if (input.laborPension.voluntaryRate < 0 || input.laborPension.voluntaryRate > 0.06) fail(3, "自己加碼提繳最多為 6%。", "自提比例");
  if (input.investment.withdrawalRule?.enabled && (input.investment.withdrawalRule.annualRate <= 0 || input.investment.withdrawalRule.annualRate >= 1)) fail(4, "本金維持試算比例請填 0% 至 100% 之間。", "每年領出比例");
  if (input.investment.stockPledge?.enabled) {
    const pledge = input.investment.stockPledge;
    if (pledge.loanToValue < 0 || pledge.loanToValue > 0.8) fail(4, "股票質押借款比例請填 0% 至 80%。", "借款占股票市值");
    if (pledge.annualInterestRate < 0 || pledge.annualInterestRate >= 1) fail(4, "股票質押年利率請填 0% 至 100% 之間。", "借款年利率");
    if (pledge.maintenanceRate < 1 || pledge.maintenanceRate > 10) fail(4, "股票質押維持率警戒線請填 100% 至 1000%。", "維持率警戒線");
  }
  const mix = input.investment.assetAllocation;
  if (mix && Math.abs(mix.stockRate + mix.bondRate + mix.cashRate - 1) > 0.001) fail(4, "股票、債券與現金比例加總必須是 100%。");
  if ((input.investment.retirementEffectiveTaxRate ?? 0) < 0 || (input.investment.retirementEffectiveTaxRate ?? 0) > 0.5) fail(4, "退休後有效稅率請填 0% 至 50%。", "退休後有效稅率");
  const lumpReinvestRate = input.laborPension.lumpReinvestRate ?? 1;
  if (lumpReinvestRate < 0 || lumpReinvestRate > 1) fail(3, "勞退一次領投入比例請填 0% 至 100%。", "一次領後繼續投資的比例");
  if (input.partTime.enabled) {
    if (input.partTime.startAge < input.profile.retirementAge) fail(0, "兼職開始年齡不可早於退休年齡。", "兼職開始年齡");
    if (input.partTime.endAge < input.partTime.startAge) fail(0, "兼職結束年齡必須晚於或等於開始年齡。", "兼職結束年齡");
    if (input.partTime.endAge > input.profile.longevityAge) fail(0, "兼職結束年齡不可超過規劃年齡。", "兼職結束年齡");
  }

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirement = monthAtAge(birth, input.profile.retirementAge);
  if (retirement < asOf) fail(0, "退休日期不可早於試算基準月。", "想幾歲退休");

  const yearsToRetirement = yearsUntilRetirement(input);
  if (laborInsuranceFutureYears(input) > yearsToRetirement + 1 / 12) fail(1, "未來勞保年資不可超過距退休的時間。", "未來還會加保");
  if (laborPensionFutureYears(input) > yearsToRetirement + 1 / 12) fail(3, "未來勞退年資不可超過距退休的時間。", "未來還會提繳");

  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  if (input.laborInsurance.claimAge < normalAge - 5) fail(1, `勞保最早只能在 ${normalAge - 5} 歲請領。`, "預計開始領取");
  if (input.laborInsurance.claimAge < input.profile.retirementAge) fail(1, "勞保請領年齡不可早於退休年齡。", "預計開始領取");
  if (input.laborInsurance.claimAge > input.profile.longevityAge) fail(1, "勞保請領年齡不可晚於規劃年齡。", "預計開始領取");
  const laborYearsAtClaim = input.laborInsurance.insuredYearsNow + laborInsuranceFutureYears(input);
  if (input.nationalPension.enabled && input.laborInsurance.claimAge > TAIWAN_RULES_2026.nationalPension.eligibleAge && laborYearsAtClaim > 0 && laborYearsAtClaim < 15 && laborYearsAtClaim + input.nationalPension.insuredYears >= 15) {
    fail(1, "勞保和國保合計年資的年金要在 65 歲請領，不能套用延後請領增加。", "預計開始領取");
  }
  if (input.laborPension.claimAge < TAIWAN_RULES_2026.laborPension.eligibleAge) fail(3, "勞退請領年齡不可小於 60 歲。", "預計開始領取");
  if (input.laborPension.claimAge < input.profile.retirementAge) fail(3, "勞退請領年齡不可早於退休年齡。", "預計開始領取");
  if (input.laborPension.claimAge > input.profile.longevityAge) fail(3, "勞退請領年齡不可晚於規劃年齡。", "預計開始領取");

  const pensionYears = input.laborPension.seniorityYearsNow + laborPensionFutureYears(input);
  if (input.laborPension.mode === "monthly" && pensionYears < TAIWAN_RULES_2026.laborPension.minimumMonthlyYears) {
    fail(3, "勞退年資未滿 15 年，不能使用月退休金模式。");
  }

  return errors;
}
