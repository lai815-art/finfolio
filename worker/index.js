/**
 * FinFolio price service (Cloudflare Worker)
 *
 *   GET /quotes?codes=2330,0050,00679B
 *     → { date, prices: { "2330": 1045, ... }, fx: { USD: 32.1 }, source }
 *
 * Privacy: only stock CODES are sent here — never holdings, amounts or identity.
 * Taiwan daily-close comes from TWSE / TPEX open data (no key).
 * US stocks require a Finnhub key (env.FINNHUB_KEY); without it, US codes are
 * simply omitted and the app falls back to the user's transaction price.
 * Results are cached per day in the Worker Cache to respect upstream limits.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

const todayStr = () => {
  // Taiwan time (UTC+8) date — daily-close key
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

const isTW = (code) => /^\d/.test(String(code || ''));

const num = (s) => {
  const n = parseFloat(String(s == null ? '' : s).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

// Build (or read from cache) the full Taiwan code→close map for today.
async function getTWMap(ctx) {
  const cache = caches.default;
  // v2 + short TTL: TWSE's daily-all file finalizes in the afternoon, so refresh
  // every ~30 min (instead of caching the whole day) to self-correct to the
  // official close shortly after it publishes.
  const key = new Request(`https://ff-cache.local/tw/v2/${todayStr()}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const map = {};
  // TWSE 上市 每日收盤
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
  // TPEX 上櫃 每日收盤
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

  // cache for ~30 min (only if we actually got data)
  if (Object.keys(map).length > 50) {
    ctx.waitUntil(cache.put(key, new Response(JSON.stringify(map), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
    })));
  }
  return map;
}

// USD→TWD (and a few others) from a free, keyless source, cached daily.
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

// US daily close via Finnhub (previous close `pc`), only when a key is configured.
async function getUS(codes, env) {
  const out = {};
  if (!env || !env.FINNHUB_KEY || !codes.length) return out;
  await Promise.all(codes.slice(0, 25).map(async (c) => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(c)}&token=${env.FINNHUB_KEY}`, { cf: { cacheTtl: 1800 } });
      if (r.ok) {
        const d = await r.json();
        const p = d && (d.pc || d.c);
        if (p && p > 0) out[c] = p;
      }
    } catch (e) { /* ignore */ }
  }));
  return out;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname !== '/quotes') {
      return new Response('FinFolio price service · /quotes?codes=2330,0050', { status: url.pathname === '/' ? 200 : 404, headers: CORS });
    }
    const codes = (url.searchParams.get('codes') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const twCodes = codes.filter(isTW);
    const usCodes = codes.filter((c) => !isTW(c));

    const [twMap, fx, usMap] = await Promise.all([
      twCodes.length ? getTWMap(ctx) : Promise.resolve({}),
      getFX(ctx),
      getUS(usCodes, env),
    ]);

    const prices = {};
    twCodes.forEach((c) => { if (twMap[c] != null) prices[c] = twMap[c]; });
    Object.keys(usMap).forEach((c) => { prices[c] = usMap[c]; });

    return json({ date: todayStr(), prices, fx, source: 'twse/tpex' + (env && env.FINNHUB_KEY ? '+finnhub' : '') });
  },
};
