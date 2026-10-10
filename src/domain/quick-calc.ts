import type { PlanningInput } from "./types";

/**
 * 首屏「快算版」的 6 個欄位（借鏡 Vanguard Nest Egg／FIRECalc 的極簡輸入）：
 * 30 秒填完、即時看到「資產幾歲用完」；完整參數收進第二層（完整模式）。
 */
export interface QuickInput {
  /** 目前年齡（歲） */
  currentAge: number;
  /** 預計退休年齡（歲） */
  retirementAge: number;
  /** 已有儲蓄（今日幣值） */
  savings: number;
  /** 每月可投入（今日幣值） */
  monthlyInvestment: number;
  /** 退休後每月花費（今日幣值） */
  monthlySpending: number;
  /** 預估年化報酬率（百分比數字，例如 5 代表 5%） */
  returnRatePercent: number;
}

/** 6 欄都填了有效數字才計算；Field 清空時會給 NaN */
export function isQuickInputComplete(quick: QuickInput): boolean {
  return [
    quick.currentAge,
    quick.retirementAge,
    quick.savings,
    quick.monthlyInvestment,
    quick.monthlySpending,
    quick.returnRatePercent
  ].every((value) => Number.isFinite(value));
}

/** 由完整 PlanningInput 推導快算初始值（回頭客直接看到自己的數字） */
export function quickInputFromPlanning(input: PlanningInput): QuickInput {
  const holding = input.investment.holdings[0];
  return {
    currentAge: Math.max(18, input.asOf.year - (input.profile.birthYearROC + 1911)),
    retirementAge: input.profile.retirementAge,
    savings: holding?.valueNow ?? 0,
    monthlyInvestment: holding?.monthlyContributionToday ?? 0,
    monthlySpending: input.spending.monthlyToday,
    returnRatePercent: Math.round((holding?.grossReturnRate ?? 0.06) * 1000) / 10
  };
}

/**
 * 快算 6 欄 → 完整 PlanningInput。
 * 只計算「自己的投資儲蓄」：勞保／國保／勞退／兼職四個模組全部關閉，
 * 呼叫端用完整版微調時再自行打開。holdingName 由呼叫端傳入已翻譯字串，
 * 保持此模組純函數、不碰 i18n。
 */
export function quickInputToPlanning(quick: QuickInput, base: PlanningInput, holdingName: string): PlanningInput {
  const today = new Date();
  const currentAge = Math.round(quick.currentAge);
  const retirementAge = Math.max(Math.round(quick.retirementAge), currentAge + 1);
  const returnRate = quick.returnRatePercent / 100;
  return {
    ...base,
    asOf: { year: today.getFullYear(), month: today.getMonth() + 1 },
    profile: {
      ...base.profile,
      birthYearROC: today.getFullYear() - currentAge - 1911,
      birthMonth: 1,
      retirementAge,
      longevityAge: Math.max(base.profile.longevityAge, retirementAge + 1)
    },
    spending: {
      ...base.spending,
      monthlyToday: Math.max(0, quick.monthlySpending),
      rentMonthlyToday: 0,
      medicalMonthlyToday: 0,
      longTermCareEnabled: false,
      longTermCareMonthlyToday: 0
    },
    laborInsurance: { ...base.laborInsurance, enabled: false },
    nationalPension: { ...base.nationalPension, enabled: false },
    laborPension: { ...base.laborPension, enabled: false },
    partTime: { ...base.partTime, enabled: false },
    investment: {
      ...base.investment,
      holdings: [{
        id: "quick",
        name: holdingName,
        valueNow: Math.max(0, quick.savings),
        monthlyContributionToday: Math.max(0, quick.monthlyInvestment),
        grossReturnRate: returnRate,
        feeRate: 0.003
      }],
      retirementGrossReturnRate: returnRate
    }
  };
}
