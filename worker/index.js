/**
 * FinFolio price service (Cloudflare Worker)
 *
 *   GET /quotes?codes=2330,0050,00679B
 *     → { date, prices: { "2330": 2400, ... }, fx: { USD: 31.5 }, source }
 *
 *   GET /fundamentals?codes=2330,AAPL
 *     → { date, items: { "2330": { epsAnnual, epsQuarters, epsTTM, epsTTMPrev, source } }, missing, partial }
 *
 * Privacy: only stock CODES are sent here — never holdings, amounts or identity.
 * Taiwan price: TWSE MIS latest trade/close (server-side, no CORS), with the
 *   TWSE/TPEX daily-close open data as a fallback.
 * US stocks require a Finnhub key (env.FINNHUB_KEY); without it, US codes are
 *   omitted and the app falls back to the user's transaction price.
 * EPS: Taiwan via FinMind (keyless); US via SEC EDGAR, which needs a contact
 *   e-mail in env.SEC_CONTACT — without it US codes report no EPS.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

const todayStr = () => {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // Taiwan time
  return d.toISOString().slice(0, 10);
};

const isTW = (code) => /^\d/.test(String(code || ''));
// 查詢用大寫、去重；回應時再照「前端問的那個寫法」把值放回去。
// 前端是用 livePrices[trade.code] 直接取值的，只回大寫 key 的話，資料裡存成小寫的
// 代號一樣拿不到值（而且是靜默的：UI 只會顯示不到收盤價，不會報錯）。
function parseCodes(url) {
  const askedBy = new Map(); // 大寫代號 → 前端原本的寫法（可能有多種）
  (url.searchParams.get('codes') || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((c) => {
    const n = norm(c);
    if (!askedBy.has(n)) askedBy.set(n, []);
    askedBy.get(n).push(c);
  });
  return { askedBy, codes: [...askedBy.keys()] };
}
// 查上游一律用大寫代號。MIS 的 ex_ch 區分大小寫：tse_00720b.tw 回空值，tse_00720B.tw 才有價，
// 所以帶字母尾碼的代號（債券 ETF 00720B/00751B/00795B…）只要大小寫不合就整檔查不到。
const norm = (code) => String(code || '').trim().toUpperCase();
const num = (s) => {
  const n = parseFloat(String(s == null ? '' : s).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

// Taiwan latest price via TWSE MIS (server-side — no browser CORS limit).
// `z` = last traded price (after close = today's close); `y` = prev close.
// 一次請求帶的代號數。每個代號會展開成 tse_/otc_ 兩筆 ex_ch，50 檔 = 100 筆，
// 是實測仍穩定的量；超過的代號改分批送，不要靜默丟掉（以前是 slice(0,50) 直接截斷，
// 匯入長歷史後現有持股會被早年已賣光的代號擠出視窗，永遠拿不到報價）。
const MIS_CHUNK = 50;
const MIS_MAX_CHUNKS = 6; // 上限 300 檔，避免子請求數失控

async function getMIS(codes) {
  const out = {};
  if (!codes.length) return out;
  const chunks = [];
  for (let i = 0; i < codes.length && chunks.length < MIS_MAX_CHUNKS; i += MIS_CHUNK) {
    chunks.push(codes.slice(i, i + MIS_CHUNK));
  }
  await Promise.all(chunks.map(async (chunk) => {
    try {
      const exCh = chunk.flatMap((c) => [`tse_${c}.tw`, `otc_${c}.tw`]).join('|');
      const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${exCh}&json=1&delay=0&_=${Date.now()}`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://mis.twse.com.tw/stock/index.jsp',
          'Accept': 'application/json',
        },
        cf: { cacheTtl: 120 },
      });
      if (r.ok) {
        const d = await r.json();
        (d.msgArray || []).forEach((item) => {
          const code = item.c;
          if (!code) return;
          let p = item.z && item.z !== '-' ? num(item.z) : null;
          if (p == null) p = num(item.y); // fallback: previous close
          if (p && p > 0) out[code] = p;
        });
      }
    } catch (e) { /* ignore — daily-close fallback covers it */ }
  }));
  return out;
}

