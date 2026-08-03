import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from './index.js';

const env = {};
const ctx = { waitUntil: () => {} };

describe('finfolio-prices worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('responds to CORS preflight', async () => {
    const req = new Request('https://worker.example/quotes', { method: 'OPTIONS' });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns a plain-text banner at the root path', async () => {
    const req = new Request('https://worker.example/');
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('/quotes?codes=');
  });

  it('404s on an unknown path', async () => {
    const req = new Request('https://worker.example/not-a-route');
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(404);
  });

  it('/quotes reads a TW price from the (mocked) TWSE MIS response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('mis.twse.com.tw')) {
          return new Response(JSON.stringify({ msgArray: [{ c: '2330', z: '1000', y: '990' }] }), {
            status: 200,
          });
        }
        // FX lookup (open.er-api.com) — return a fixed rate so the response is deterministic.
        return new Response(JSON.stringify({ rates: { TWD: 32.5 } }), { status: 200 });
      })
    );

    const req = new Request('https://worker.example/quotes?codes=2330');
    const res = await worker.fetch(req, env, ctx);
    const body = await res.json();

    expect(body.prices['2330']).toBe(1000);
  });

  // 債券 ETF（00720B/00751B/00795B…）的代號帶字母尾碼，而 MIS 的 ex_ch 區分大小寫：
  // 小寫 tse_00720b.tw 回空值。查詢要一律轉大寫，但回應要照前端問的寫法回，否則前端
  // 用 livePrices[trade.code] 取值會落空——症狀就是這幾檔永遠抓不到收盤價。
  it('/quotes prices a lower-case bond-ETF code, keyed back by the requested spelling', async () => {
    const exCh = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const s = String(url);
        if (s.includes('mis.twse.com.tw')) {
          exCh.push(new URL(s).searchParams.get('ex_ch'));
          // MIS 只認大寫，且回的是正規化後的代號。
          return new Response(JSON.stringify({ msgArray: [{ c: '00720B', z: '32.27', y: '32.39' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ rates: { TWD: 32.5 } }), { status: 200 });
      })
    );

    const req = new Request('https://worker.example/quotes?codes=00720b');
    const res = await worker.fetch(req, env, ctx);
    const body = await res.json();

    expect(exCh.join('|')).toContain('tse_00720B.tw');
    expect(body.prices['00720b']).toBe(32.27); // 前端問小寫 → 回小寫 key
  });

  it('/quotes dedupes codes that differ only in case and prices both spellings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('mis.twse.com.tw')) {
          return new Response(JSON.stringify({ msgArray: [{ c: '00751B', z: '30.83', y: '31.02' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ rates: { TWD: 32.5 } }), { status: 200 });
      })
    );

    const req = new Request('https://worker.example/quotes?codes=00751B,00751b');
    const res = await worker.fetch(req, env, ctx);
    const body = await res.json();

    expect(body.prices['00751B']).toBe(30.83);
    expect(body.prices['00751b']).toBe(30.83);
    expect(body.partial).toBe(false); // 大小寫不同不算「查不到」，不該退去跑補價
  });

  it('routes all US quotes through Yahoo when no FINNHUB_KEY is configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('query1.finance.yahoo.com')) {
          return new Response(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 227.5 } }] } }), { status: 200 });
        }
        if (u.includes('open.er-api.com')) {
          return new Response(JSON.stringify({ rates: { TWD: 32.5 } }), { status: 200 });
        }
        return new Response('', { status: 404 });
      })
    );

    const req = new Request('https://worker.example/quotes?codes=AAPL');
    const res = await worker.fetch(req, env /* no FINNHUB_KEY */, ctx);
    const body = await res.json();

    expect(body.prices.AAPL).toBe(227.5);
    expect(body.source).not.toContain('finnhub');
    expect(body.source).toContain('yahoo');
  });

  it('falls back to Yahoo only for the specific US symbols Finnhub misses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('finnhub.io/api/v1/quote')) {
          // AAPL: Finnhub has it. SPCX: Finnhub doesn't (pre-IPO / structured product).
          if (u.includes('symbol=AAPL')) return new Response(JSON.stringify({ c: 150, pc: 148 }), { status: 200 });
          return new Response(JSON.stringify({ c: 0, pc: 0 }), { status: 200 });
        }
        if (u.includes('query1.finance.yahoo.com')) {
          return new Response(JSON.stringify({ chart: { result: [{ meta: { previousClose: 12.3 } }] } }), { status: 200 });
        }
        if (u.includes('open.er-api.com')) {
          return new Response(JSON.stringify({ rates: { TWD: 32.5 } }), { status: 200 });
        }
        return new Response('', { status: 404 });
      })
    );

    const req = new Request('https://worker.example/quotes?codes=AAPL,SPCX');
    const res = await worker.fetch(req, { FINNHUB_KEY: 'test-key' }, ctx);
    const body = await res.json();

    expect(body.prices.AAPL).toBe(150); // from Finnhub, no Yahoo needed
    expect(body.prices.SPCX).toBe(12.3); // Finnhub missed it, Yahoo covered it
    expect(body.source).toContain('finnhub');
    expect(body.source).toContain('yahoo');
  });

  it('GET /stocks returns the {stocks, us} shape, with us empty when no FINNHUB_KEY is set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })) // every TW/US list source unavailable
    );

    const req = new Request('https://worker.example/stocks');
    const res = await worker.fetch(req, env, ctx);
    const body = await res.json();

    expect(Array.isArray(body.stocks)).toBe(true);
    expect(body.us).toEqual([]);
  });
});
