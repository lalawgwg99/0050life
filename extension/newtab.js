import { DEFAULTS, sanitize } from "./lib/defaults.js";
import { projectPlan } from "./lib/calc.js";
import { money, moneyCompact, ageText } from "./lib/format.js";

const RING_C = 2 * Math.PI * 70;

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    return sanitize(stored);
  } catch {
    return sanitize({});
  }
}

function setRing(pct, level) {
  const fg = document.getElementById("ringFg");
  fg.style.strokeDasharray = `${RING_C}`;
  fg.style.strokeDashoffset = `${RING_C * (1 - pct)}`;
  fg.classList.remove("low", "mid");
  if (level) fg.classList.add(level);
}

function main() {
  loadSettings().then((p) => {
    const r = projectPlan(p);
    const heroNumber = document.getElementById("heroNumber");
    const kicker = document.getElementById("kicker");
    const heroSub = document.getElementById("heroSub");
    const tip = document.getElementById("tip");

    const pct = Math.round(r.progress * 100);

    if (r.funded) {
      kicker.textContent = "YOU ARE ON TRACK";
      heroNumber.textContent = "✓ Funded";
      heroNumber.classList.add("funded");
      heroSub.textContent =
        `At this pace your money lasts through age ${p.longevityAge}. ` +
        `Projected ${moneyCompact(r.atRetirement, p.currency)} at age ${p.retireAge}.`;
      tip.innerHTML =
        `Nice — but plans drift. If returns dip or spending rises, ` +
        `re-check here or run the <strong>full 0050life calculator</strong> for pensions, taxes and scenarios.`;
    } else {
      const age = ageText(r.depletionAge);
      kicker.textContent = "YOUR MONEY RUNS OUT AT AGE";
      heroNumber.textContent = age;
      heroSub.textContent =
        `You retire at ${p.retireAge} with about ${moneyCompact(r.atRetirement, p.currency)}, ` +
        `but you need ${moneyCompact(r.required, p.currency)} to last to ${p.longevityAge} — ` +
        `a gap of ${moneyCompact(r.gap, p.currency)}.`;
      tip.innerHTML =
        `Every extra ${money(200, p.currency)}/mo saved now pushes that age later. ` +
        `<strong>Adjust your plan</strong> to see what it takes — or open the full calculator.`;
    }

    setRing(r.progress, r.progress < 0.5 ? "low" : r.progress < 0.85 ? "mid" : null);
    document.getElementById("progressPct").textContent = `${pct}%`;
    document.getElementById("statProjected").textContent = moneyCompact(r.atRetirement, p.currency);
    document.getElementById("statRequired").textContent = moneyCompact(r.required, p.currency);
    document.getElementById("statSaving").textContent = money(p.monthlySaving, p.currency);
    document.getElementById("statLongevity").textContent = p.longevityAge;
  });

  document.getElementById("adjustLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

main();
