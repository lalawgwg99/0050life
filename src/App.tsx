import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChartNoAxesCombined, Printer, RotateCcw, SlidersHorizontal } from "lucide-react";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { PlanComparison } from "./components/PlanComparison";
import { InvestmentPage } from "./components/InvestmentPage";
import { IncomeTool } from "./components/IncomeTool";
import { CashflowTool } from "./components/CashflowTool";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { useLocale } from "./i18n";
import { setDisplaySettings } from "./lib/format";
import { defaultInput } from "./defaults";
import type { PlanningInput, ProjectionResult } from "./domain/types";
import { validateInput } from "./domain/validation";
import { projectPlan, projectScenarios } from "./engine/project";

const STORAGE_KEY = "0050life-web-v3";

type LegacyInvestment = Partial<PlanningInput["investment"]> & {
  assetsNow?: number;
  monthlyContributionToday?: number;
  grossReturnRate?: number;
  feeRate?: number;
};

function loadSavedInput(): PlanningInput {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { version?: number; input?: PlanningInput } | null;
    if ((saved?.version === 1 || saved?.version === 2 || saved?.version === 3 || saved?.version === 4) && saved.input) {
      const oldInvestment = saved.input.investment as LegacyInvestment;
      const defaultHolding = defaultInput.investment.holdings[0];
      const holdings = Array.isArray(oldInvestment.holdings)
        ? oldInvestment.holdings
        : [{
          ...defaultHolding,
          valueNow: oldInvestment.assetsNow ?? defaultHolding.valueNow,
          monthlyContributionToday: oldInvestment.monthlyContributionToday ?? defaultHolding.monthlyContributionToday,
          grossReturnRate: oldInvestment.grossReturnRate ?? defaultHolding.grossReturnRate,
          feeRate: oldInvestment.feeRate ?? defaultHolding.feeRate
        }];
      // v3 曾用 profile.region（taiwan/other）一次開關三個年金；v4 改為各自獨立開關
      const wasOtherRegion = (saved.input.profile as { region?: string } | undefined)?.region === "other";
      const savedLabor = saved.input.laborInsurance as { enabled?: boolean } | undefined;
      const savedPension = saved.input.laborPension as { enabled?: boolean } | undefined;
      return {
        ...saved.input,
        asOf: defaultInput.asOf,
        profile: { ...defaultInput.profile, ...(saved.input.profile as Partial<PlanningInput["profile"]>) },
        spending: { ...defaultInput.spending, ...saved.input.spending },
        partTime: { ...defaultInput.partTime, ...saved.input.partTime },
        nationalPension: { ...defaultInput.nationalPension, ...saved.input.nationalPension },
        laborInsurance: {
          ...defaultInput.laborInsurance,
          ...saved.input.laborInsurance,
          enabled: savedLabor?.enabled ?? !wasOtherRegion,
          futureYearsMode: saved.input.laborInsurance.futureYearsMode ?? "custom"
        },
        laborPension: {
          ...defaultInput.laborPension,
          ...saved.input.laborPension,
          enabled: savedPension?.enabled ?? !wasOtherRegion,
          futureYearsMode: saved.input.laborPension.futureYearsMode ?? "custom",
          mode: saved.input.laborPension.mode ?? defaultInput.laborPension.mode,
          lumpReinvestRate: saved.input.laborPension.lumpReinvestRate ?? defaultInput.laborPension.lumpReinvestRate
        },
        investment: {
          ...defaultInput.investment,
          ...oldInvestment,
          holdings,
          withdrawalRule: { enabled: oldInvestment.withdrawalRule?.enabled ?? defaultInput.investment.withdrawalRule!.enabled, annualRate: oldInvestment.withdrawalRule?.annualRate ?? defaultInput.investment.withdrawalRule!.annualRate },
          stockPledge: { enabled: oldInvestment.stockPledge?.enabled ?? defaultInput.investment.stockPledge!.enabled, loanToValue: oldInvestment.stockPledge?.loanToValue ?? defaultInput.investment.stockPledge!.loanToValue, annualInterestRate: oldInvestment.stockPledge?.annualInterestRate ?? defaultInput.investment.stockPledge!.annualInterestRate, maintenanceRate: oldInvestment.stockPledge?.maintenanceRate && oldInvestment.stockPledge.maintenanceRate < 1 ? oldInvestment.stockPledge.maintenanceRate * 10 : oldInvestment.stockPledge?.maintenanceRate ?? defaultInput.investment.stockPledge!.maintenanceRate },
          assetAllocation: { ...defaultInput.investment.assetAllocation!, ...oldInvestment.assetAllocation }
        }
      };
    }
  } catch {
    // Broken browser storage should never prevent the calculator from opening.
  }
  return defaultInput;
}

