# FinFolio — 智慧資產管理 App

由 `claude.ai/design` 的 FinFolio 設計（v3）建置而成的前端 App。

- **技術**：Vite 打包 + React 18（v3 設計原始碼預先編譯，取代瀏覽器內 Babel）
- **設計變數**：`public/tokens.js`（顏色／間距／字級／匯率輔助，掛在 `window`）
- **股票清單/價格輔助**：`public/stock-data.js`
- **資料**：記帳、餘額、持倉、設定皆存於使用者瀏覽器本機（localStorage），不上雲

## 開發

```bash
npm install      # 安裝相依套件
npm run dev      # 開發伺服器 (http://localhost:5173)
npm run build    # 打包到 dist/
npm run preview  # 預覽打包結果
```

## 結構

```
public/
  tokens.js          設計變數 + FS/SP/PAD/RS/SH/fxToTWD 等全域輔助（經典腳本，先載入）
  stock-data.js      US 股清單 + 台股清單非同步載入（經典腳本）
src/
  main.js            進入點：將 React/ReactDOM 設為全域，再動態載入 v3 程式
  legacy/
    load.js          依原始順序載入各畫面
    icons.jsx        圖示組
    app.jsx          App 殼層、TabBar、記帳彈窗、語音 overlay、設定 overlay、
                     餘額/持倉動態計算 (computeAccounts/computeHoldings)、ErrorBoundary
    screens/
      portfolio.jsx  共用資料來源 (ASSET_GROUPS / INVEST_HOLDINGS / computePortfolio)
      dashboard.jsx  看板：月收支統計、淨值、當日收支/交易、日曆
      accounts.jsx   資產：淨值 Hero、帳戶分類、帳戶明細
      accounting.jsx 記帳：收支轉帳 / 股票買賣、語音情境
      advisor.jsx    AI 顧問（健康檢查 + 對話）
      invest.jsx     投資組合（依類型分頁、持倉明細、拆解）
      settings.jsx   設定：主檔管理、AI 金鑰、初始餘額、安全備份
index.html           手機框、字型、keyframes、縮放邏輯、經典腳本載入順序
```

## 待辦（後續階段）
- 配色微調（收入降彩度）、賣股自動分錄標示、初始餘額穩定 id、資料版本/migration、加密備份匯出入
- 真實每日收盤市價（台股/美股，經由極小後端服務）
- 真 AI 顧問（BYOK）＋ 記帳/提問意圖判斷
