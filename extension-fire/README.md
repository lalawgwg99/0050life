# FI Countdown — Financial Independence New Tab (v1)

Every new tab counts down your **years to financial independence**: FI number
(annual spending ÷ withdrawal rate, the 4% rule), a progress ring, and what an
extra $200/mo of saving buys you. Free tier, no account, data stays in the browser.

## Files

- `manifest.json` — Manifest V3, `storage` permission only
- `newtab.html / .css / .js` — new-tab override page
- `options.html / .css / .js` — plan settings (saved to `chrome.storage.sync`)
- `popup.html / .js` — toolbar popup quick view
- `lib/calc.js` — FI math: monthly simulation in today's money at a real return
- `lib/defaults.js` — defaults + input sanitizing
- `lib/format.js` — currency formatting
- `icons/` — 16/48/128 PNG
- `PRIVACY.md` — privacy policy (for the store listing)

## The math (deliberately simple, labeled as estimate in UI)

1. FI number = annualSpending ÷ withdrawalRate (4% → 25× spending).
2. Each month: balance compounds at the real return, monthlySaving is added,
   until balance ≥ FI number. Month count ÷ 12 = years to FI.
3. Progress = netWorth ÷ FI number. Savings rate is implied from
   saving ÷ (saving + spending).

## Try it locally

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this `extension-fire/` folder.
3. Open a new tab. Click the toolbar icon → Adjust plan.

## Publish checklist (manual steps)

1. Zip: `cd extension-fire && zip -r ../fi-countdown-v1.zip . -x "*.DS_Store"`
2. Pay the one-time **US$5** developer registration (same account covers all
   your extensions — if you already paid for the Retirement Countdown, skip).
3. Upload the zip, store name leads with keywords ("Financial Independence
   Countdown"), fill the listing + screenshots, paste `PRIVACY.md`.
4. Submit for review.

## Monetization (later, not in v1)

v1 is free to earn installs. When retention is proven, a lifetime unlock
($29–49) for extras like multiple scenarios side-by-side converts better
than a subscription for this kind of glanceable tool. Billing is external
(Chrome Web Store has no built-in payments since 2021): Paddle / Lemon
Squeezy as merchant of record is recommended for global VAT handling.
