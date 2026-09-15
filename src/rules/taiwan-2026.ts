export const TAIWAN_RULES_2026 = {
  version: "TW-2026.09",
  verifiedAt: "2026-09-15",
  laborInsurance: {
    formulaOneRate: 0.00775,
    formulaOneAddition: 3_000,
    formulaTwoRate: 0.0155,
    earlyLateRatePerYear: 0.04,
    maximumAdjustment: 0.2,
    minimumAnnuityYears: 15,
    cpiAdjustmentThreshold: 0.05,
    source: "https://www.bli.gov.tw/0109187.html"
  },
  laborPension: {
    eligibleAge: 60,
    minimumMonthlyYears: 15,
    actuarialAnnualRate: 0.011473,
    remainingWholeYearsFromAge60: [23, 23, 22, 21, 20, 19, 19, 18, 17, 16, 16, 15, 14, 13, 13, 12, 11, 11, 10, 9, 9, 8, 8, 7, 6, 6],
    source: "https://www.bli.gov.tw/0104047.html"
  }
} as const;

export function laborInsuranceNormalAge(birthYearROC: number): number {
  if (birthYearROC <= 46) return 60;
  if (birthYearROC === 47) return 61;
  if (birthYearROC === 48) return 62;
  if (birthYearROC === 49) return 63;
  if (birthYearROC === 50) return 64;
  return 65;
}

export function laborPensionRemainingYears(claimAge: number): number {
  const years = TAIWAN_RULES_2026.laborPension.remainingWholeYearsFromAge60;
  const index = Math.max(0, Math.min(years.length - 1, Math.floor(claimAge) - 60));
  return years[index];
}
