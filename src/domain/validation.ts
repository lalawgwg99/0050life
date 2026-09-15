import type { PlanningInput } from "./types";
import { laborInsuranceNormalAge, TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { birthSerial, monthAtAge, toSerial } from "./time";
import { laborInsuranceFutureYears, laborPensionFutureYears, yearsUntilRetirement } from "./coverage";

export function validateInput(input: PlanningInput): string[] {
  const errors: string[] = [];
  const values: Array<[number, string]> = [
    [input.profile.birthYearROC, "出生年"],
    [input.profile.birthMonth, "出生月份"],
    [input.profile.retirementAge, "退休年齡"],
    [input.profile.longevityAge, "規劃年齡"],
    [input.spending.monthlyToday, "每月生活費"],
    [input.economy.inflationRate, "物價上漲率"],
    [input.laborInsurance.insuredYearsNow, "目前勞保年資"],
    [input.laborInsurance.averageSalaryToday, "勞保平均薪資"],
    [input.laborInsurance.salaryGrowthRate, "投保薪資成長率"],
    [input.laborInsurance.claimAge, "勞保請領年齡"],
    [input.laborPension.balanceNow, "勞退專戶餘額"],
    [input.laborPension.seniorityYearsNow, "目前勞退年資"],
    [input.laborPension.monthlyWageToday, "勞退提繳工資"],
    [input.laborPension.wageGrowthRate, "提繳工資成長率"],
    [input.laborPension.employerRate, "雇主提繳比例"],
    [input.laborPension.voluntaryRate, "自願提繳比例"],
    [input.laborPension.returnRate, "勞退專戶成長率"],
    [input.laborPension.claimAge, "勞退請領年齡"],
    [input.investment.contributionGrowthRate, "每月投入成長率"],
    [input.investment.retirementGrossReturnRate, "退休後投資報酬率"],
    [input.investment.retirementFeeRate, "退休後投資費用率"]
  ];
  if (input.laborInsurance.futureYearsMode !== "until-retirement") values.push([input.laborInsurance.insuredYearsFuture, "未來勞保年資"]);
  if (input.laborPension.futureYearsMode !== "until-retirement") values.push([input.laborPension.seniorityYearsFuture, "未來勞退年資"]);
  input.investment.holdings.forEach((holding, index) => {
    const name = holding.name.trim() || `第 ${index + 1} 筆投資`;
    values.push(
      [holding.valueNow, `${name}目前市值`],
      [holding.monthlyContributionToday, `${name}每月投入`],
      [holding.grossReturnRate, `${name}總報酬率`],
      [holding.feeRate, `${name}費用率`]
    );
  });
  if (input.partTime.enabled) {
    values.push(
      [input.partTime.monthlyToday, "兼職收入"],
      [input.partTime.startAge, "兼職開始年齡"],
      [input.partTime.endAge, "兼職結束年齡"],
      [input.partTime.growthRate, "兼職收入成長率"]
    );
  }
  if (input.nationalPension.enabled) values.push([input.nationalPension.insuredYears, "國保年資"]);
  for (const [value, label] of values) {
    if (!Number.isFinite(value)) errors.push(`${label}需要填入數字。`);
  }
  if (errors.length > 0) return errors;
  if (input.investment.holdings.some((holding) => holding.name.trim() === "")) errors.push("每筆投資都需要填名稱。");

  if (input.profile.birthYearROC < 1 || input.profile.birthYearROC > 140) errors.push("出生年請填民國 1 至 140 年。");
  if (input.profile.birthMonth < 1 || input.profile.birthMonth > 12) errors.push("出生月份請填 1 至 12。");
  if (input.profile.retirementAge < 18 || input.profile.retirementAge > 100) errors.push("退休年齡請填 18 至 100 歲。");
  if (input.profile.longevityAge > 120) errors.push("規劃年齡最多可填到 120 歲。");
  const ages = [input.profile.retirementAge, input.profile.longevityAge, input.laborInsurance.claimAge, input.laborPension.claimAge];
  if (input.partTime.enabled) ages.push(input.partTime.startAge, input.partTime.endAge);
  if (!Number.isInteger(input.profile.birthYearROC) || !Number.isInteger(input.profile.birthMonth) || ages.some((age) => !Number.isInteger(age))) errors.push("出生年月與各項年齡請填整數。");
  if (input.profile.longevityAge <= input.profile.retirementAge) errors.push("規劃年齡必須晚於退休年齡。");
  if (input.spending.monthlyToday < 0) errors.push("生活費不可為負數。");
  if (input.investment.holdings.some((holding) => holding.valueNow < 0 || holding.monthlyContributionToday < 0)) errors.push("投資市值與每月投入不可為負數。");
  if (input.partTime.enabled && input.partTime.monthlyToday < 0) errors.push("兼職收入不可為負數。");
  if (input.laborInsurance.insuredYearsNow < 0 || laborInsuranceFutureYears(input) < 0 || input.laborInsurance.averageSalaryToday < 0) errors.push("勞保年資與平均薪資不可為負數。");
  if (input.nationalPension.enabled && (input.nationalPension.insuredYears <= 0 || input.nationalPension.insuredYears > 40)) errors.push("國保年資請填大於 0、最多 40 年。");
  if (input.laborPension.balanceNow < 0 || input.laborPension.monthlyWageToday < 0 || input.laborPension.seniorityYearsNow < 0 || laborPensionFutureYears(input) < 0) errors.push("勞退餘額、年資與提繳工資不可為負數。");
  const annualRates = [input.economy.inflationRate, input.laborInsurance.salaryGrowthRate, input.laborPension.wageGrowthRate, input.laborPension.returnRate, input.investment.contributionGrowthRate, input.investment.retirementGrossReturnRate, ...input.investment.holdings.map((holding) => holding.grossReturnRate)];
  if (input.partTime.enabled) annualRates.push(input.partTime.growthRate);
  if (annualRates.some((rate) => rate <= -1)) errors.push("每年變動比例必須大於 -100%。");
  const investmentFees = [input.investment.retirementFeeRate, ...input.investment.holdings.map((holding) => holding.feeRate)];
  if (investmentFees.some((fee) => fee < 0 || fee >= 1)) errors.push("投資費用率必須介於 0% 與 100% 之間。");
  if (input.laborPension.employerRate < 0 || input.laborPension.employerRate > 1) errors.push("雇主提繳比例請填 0% 至 100%。");
  if (input.laborPension.voluntaryRate < 0 || input.laborPension.voluntaryRate > 0.06) errors.push("自己加碼提繳最多為 6%。");
  if (input.partTime.enabled) {
    if (input.partTime.startAge < input.profile.retirementAge) errors.push("兼職開始年齡不可早於退休年齡。");
    if (input.partTime.endAge < input.partTime.startAge) errors.push("兼職結束年齡必須晚於或等於開始年齡。");
    if (input.partTime.endAge > input.profile.longevityAge) errors.push("兼職結束年齡不可超過規劃年齡。");
  }

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirement = monthAtAge(birth, input.profile.retirementAge);
  if (retirement < asOf) errors.push("退休日期不可早於試算基準月。");

  const yearsToRetirement = yearsUntilRetirement(input);
  if (laborInsuranceFutureYears(input) > yearsToRetirement + 1 / 12) errors.push("未來勞保年資不可超過距退休的時間。");
  if (laborPensionFutureYears(input) > yearsToRetirement + 1 / 12) errors.push("未來勞退年資不可超過距退休的時間。");

  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  if (input.laborInsurance.claimAge < normalAge - 5) errors.push(`勞保最早只能在 ${normalAge - 5} 歲請領。`);
  if (input.laborInsurance.claimAge < input.profile.retirementAge) errors.push("勞保請領年齡不可早於退休年齡。");
  if (input.laborInsurance.claimAge > input.profile.longevityAge) errors.push("勞保請領年齡不可晚於規劃年齡。");
  const laborYearsAtClaim = input.laborInsurance.insuredYearsNow + laborInsuranceFutureYears(input);
  if (input.nationalPension.enabled && input.laborInsurance.claimAge > TAIWAN_RULES_2026.nationalPension.eligibleAge && laborYearsAtClaim > 0 && laborYearsAtClaim < 15 && laborYearsAtClaim + input.nationalPension.insuredYears >= 15) {
    errors.push("勞保和國保合計年資的年金要在 65 歲請領，不能套用延後請領增加。");
  }
  if (input.laborPension.claimAge < TAIWAN_RULES_2026.laborPension.eligibleAge) errors.push("勞退請領年齡不可小於 60 歲。");
  if (input.laborPension.claimAge < input.profile.retirementAge) errors.push("勞退請領年齡不可早於退休年齡。");
  if (input.laborPension.claimAge > input.profile.longevityAge) errors.push("勞退請領年齡不可晚於規劃年齡。");

  const pensionYears = input.laborPension.seniorityYearsNow + laborPensionFutureYears(input);
  if (input.laborPension.mode === "monthly" && pensionYears < TAIWAN_RULES_2026.laborPension.minimumMonthlyYears) {
    errors.push("勞退年資未滿 15 年，不能使用月退休金模式。");
  }

  return errors;
}
