import { effectiveMonthlyRate, growthFactor, netAnnualReturn, realValue } from "../domain/rates";
import { ageAtMonth, birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { LaborInsuranceProjection, LaborPensionProjection, MonthlyRecord, PlanningInput } from "../domain/types";

export interface RetirementSimulationResult {
  records: MonthlyRecord[];
  depletedMonth: number | null;
  endingPortfolioReal: number;
  firstYearWithdrawals: number;
}

export function simulateRetirement(
  input: PlanningInput,
  laborInsurance: LaborInsuranceProjection,
  laborPension: LaborPensionProjection,
  investmentAtRetirement: number
): RetirementSimulationResult {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const endMonth = monthAtAge(birth, input.profile.longevityAge);
  const monthlyReturn = effectiveMonthlyRate(netAnnualReturn(
    input.investment.grossReturnRate,
    input.investment.feeRate
  ));
  const partTimeStart = monthAtAge(birth, input.partTime.startAge);
  const partTimeEnd = monthAtAge(birth, input.partTime.endAge);
  const records: MonthlyRecord[] = [];
  let portfolio = investmentAtRetirement;
  let depletedMonth: number | null = null;
  let firstYearWithdrawals = 0;

  for (let month = retirementMonth; month < endMonth; month += 1) {
    const monthsFromAsOf = month - asOf;
    const portfolioReturnNominal = portfolio * monthlyReturn;
    portfolio += portfolioReturnNominal;
    const expenseNominal = input.spending.monthlyToday * growthFactor(input.economy.inflationRate, monthsFromAsOf);
    const laborInsuranceNominal = laborInsurance.events.get(month) ?? 0;
    const laborPensionNominal = laborPension.events.get(month) ?? 0;
    const partTimeNominal = month >= partTimeStart && month < partTimeEnd
      ? input.partTime.monthlyToday * growthFactor(input.partTime.growthRate, monthsFromAsOf)
      : 0;
    const income = laborInsuranceNominal + laborPensionNominal + partTimeNominal;
    const need = Math.max(0, expenseNominal - income);
    const surplus = Math.max(0, income - expenseNominal);
    const portfolioWithdrawalNominal = Math.min(portfolio, need);
    const unmetNeedNominal = Math.max(0, need - portfolioWithdrawalNominal);
    portfolio = Math.max(0, portfolio - portfolioWithdrawalNominal + surplus);

    if (month < retirementMonth + 12) firstYearWithdrawals += portfolioWithdrawalNominal;
    if (unmetNeedNominal > 0.005 && depletedMonth === null) depletedMonth = month;

    records.push({
      month,
      age: ageAtMonth(birth, month),
      expenseNominal,
      laborInsuranceNominal,
      laborPensionNominal,
      partTimeNominal,
      portfolioReturnNominal,
      portfolioWithdrawalNominal,
      unmetNeedNominal,
      portfolioNominal: portfolio,
      portfolioReal: realValue(portfolio, input.economy.inflationRate, monthsFromAsOf),
      pensionAccountNominal: laborPension.accountByMonth.get(month) ?? 0
    });
  }

  return {
    records,
    depletedMonth,
    endingPortfolioReal: records.at(-1)?.portfolioReal ?? investmentAtRetirement,
    firstYearWithdrawals
  };
}
