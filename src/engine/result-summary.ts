import { realValue } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import type { ProjectionResult } from "../domain/types";

/** One comparison basis for every result card, heading and action. */
export function summarizeResult(result: ProjectionResult) {
  const { input } = result;
  const retirement = monthAtAge(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), input.profile.retirementAge);
  const months = retirement - toSerial(input.asOf.year, input.asOf.month);
  const today = (amount: number) => realValue(amount, input.economy.inflationRate, months);
  const available = today(result.projectedRetirementAssetsAtRetirement);
  const target = today(result.requiredRetirementAssetsAtRetirement);
  const difference = available - target;
  return {
    available, target,
    gap: Math.max(0, -difference),
    surplus: Math.max(0, difference),
    meetsPlan: result.depletedMonth === null,
    progress: target > 0 ? Math.min(1, available / target) : 1
  };
}
