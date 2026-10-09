import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectNationalPension, estimateNationalYearsOnEnable } from "./national-pension";

describe("national pension", () => {
  it("uses B formula when the user receives a labor insurance annuity", () => {
    const input = makeInput({
      nationalPension: { enabled: true, insuredYears: 5, aFormulaEligible: true, indexation: "none" },
      economy: { inflationRate: 0 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectNationalPension(input, monthAtAge(birth, 90), true);

    expect(result.formulaUsed).toBe("B");
    expect(result.initialMonthlyNominal).toBeCloseTo(21_103 * 5 * 0.013, 8);
    expect(result.events.get(result.claimMonth)).toBe(result.initialMonthlyNominal);
  });

  it("uses the better A formula only after the user confirms eligibility", () => {
    const input = makeInput({
      nationalPension: { enabled: true, insuredYears: 5, aFormulaEligible: true, indexation: "none" },
      economy: { inflationRate: 0 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectNationalPension(input, monthAtAge(birth, 90), false);

    expect(result.formulaUsed).toBe("A");
    expect(result.initialMonthlyNominal).toBeCloseTo(21_103 * 5 * 0.0065 + 4_049, 8);
  });

  it("does not create payments when the optional section is off", () => {
    const input = makeInput({ nationalPension: { enabled: false, insuredYears: 8, aFormulaEligible: true, indexation: "none" } });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectNationalPension(input, monthAtAge(birth, 90), false);

    expect(result.formulaUsed).toBe("none");
    expect(result.events.size).toBe(0);
  });

  it("carries announced CPI threshold adjustments into a later claim", () => {
    const input = makeInput({
      nationalPension: { enabled: true, insuredYears: 5, aFormulaEligible: false, indexation: "threshold" },
      economy: { inflationRate: 0.03 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectNationalPension(input, monthAtAge(birth, 90), false);

    expect(result.initialMonthlyNominal).toBeGreaterThan(21_103 * 5 * 0.013);
  });

  it("leaves the announced amount unchanged when future indexation is turned off", () => {
    const input = makeInput({
      nationalPension: { enabled: true, insuredYears: 5, aFormulaEligible: false, indexation: "none" },
      economy: { inflationRate: 0.03 }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const result = projectNationalPension(input, monthAtAge(birth, 90), false);

    expect(result.initialMonthlyNominal).toBeCloseTo(21_103 * 5 * 0.013, 8);
  });
});

describe("estimateNationalYearsOnEnable", () => {
  it("estimates the gap between the national-pension window and labor insurance years", () => {
    // fixture：退休 65 歲、勞保 10＋29＝39 年 → 65-25-39＝1
    const input = makeInput();
    expect(estimateNationalYearsOnEnable(input)).toBe(1);
  });

  it("returns 0 when labor insurance already covers the whole window", () => {
    const input = makeInput({
      laborInsurance: { insuredYearsNow: 20, insuredYearsFuture: 20, futureYearsMode: "custom" }
    });
    expect(estimateNationalYearsOnEnable(input)).toBe(0);
  });

  it("ignores labor years when the labor module is disabled", () => {
    const input = makeInput({ laborInsurance: { enabled: false } });
    // 65-25＝40，上限 40
    expect(estimateNationalYearsOnEnable(input)).toBe(40);
  });

  it("caps coverage at the claim age when retiring before 65", () => {
    const input = makeInput({ profile: { retirementAge: 60 } });
    // 60-25-39＜0 → 0
    expect(estimateNationalYearsOnEnable(input)).toBe(0);
  });

  it("rounds fractional estimates to one decimal", () => {
    const input = makeInput({
      laborInsurance: { insuredYearsNow: 10, insuredYearsFuture: 28.75, futureYearsMode: "custom" }
    });
    expect(estimateNationalYearsOnEnable(input)).toBe(1.3);
  });
});
