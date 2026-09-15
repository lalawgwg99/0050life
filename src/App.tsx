import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChartNoAxesCombined, Printer, RotateCcw, SlidersHorizontal } from "lucide-react";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { defaultInput } from "./defaults";
import type { PlanningInput } from "./domain/types";
import { validateInput } from "./domain/validation";
import { projectPlan, projectScenarios } from "./engine/project";

const STORAGE_KEY = "0050life-web-v3";

function loadSavedInput(): PlanningInput {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { version?: number; input?: PlanningInput } | null;
    if (saved?.version === 1 && saved.input) return { ...saved.input, asOf: defaultInput.asOf };
  } catch {
    // Broken browser storage should never prevent the calculator from opening.
  }
  return defaultInput;
}

export default function App() {
  const [input, setInput] = useState<PlanningInput>(loadSavedInput);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, input }));
  }, [input]);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInput(defaultInput);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="0050 Life 首頁">
          <span><ChartNoAxesCombined aria-hidden="true" /></span>
          <div><strong>0050 Life</strong><small>退休規劃試算</small></div>
        </a>
        <nav aria-label="主要功能">
          <a href="/blog/index.html"><BookOpen aria-hidden="true" />退休筆記</a>
          <button type="button" className="icon-button" onClick={reset} aria-label="重新填寫"><RotateCcw aria-hidden="true" /></button>
          <button type="button" className="icon-button" onClick={() => window.print()} aria-label="列印結果"><Printer aria-hidden="true" /></button>
        </nav>
      </header>

      <div className="mobile-tabs" role="tablist" aria-label="試算頁面">
        <button type="button" role="tab" aria-selected={mobileView === "inputs"} className={mobileView === "inputs" ? "active" : ""} onClick={() => setMobileView("inputs")}><SlidersHorizontal aria-hidden="true" />填寫資料</button>
        <button type="button" role="tab" aria-selected={mobileView === "results"} className={mobileView === "results" ? "active" : ""} onClick={() => setMobileView("results")}><ChartNoAxesCombined aria-hidden="true" />查看結果</button>
      </div>

      <main className="workspace">
        <aside className={mobileView === "inputs" ? "mobile-visible" : ""}><InputPanel input={input} errors={errors} onChange={setInput} /></aside>
        <div className={`results-column ${mobileView === "results" ? "mobile-visible" : ""}`}>
          {errors.length > 0 ? (
            <div className="empty-state"><EmptyIcon /><h1>先完成左側資料</h1><p>需要調整的地方會直接標示在輸入區。</p></div>
          ) : calculation && "error" in calculation ? (
            <div className="empty-state" role="alert"><EmptyIcon /><h1>這次沒有算完</h1><p>{calculation.error}</p></div>
          ) : calculation && "result" in calculation ? (
            <ResultsPanel result={calculation.result} scenarios={calculation.scenarios} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function EmptyIcon() {
  return <span className="empty-icon"><ChartNoAxesCombined aria-hidden="true" /></span>;
}
