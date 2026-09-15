import { BriefcaseBusiness, Landmark, PiggyBank, SlidersHorizontal, UserRound } from "lucide-react";
import type { PlanningInput } from "../domain/types";
import { laborInsuranceNormalAge } from "../rules/taiwan-2026";
import { Field } from "./Field";

interface InputPanelProps {
  input: PlanningInput;
  errors: string[];
  onChange: (input: PlanningInput) => void;
}

export function InputPanel({ input, errors, onChange }: InputPanelProps) {
  const update = (section: keyof PlanningInput, field: string, value: number | string) => {
    onChange({
      ...input,
      [section]: { ...(input[section] as object), [field]: value }
    });
  };
  const normalAge = laborInsuranceNormalAge(input.profile.birthYearROC);

  return (
    <div className="input-panel">
      {errors.length > 0 && (
        <div className="error-box" role="alert">
          <strong>有些資料需要調整</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}

      <section className="input-section">
        <div className="section-heading">
          <UserRound aria-hidden="true" />
          <div><span>第一步</span><h2>你的退休時間</h2></div>
        </div>
        <div className="field-grid two">
          <Field label="民國出生年" value={input.profile.birthYearROC} onChange={(value) => update("profile", "birthYearROC", value)} suffix="年" min={30} max={110} />
          <Field label="出生月份" value={input.profile.birthMonth} onChange={(value) => update("profile", "birthMonth", value)} suffix="月" min={1} max={12} />
          <Field label="想幾歲退休" value={input.profile.retirementAge} onChange={(value) => update("profile", "retirementAge", value)} suffix="歲" min={40} max={85} />
          <Field label="希望規劃到" value={input.profile.longevityAge} onChange={(value) => update("profile", "longevityAge", value)} suffix="歲" min={60} max={110} />
        </div>
        <Field label="退休後每月生活費" value={input.spending.monthlyToday} onChange={(value) => update("spending", "monthlyToday", value)} suffix="元" step={1000} hint="請填今天物價下需要的金額" />
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多生活假設</summary>
          <div className="details-body field-grid two">
            <Field label="每年物價上漲" value={input.economy.inflationRate * 100} onChange={(value) => update("economy", "inflationRate", value / 100)} suffix="%" step={0.1} />
            <Field label="退休兼職收入" value={input.partTime.monthlyToday} onChange={(value) => update("partTime", "monthlyToday", value)} suffix="元／月" step={1000} />
            <Field label="兼職開始年齡" value={input.partTime.startAge} onChange={(value) => update("partTime", "startAge", value)} suffix="歲" />
            <Field label="兼職結束年齡" value={input.partTime.endAge} onChange={(value) => update("partTime", "endAge", value)} suffix="歲" />
          </div>
        </details>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <Landmark aria-hidden="true" />
          <div><span>第二步</span><h2>勞保老年給付</h2></div>
        </div>
        <div className="inline-note">你的法定年齡是 <strong>{normalAge} 歲</strong>，最早可從 {normalAge - 5} 歲開始領。</div>
        <div className="field-grid two">
          <Field label="目前勞保年資" value={input.laborInsurance.insuredYearsNow} onChange={(value) => update("laborInsurance", "insuredYearsNow", value)} suffix="年" step={0.1} />
          <Field label="未來還會加保" value={input.laborInsurance.insuredYearsFuture} onChange={(value) => update("laborInsurance", "insuredYearsFuture", value)} suffix="年" step={0.1} />
          <Field label="預計開始領取" value={input.laborInsurance.claimAge} onChange={(value) => update("laborInsurance", "claimAge", value)} suffix="歲" min={normalAge - 5} />
          <Field label="最高 60 月平均薪資" value={input.laborInsurance.averageSalaryToday} onChange={(value) => update("laborInsurance", "averageSalaryToday", value)} suffix="元" step={100} hint="不知道時可先填目前投保薪資" />
        </div>
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多勞保假設</summary>
          <div className="details-body">
            <Field label="投保薪資每年成長" value={input.laborInsurance.salaryGrowthRate * 100} onChange={(value) => update("laborInsurance", "salaryGrowthRate", value / 100)} suffix="%" step={0.1} />
            <label className="select-field">
              <span>領取後的物價調整</span>
              <select value={input.laborInsurance.indexation} onChange={(event) => update("laborInsurance", "indexation", event.target.value)}>
                <option value="threshold">累計物價達 5% 時調整</option>
                <option value="none">先不估未來調整</option>
              </select>
            </label>
          </div>
        </details>
        <a className="source-link" href="https://www.bli.gov.tw/0109187.html" target="_blank" rel="noreferrer">到勞保局核對資料</a>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <PiggyBank aria-hidden="true" />
          <div><span>第三步</span><h2>勞退個人專戶</h2></div>
        </div>
        <div className="mode-control" role="group" aria-label="勞退領取方式">
          <button type="button" className={input.laborPension.mode === "lump" ? "active" : ""} onClick={() => update("laborPension", "mode", "lump")}>一次領</button>
          <button type="button" className={input.laborPension.mode === "monthly" ? "active" : ""} onClick={() => update("laborPension", "mode", "monthly")}>按月領</button>
        </div>
        <div className="field-grid two">
          <Field label="目前專戶餘額" value={input.laborPension.balanceNow} onChange={(value) => update("laborPension", "balanceNow", value)} suffix="元" step={10_000} />
          <Field label="目前提繳工資" value={input.laborPension.monthlyWageToday} onChange={(value) => update("laborPension", "monthlyWageToday", value)} suffix="元" step={100} />
          <Field label="目前勞退年資" value={input.laborPension.seniorityYearsNow} onChange={(value) => update("laborPension", "seniorityYearsNow", value)} suffix="年" step={0.1} />
          <Field label="未來還會提繳" value={input.laborPension.seniorityYearsFuture} onChange={(value) => update("laborPension", "seniorityYearsFuture", value)} suffix="年" step={0.1} />
          <Field label="預計開始領取" value={input.laborPension.claimAge} onChange={(value) => update("laborPension", "claimAge", value)} suffix="歲" min={60} />
          <Field label="自己加碼提繳" value={input.laborPension.voluntaryRate * 100} onChange={(value) => update("laborPension", "voluntaryRate", value / 100)} suffix="%" min={0} max={6} step={1} />
        </div>
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多勞退假設</summary>
          <div className="details-body field-grid two">
            <Field label="雇主提繳比例" value={input.laborPension.employerRate * 100} onChange={(value) => update("laborPension", "employerRate", value / 100)} suffix="%" step={0.1} />
            <Field label="專戶每年成長" value={input.laborPension.returnRate * 100} onChange={(value) => update("laborPension", "returnRate", value / 100)} suffix="%" step={0.1} />
            <Field label="提繳工資每年成長" value={input.laborPension.wageGrowthRate * 100} onChange={(value) => update("laborPension", "wageGrowthRate", value / 100)} suffix="%" step={0.1} />
            {input.laborPension.mode === "monthly" && <Field label="預計分幾年領完" value={input.laborPension.payoutYears} onChange={(value) => update("laborPension", "payoutYears", value)} suffix="年" min={1} max={40} />}
          </div>
        </details>
        <a className="source-link" href="https://www.bli.gov.tw/0104047.html" target="_blank" rel="noreferrer">到勞保局核對月退休金</a>
      </section>

      <section className="input-section">
        <div className="section-heading">
          <BriefcaseBusiness aria-hidden="true" />
          <div><span>第四步</span><h2>自己的投資</h2></div>
        </div>
        <div className="field-grid two">
          <Field label="目前投資資產" value={input.investment.assetsNow} onChange={(value) => update("investment", "assetsNow", value)} suffix="元" step={10_000} />
          <Field label="每月持續投入" value={input.investment.monthlyContributionToday} onChange={(value) => update("investment", "monthlyContributionToday", value)} suffix="元" step={1000} />
          <Field label="預估每年報酬" value={input.investment.grossReturnRate * 100} onChange={(value) => update("investment", "grossReturnRate", value / 100)} suffix="%" step={0.1} />
          <Field label="每年投資費用" value={input.investment.feeRate * 100} onChange={(value) => update("investment", "feeRate", value / 100)} suffix="%" step={0.01} />
        </div>
        <details>
          <summary><SlidersHorizontal aria-hidden="true" /> 更多投資假設</summary>
          <div className="details-body">
            <Field label="每月投入每年增加" value={input.investment.contributionGrowthRate * 100} onChange={(value) => update("investment", "contributionGrowthRate", value / 100)} suffix="%" step={0.1} hint="若希望投入金額跟著物價提高，可填和物價相同" />
          </div>
        </details>
      </section>
    </div>
  );
}
