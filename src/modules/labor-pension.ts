import { effectiveMonthlyRate, growthFactor } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { LaborPensionProjection, PlanningInput } from "../domain/types";
import { laborPensionRemainingYears, TAIWAN_RULES_2026 } from "../rules/taiwan-2026";

export function projectLaborPension(input: PlanningInput, endMonth: number): LaborPensionProjection {
  const rules = TAIWAN_RULES_2026.laborPension;
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const birth = birthSerial(input.profile.birthYearROC, input.profile.birthMonth);
  const retirementMonth = monthAtAge(birth, input.profile.retirementAge);
  const claimMonth = monthAtAge(birth, input.laborPension.claimAge);
  const fundMonthlyRate = effectiveMonthlyRate(input.laborPension.returnRate);
  const actuarialMonthlyRate = effectiveMonthlyRate(rules.actuarialAnnualRate);
  const contributionMonths = Math.round(input.laborPension.seniorityYearsFuture * 12);
  const seniorityAtClaim = input.laborPension.seniorityYearsNow + input.laborPension.seniorityYearsFuture;
  const eligibleForMonthly = seniorityAtClaim >= rules.minimumMonthlyYears;
  const events = new Map<number, number>();
  const accountByMonth = new Map<number, number>();
  let balance = input.laborPension.balanceNow;
  let balanceAtRetirement = retirementMonth <= asOf ? balance : 0;
  let balanceAtClaim = 0;
  let initialMonthlyNominal = 0;
  let claimed = false;
  let payoutCount = 0;
  const payoutYears = laborPensionRemainingYears(input.laborPension.claimAge);
  const payoutMonths = payoutYears * 12;

  for (let month = asOf; month < endMonth; month += 1) {
    if (month === retirementMonth) balanceAtRetirement = balance;

    if (month === claimMonth) {
      balanceAtClaim = balance;
      claimed = true;
      if (input.laborPension.mode === "lump") {
        events.set(month, balance);
        balance = 0;
        accountByMonth.set(month, balance);
        continue;
      }
      const annualDiscount = 1 - Math.pow(1 + rules.actuarialAnnualRate, -payoutYears);
      initialMonthlyNominal = actuarialMonthlyRate === 0
        ? balance / payoutMonths
        : balance * actuarialMonthlyRate / annualDiscount / (1 + actuarialMonthlyRate);
    }

    if (!claimed) {
      balance *= 1 + fundMonthlyRate;
      if (month < retirementMonth && month - asOf < contributionMonths) {
        const wage = input.laborPension.monthlyWageToday * growthFactor(input.laborPension.wageGrowthRate, month - asOf);
        balance += wage * (input.laborPension.employerRate + input.laborPension.voluntaryRate);
      }
    } else if (input.laborPension.mode === "monthly" && payoutCount < payoutMonths && balance > 0) {
      const payment = payoutCount === payoutMonths - 1 ? balance : Math.min(initialMonthlyNominal, balance);
      events.set(month, payment);
      balance -= payment;
      payoutCount += 1;
      if (balance > 0) balance *= 1 + actuarialMonthlyRate;
    }

    accountByMonth.set(month, Math.max(0, balance));
  }

  if (retirementMonth >= endMonth) balanceAtRetirement = balance;

  return {
    eligibleForMonthly,
    claimMonth,
    balanceAtRetirement,
    balanceAtClaim,
    initialMonthlyNominal,
    events,
    accountByMonth,
    ruleVersion: TAIWAN_RULES_2026.version
  };
}
