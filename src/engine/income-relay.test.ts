import { describe, expect, it } from "vitest";
import { makeInput } from "../test-fixtures";
import { birthSerial, monthAtAge } from "../domain/time";
import { projectPlan } from "./project";
import { buildIncomeRelay } from "./income-relay";

describe("income relay", () => {
  it("separates the bridge, monthly pension and insurance without missing months", () => {
    const input = makeInput({
      profile: { longevityAge: 70 }, economy: { inflationRate: 0 },
      laborInsurance: { claimAge: 67 }, laborPension: { claimAge: 66, mode: "monthly" },
      partTime: { enabled: true, monthlyToday: 10000, startAge: 65, endAge: 66, growthRate: 0 }
    });
    const result = projectPlan(input);
    const phases = buildIncomeRelay(result);
    const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
    expect(phases.map(p => p.sources)).toEqual([["兼職"], ["勞退月領"], ["勞保", "勞退月領"]]);
    expect(phases.map(p => p.start)).toEqual([65, 66, 67].map(age => monthAtAge(birth, age)));
    expect(phases[0].income).toBe(10000);
    expect(phases[0].fromAssets).toBe(40000);
    expect(phases.reduce((sum, p) => sum + p.end - p.start, 0)).toBe(result.records.length);
    for (let i = 1; i < phases.length; i++) expect(phases[i].start).toBe(phases[i - 1].end);
  });

  it("excludes lump sums and derives net monthly income from the actual projection", () => {
    const result = projectPlan(makeInput({ laborPension: { mode: "lump", lumpReinvestRate: 0.5 } }));
    const phases = buildIncomeRelay(result);
    expect(phases.every(p => !p.sources.includes("勞退月領"))).toBe(true);
    for (const phase of phases) {
      const record = result.records.find(r => r.month === phase.start)!;
      const months = record.month - (result.input.asOf.year * 12 + result.input.asOf.month - 1);
      const discount = Math.pow(1 + result.input.economy.inflationRate, months / 12);
      expect(phase.income).toBeCloseTo((record.laborInsuranceNominal + record.nationalPensionNominal + record.partTimeNominal - record.taxNominal) / discount, 6);
      expect(phase.fromAssets).toBeCloseTo(Math.max(0, phase.expense - phase.income), 6);
    }
  });
});
