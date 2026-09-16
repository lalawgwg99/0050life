import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeInput } from "../test-fixtures";
import { projectPlan } from "./project";
import { summarizeResult } from "./result-summary";
import { estimateAdditionalMonthlyInvestment } from "./actions";
import { ResultsPanel } from "../components/ResultsPanel";

describe("consistent asset comparisons", () => {
  it("shows the reported 611 surplus without a false 121萬 gap", () => {
    const result = projectPlan(makeInput({ economy: { inflationRate: 0 } }));
    Object.assign(result, {
      projectedInvestmentAtRetirement: 4_138_324,
      lumpPensionAmountAtRetirement: 1_212_181,
      projectedRetirementAssetsAtRetirement: 5_350_505,
      requiredInvestmentAtRetirement: 4_137_713,
      requiredRetirementAssetsAtRetirement: 5_349_894,
      investmentGapAtRetirement: 0,
      depletedMonth: null
    });
    expect(summarizeResult(result)).toMatchObject({ gap: 0, surplus: 611, meetsPlan: true });
    expect(estimateAdditionalMonthlyInvestment(result.input, result)).toBe(0);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, scenarios: [], onChange: () => {} }));
    expect(html).toContain("超過目標</span><strong>$611");
    expect(html).toContain("退休時可運用資產</span><strong>$5,350,505");
    expect(html).not.toContain("退休準備還差");
    expect(html).not.toContain('aria-label="改善建議"');
  });

  for (const claimAge of [65, 67]) {
    for (const reinvest of [0, 0.5, 1]) {
      it(`uses the same gap with claim age ${claimAge}, reinvest ${reinvest}`, () => {
        const input = makeInput({ economy: { inflationRate: 0 }, laborPension: { claimAge, lumpReinvestRate: reinvest } });
        const result = projectPlan(input);
        const summary = summarizeResult(result);
        expect(summary.available - summary.target).toBeCloseTo(result.projectedInvestmentAtRetirement - result.requiredInvestmentAtRetirement, 5);
        expect(summary.gap).toBeCloseTo(result.investmentGapAtRetirement, 5);
        if (claimAge > input.profile.retirementAge) expect(result.lumpPensionAmountAtRetirement).toBe(0);
      });
    }
  }

  it("changes all status and action decisions across the funding boundary", () => {
    const input = makeInput({
      asOf: { year: 2056, month: 4 }, economy: { inflationRate: 0 },
      laborInsurance: { insuredYearsFuture: 0 }, laborPension: { seniorityYearsFuture: 0 },
      spending: { monthlyToday: 100_000 }
    });
    const target = projectPlan(input).requiredInvestmentAtRetirement;
    for (const difference of [-1_000, 1_000]) {
      const result = projectPlan({ ...input, investment: { ...input.investment, holdings: [{ id: "cash", name: "投資", valueNow: target + difference, monthlyContributionToday: 0, grossReturnRate: 0, feeRate: 0 }] } });
      expect(summarizeResult(result).meetsPlan).toBe(difference > 0);
      expect(summarizeResult(result).gap).toBeCloseTo(Math.max(0, -difference), 3);
    }
  });
});
