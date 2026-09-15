import { describe, expect, it } from "vitest";
import { effectiveMonthlyRate, growthFactor, netAnnualReturn, realValue } from "./rates";

describe("rate conversions", () => {
  it("preserves an effective annual return across twelve months", () => {
    const monthly = effectiveMonthlyRate(0.08);
    expect(Math.pow(1 + monthly, 12)).toBeCloseTo(1.08, 12);
  });

  it("keeps a legitimate zero return at zero", () => {
    expect(effectiveMonthlyRate(0)).toBe(0);
    expect(growthFactor(0, 360)).toBe(1);
  });

  it("applies fees without using a truthy fallback", () => {
    expect(netAnnualReturn(0.08, 0.003)).toBeCloseTo(0.07676, 10);
    expect(netAnnualReturn(0, 0)).toBe(0);
  });

  it("reverses nominal inflation into today's purchasing power", () => {
    const nominal = 40_000 * growthFactor(0.02, 360);
    expect(realValue(nominal, 0.02, 360)).toBeCloseTo(40_000, 6);
  });
});
