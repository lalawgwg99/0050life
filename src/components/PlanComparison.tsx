import type { ProjectionResult } from "../domain/types";
import { summarizeResult } from "../engine/result-summary";
import { formatMoney } from "../lib/format";

interface Props {
  current: ProjectionResult;
  saved: ProjectionResult | null;
  onSave: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export function PlanComparison({ current, saved, onSave, onRestore, onClear }: Props) {
  const now = summarizeResult(current);
  const before = saved ? summarizeResult(saved) : null;
  const groups = [
    ["profile", "年齡與規劃期間"], ["spending", "生活與照護支出"], ["economy", "物價假設"],
    ["laborInsurance", "勞保"], ["nationalPension", "國保"], ["laborPension", "勞退"],
    ["investment", "投資設定"], ["partTime", "兼職收入"], ["asOf", "試算日期"]
  ] as const;
  const changes = saved ? groups.filter(([key]) => JSON.stringify(saved.input[key]) !== JSON.stringify(current.input[key])).map(([, label]) => label) : [];
  const marginChange = before ? (now.available - now.target) - (before.available - before.target) : 0;
  const contribution = (plan: ProjectionResult) => plan.input.investment.holdings.reduce((sum, holding) => sum + holding.monthlyContributionToday, 0);
  const outcome = (plan: ProjectionResult) => plan.depletedMonth === null ? `可支應到 ${plan.input.profile.longevityAge} 歲` : `約 ${plan.records.find(record => record.month === plan.depletedMonth)?.age.toFixed(1)} 歲開始不足`;
  return <section className="plan-comparison" aria-label="調整前後比較">
    <div className="comparison-heading"><div><strong>試試不同安排</strong><p>{saved ? "修改資料後，這裡會比較原方案與目前方案。金額都換算成今天的錢。" : "先保留目前方案，再調整退休年齡、生活費或每月投入，看差多少。"}</p></div>
      {!saved && <button type="button" onClick={onSave}>保留目前方案來比較</button>}
    </div>
    {saved && before && <>
      <p className="comparison-change">{changes.length ? `已調整：${changes.join("、")}。` : "目前與原方案相同，可以回到填寫資料調整條件。"}{changes.length > 0 && (Math.round(marginChange) === 0 ? "距離目標的金額沒有改變。" : `與原方案相比，距離目標的金額${marginChange > 0 ? "改善" : "退步"} ${formatMoney(Math.abs(marginChange))}。`)}</p>
      <div className="scenario-table-wrap"><table className="scenario-table"><caption className="sr-only">原方案與目前方案的條件和結果</caption><thead><tr><th>比較項目</th><th>原方案</th><th>目前方案</th></tr></thead><tbody>
        <tr><th>退休／規劃年齡</th><td>{saved.input.profile.retirementAge}／{saved.input.profile.longevityAge} 歲</td><td>{current.input.profile.retirementAge}／{current.input.profile.longevityAge} 歲</td></tr>
        <tr><th>每月生活費</th><td>{formatMoney(saved.input.spending.monthlyToday)}</td><td>{formatMoney(current.input.spending.monthlyToday)}</td></tr>
        <tr><th>現在每月投入</th><td>{formatMoney(contribution(saved))}</td><td>{formatMoney(contribution(current))}</td></tr>
        <tr><th>退休可用資產</th><td>{formatMoney(before.available)}</td><td>{formatMoney(now.available)}</td></tr>
        <tr><th>距離目標</th><td>{before.meetsPlan ? "超過" : "還差"} {formatMoney(before.meetsPlan ? before.surplus : before.gap)}</td><td>{now.meetsPlan ? "超過" : "還差"} {formatMoney(now.meetsPlan ? now.surplus : now.gap)}</td></tr>
        <tr><th>依各自假設試算</th><td>{outcome(saved)}</td><td>{outcome(current)}</td></tr>
      </tbody></table></div>
      <p className="section-footnote">還原會恢復原方案的全部欄位。本次比較只保留在此頁，重新整理後會清除。</p>
      <div className="comparison-actions"><button type="button" onClick={onRestore}>還原原方案</button><button type="button" onClick={onSave}>以目前方案重新比較</button><button type="button" onClick={onClear}>結束比較</button></div>
    </>}
  </section>;
}
