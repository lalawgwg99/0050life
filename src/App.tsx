import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChartNoAxesCombined, Download, Printer, RotateCcw, SlidersHorizontal, Upload } from "lucide-react";
import { InputPanel } from "./components/InputPanel";
import { QuickCalc } from "./components/QuickCalc";
import { isQuickInputComplete, quickInputFromPlanning, quickInputToPlanning, type QuickInput } from "./domain/quick-calc";
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
const QUICK_STORAGE_KEY = "0050life-quick-v1";

/** 快算 6 欄獨立存檔：完整輸入保持不動，切換模式不互相覆蓋 */
function loadSavedQuick(base: PlanningInput): QuickInput {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_STORAGE_KEY) ?? "null") as Partial<QuickInput> | null;
    if (saved && [saved.currentAge, saved.retirementAge, saved.savings, saved.monthlyInvestment, saved.monthlySpending, saved.returnRatePercent]
      .every((value) => typeof value === "number" && Number.isFinite(value))) {
      return saved as QuickInput;
    }
  } catch {
    // Broken browser storage should never prevent the calculator from opening.
  }
  return quickInputFromPlanning(base);
}

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
  const [inputMode, setInputMode] = useState<"quick" | "full">("quick");
  const [quickInput, setQuickInput] = useState<QuickInput>(() => loadSavedQuick(input));
  const [comparison, setComparison] = useState<ProjectionResult | null>(null);
  const [mobileView, setMobileView] = useState<"inputs" | "results">("inputs");
  // 快算模式：以 6 欄映射出的有效輸入計算；完整輸入保持不動，切回完整模式還在
  const quickReady = inputMode === "quick" && isQuickInputComplete(quickInput);
  const effectiveInput = useMemo(
    () => quickReady ? quickInputToPlanning(quickInput, input, t.results.fallbackHoldingName) : input,
    [quickReady, quickInput, input, t]
  );
  const errors = useMemo(() => validateInput(effectiveInput, t), [effectiveInput, t]);
  const calculation = useMemo(() => {
    if (errors.length > 0) return null;
    try {
      return { result: projectPlan(effectiveInput, undefined, t.project.warnings), scenarios: projectScenarios(effectiveInput, [t.project.scenarioLow, t.project.scenarioBase, t.project.scenarioHigh]) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : t.app.calcError };
    }
  }, [errors.length, effectiveInput, t]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, input }));
  }, [input]);
  useEffect(() => {
    try {
      localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(quickInput));
    } catch {
      // ignore storage errors
    }
  }, [quickInput]);

  // render 期間同步（不能放 useEffect：useMemo 會在 effect 前用舊設定算出中文格式，造成首屏中英混雜）
  setDisplaySettings({ currency: effectiveInput.profile.currency ?? "TWD", locale });
  useEffect(() => {
    document.title = t.app.pageTitle;
  }, [t]);

  const exportData = () => {
    try {
      const payload = {
        app: "nestegg",
        version: 1,
        exportedAt: new Date().toISOString(),
        input,
        quick: (() => {
          try { return JSON.parse(localStorage.getItem(QUICK_STORAGE_KEY) ?? "null"); } catch { return null; }
        })(),
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nestegg-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // 下載失敗時靜默略過，不影響試算
    }
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { app?: string; input?: PlanningInput; quick?: QuickInput };
        if (parsed?.app !== "nestegg" || !parsed.input || typeof parsed.input !== "object") {
          window.alert(t.app.importError);
          return;
        }
        setInput({ ...defaultInput, ...parsed.input });
        if (parsed.quick) {
          try { localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(parsed.quick)); } catch { /* 忽略 */ }
        }
      } catch {
        window.alert(t.app.importError);
      }
    };
    reader.readAsText(file);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    try {
      localStorage.removeItem(QUICK_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setInput(defaultInput);
    setQuickInput(quickInputFromPlanning(defaultInput));
    setComparison(null);
  };
  const expandQuick = () => {
    // 把 6 個數字帶入完整表單（承諾寫在展開按鈕下方說明），再切到完整模式
    if (isQuickInputComplete(quickInput)) {
      setInput(quickInputToPlanning(quickInput, input, t.results.fallbackHoldingName));
    }
    setInputMode("full");
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
  const quickResult: ProjectionResult | null = calculation?.result ?? null;
  const quickCalcError: string | null = calculation?.error ?? null;

  return (
    <div className="app-shell">
      <div className="move-banner" role="note">
        <span>{t.app.movedNote}</span>
        <a href="https://taicalc.com/nestegg">{t.app.movedCta}</a>
      </div>
      <header className="app-header">
        <a className="brand" href="/" aria-label={t.app.brandHomeLabel}>
          <span><ChartNoAxesCombined aria-hidden="true" /></span>
          <div><strong>{t.app.brandTitle}</strong><small>{t.app.brandSubtitle}</small></div>
        </a>
        <nav aria-label={t.app.navLabel}>
          <a href="/blog/index.html"><BookOpen aria-hidden="true" />{t.app.blog}</a>
          <LanguageSwitcher />
          {page === "retirement" && <button type="button" className="icon-button" onClick={reset} aria-label={t.app.reset} title={t.app.reset}><RotateCcw aria-hidden="true" /></button>}
          <button type="button" className="icon-button" onClick={exportData} aria-label={t.app.exportData} title={t.app.exportData}><Download aria-hidden="true" /></button>
          <label className="icon-button" aria-label={t.app.importData} title={t.app.importData}>
            <Upload aria-hidden="true" />
            <input type="file" accept="application/json,.json" className="sr-only" aria-hidden="true" tabIndex={-1}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ""; }} />
          </label>
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
        <aside className={mobileView === "inputs" ? "mobile-visible" : ""}>
          <div className="mode-toggle" role="tablist" aria-label={t.quick.modeLabel}>
            <button type="button" role="tab" aria-selected={inputMode === "quick"} className={inputMode === "quick" ? "active" : ""} onClick={() => setInputMode("quick")}>{t.quick.tabQuick}</button>
            <button type="button" role="tab" aria-selected={inputMode === "full"} className={inputMode === "full" ? "active" : ""} onClick={() => setInputMode("full")}>{t.quick.tabFull}</button>
          </div>
          {inputMode === "quick" ? (
            <QuickCalc
              quick={quickInput}
              onChange={setQuickInput}
              result={quickResult}
              calcError={quickCalcError}
              onExpand={expandQuick}
            />
          ) : (
            <InputPanel input={input} errors={errors} onChange={setInput} onViewResults={viewResults} />
          )}
        </aside>
        <div className={`results-column ${mobileView === "results" ? "mobile-visible" : ""}`}>
          {inputMode === "quick" && !quickReady ? (
            <div className="empty-state"><EmptyIcon /><h1>{t.quick.eyebrow}</h1><p>{t.quick.needAll}</p></div>
          ) : errors.length > 0 ? (
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
