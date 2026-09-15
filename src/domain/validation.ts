import type { PlanningInput } from "./types";
import { laborInsuranceNormalAge, TAIWAN_RULES_2026 } from "../rules/taiwan-2026";
import { birthSerial, monthAtAge, toSerial } from "./time";

export function validateInput(input: PlanningInput): string[] {
  const errors: string[] = [];
  const finite = (value: number, label: string) => {
    if (!Number.isFinite(value)) errors.push(`${label}必須是有效數字。`);
  };

  finite(input.spending.monthlyToday, "每月生活費");
  finite(input.investment.assetsNow, "目前投資資產");
  finite(input.investment.grossReturnRate, "投資報酬率");
  finite(input.economy.inflationRate, "通膨率");

  if (input.profile.birthMonth < 1 || input.profile.birthMonth > 12) errors.push("出生月份必須介於 1 至 12。 ");
  if (input.profile.retirementAge < 18) errors.push("退休年齡不可小於 18 歲。");
  if (input.profile.longevityAge <= input.profile.retirementAge) errors.push("規劃年齡必須晚於退休年齡。");
  if (input.spending.monthlyToday < 0) errors.push("生活費不可為負數。");
  if (input.investment.assetsNow < 0 || input.investment.monthlyContributionToday < 0) errors.push("投資資產與投入不可為負數。");
  if (input.laborPension.balanceNow < 0 || input.laborPension.monthlyWageToday < 0) errors.push("勞退餘額與提繳工資不可為負數。");
  if (input.economy.inflationRate <= -1 || input.investment.grossReturnRate <= -1 || input.laborPension.returnRate <= -1) errors.push("每年變動比例必須大於 -100%。");
  if (input.investment.feeRate < 0 || input.investment.feeRate >= 1) errors.push("投資費用率必須介於 0% 與 100% 之間。");

  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirement = monthAtAge(birth, input.profile.retirementAge);
  if (retirement < asOf) errors.push("退休日期不可早於試算基準月。");

  const yearsToRetirement = Math.max(0, (retirement - asOf) / 12);
  if (input.laborInsurance.insuredYearsFuture > yearsToRetirement + 1 / 12) errors.push("未來勞保年資不可超過距退休的時間。");
  if (input.laborPension.seniorityYearsFuture > yearsToRetirement + 1 / 12) errors.push("未來勞退年資不可超過距退休的時間。");

  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);
  if (input.laborInsurance.claimAge < normalAge - 5) errors.push(`勞保最早只能在 ${normalAge - 5} 歲請領。`);
  if (input.laborInsurance.claimAge < input.profile.retirementAge) errors.push("勞保請領年齡不可早於退休年齡。");
  if (input.laborPension.claimAge < TAIWAN_RULES_2026.laborPension.eligibleAge) errors.push("勞退請領年齡不可小於 60 歲。");
  if (input.laborPension.claimAge < input.profile.retirementAge) errors.push("勞退請領年齡不可早於退休年齡。");

  const pensionYears = input.laborPension.seniorityYearsNow + input.laborPension.seniorityYearsFuture;
  if (input.laborPension.mode === "monthly" && pensionYears < TAIWAN_RULES_2026.laborPension.minimumMonthlyYears) {
    errors.push("勞退年資未滿 15 年，不能使用月退休金模式。");
  }

  return errors;
}
