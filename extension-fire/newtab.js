import { DEFAULTS, sanitize } from "./lib/defaults.js";
import { projectFI } from "./lib/calc.js";
import { money, moneyCompact, yearsText } from "./lib/format.js";

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
    const r = projectFI(p);
    const heroNumber = document.getElementById("heroNumber");
    const kicker = document.getElementById("kicker");
    const heroSub = document.getElementById("heroSub");
    const tip = document.getElementById("tip");
    const pct = Math.round(r.progress * 100);

    if (r.alreadyFI) {
      kicker.textContent = "YOU MADE IT";
      heroNumber.textContent = "✓ Free";
      heroNumber.classList.add("free");
      heroSub.textContent =
        `Your ${moneyCompact(p.netWorth, p.currency)} covers ${moneyCompact(r.fiNumber, p.currency)} — ` +
        `you're financially independent.`;
      tip.innerHTML =
        `Staying free is the new game: keep spending at or below ` +
        `${money(p.annualSpending, p.currency)}/yr and the math holds.`;
    } else if (r.yearsToFI === null) {
      kicker.textContent = "NOT ON TRACK YET";
      heroNumber.textContent = "100+";
      heroSub.textContent =
        `At this pace you won't reach your ${moneyCompact(r.fiNumber, p.currency)} FI number. ` +
        `Something has to change: save more, spend less, or both.`;
      tip.innerHTML =
        `The fastest lever is usually the savings rate — <strong>adjust your plan</strong> ` +
        `and watch the number move.`;
    } else {
      kicker.textContent = "YEARS TO FINANCIAL INDEPENDENCE";
      heroNumber.textContent = yearsText(r.yearsToFI);
      heroSub.textContent =
        `Your FI number is ${moneyCompact(r.fiNumber, p.currency)} ` +
        `(${money(p.annualSpending, p.currency)}/yr × ${Math.round(100 / p.withdrawalRate)}). ` +
        `You're ${pct}% there.`;
      const saved = Math.round(r.yearsSavedByBoost * 10) / 10;
      tip.innerHTML = saved >= 0.1
        ? `Saving an extra <strong>${money(200, p.currency)}/mo</strong> would get you there ` +
          `<strong>${saved} years sooner</strong>. Small habits, big clock.`
        : `Every extra dollar saved shortens the countdown. <strong>Adjust your plan</strong> to play with it.`;
    }

    setRing(r.progress, r.progress < 0.35 ? "low" : r.progress < 0.7 ? "mid" : null);
    document.getElementById("progressPct").textContent = `${pct}%`;
    document.getElementById("statFI").textContent = moneyCompact(r.fiNumber, p.currency);
    document.getElementById("statNW").textContent = moneyCompact(p.netWorth, p.currency);
    document.getElementById("statSR").textContent = `${Math.round(r.savingsRate * 100)}%`;
  });

  document.getElementById("adjustLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

main();
