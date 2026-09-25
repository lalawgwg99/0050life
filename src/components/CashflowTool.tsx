import { useMemo, useState } from "react";
import type { PlanningInput } from "../domain/types";
import { projectPlan } from "../engine/project";
import { formatMoney } from "../lib/format";
import { effectiveMonthlyRate, growthFactor, netAnnualReturn, realValue } from "../domain/rates";
import { birthSerial, monthAtAge, toSerial } from "../domain/time";

export function CashflowTool({ input }: { input: PlanningInput }) {
  const result = useMemo(() => projectPlan(input), [input]);
  const [assets, setAssets] = useState(Math.round(result.projectedRetirementAssetsAtRetirement));
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(0);
  const asOf = toSerial(input.asOf.year, input.asOf.month);
  const retirementMonth = monthAtAge(birthSerial(input.profile.birthYearROC, input.profile.birthMonth), input.profile.retirementAge);
  const monthlyRate = effectiveMonthlyRate(netAnnualReturn(input.investment.retirementGrossReturnRate, input.investment.retirementFeeRate));
  let balance = Math.max(0, assets);
  const records = result.records.map(record => {
    balance = Math.max(0, balance * (1 + monthlyRate) - monthlyWithdrawal * growthFactor(input.economy.inflationRate, record.month - asOf));
    return { ...record, portfolioNominal: balance, today: realValue(balance, input.economy.inflationRate, record.month - asOf) };
  });
  const ending = records.at(-1)?.today ?? 0;
  const depleted = records.find(r => r.portfolioNominal <= 0)?.age;
  return <main className="standalone-tool"><header><span className="eyebrow">0050 Life・退休現金流</span><h1>只看退休後資產夠不夠用</h1><p>這一頁不重新計算勞保或投資累積，只把你提供的退休資產拿來測試每月提領。</p></header><section className="tool-form"><label>退休時可用資產（當年帳面）<input type="number" value={assets} onChange={e => setAssets(Number(e.target.value))} /></label><label>每月由資產支付（今天物價）<input type="number" value={monthlyWithdrawal} onChange={e => setMonthlyWithdrawal(Number(e.target.value))} /></label><p>目前退休頁帶入的資產約 {formatMoney(result.projectedRetirementAssetsAtRetirement)}；這裡修改不會改變退休規劃。</p></section><section className="investment-answer"><span>規劃到 {input.profile.longevityAge} 歲後，預計剩下</span><h2>{formatMoney(ending)}</h2><p>{depleted ? `約 ${depleted.toFixed(0)} 歲開始不足` : "依目前簡化提領假設，規劃期間內尚未用完"}</p></section><h2>逐年資產（今天物價）</h2><table className="scenario-table"><thead><tr><th>年齡</th><th>資產餘額</th></tr></thead><tbody>{records.filter(r => Math.round(r.age) % 5 === input.profile.retirementAge % 5).map(r => <tr key={r.month}><td>{r.age.toFixed(0)} 歲</td><td>{formatMoney(r.today)}</td></tr>)}</tbody></table><p className="section-footnote">這是獨立提領試算，未加入收入接力、稅額、長照與市場波動；不要把本頁結果直接解讀成完整退休計畫。</p></main>;
}
