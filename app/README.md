# FinFolio — 智慧資產管理 App

由 `claude.ai/design` 匯出的設計原型（`../project/FinFolio.html`）忠實實作而成的真正前端專案。

- **技術堆疊**：Vite + React 18 + TypeScript
- **樣式**：沿用原型的 inline style 設計系統（暖色淺色主題，Noto Sans TC + JetBrains Mono）
- **目標**：像素級還原原型的視覺、互動與動畫；展示資料維持原型的 mock data

## 開發

```bash
npm install      # 安裝相依套件
npm run dev      # 啟動開發伺服器 (http://localhost:5173)
npm run build    # 型別檢查 + 打包到 dist/
npm run preview  # 預覽打包結果
```

打開後會看到一支固定 402×874 的手機框，並自動縮放至視窗大小（與原型相同的 `fit()` 邏輯，位於 `src/main.tsx`）。

## 專案結構

```
src/
  main.tsx              進入點：掛載 App、手機框縮放邏輯
  index.css             全域樣式、字型、keyframes 動畫、捲軸隱藏
  App.tsx               根元件：狀態列、標題列、底部導覽列 (含中央 FAB)、記帳底部彈窗、跨頁狀態
  icons.tsx             Lucide 風格自繪 SVG 圖示組
  data/demo.ts          型別定義 + 看板每日 mock 資料的確定性產生器 (mulberry32 PRNG)
  components/
    PieDonut.tsx        環圈圖
    CalendarSheet.tsx   日曆底部彈窗 (看板與記帳共用)
    DropField.tsx       下拉選單欄位
  screens/
    Dashboard.tsx       看板：淨值卡、日期切換/滑動、當日收支與股票買賣
    Accounts.tsx        配置：淨資產 + 4 類圓餅、7 個可展開資產分項
    Accounting.tsx      記帳：收支轉帳 / 股票買賣表單 + AI 一鍵語音記帳 (模擬)
    Advisor.tsx         AI 財富導師：健檢卡、快速提問、對話 (模擬回覆)
    Settings.tsx        設定：加密盾、主檔管理 (分類/帳戶/券商/交割戶)、AI 金鑰 (BYOK)
```

## 與原型的對應與取捨

- 原型靠 `window.Icons`、`window.CalendarSheet` 等全域變數與瀏覽器內 Babel 轉譯串接；本專案改寫為正規的 ES module import 與元件拆分。
- 原型 `dashboard.jsx` 內定義的 `DashWidget`（配置/消費/股票圓餅小工具）在最終的 `DashboardScreen` 中並未被渲染（配置圖已從看板移除），故本實作未移植該段死碼。`SettingsScreen` 實際上也未使用 `dashWidget` 參數，一併略過。
- 設定頁的「外部連動」區塊在原型中已被註解隱藏，本實作以註解標記保留其位置。
- AI 對話與語音記帳維持原型的「模擬」行為（打字動畫、預設情境解析）；尚未串接真實 AI 或裝置語音。可作為後續延伸。