export default function App() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(() => {
    const hash = window.location.hash;
    return hash === "#investment" ? "investment" : hash === "#income" ? "income" : hash === "#cashflow" ? "cashflow" : "retirement";
  });
  useEffect(() => {
    const navigate = () => {
      if (!["", "#investment", "#retirement", "#income", "#cashflow"].includes(window.location.hash)) return;
      setPage(window.location.hash === "#investment" ? "investment" : window.location.hash === "#income" ? "income" : window.location.hash === "#cashflow" ? "cashflow" : "retirement");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const [input, setInput] = useState<PlanningInput>(loadSavedInput);
  const [comparison, setComparison] = useState<ProjectionResult | null>(null);
  const [mobileView, setMobileView] = useState<"inputs" | "results">("inputs");
  const errors = useMemo(() => validateInput(input), [input]);
  const calculation = useMemo(() => {
    if (errors.length > 0) return null;
    try {
      return { result: projectPlan(input), scenarios: projectScenarios(input) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "目前無法完成計算。" };
    }
  }, [errors.length, input]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, input }));
  }, [input]);

  useEffect(() => {
    setDisplaySettings({ currency: input.profile.currency ?? "TWD", locale });
  }, [input.profile.currency, locale]);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInput(defaultInput);
    setComparison(null);
  };
  const showMobileView = (view: "inputs" | "results") => {
    setMobileView(view);
    if (window.matchMedia("(max-width: 820px)").matches) window.scrollTo({ top: 0, behavior: "auto" });
  };
  const viewResults = () => {
    showMobileView("results");
    if (!window.matchMedia("(max-width: 820px)").matches) {
      document.querySelector(".results-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label={t.app.brandHomeLabel}>
          <span><ChartNoAxesCombined aria-hidden="true" /></span>
          <div><strong>{t.app.brandTitle}</strong><small>{t.app.brandSubtitle}</small></div>
        </a>
        <nav aria-label={t.app.navLabel}>
          <a href="/blog/index.html"><BookOpen aria-hidden="true" />{t.app.blog}</a>
          <LanguageSwitcher />
          {page === "retirement" && <button type="button" className="icon-button" onClick={reset} aria-label={t.app.reset} title={t.app.reset}><RotateCcw aria-hidden="true" /></button>}
          <button type="button" className="icon-button" onClick={() => window.print()} aria-label={t.app.print} title={t.app.print}><Printer aria-hidden="true" /></button>
        </nav>
      </header>

      <nav className="tool-navigation" aria-label={t.app.navLabel}><a href="#retirement" aria-current={page === "retirement" ? "page" : undefined}>{t.app.navRetirement}</a><a href="#investment" aria-current={page === "investment" ? "page" : undefined}>{t.app.navInvestment}</a><a href="#income" aria-current={page === "income" ? "page" : undefined}>{t.app.navIncome}</a><a href="#cashflow" aria-current={page === "cashflow" ? "page" : undefined}>{t.app.navCashflow}</a></nav>
      {page === "investment" ? <InvestmentPage input={input} onImport={(holdings, contributionGrowthRate) => {
        setComparison(null);
        setInput({ ...input, investment: { ...input.investment, holdings, contributionGrowthRate } });
        window.location.hash = "retirement";
        showMobileView("inputs");
      }} /> : page === "income" ? <IncomeTool input={input} /> : page === "cashflow" ? <CashflowTool input={input} /> : <>
      <div className="mobile-tabs" role="tablist" aria-label={t.app.mobileTabsLabel}>
        <button type="button" role="tab" aria-selected={mobileView === "inputs"} className={mobileView === "inputs" ? "active" : ""} onClick={() => showMobileView("inputs")}><SlidersHorizontal aria-hidden="true" />{t.app.mobileTabInputs}</button>
        <button type="button" role="tab" aria-selected={mobileView === "results"} className={mobileView === "results" ? "active" : ""} onClick={() => showMobileView("results")}><ChartNoAxesCombined aria-hidden="true" />{t.app.mobileTabResults}</button>
      </div>

      <main className="workspace">
        <aside className={mobileView === "inputs" ? "mobile-visible" : ""}><InputPanel input={input} errors={errors} onChange={setInput} onViewResults={viewResults} /></aside>
        <div className={`results-column ${mobileView === "results" ? "mobile-visible" : ""}`}>
          {errors.length > 0 ? (
            <div className="empty-state"><EmptyIcon /><h1>{t.empty.needInputsTitle}</h1><p>{t.empty.needInputsBody}</p></div>
          ) : calculation && "error" in calculation ? (
            <div className="empty-state" role="alert"><EmptyIcon /><h1>{t.empty.calcFailedTitle}</h1><p>{calculation.error}</p></div>
          ) : calculation && "result" in calculation ? (
            <ResultsPanel result={calculation.result} scenarios={calculation.scenarios} onChange={setInput}
              comparison={<PlanComparison current={calculation.result} saved={comparison} onSave={() => setComparison(calculation.result)} onRestore={() => comparison && setInput(comparison.input)} onClear={() => setComparison(null)} />} />
          ) : null}
        </div>
      </main>
      </>}
    </div>
  );
}

function EmptyIcon() {
  return <span className="empty-icon"><ChartNoAxesCombined aria-hidden="true" /></span>;
}
