# 0050 Life

一個只在瀏覽器執行的退休規劃試算工具。勞保、勞退與自己的投資會先分開計算，再按照實際開始領取的月份，逐月合併到退休現金流。

## 本機執行

```bash
npm install
npm run dev
```

開發頁面是 `http://localhost:5173/index.vite.html`。正式建置完成後，編譯過的首頁與資源也會同步到專案根目錄，供目前未設定建置指令的 Cloudflare Pages 直接發布。

## 檢查

```bash
npm test
npm run test:e2e
npm run build
```

- `npm test`：檢查日期、利率、勞保、勞退、投資與整體試算。
- `npm run test:e2e`：用桌機及手機尺寸實際操作頁面。
- `npm run build`：檢查型別、建立正式網站檔案，並同步 Cloudflare Pages 直接發布所需的檔案。

## 計算原則

詳細內容請看 [計算說明](docs/CALCULATION.md)。法規數字集中在 `src/rules/`，未來規定改變時不需要重寫整套程式。

本工具提供規劃參考，不等同勞保局核定金額或投資保證。正式申請前仍應以勞保局個人資料與最新公告為準。
