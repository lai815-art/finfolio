/**
 * FinFolio price service (Cloudflare Worker)
 *
 *   GET /quotes?codes=2330,0050,00679B
 *     → { date, prices: { "2330": 2400, ... }, fx: { USD: 31.5 }, source }
 *
 * Privacy: only stock CODES are sent here — never holdings, amounts or identity.
 * Taiwan price: TWSE MIS latest trade/close (server-side, no CORS), with the
 *   TWSE/TPEX daily-close open data as a fallback.
 * US stocks require a Finnhub key (env.FINNHUB_KEY); without it, US codes are
 *   omitted and the app falls back to the user's transaction price.
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
const num = (s) => {
  const n = parseFloat(String(s == null ? '' : s).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

// Taiwan latest price via TWSE MIS (server-side — no browser CORS limit).
// `z` = last traded price (after close = today's close); `y` = prev close.
async function getMIS(codes) {
  const out = {};
  if (!codes.length) return out;
  try {
    const exCh = codes.slice(0, 50)
      .flatMap((c) => [`tse_${c}.tw`, `otc_${c}.tw`])
      .join('|');
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
  return out;
}

// Fallback: full TW daily-close map (TWSE 上市 + TPEX 上櫃), cached ~30 min.
async function getDailyAll(ctx) {
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/tw/v2/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const map = {};
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

  if (Object.keys(map).length > 50) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(map), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
    })));
  }
  return map;
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

// US daily close via Finnhub (previous close `pc`), only when a key is set.
async function getUS(codes, env) {
  const out = {};
  if (!env || !env.FINNHUB_KEY || !codes.length) return out;
  await Promise.all(codes.slice(0, 25).map(async (c) => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(c)}&token=${env.FINNHUB_KEY}`, { cf: { cacheTtl: 600 } });
      if (r.ok) {
        const d = await r.json();
        const p = d && (d.pc || d.c);
        if (p && p > 0) out[c] = p;
      }
    } catch (e) { /* ignore */ }
  }));
  return out;
}

// Full Taiwan securities list (code → name), incl. ETFs/bonds — cached ~12h.
async function getTWList(ctx) {
  const cache = caches.default;
  const key = new Request(`https://ff-cache.local/twlist/v1/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const map = {};
  const add = (code, name) => { if (code && name && !map[code]) map[code] = name; };
  try {
    const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { cf: { cacheTtl: 21600 } });
    if (r.ok) { const arr = await r.json(); (Array.isArray(arr) ? arr : []).forEach((s) => add(s.Code, (s.Name || '').trim())); }
  } catch (e) { /* ignore */ }
  try {
    const r = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes', { cf: { cacheTtl: 21600 } });
    if (r.ok) { const arr = await r.json(); (Array.isArray(arr) ? arr : []).forEach((s) => add(s.SecuritiesCompanyCode || s.Code, (s.CompanyName || s.Name || '').trim())); }
  } catch (e) { /* ignore */ }
  const list = Object.keys(map).map((code) => ({ code, name: map[code], class: '台股' }));
  if (list.length > 50) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(list), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=43200' },
    })));
  }
  return list;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === '/stocks') {
      const list = await getTWList(ctx);
      return json({ stocks: list });
    }
    if (url.pathname !== '/quotes') {
      return new Response('FinFolio price service · /quotes?codes=2330,0050 · /stocks', { status: url.pathname === '/' ? 200 : 404, headers: CORS });
    }
    const codes = (url.searchParams.get('codes') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const twCodes = codes.filter(isTW);
    const usCodes = codes.filter((c) => !isTW(c));

    const prices = {};

    // Taiwan: MIS latest first, daily-close as fallback for anything missing.
    if (twCodes.length) {
      const mis = await getMIS(twCodes);
      Object.assign(prices, mis);
      const need = twCodes.filter((c) => prices[c] == null);
      if (need.length) {
        const all = await getDailyAll(ctx);
        need.forEach((c) => { if (all[c] != null) prices[c] = all[c]; });
      }
    }

    const [fx, usMap] = await Promise.all([getFX(ctx), getUS(usCodes, env)]);
    Object.keys(usMap).forEach((c) => { prices[c] = usMap[c]; });

    return json({ date: todayStr(), prices, fx, source: 'twse-mis' + (env && env.FINNHUB_KEY ? '+finnhub' : '') });
  },
};
