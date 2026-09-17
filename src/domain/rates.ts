export function effectiveMonthlyRate(annualRate: number): number {
  if (annualRate <= -1) throw new Error("年化率必須大於 -100%。");
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function netAnnualReturn(grossRate: number, feeRate: number): number {
  if (grossRate <= -1) throw new Error("投資報酬率必須大於 -100%。");
  if (feeRate < 0 || feeRate >= 1) throw new Error("費用率必須介於 0% 與 100% 之間。");
  return (1 + grossRate) * (1 - feeRate) - 1;
}

export function growthFactor(annualRate: number, months: number): number {
  return Math.pow(1 + annualRate, months / 12);
}

export function realValue(nominal: number, inflationRate: number, months: number): number {
  return nominal / growthFactor(inflationRate, months);
}

/** Interest first, then month-end cash flow. Shared by investment tools. */
export function investmentMonth(balance: number, monthlyRate: number, deposit: number): number {
  return balance * (1 + monthlyRate) + deposit;
}
