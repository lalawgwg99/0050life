import { DEFAULTS, sanitize } from "./lib/defaults.js";
import { projectPlan } from "./lib/calc.js";
import { ageText } from "./lib/format.js";

async function main() {
  let stored = {};
  try {
    stored = await chrome.storage.sync.get(DEFAULTS);
  } catch { /* ignore */ }
  const p = sanitize(stored);
  const r = projectPlan(p);

  const headline = document.getElementById("headline");
  if (r.funded) {
    headline.innerHTML = `On track — money lasts through age <strong>${p.longevityAge}</strong>`;
  } else {
    headline.innerHTML = `Money runs out at age <strong>${ageText(r.depletionAge)}</strong>`;
  }
  document.getElementById("barFg").style.width = `${Math.round(r.progress * 100)}%`;
  document.getElementById("pctLine").textContent =
    `${Math.round(r.progress * 100)}% funded · retire at ${p.retireAge}`;

  document.getElementById("adjustLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

main();
