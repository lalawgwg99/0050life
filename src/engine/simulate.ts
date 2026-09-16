import { effectiveMonthlyRate, growthFactor, netAnnualReturn, realValue } from "../domain/rates";
import { ageAtMonth, birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { LaborInsuranceProjection, LaborPensionProjection, MonthlyRecord, NationalPensionProjection, PlanningInput } from "../domain/types";

export interface RetirementSimulationResult {
  records: MonthlyRecord[];
  depletedMonth: number | null;
  endingPortfolioReal: number;
  firstYearWithdrawals: number;
}

export function simulateRetirement(
  input: PlanningInput,
  laborInsurance: LaborInsuranceProjection,
  nationalPension: NationalPensionProjection,
  laborPension: LaborPensionProjection,
  investmentAtRetirement: number
): RetirementSimulationResult {
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const endMonth = monthAtAge(birth, input.profile.longevityAge);
  const monthlyReturn = effectiveMonthlyRate(netAnnualReturn(
    input.investment.retirementGrossReturnRate,
    input.investment.retirementFeeRate
  ));
  const partTimeStart = monthAtAge(birth, input.partTime.startAge);
  const partTimeEnd = monthAtAge(birth, input.partTime.endAge);
  const records: MonthlyRecord[] = [];
  let portfolio = investmentAtRetirement;
  let cashReserve = 0;
  let depletedMonth: number | null = null;
  let firstYearWithdrawals = 0;

  for (let month = retirementMonth; month < endMonth; month += 1) {
    const monthsFromAsOf = month - asOf;
    const expenseNominal = input.spending.monthlyToday * growthFactor(input.economy.inflationRate, monthsFromAsOf);
    const laborInsuranceNominal = laborInsurance.events.get(month) ?? 0;
    const nationalPensionNominal = nationalPension.events.get(month) ?? 0;
    const laborPensionEventNominal = laborPension.events.get(month) ?? 0;
    const isLumpPension = input.laborPension.mode === "lump";
    const lumpReinvestNominal = isLumpPension ? laborPensionEventNominal * (input.laborPension.lumpReinvestRate ?? 1) : 0;
    const lumpCashNominal = isLumpPension ? laborPensionEventNominal - lumpReinvestNominal : 0;
    if (isLumpPension && laborPensionEventNominal > 0) {
      portfolio += lumpReinvestNominal;
      cashReserve += lumpCashNominal;
    }
    const laborInsuranceLumpNominal = laborInsurance.eligibleForAnnuity ? 0 : laborInsuranceNominal;
    if (laborInsuranceLumpNominal > 0) cashReserve += laborInsuranceLumpNominal;
    const portfolioReturnNominal = portfolio * monthlyReturn;
    portfolio += portfolioReturnNominal;
    const laborPensionNominal = isLumpPension ? 0 : laborPensionEventNominal;
    const laborInsuranceIncomeNominal = laborInsurance.eligibleForAnnuity ? laborInsuranceNominal : 0;
    const partTimeNominal = input.partTime.enabled && month >= partTimeStart && month < partTimeEnd
      ? input.partTime.monthlyToday * growthFactor(input.partTime.growthRate, monthsFromAsOf)
      : 0;
    const income = laborInsuranceIncomeNominal + nationalPensionNominal + laborPensionNominal + partTimeNominal;
    const need = Math.max(0, expenseNominal - income);
    const surplus = Math.max(0, income - expenseNominal);
    const cashWithdrawalNominal = Math.min(cashReserve, need);
    cashReserve = Math.max(0, cashReserve - cashWithdrawalNominal);
    const remainingNeed = Math.max(0, need - cashWithdrawalNominal);
    const portfolioWithdrawalNominal = Math.min(portfolio, remainingNeed);
    const unmetNeedNominal = Math.max(0, remainingNeed - portfolioWithdrawalNominal);
    portfolio = Math.max(0, portfolio - portfolioWithdrawalNominal + surplus);

    if (month < retirementMonth + 12) firstYearWithdrawals += portfolioWithdrawalNominal;
    if (unmetNeedNominal > 0.005 && depletedMonth === null) depletedMonth = month;

    records.push({
      month,
      age: ageAtMonth(birth, month),
      expenseNominal,
      laborInsuranceNominal: laborInsuranceIncomeNominal,
      nationalPensionNominal,
      laborPensionNominal,
      partTimeNominal,
      portfolioReturnNominal,
      portfolioWithdrawalNominal,
      unmetNeedNominal,
      portfolioNominal: portfolio,
      portfolioReal: realValue(portfolio, input.economy.inflationRate, monthsFromAsOf),
      pensionAccountNominal: laborPension.accountByMonth.get(month) ?? 0,
      cashReserveNominal: cashReserve,
      totalRetirementAssetsNominal: portfolio + cashReserve
    });
  }

  return {
    records,
    depletedMonth,
    endingPortfolioReal: records.at(-1)?.portfolioReal ?? investmentAtRetirement,
    firstYearWithdrawals
  };
}
