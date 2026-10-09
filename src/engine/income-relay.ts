import { realValue } from "../domain/rates";
import { toSerial } from "../domain/time";
import type { ProjectionResult } from "../domain/types";

export interface IncomeRelaySourceNames {
  labor: string;
  national: string;
  pensionMonthly: string;
  work: string;
}

const DEFAULT_SOURCE_NAMES: IncomeRelaySourceNames = {
  labor: "勞保",
  national: "國保",
  pensionMonthly: "勞退月領",
  work: "兼職"
};

export function buildIncomeRelay(result: ProjectionResult, names: IncomeRelaySourceNames = DEFAULT_SOURCE_NAMES) {
  const asOf = toSerial(result.input.asOf.year, result.input.asOf.month);
  const phases: Array<{ start: number; end: number; sources: string[]; expense: number; income: number; fromAssets: number; care: boolean }> = [];
  let previousKey = "";
  for (const record of result.records) {
    const sources = [
      record.laborInsuranceNominal > 0 ? names.labor : "",
      record.nationalPensionNominal > 0 ? names.national : "",
      record.laborPensionNominal > 0 ? names.pensionMonthly : "",
      record.partTimeNominal > 0 ? names.work : ""
    ].filter(Boolean);
    const care = record.longTermCareExpenseNominal > 0;
    const key = JSON.stringify([sources, care]);
    if (phases.length && key === previousKey) {
      phases[phases.length - 1].end = record.month + 1;
      continue;
    }
    const today = (value: number) => realValue(value, result.input.economy.inflationRate, record.month - asOf);
    const netIncome = record.laborInsuranceNominal + record.nationalPensionNominal + record.laborPensionNominal + record.partTimeNominal - record.taxNominal;
    phases.push({ start: record.month, end: record.month + 1, sources, care, expense: today(record.expenseNominal), income: today(netIncome), fromAssets: today(Math.max(0, record.expenseNominal - netIncome)) });
    previousKey = key;
  }
  return phases;
}