// 當日收盤總表（TWSE 上市 + TPEX 上櫃 + 興櫃），快取一天。
//
// 這份總表是 MIS 查不到時的補價來源，但「建表」很貴：要抓並解析數份全市場資料。實測放在
// 請求路徑上會把執行預算吃光，接在後面的匯率查詢就跟著拋例外（症狀：fx 變成空物件），
// 而且對「永遠查不到的代號」每次請求都會重跑一遍、快取永遠轉不暖。
//
// 所以請求路徑上只做「讀快取」這件便宜事；缺的代號交給背景（ctx.waitUntil）去建表，
// 這次就先回 MIS 的結果並標記 partial，下一次刷新自然就補上了。
const DAILY_KEY = () => new Request(`https://ff-cache.local/tw/v3/${todayStr()}`);
// 興櫃候選 endpoint 一天只探一次：查不到的代號（下市、打錯）本來就不會出現在任何清單裡，
// 不設這個閘門就會每次都白跑一輪最貴的請求。
const ESB_MARK = () => new Request(`https://ff-cache.local/tw/esb-done/${todayStr()}`);

async function readDailyCache() {
  try {
    const hit = await caches.default.match(DAILY_KEY());
    if (hit) return await hit.json();
  } catch (e) { /* 讀不到就當沒有 */ }
  return null;
}

// 背景執行：建（或補強）當日收盤總表並寫回快取。不回傳給這次請求用。
async function refreshDailyCache(need) {
  const cache = caches.default;
  let map = await readDailyCache();
  const hadCache = !!map;
  if (!map) {
    map = {};
    await fillListedDailyClose(map);
  }
  if (need.some((c) => map[c] == null)) {
    let esbDone = false;
    try { esbDone = !!(await cache.match(ESB_MARK())); } catch (e) {}
    if (!esbDone) {
      await fillEmergingDailyClose(map, need);
      try {
        await cache.put(ESB_MARK(), new Response('1', {
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' },
        }));
      } catch (e) {}
    }
  }
  const size = Object.keys(map).length;
  if (size > 50 && (!hadCache || size > 0)) {
    try {
      await cache.put(DAILY_KEY(), new Response(JSON.stringify(map), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
      }));
    } catch (e) {}
  }
}

// 上市（TWSE）+ 上櫃（TPEx）當日收盤。
async function fillListedDailyClose(map) {
  try {
    const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { cf: { cacheTtl: 600 } });
    if (r.ok) {
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach((s) => {
        const p = num(s.ClosingPrice);
        if (s.Code && p) map[s.Code] = p;
      });
    }
  } catch (e) { /* ignore */ }
  try {
    const r = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes', { cf: { cacheTtl: 600 } });
    if (r.ok) {
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach((s) => {
        const code = s.SecuritiesCompanyCode || s.Code;
        const p = num(s.Close || s.ClosingPrice);
        if (code && p) map[code] = p;
      });
    }
  } catch (e) { /* ignore */ }
}

// 興櫃（emerging board）daily close. TPEx's exact OpenAPI dataset name for
// emerging stocks is not certain from here, so try a few candidates and parse
// defensively (any object with a 4–6 digit code + a positive price field).
// Harmless if an endpoint 404s or its shape differs — nothing gets written.
// 只在 need 還有缺價時才跑，且第一個有資料的 endpoint 就收工——三份全打是冷路徑爆掉的主因。
const ESB_ENDPOINTS = [
  'https://www.tpex.org.tw/openapi/v1/tpex_esb_daily_close_quotes',
  'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics',
  'https://www.tpex.org.tw/openapi/v1/tpex_esbtr_daily_close_quotes',
];
async function fillEmergingDailyClose(map, need) {
  if (!need.length || !need.some((c) => map[c] == null)) return;
  for (const ep of ESB_ENDPOINTS) {
    try {
      const r = await fetch(ep, { cf: { cacheTtl: 600 } });
      if (!r.ok) continue;
      const arr = await r.json();
      let got = 0;
      (Array.isArray(arr) ? arr : []).forEach((s) => {
        const code = String(s.SecuritiesCompanyCode || s.Code || s.CompanyCode || s.code || '').trim();
        const p = num(s.LastPrice || s.Close || s.ClosingPrice || s.WeightedAvgPrice || s.Deal || s.LatestPrice || s.LatestDealPrice);
        if (/^\d{4,6}[A-Z]?$/.test(code) && p && p > 0 && map[code] == null) { map[code] = p;got++; }
      });
      if (got) return; // 這份有資料就夠，不必再打其他候選
    } catch (e) { /* ignore — 興櫃 price is best-effort */ }
  }
}

