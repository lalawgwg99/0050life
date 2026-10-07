# 0050life Retirement Countdown — Chrome Extension (v1)

Every new tab shows **the age your money runs out** and how close the plan is
to fully funded. Free tier, no account, data stays in the browser.

## Files

- `manifest.json` — Manifest V3, `storage` permission only
- `newtab.html / .css / .js` — new-tab override page (hero number, progress ring, stats)
- `options.html / .css / .js` — plan settings (saved to `chrome.storage.sync`)
- `popup.html / .js` — toolbar popup quick view
- `lib/calc.js` — simplified monthly projection (accumulation + decumulation)
- `lib/defaults.js` — defaults + input sanitizing
- `lib/format.js` — currency formatting
- `icons/` — 16/48/128 PNG
- `PRIVACY.md` — privacy policy (for the store listing)

## The math (deliberately simple, labeled as estimate in UI)

1. Accumulate: savings compound monthly at `annualReturn`, contributions added, until `retireAge`.
2. Decumulate: balance compounds at `retireReturn`; each month pays
   `(monthlySpending − monthlyPension)` inflated from today, until `longevityAge`.
3. First month the balance can't cover the need = depletion age.
4. `required` = balance at retirement that would last exactly to `longevityAge`
   (binary search); progress = projected ÷ required.

## Try it locally

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Open a new tab. Click the toolbar icon → Adjust plan.

## Publish checklist (for 榮德 — manual steps)

1. Zip: `cd extension && zip -r ../0050life-retirement-countdown-v1.zip . -x "*.DS_Store"`
2. Pay the one-time **US$5** developer registration at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Upload the zip, fill the store listing (description + screenshots of the
   new-tab page), paste `PRIVACY.md` content as the privacy policy.
4. Submit for review (usually a few business days; `storage`-only permission
   keeps review simple).

## Monetization (later, not in v1)

v1 is free to earn installs first. When retention is proven, add a paywall
(e.g. unlimited "what-if" scenarios) via Stripe / ExtensionPay / crxpay —
Chrome Web Store has no built-in payments since 2021, so billing is external.
