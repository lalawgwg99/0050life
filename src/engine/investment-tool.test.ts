import { describe, expect, it } from "vitest";
import { calculateInvestment, solveMonthlyInvestment, type InvestmentPlan } from "./investment-tool";
import { makeInput } from "../test-fixtures";
import { projectInvestmentAtRetirement } from "../modules/investment";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import { projectPlan } from "./project";
import { simulateRetirement } from "./simulate";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ResultsPanel } from "../components/ResultsPanel";
import { formatMoney } from "../lib/format";

const base: InvestmentPlan = { holdings: [{ id: "one", name: "投資", valueNow: 100000, monthlyContributionToday: 1000, grossReturnRate: 0, feeRate: 0 }], months: 12, inflation: 0, contributionGrowth: 0, lumpMonth: 6, lumpAmount: 10000, withdrawal: 0 };
describe("independent investment tool", () => {
  it("has exact zero-return cash accounting", () => {
    const result = calculateInvestment(base);
    expect(result.final.nominal).toBe(122000);
    expect(result.final.gain).toBe(0);
    expect(result.records[4].nominal).toBe(105000);
    expect(result.records[5].nominal).toBe(116000);
  });
  it("matches retirement accumulation with the same settings, including fees", () => {
    const input = makeInput();
    const months = monthAtAge(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), input.profile.retirementAge) - toSerial(input.asOf.year, input.asOf.month);
    expect(calculateInvestment({ ...base, holdings: input.investment.holdings, months, contributionGrowth: input.investment.contributionGrowthRate, lumpAmount: 0 }).final.nominal).toBeCloseTo(projectInvestmentAtRetirement(input), 6);
  });
  it("inverts the target and counts withdrawals without negative balances", () => {
    expect(solveMonthlyInvestment({ ...base, lumpAmount: 0 }, 124000)).toBe(2000);
    const result = calculateInvestment({ ...base, lumpAmount: 0, withdrawal: 11000 });
    expect(result.depletedMonth).toBe(11);
    expect(result.final.nominal).toBe(0);
    expect(result.final.principal + result.final.gain - result.withdrawn).toBeCloseTo(0);
  });
  it("discounts future money and supports negative returns", () => {
    const result = calculateInvestment({ ...base, inflation: 0.02 }, -0.02);
    expect(result.final.today).toBeCloseTo(result.final.nominal / 1.02);
    expect(result.final.gain).toBeLessThan(0);
  });
  it("rejects invalid months and non-finite or negative input", () => {
    for (const patch of [{ months: 0 }, { months: 1201 }, { lumpMonth: 13 }, { withdrawal: -1 }, { inflation: NaN }]) expect(() => calculateInvestment({ ...base, ...patch })).toThrow();
  });
});

describe("retirement report regressions", () => {
  it("does not count a later pension in the retirement opening withdrawal base", () => {
    const result = projectPlan(makeInput({ laborPension: { claimAge: 67, lumpReinvestRate: 1 } }));
    expect(result.lumpPensionReinvestedAtRetirement).toBe(0);
  });
  for (const reinvest of [0, 0.5, 1]) it(`uses invested pension only for withdrawal reference (${reinvest})`, () => {
    const input = makeInput({ economy: { inflationRate: 0 }, laborPension: { lumpReinvestRate: reinvest }, investment: { withdrawalRule: { enabled: true, annualRate: 0.04 } } });
    const result = projectPlan(input);
    const expected = (result.projectedInvestmentAtRetirement + result.lumpPensionReinvestedAtRetirement) * 0.04 / 12;
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, scenarios: [], onChange: () => {} }));
    expect(html).toContain(`${formatMoney(expected)}／月`);
    const milestones = html.split('class="balance-milestones"')[1].split('</section>')[0];
    expect((milestones.match(/65 歲/g) ?? []).length).toBe(1);
    expect((milestones.match(/70 歲/g) ?? []).length).toBe(1);
  });
  it("uses the same forward engine to solve the minimum starting capital", () => {
    const input = makeInput({ economy: { inflationRate: 0.02 } });
    const result = projectPlan(input);
    const run = (amount: number) => simulateRetirement(input, result.laborInsurance, result.nationalPension, result.laborPension, amount);
    expect(run(result.requiredInvestmentAtRetirement).depletedMonth).toBeNull();
    expect(run(result.requiredInvestmentAtRetirement - 100).depletedMonth).not.toBeNull();
    expect(run(result.requiredInvestmentAtRetirement + 100000).endingPortfolioReal).toBeGreaterThan(run(result.requiredInvestmentAtRetirement).endingPortfolioReal);
  });
});
