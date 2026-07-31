---
name: deploy-price-worker
description: 部署 finfolio 的報價 Cloudflare Worker（worker/），並同步更新前端讀取的 API 網址。當使用者說「部署 worker」「更新報價服務」「worker 上線」時觸發。
---

worker（`worker/index.js`）改完要上線時，照這個順序做，不要漏步驟：

1. 跑測試：`cd worker && npm test`，確認 vitest 全過再部署。
2. 部署：`cd worker && npx wrangler deploy`，記下輸出裡的 Worker URL（例如 `https://finfolio-prices.xxx.workers.dev`）。
3. 更新前端設定：把這個 URL 寫進 [app/public/config.js](../../../app/public/config.js) 的 `window.FF_PRICE_API = '...'` 這一行（**只有 URL 變了才需要改**；如果 URL 沒變，跳過這步）。
4. 若涉及美股報價且尚未設定過金鑰：`npx wrangler secret put FINNHUB_KEY`（選用，缺了會自動 fallback 到 Yahoo Finance，不是必要步驟）。
5. 確認 `app/public/config.js` 有異動時一併 commit，避免前端還連著舊網址。
