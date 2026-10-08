import { DEFAULTS, CURRENCIES, sanitize } from "./lib/defaults.js";

const form = document.getElementById("planForm");
const savedMsg = document.getElementById("savedMsg");
const currencySel = document.getElementById("currencySel");

for (const c of CURRENCIES) {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  currencySel.appendChild(opt);
}

async function load() {
  let stored = {};
  try {
    stored = await chrome.storage.sync.get(DEFAULTS);
  } catch { /* fresh install */ }
  const p = sanitize(stored);
  for (const [k, v] of Object.entries(p)) {
    const el = form.elements.namedItem(k);
    if (el) el.value = v;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = {};
  for (const el of form.elements) {
    if (el.name) raw[el.name] = el.value;
  }
  const p = sanitize(raw);
  try {
    await chrome.storage.sync.set(p);
  } catch {
    await chrome.storage.local.set(p);
  }
  savedMsg.hidden = false;
  setTimeout(() => { savedMsg.hidden = true; }, 2000);
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  const p = sanitize({});
  try {
    await chrome.storage.sync.set(p);
  } catch {
    await chrome.storage.local.set(p);
  }
  load();
  savedMsg.hidden = false;
  setTimeout(() => { savedMsg.hidden = true; }, 2000);
});

load();
