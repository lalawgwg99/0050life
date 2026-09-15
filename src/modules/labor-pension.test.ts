import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectLaborPension } from "./labor-pension";
import { laborPensionRemainingYears } from "../rules/taiwan-2026";

describe("labor pension", () => {
  it("preserves the account under zero return and zero contributions before a lump claim", () => {
    const input = makeInput({
      laborPension: {
        balanceNow: 500_000,
        seniorityYearsNow: 20,
        seniorityYearsFuture: 0,
        monthlyWageToday: 0,
        wageGrowthRate: 0,
        employerRate: 0.06,
        voluntaryRate: 0,
        returnRate: 0,
        claimAge: 65,
        mode: "lump"
      }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborPension(input, monthAtAge(birth, 90));
    expect(result.balanceAtClaim).toBe(500_000);
    expect(result.events.get(result.claimMonth)).toBe(500_000);
    expect(result.accountByMonth.get(result.claimMonth)).toBe(0);
  });

  it("pays a monthly annuity without also emitting a lump sum", () => {
    const input = makeInput({ laborPension: { mode: "monthly" } });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborPension(input, monthAtAge(birth, 90));
    const payoutMonths = laborPensionRemainingYears(input.laborPension.claimAge) * 12;
    expect(result.initialMonthlyNominal).toBeGreaterThan(0);
    expect(result.events.get(result.claimMonth)).toBeCloseTo(result.initialMonthlyNominal, 6);
    expect(result.events.size).toBe(payoutMonths);
    expect(result.accountByMonth.get(result.claimMonth + payoutMonths - 1)).toBeCloseTo(0, 4);
  });

  it("matches the official age-65 annuity-due formula", () => {
    const input = makeInput({
      laborPension: {
        balanceNow: 1_000_000,
        seniorityYearsNow: 20,
        seniorityYearsFuture: 0,
        monthlyWageToday: 0,
        returnRate: 0,
        claimAge: 65,
        mode: "monthly"
      }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborPension(input, monthAtAge(birth, 90));
    const annualRate = 0.011473;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const expected = 1_000_000 * monthlyRate / (1 - Math.pow(1 + annualRate, -19)) / (1 + monthlyRate);
    expect(result.initialMonthlyNominal).toBeCloseTo(expected, 8);
  });
});
