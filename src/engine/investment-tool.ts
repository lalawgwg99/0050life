import { effectiveMonthlyRate, growthFactor, investmentMonth, netAnnualReturn, realValue } from "../domain/rates";
import type { InvestmentHolding } from "../domain/types";

export interface InvestmentPlan {
  holdings: InvestmentHolding[];
  months: number;
  inflation: number;
  contributionGrowth: number;
  lumpMonth: number;
  lumpAmount: number;
  withdrawal: number;
}

export function calculateInvestment(plan: InvestmentPlan, returnDelta = 0) {
  const numbers = [plan.months, plan.inflation, plan.contributionGrowth, plan.lumpMonth, plan.lumpAmount, plan.withdrawal, returnDelta];
  if (!numbers.every(Number.isFinite) || !Number.isInteger(plan.months) || plan.months < 1 || plan.months > 1200 || plan.inflation < 0 || plan.inflation > 0.2 || plan.contributionGrowth < 0 || plan.contributionGrowth > 0.3 || !Number.isInteger(plan.lumpMonth) || plan.lumpMonth < 1 || plan.lumpMonth > plan.months || plan.lumpAmount < 0 || plan.withdrawal < 0 || plan.holdings.length === 0) throw new Error("請確認期間為 1～100 年，金額不可小於 0，單筆投入日期需在試算期間內。");
  const balances = plan.holdings.map(h => {
    if (![h.valueNow, h.monthlyContributionToday, h.grossReturnRate, h.feeRate].every(Number.isFinite) || h.valueNow < 0 || h.monthlyContributionToday < 0 || h.grossReturnRate <= -0.98 || h.grossReturnRate > 1) throw new Error("投資金額不可小於 0；年報酬請填大於 -98% 且不超過 100%。");
    return { balance: h.valueNow, rate: effectiveMonthlyRate(netAnnualReturn(Math.max(-0.99, h.grossReturnRate + returnDelta), h.feeRate)), contribution: h.monthlyContributionToday };
  });
  let principal = balances.reduce((s, h) => s + h.balance, 0);
  let withdrawn = 0;
  let depletedMonth: number | null = null;
  const records = [];
  for (let month = 1; month <= plan.months; month++) {
    for (const h of balances) {
      const deposit = h.contribution * growthFactor(plan.contributionGrowth, month - 1);
      h.balance = investmentMonth(h.balance, h.rate, deposit);
      principal += deposit;
    }
    if (month === plan.lumpMonth) { balances[0].balance += plan.lumpAmount; principal += plan.lumpAmount; }
    let need = plan.withdrawal * growthFactor(plan.inflation, month - 1);
    for (const h of balances) { const take = Math.min(h.balance, need); h.balance -= take; need -= take; withdrawn += take; }
    if (need > 0.005 && depletedMonth === null) depletedMonth = month;
    const nominal = balances.reduce((s, h) => s + h.balance, 0);
    if (![nominal, principal, withdrawn].every(Number.isFinite)) throw new Error("金額或報酬超出可計算範圍，請降低設定。");
    records.push({ month, nominal, today: realValue(nominal, plan.inflation, month), principal, gain: nominal + withdrawn - principal });
  }
  return { records, final: records.at(-1)!, withdrawn, depletedMonth };
}

/** Solve today's purchasing-power target, preserving contribution weights. */
export function solveMonthlyInvestment(plan: InvestmentPlan, target: number): number {
  if (!Number.isFinite(target) || target < 0) throw new Error("目標金額不可小於 0。");
  const total = plan.holdings.reduce((s, h) => s + h.monthlyContributionToday, 0);
  const run = (amount: number) => calculateInvestment({ ...plan, holdings: plan.holdings.map((h, i) => ({ ...h, monthlyContributionToday: amount * (total > 0 ? h.monthlyContributionToday / total : i === 0 ? 1 : 0) })) }).final.today;
  if (run(0) >= target) return 0;
  let low = 0, high = 10000;
  while (run(high) < target && high < 1e10) high *= 2;
  if (run(high) < target) throw new Error("目標超出可計算範圍。");
  for (let i = 0; i < 60; i++) { const mid = (low + high) / 2; if (run(mid) >= target) high = mid; else low = mid; }
  return Math.ceil(high);
}
