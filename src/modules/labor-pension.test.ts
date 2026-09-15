import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectLaborPension } from "./labor-pension";

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
        mode: "lump",
        payoutYears: 20
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
    expect(result.initialMonthlyNominal).toBeGreaterThan(0);
    expect(result.events.get(result.claimMonth)).toBeCloseTo(result.initialMonthlyNominal, 6);
    expect(result.events.size).toBe(input.laborPension.payoutYears * 12);
    expect(result.accountByMonth.get(result.claimMonth + input.laborPension.payoutYears * 12 - 1)).toBeCloseTo(0, 4);
  });
});
