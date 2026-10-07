import { useMemo, useState } from "react";
import type { PlanningInput } from "../domain/types";
import { projectPlan } from "../engine/project";
import { formatMoney } from "../lib/format";
import { effectiveMonthlyRate, growthFactor, netAnnualReturn, realValue } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";
import { useLocale } from "../i18n";

export function CashflowTool({ input }: { input: PlanningInput }) {
  const { t } = useLocale();
  const result = useMemo(() => projectPlan(input), [input]);
  const [assets, setAssets] = useState<number | "">(Math.round(result.projectedRetirementAssetsAtRetirement));
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState<number | "">(0);
  const assetValue = assets === "" ? 0 : assets;
  const withdrawalValue = monthlyWithdrawal === "" ? 0 : monthlyWithdrawal;
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirementMonth = monthAtAge(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), input.profile.retirementAge);
  const monthlyRate = effectiveMonthlyRate(netAnnualReturn(input.investment.retirementGrossReturnRate, input.investment.retirementFeeRate));
  let balance = Math.max(0, assetValue);
  const records = result.records.map(record => {
    balance = Math.max(0, balance * (1 + monthlyRate) - withdrawalValue * growthFactor(input.economy.inflationRate, record.month - asOf));
    return { ...record, portfolioNominal: balance, today: realValue(balance, input.economy.inflationRate, record.month - asOf) };
  });
  const ending = records.at(-1)?.today ?? 0;
  const depleted = withdrawalValue > 0 ? records.find(r => r.portfolioNominal <= 0)?.age : undefined;
  // 每年只取一列（生日當月最接近整數年齡的那筆），避免同一年 12 筆重複
  const seenYears = new Set<number>();
  const yearlyRecords = records.filter(r => {
    const ageYear = Math.round(r.age);
    if (ageYear % 5 !== input.profile.retirementAge % 5) return false;
    if (seenYears.has(ageYear)) return false;
    seenYears.add(ageYear);
    return true;
  });
  return <main className="standalone-tool"><header><span className="eyebrow">{t.cashflow.eyebrow}</span><h1>{t.cashflow.title}</h1><p>{t.cashflow.intro}</p></header><section className="tool-form"><label>{t.cashflow.assetsLabel}<input type="number" value={assets} onChange={e => setAssets(e.target.value === "" ? "" : Number(e.target.value))} /></label><label>{t.cashflow.withdrawalLabel}<input type="number" value={monthlyWithdrawal} onChange={e => setMonthlyWithdrawal(e.target.value === "" ? "" : Number(e.target.value))} /></label><p>{t.cashflow.assetsNote(formatMoney(result.projectedRetirementAssetsAtRetirement))}</p></section><section className="investment-answer"><span>{t.cashflow.answerPrefix(input.profile.longevityAge)}</span><h2>{formatMoney(ending)}</h2><p>{depleted !== undefined ? t.cashflow.depleted(depleted) : t.cashflow.notDepleted}</p></section><h2>{t.cashflow.yearlyTitle}</h2><table className="scenario-table"><thead><tr><th>{t.cashflow.colAge}</th><th>{t.cashflow.colBalance}</th></tr></thead><tbody>{yearlyRecords.map(r => <tr key={r.month}><td>{t.cashflow.ageLabel(r.age)}</td><td>{formatMoney(r.today)}</td></tr>)}</tbody></table><p className="section-footnote">{t.cashflow.footnote}</p></main>;
}
