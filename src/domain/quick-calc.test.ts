import { describe, expect, it } from "vitest";
import { defaultInput } from "../defaults";
import { projectPlan } from "../engine/project";
import { validateInput } from "./validation";
import {
  isQuickInputComplete,
  quickInputFromPlanning,
  quickInputToPlanning,
  type QuickInput
} from "./quick-calc";

const validQuick: QuickInput = {
  currentAge: 35,
  retirementAge: 65,
  savings: 1_000_000,
  monthlyInvestment: 20_000,
  monthlySpending: 50_000,
  returnRatePercent: 8
};

describe("quickInputFromPlanning", () => {
  it("由完整輸入推導 6 個快算欄位", () => {
    const quick = quickInputFromPlanning(defaultInput);
    expect(quick.currentAge).toBe(defaultInput.asOf.year - (defaultInput.profile.birthYearROC + 1911));
    expect(quick.retirementAge).toBe(defaultInput.profile.retirementAge);
    expect(quick.savings).toBe(defaultInput.investment.holdings[0].valueNow);
    expect(quick.monthlyInvestment).toBe(defaultInput.investment.holdings[0].monthlyContributionToday);
    expect(quick.monthlySpending).toBe(defaultInput.spending.monthlyToday);
    expect(quick.returnRatePercent).toBe(defaultInput.investment.holdings[0].grossReturnRate * 100);
  });
});

describe("quickInputToPlanning", () => {
  it("6 欄正確映射：年齡→民國出生年、百分比→小數、單一持有部位", () => {
    const mapped = quickInputToPlanning(validQuick, defaultInput, "快算投資");
    const thisYear = new Date().getFullYear();
    expect(mapped.profile.birthYearROC).toBe(thisYear - 35 - 1911);
    expect(mapped.profile.birthMonth).toBe(1);
    expect(mapped.profile.retirementAge).toBe(65);
    expect(mapped.investment.holdings).toHaveLength(1);
    const holding = mapped.investment.holdings[0];
    expect(holding.name).toBe("快算投資");
    expect(holding.valueNow).toBe(1_000_000);
    expect(holding.monthlyContributionToday).toBe(20_000);
    expect(holding.grossReturnRate).toBeCloseTo(0.08, 10);
    expect(mapped.investment.retirementGrossReturnRate).toBeCloseTo(0.08, 10);
    expect(mapped.spending.monthlyToday).toBe(50_000);
  });

  it("年金與兼職模組全部關閉（快算只算自己的投資）", () => {
    const mapped = quickInputToPlanning(validQuick, defaultInput, "x");
    expect(mapped.laborInsurance.enabled).toBe(false);
    expect(mapped.nationalPension.enabled).toBe(false);
    expect(mapped.laborPension.enabled).toBe(false);
    expect(mapped.partTime.enabled).toBe(false);
    expect(mapped.spending.longTermCareEnabled).toBe(false);
  });

  it("退休年齡不合理時自動往後推（至少比目前年齡大 1 歲），避免驗證錯誤", () => {
    const mapped = quickInputToPlanning({ ...validQuick, currentAge: 64, retirementAge: 60 }, defaultInput, "x");
    expect(mapped.profile.retirementAge).toBe(65);
    expect(mapped.profile.longevityAge).toBeGreaterThan(mapped.profile.retirementAge);
  });

  it("映射結果能通過完整驗證（可以直接丟進引擎）", () => {
    const mapped = quickInputToPlanning(validQuick, defaultInput, "x");
    expect(validateInput(mapped)).toEqual([]);
  });

  it("保留使用者的幣別與通膨等基礎設定", () => {
    const mapped = quickInputToPlanning(validQuick, defaultInput, "x");
    expect(mapped.profile.currency).toBe(defaultInput.profile.currency);
    expect(mapped.economy.inflationRate).toBe(defaultInput.economy.inflationRate);
  });
});

describe("isQuickInputComplete", () => {
  it("6 欄皆為有效數字才算完整", () => {
    expect(isQuickInputComplete(validQuick)).toBe(true);
    expect(isQuickInputComplete({ ...validQuick, savings: Number.NaN })).toBe(false);
    expect(isQuickInputComplete({ ...validQuick, returnRatePercent: Number.NaN })).toBe(false);
  });
});

describe("quick calc end-to-end", () => {
  it("映射後的輸入可直接跑完整引擎並得到一句話結論", () => {
    const mapped = quickInputToPlanning(validQuick, defaultInput, "x");
    const result = projectPlan(mapped);
    expect(result.records.length).toBeGreaterThan(0);
    // 結論二選一：撐到規劃終點，或有明確的耗盡月份
    expect(result.depletedMonth === null || result.depletedMonth > 0).toBe(true);
    // 快算預設值（35 歲、8% 報酬）應足以撐過規劃終點
    expect(result.depletedMonth).toBeNull();
  });

  it("報酬率調低會讓結論變差（引擎真的有在算，不是寫死的）", () => {
    const poor = quickInputToPlanning({ ...validQuick, returnRatePercent: 1, monthlyInvestment: 0, savings: 100_000 }, defaultInput, "x");
    const result = projectPlan(poor);
    expect(result.depletedMonth).not.toBeNull();
  });
});