// USD→TWD from a free, keyless source, cached ~12h.
async function getFX(ctx) {
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/fx/v2/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const fx = {};
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cf: { cacheTtl: 43200 } });
    if (r.ok) {
      const d = await r.json();
      if (d && d.rates && d.rates.TWD) fx.USD = Math.round(d.rates.TWD * 100) / 100;
    }
  } catch (e) { /* ignore */ }
  if (fx.USD) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(fx), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=43200' },
    })));
  }
  return fx;
}

// US latest price via Finnhub, only when a key is set.
// `c` = current/last price (updates during and after the session → today's close
// once the market closes); `pc` = previous close. Prefer `c` so after-hours and
// close prices update; fall back to `pc` only when `c` is missing/zero.
async function getUS(codes, env) {
  const out = {};
  if (!env || !env.FINNHUB_KEY || !codes.length) return out;
  await Promise.all(codes.slice(0, 25).map(async (c) => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(c)}&token=${env.FINNHUB_KEY}`, { cf: { cacheTtl: 120 } });
      if (r.ok) {
        const d = await r.json();
        const p = d && (d.c && d.c > 0 ? d.c : d.pc);
        if (p && p > 0) out[c] = p;
      }
    } catch (e) { /* ignore */ }
  }));
  return out;
}

// Authoritative full securities list from the TWSE ISIN service (Big5 HTML),
// strMode=2 上市 / strMode=4 上櫃. Includes stocks, ETFs, bond ETFs (債券ETF),
// ETNs, 受益證券, TDRs, 特別股 — everything except warrants (excluded as noise).
async function getISINList(strMode) {
  const out = [];
  try {
    const r = await fetch(`https://isin.twse.com.tw/isin/C_public.jsp?strMode=${strMode}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 21600 },
    });
    if (!r.ok) return out;
    const html = new TextDecoder('big5').decode(await r.arrayBuffer());
    let cat = '';
    const SKIP = /權證|認購|認售|牛證|熊證/;
    for (const row of html.split('<tr')) {
      const hdr = row.match(/colspan[^>]*>\s*<b>\s*([^<]+?)\s*<\/b>/i);
      if (hdr) { cat = hdr[1].trim(); continue; }
      if (SKIP.test(cat)) continue;
      const m = row.match(/<td[^>]*>\s*([0-9A-Z]{4,6})　([^<]+?)\s*<\/td>/);
      if (m) out.push({ code: m[1].trim(), name: m[2].trim() });
    }
  } catch (e) { /* Big5 unsupported / network — fall back to OpenAPI below */ }
  return out;
}

