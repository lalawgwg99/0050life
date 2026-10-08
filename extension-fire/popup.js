import { DEFAULTS, sanitize } from "./lib/defaults.js";
import { projectFI } from "./lib/calc.js";
import { yearsText } from "./lib/format.js";

async function main() {
  let stored = {};
  try {
    stored = await chrome.storage.sync.get(DEFAULTS);
  } catch { /* ignore */ }
  const p = sanitize(stored);
  const r = projectFI(p);

  const headline = document.getElementById("headline");
  if (r.alreadyFI) {
    headline.innerHTML = `You're <strong>financially independent</strong> ✓`;
  } else if (r.yearsToFI === null) {
    headline.innerHTML = `<strong>Not on track</strong> — adjust your plan`;
  } else {
    headline.innerHTML = `<strong>${yearsText(r.yearsToFI)}</strong> years to FI`;
  }
  document.getElementById("barFg").style.width = `${Math.round(r.progress * 100)}%`;
  document.getElementById("pctLine").textContent =
    `${Math.round(r.progress * 100)}% of FI number · saving ${Math.round(r.savingsRate * 100)}%`;

  document.getElementById("adjustLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

main();
