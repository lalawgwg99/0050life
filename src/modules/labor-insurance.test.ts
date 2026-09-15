import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectLaborInsurance } from "./labor-insurance";

describe("labor insurance", () => {
  it("matches the statutory better-of-two annuity formulas", () => {
    const input = makeInput({
      economy: { inflationRate: 0 },
      laborInsurance: {
        insuredYearsNow: 30,
        insuredYearsFuture: 0,
        averageSalaryToday: 45_800,
        salaryGrowthRate: 0,
        claimAge: 65,
        indexation: "none"
      }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborInsurance(input, monthAtAge(birth, 90));
    expect(result.initialMonthlyNominal).toBeCloseTo(45_800 * 30 * 0.0155, 8);
    expect(result.events.get(result.claimMonth - 1)).toBeUndefined();
    expect(result.events.get(result.claimMonth)).toBeCloseTo(21_297, 8);
  });

  it("applies the maximum five-year early reduction", () => {
    const input = makeInput({
      profile: { birthYearROC: 80, birthMonth: 4, retirementAge: 60, longevityAge: 90 },
      economy: { inflationRate: 0 },
      laborInsurance: {
        insuredYearsNow: 30,
        insuredYearsFuture: 0,
        averageSalaryToday: 45_800,
        salaryGrowthRate: 0,
        claimAge: 60,
        indexation: "none"
      },
      laborPension: { claimAge: 60 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborInsurance(input, monthAtAge(birth, 90));
    expect(result.initialMonthlyNominal).toBeCloseTo(21_297 * 0.8, 8);
  });

  it("keeps payments fixed until cumulative CPI reaches the threshold", () => {
    const input = makeInput({ laborInsurance: { indexation: "threshold" } });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborInsurance(input, monthAtAge(birth, 90));
    const first = result.events.get(result.claimMonth)!;
    expect(result.events.get(result.claimMonth + 12)).toBe(first);
    expect([...result.events.values()].some((amount) => amount > first * 1.049)).toBe(true);
  });

  it("does not add a delayed-claim bonus to the combined labor and national pension case", () => {
    const input = makeInput({
      nationalPension: { enabled: true, insuredYears: 5 },
      laborInsurance: { insuredYearsNow: 10, insuredYearsFuture: 0, futureYearsMode: "custom", averageSalaryToday: 45_800, salaryGrowthRate: 0, claimAge: 65 },
      economy: { inflationRate: 0 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectLaborInsurance(input, monthAtAge(birth, 90));
    expect(result.eligibleByCombinedYears).toBe(true);
    expect(result.initialMonthlyNominal).toBeCloseTo(45_800 * 10 * 0.0155, 8);
  });
});