// Full Taiwan securities list (code → name), incl. ETFs/bonds — cached ~12h.
async function getTWList(ctx) {
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/twlist/v2/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const map = {};
  const add = (code, name) => { code = (code || '').trim(); name = (name || '').trim(); if (code && name && !map[code]) map[code] = name; };

  // 1) Authoritative ISIN list (complete, incl. ETFs / bond ETFs).
  //    strMode 2 上市 · 4 上櫃 · 5 興櫃（emerging board, e.g. 長亨）.
  const [listed, otc, emerging] = await Promise.all([getISINList(2), getISINList(4), getISINList(5)]);
  listed.forEach((s) => add(s.code, s.name));
  otc.forEach((s) => add(s.code, s.name));
  emerging.forEach((s) => add(s.code, s.name));

  // 2) Fallback: OpenAPI daily reports (only if ISIN failed, e.g. Big5 issue).
  if (Object.keys(map).length < 50) {
    try {
      const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { cf: { cacheTtl: 21600 } });
      if (r.ok) { const arr = await r.json(); (Array.isArray(arr) ? arr : []).forEach((s) => add(s.Code, (s.Name || '').trim())); }
    } catch (e) { /* ignore */ }
    try {
      const r = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes', { cf: { cacheTtl: 21600 } });
      if (r.ok) { const arr = await r.json(); (Array.isArray(arr) ? arr : []).forEach((s) => add(s.SecuritiesCompanyCode || s.Code, (s.CompanyName || s.Name || '').trim())); }
    } catch (e) { /* ignore */ }
  }

  const list = Object.keys(map).map((code) => ({ code, name: map[code], class: '台股' }));
  if (list.length > 50) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(list), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=43200' },
    })));
  }
  return list;
}

// Yahoo Finance fallback (keyless) — covers symbols Finnhub misses (e.g. pre-IPO
// / structured products like SPCX). Prefers post-market (盤後) price, else regular
// market / previous close. v8 chart endpoint needs no crumb/auth.
async function getYahoo(codes) {
  const out = {};
  if (!codes.length) return out;
  await Promise.all(codes.slice(0, 25).map(async (c) => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c)}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 120 },
      });
      if (!r.ok) return;
      const d = await r.json();
      const m = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (!m) return;
      const p = (m.postMarketPrice && m.postMarketPrice > 0) ? m.postMarketPrice :
                (m.regularMarketPrice && m.regularMarketPrice > 0) ? m.regularMarketPrice :
                (m.previousClose && m.previousClose > 0) ? m.previousClose : null;
      if (p && p > 0) out[c] = p;
    } catch (e) { /* ignore — best effort */ }
  }));
  return out;
}

