import { describe, expect, it } from "vitest";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import { makeInput } from "../test-fixtures";
import { projectInvestmentAtRetirement, projectInvestmentHoldingsAtRetirement } from "./investment";

describe("investment accumulation", () => {
  it("equals principal plus contributions when return and growth are zero", () => {
    const input = makeInput({
      investment: {
        holdings: [{ id: "0050", name: "0050", valueNow: 1_000_000, monthlyContributionToday: 10_000, grossReturnRate: 0, feeRate: 0 }],
        contributionGrowthRate: 0,
      }
    });
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    const months = monthAtAge(birth, input.profile.retirementAge) - toSerial(input.asOf.year, input.asOf.month);
    expect(projectInvestmentAtRetirement(input)).toBe(1_000_000 + 10_000 * months);
  });

  it("retains negative returns instead of clamping them to zero", () => {
    const holding = { id: "fund", name: "投資", valueNow: 1_000_000, monthlyContributionToday: 0, feeRate: 0 };
    const zero = makeInput({ investment: { holdings: [{ ...holding, grossReturnRate: 0 }], contributionGrowthRate: 0 } });
    const negative = makeInput({ investment: { holdings: [{ ...holding, grossReturnRate: -0.02 }], contributionGrowthRate: 0 } });
    expect(projectInvestmentAtRetirement(negative)).toBeLessThan(projectInvestmentAtRetirement(zero));
  });

  it("compounds multiple holdings independently before adding them together", () => {
    const first = { id: "first", name: "第一筆", valueNow: 700_000, monthlyContributionToday: 8_000, grossReturnRate: 0.07, feeRate: 0.002 };
    const second = { id: "second", name: "第二筆", valueNow: 300_000, monthlyContributionToday: 2_000, grossReturnRate: 0.03, feeRate: 0.001 };
    const combined = projectInvestmentAtRetirement(makeInput({ investment: { holdings: [first, second] } }));
    const firstOnly = projectInvestmentAtRetirement(makeInput({ investment: { holdings: [first] } }));
    const secondOnly = projectInvestmentAtRetirement(makeInput({ investment: { holdings: [second] } }));
    expect(combined).toBeCloseTo(firstOnly + secondOnly, 6);
  });

  it("returns one auditable retirement value for each holding", () => {
    const holdings = [
      { id: "first", name: "第一筆", valueNow: 700_000, monthlyContributionToday: 8_000, grossReturnRate: 0.07, feeRate: 0.002 },
      { id: "second", name: "第二筆", valueNow: 300_000, monthlyContributionToday: 2_000, grossReturnRate: 0.03, feeRate: 0.001 }
    ];
    const result = projectInvestmentHoldingsAtRetirement(makeInput({ investment: { holdings } }));
    expect(result.map((holding) => holding.name)).toEqual(["第一筆", "第二筆"]);
    expect(result.reduce((sum, holding) => sum + holding.projectedValueNominal, 0)).toBeCloseTo(projectInvestmentAtRetirement(makeInput({ investment: { holdings } })), 6);
  });
});
