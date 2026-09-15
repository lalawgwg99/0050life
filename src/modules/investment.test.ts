import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectInvestmentAtRetirement } from "./investment";

describe("investment accumulation", () => {
  it("equals principal plus contributions when return and growth are zero", () => {
    const input = makeInput({
      investment: {
        assetsNow: 1_000_000,
        monthlyContributionToday: 10_000,
        contributionGrowthRate: 0,
        grossReturnRate: 0,
        feeRate: 0
      }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const months = monthAtAge(birth, input.profile.retirementAge) - toSerial(input.asOf.year, input.asOf.month);
    expect(projectInvestmentAtRetirement(input)).toBe(1_000_000 + 10_000 * months);
  });

  it("retains negative returns instead of clamping them to zero", () => {
    const zero = makeInput({ investment: { grossReturnRate: 0, feeRate: 0, contributionGrowthRate: 0 } });
    const negative = makeInput({ investment: { grossReturnRate: -0.02, feeRate: 0, contributionGrowthRate: 0 } });
    expect(projectInvestmentAtRetirement(negative)).toBeLessThan(projectInvestmentAtRetirement(zero));
  });
});