// Full US symbol list via Finnhub (only when a key is set) — cached ~24h.
async function getUSList(env, ctx) {
  if (!env || !env.FINNHUB_KEY) return [];
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/uslist/v1/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  let list = [];
  try {
    const r = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${env.FINNHUB_KEY}`, { cf: { cacheTtl: 86400 } });
    if (r.ok) {
      const arr = await r.json();
      list = (Array.isArray(arr) ? arr : [])
        .filter((s) => s.symbol && s.description && /^[A-Z][A-Z.]{0,6}$/.test(s.symbol))
        .map((s) => ({ code: s.symbol, name: s.description, class: s.type === 'ETP' || s.type === 'ETF' ? '美股ETF' : '美股' }));
    }
  } catch (e) { /* ignore */ }
  if (list.length > 50) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(list), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    })));
  }
  return list;
}

/* ─── Fundamentals（EPS）────────────────────────────────────────────────
 * 只回「單季 EPS 聚合出來的年度 EPS 與 TTM」，本益比與 PEG 一律交給前端算：
 * 現價本來就在前端手上，而且使用者要能手動覆寫成長率，指標留在前端才有單一計算點。
 * 這也讓這裡不必再多抓 TWSE BWIBBU_ALL / TPEx 本益比兩份全市場總表。
 */

// 財報是季頻資料，快取以「月」為單位；跨月自然重抓一次。
// 版本號隨回傳形狀變動要 bump：快取是以「月」為單位，不換 key 的話舊形狀會活到下個月。
const FUND_KEY = (code) => new Request(`https://ff-cache.local/fund/v2/${code}/${todayStr().slice(0, 7)}`);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const round2 = (n) => Math.round(n * 100) / 100;

// SEC 要求每個請求都帶「名稱 + 聯絡 email」形式的 User-Agent，格式不合就直接 403
// （實測 'FinFolio/1.0 (…github.com/…)' 這種帶括號的寫法會被擋）。這個 repo 是公開的，
// 信箱不寫死在程式碼裡：沒設定 env.SEC_CONTACT 就整個不打 SEC，美股當作查無 EPS——
// 比照 FINNHUB_KEY 的做法，要開只需 `npx wrangler secret put SEC_CONTACT`。
const secHeaders = (env) => ({ 'User-Agent': env.SEC_CONTACT });

// 前端的每股盈餘圖表可切「年/季」，季圖只畫最近三年，再往前的季資料細到看不出趨勢。
const EPS_QUARTERS_KEPT = 12;

// 單季 EPS 序列 → { epsAnnual, epsQuarters, epsTTM, epsTTMPrev }。台股與美股共用同一套聚合。
// 年度只收「湊滿四季」的年份——少一季的和拿去算成長率會憑空多出一個假的衰退年。
function aggregateEps(quarters) {
  const byEnd = new Map();
  quarters.forEach((q) => { if (q && q.end && q.val != null) byEnd.set(q.end, q.val); });
  const sorted = [...byEnd.entries()].map(([end, val]) => ({ end, val })).sort((a, b) => (a.end < b.end ? -1 : 1));

  const years = {};
  sorted.forEach((q) => { const y = q.end.slice(0, 4); (years[y] = years[y] || []).push(q.val); });
  const epsAnnual = {};
  Object.keys(years).forEach((y) => {
    if (years[y].length === 4) epsAnnual[y] = round2(years[y].reduce((a, b) => a + b, 0));
  });

  // 往回數第 back 組的四季加總。四季的頭尾必須相距約九個月（Q1 季底→Q4 季底），
  // 中間缺一季就回 null：寧可沒有 TTM，也不要拿三季的和當成一年在算本益比。
  const ttmAt = (back) => {
    const end = sorted.length - back;
    if (end < 4) return null;
    const seg = sorted.slice(end - 4, end);
    const span = daysBetween(seg[0].end, seg[3].end);
    if (span < 240 || span > 310) return null;
    return round2(seg.reduce((a, q) => a + q.val, 0));
  };

  return {
    epsAnnual,
    epsQuarters: sorted.slice(-EPS_QUARTERS_KEPT).map((q) => ({ end: q.end, val: round2(q.val) })),
    epsTTM: ttmAt(0), epsTTMPrev: ttmAt(4),
  };
}

// 台股單季 EPS：FinMind 的 TaiwanStockFinancialStatements（type=EPS）給的是「單季」值，
// 不是累計數（實測 2330 2020 四季相加 19.97，與公告全年 EPS 相符），可以直接餵給 aggregateEps。
async function getTWEps(code) {
  const from = `${Number(todayStr().slice(0, 4)) - 6}-01-01`;
  const url = 'https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockFinancialStatements' +
    `&data_id=${encodeURIComponent(code)}&start_date=${from}`;
  const r = await fetch(url, { cf: { cacheTtl: 86400 } });
  if (!r.ok) return null;
  const d = await r.json();
  const rows = (d && Array.isArray(d.data) ? d.data : []).filter((x) => x && x.type === 'EPS');
  if (!rows.length) return null;
  return rows.map((x) => ({ end: String(x.date), val: num(x.value) }));
}

// ticker → CIK 對照（約 1MB，全市場一份），快取一天。SEC 的 companyconcept 只吃 CIK。
async function getCikMap(env, ctx) {
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/sec-cik/v1/${todayStr()}`);
  try {
    const hit = await cache.match(key);
    if (hit) return hit.json();
  } catch (e) { /* 讀不到就重建 */ }
  const map = {};
  try {
    const r = await fetch('https://www.sec.gov/files/company_tickers.json', { headers: secHeaders(env), cf: { cacheTtl: 86400 } });
    if (r.ok) {
      const d = await r.json();
      Object.keys(d || {}).forEach((k) => {
        const row = d[k];
        if (row && row.ticker && row.cik_str) map[String(row.ticker).toUpperCase()] = String(row.cik_str).padStart(10, '0');
      });
    }
  } catch (e) { /* ignore — 這次就當查無資料 */ }
  if (Object.keys(map).length > 100) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(map), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    })));
  }
  return map;
}

// SEC XBRL 的單筆事實只有 start/end，沒有「這是第幾季」；用區間長度分辨年報與季報。
const isAnnualFact = (f) => { const d = daysBetween(f.start, f.end); return d >= 340 && d <= 400; };
const isQuarterFact = (f) => { const d = daysBetween(f.start, f.end); return d >= 80 && d <= 100; };

// 10-Q 只涵蓋前三個會計季，第四季只出現在 10-K 的全年數字裡，所以季序列固定會缺 Q4。
// 用「全年 − 該年已知的三季」把缺的那一季補回來，TTM 才算得出來。
function fillMissingQuarter(annuals, quarters) {
  const out = quarters.slice();
  annuals.forEach((a) => {
    const inside = out.filter((q) => q.end > a.start && q.end <= a.end);
    if (inside.length !== 3) return;
    // 三季都落在年度結束前兩個月以上 → 缺的必定是最後一季，季底就是年度結束日。
    if (inside.some((q) => daysBetween(q.end, a.end) < 60)) return;
    if (out.some((q) => q.end === a.end)) return;
    out.push({ end: a.end, val: round2(a.val - inside.reduce((s, q) => s + q.val, 0)) });
  });
  return out;
}

// 美股單季 EPS：SEC EDGAR companyconcept（免金鑰、官方、含歷史）。
// 稀釋 EPS 為主，公司沒報就退回基本 EPS。
async function getUSEps(code, env, ctx) {
  if (!env || !env.SEC_CONTACT) return null; // 沒設聯絡信箱就不打 SEC
  const cikMap = await getCikMap(env, ctx);
  const cik = cikMap[norm(code)];
  if (!cik) return null;
  for (const tag of ['EarningsPerShareDiluted', 'EarningsPerShareBasic']) {
    try {
      const r = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`, {
        headers: secHeaders(env), cf: { cacheTtl: 86400 },
      });
      if (!r.ok) continue;
      const d = await r.json();
      const facts = (d && d.units && d.units['USD/shares']) || [];
      if (!facts.length) continue;
      // 同一期間會被多份報告重覆申報（後期報告含重編值）；以最後申報的為準。
      const pick = (list) => {
        const by = new Map();
        list.forEach((f) => {
          const prev = by.get(f.end);
          if (!prev || String(f.filed) > String(prev.filed)) by.set(f.end, f);
        });
        return [...by.values()];
      };
      const annuals = pick(facts.filter(isAnnualFact)).map((f) => ({ start: f.start, end: f.end, val: f.val }));
      const quarters = pick(facts.filter(isQuarterFact)).map((f) => ({ end: f.end, val: f.val }));
      if (!annuals.length && !quarters.length) continue;
      return fillMissingQuarter(annuals, quarters);
    } catch (e) { /* 換下一個 tag */ }
  }
  return null;
}

