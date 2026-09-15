import { describe, expect, it } from "vitest";
import { ageAtMonth, birthSerial, formatYearMonth, fromSerial, monthAtAge, toSerial } from "./time";

describe("monthly time axis", () => {
  it("round-trips a calendar month", () => {
    expect(fromSerial(toSerial(2026, 9))).toEqual({ year: 2026, month: 9 });
    expect(formatYearMonth(toSerial(2026, 9))).toBe("2026/09");
  });

  it("places an age milestone on the birth month", () => {
    const birth = birthSerial(80, 4);
    const retirement = monthAtAge(birth, 65);
    expect(fromSerial(retirement)).toEqual({ year: 2056, month: 4 });
    expect(ageAtMonth(birth, retirement)).toBe(65);
  });
});