// 單一代號的基本面（帶月快取）。查不到就回 null，交給呼叫端記進 missing。
async function getFundamental(code, env, ctx) {
  const cache = caches.default;
  const key = FUND_KEY(code);
  try {
    const hit = await cache.match(key);
    if (hit) return hit.json();
  } catch (e) { /* 讀不到就重查 */ }

  let quarters = null;
  const source = isTW(code) ? 'finmind' : 'sec-edgar';
  try {
    quarters = isTW(code) ? await getTWEps(code) : await getUSEps(code, env, ctx);
  } catch (e) { return null; }
  if (!quarters || !quarters.length) return null;

  const agg = aggregateEps(quarters);
  // 年度與 TTM 全空表示這檔沒有 EPS 可談（ETF、債券 ETF、剛上市），當作查無資料。
  if (!Object.keys(agg.epsAnnual).length && agg.epsTTM == null) return null;
  const item = { ...agg, source };
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify(item), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2592000' },
  })).catch(() => {}));
  return item;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === '/stocks') {
      const [list, us] = await Promise.all([getTWList(ctx), getUSList(env, ctx)]);
      return json({ stocks: list, us });
    }
    if (url.pathname === '/fundamentals') {
      const { askedBy, codes } = parseCodes(url);
      const items = {};
      const missing = [];
      const results = await Promise.all(codes.slice(0, 60).map(async (c) => {
        try { return [c, await getFundamental(c, env, ctx)]; } catch (e) { return [c, null]; }
      }));
      results.forEach(([n, item]) => {
        const originals = askedBy.get(n) || [n];
        if (item) originals.forEach((c) => { items[c] = item; });
        else originals.forEach((c) => missing.push(c));
      });
      // 比照 /quotes：缺資料只標 partial，永遠回 200，不讓前端整批丟棄查得到的部分。
      return json({ date: todayStr(), items, missing, partial: missing.length > 0 });
    }
    if (url.pathname !== '/quotes') {
      return new Response('FinFolio price service · /quotes?codes=2330,0050 · /stocks · /fundamentals?codes=2330,AAPL', { status: url.pathname === '/' ? 200 : 404, headers: CORS });
    }
    const { askedBy, codes } = parseCodes(url);
    const twCodes = codes.filter(isTW);
    const usCodes = codes.filter((c) => !isTW(c));

    const prices = {};
    let partial = false;

    // Taiwan: MIS latest first, daily-close as fallback for anything missing.
    if (twCodes.length) {
      try {
        const mis = await getMIS(twCodes);
        Object.assign(prices, mis);
      } catch (e) { partial = true; }
      const need = twCodes.filter((c) => prices[c] == null);
      if (need.length) {
        // 補價是「有就好」，絕不能拖垮整包回應。匯入歷史後一定會有下市／已賣光的代號查不到，
        // 以前這條路徑一失敗會讓整個請求 500，連 MIS 已經查到的持股也一起沒有報價，
        // 前端的 `if (!res.ok) return` 又是靜默的，症狀就是「收盤價永遠不更新」。
        // 現在請求路徑只讀快取；還缺的丟到背景建表，下一次刷新就補上。
        try {
          const cached = await readDailyCache();
          if (cached) need.forEach((c) => { if (cached[c] != null) prices[c] = cached[c]; });
        } catch (e) { /* 讀快取失敗就當沒補到 */ }
        const stillMissing = need.filter((c) => prices[c] == null);
        if (stillMissing.length) {
          partial = true;
          ctx.waitUntil(refreshDailyCache(stillMissing).catch(() => {}));
        }
      }
    }

    let fx = {};
    try {
      const [fxRes, usMap] = await Promise.all([getFX(ctx), getUS(usCodes, env)]);
      fx = fxRes;
      Object.keys(usMap).forEach((c) => { prices[c] = usMap[c]; });
    } catch (e) { partial = true; }

    // Yahoo fallback for US codes Finnhub didn't cover (e.g. SPCX / pre-IPO),
    // and for all US codes when no Finnhub key is set. Also carries 盤後價.
    const usMiss = usCodes.filter((c) => prices[c] == null);
    let usedYahoo = false;
    if (usMiss.length) {
      try {
        const yh = await getYahoo(usMiss);
        Object.keys(yh).forEach((c) => { prices[c] = yh[c]; });
        usedYahoo = Object.keys(yh).length > 0;
      } catch (e) { partial = true; }
    }

    // 攤回前端問的寫法（大寫問就回大寫，小寫問就同時回小寫），前端才取得到值。
    const out = {};
    askedBy.forEach((originals, n) => {
      if (prices[n] == null) return;
      originals.forEach((c) => { out[c] = prices[n]; });
    });

    // partial：有某個來源失敗，prices 可能不完整。仍然回 200 帶著已經拿到的價格——
    // 回 500 會讓前端整批丟棄，連查得到的持股都沒有報價。
    return json({ date: todayStr(), prices: out, fx, partial,
      source: 'twse-mis' + (env && env.FINNHUB_KEY ? '+finnhub' : '') + (usedYahoo ? '+yahoo' : '') });
  },
};
