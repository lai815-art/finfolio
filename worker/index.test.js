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

  // ── /fundamentals ────────────────────────────────────────────────────────
  // 快取的 key 帶代號，測試之間互不干擾——但同一支測試不要重覆用同一個代號。
  const finmindEps = (rows) =>
    new Response(JSON.stringify({ msg: 'success', data: rows.map(([date, value]) => ({ date, stock_id: 'x', type: 'EPS', value })) }), { status: 200 });

  it('/fundamentals aggregates FinMind quarterly EPS into annual totals and TTM', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('finmindtrade.com')) {
          return finmindEps([
            ['2024-03-31', 1], ['2024-06-30', 2], ['2024-09-30', 3], ['2024-12-31', 4],
            ['2025-03-31', 2], ['2025-06-30', 3], ['2025-09-30', 4], ['2025-12-31', 5],
          ]);
        }
        return new Response('', { status: 404 });
      })
    );

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1111'), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items['1111'].epsAnnual).toEqual({ 2024: 10, 2025: 14 });
    expect(body.items['1111'].epsTTM).toBe(14); // 最近四季
    expect(body.items['1111'].epsTTMPrev).toBe(10); // 再往前四季
    expect(body.items['1111'].source).toBe('finmind');
    expect(body.partial).toBe(false);
  });

  // 年度只收湊滿四季的年份：三季的和拿去算成長率會憑空多出一個假的衰退年。
  it('/fundamentals skips years without four quarters, and reports no TTM when a quarter is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('finmindtrade.com')) {
          return finmindEps([
            ['2024-03-31', 1], ['2024-06-30', 2], ['2024-09-30', 3], ['2024-12-31', 4],
            ['2025-03-31', 2], ['2025-06-30', 3], /* Q3 缺 */ ['2025-12-31', 5],
          ]);
        }
        return new Response('', { status: 404 });
      })
    );

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1112'), env, ctx);
    const body = await res.json();

    expect(body.items['1112'].epsAnnual).toEqual({ 2024: 10 }); // 2025 只有三季 → 不收
    expect(body.items['1112'].epsTTM).toBeNull(); // 最近四季跨了 15 個月，不是一年
  });

  // 10-Q 只涵蓋前三個會計季，第四季只出現在 10-K 的全年數字裡。
  // 缺的那一季要用「全年 − 已知三季」補回來，否則 TTM 永遠算不出來。
  it('/fundamentals derives the missing fourth quarter from the SEC annual figure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes('company_tickers.json')) {
          const rows = { 0: { cik_str: 320193, ticker: 'TSTA', title: 'Test A' } };
          for (let i = 1; i < 150; i++) rows[i] = { cik_str: i, ticker: `Z${i}`, title: 'filler' };
          return new Response(JSON.stringify(rows), { status: 200 });
        }
        if (u.includes('EarningsPerShareDiluted')) {
          return new Response(JSON.stringify({ units: { 'USD/shares': [
            { start: '2025-01-01', end: '2025-12-31', val: 10, filed: '2026-02-01' },
            { start: '2025-01-01', end: '2025-03-31', val: 2, filed: '2025-05-01' },
            { start: '2025-04-01', end: '2025-06-30', val: 3, filed: '2025-08-01' },
            { start: '2025-07-01', end: '2025-09-30', val: 3, filed: '2025-11-01' },
          ] } }), { status: 200 });
        }
        return new Response('', { status: 404 });
      })
    );

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=TSTA'),
      { SEC_CONTACT: 'FinFolio Test test@example.com' }, ctx);
    const body = await res.json();

    expect(body.items.TSTA.epsAnnual).toEqual({ 2025: 10 }); // 補完 Q4=2 才湊滿四季
    expect(body.items.TSTA.epsTTM).toBe(10);
    expect(body.items.TSTA.source).toBe('sec-edgar');
  });

  // SEC 要求 User-Agent 帶聯絡信箱，信箱不寫死在公開 repo 裡；沒設定就整個不打 SEC。
  it('/fundamentals skips SEC entirely when no SEC_CONTACT is configured', async () => {
    const hits = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => { hits.push(String(url)); return new Response('', { status: 404 }); }));

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=TSTB'), env, ctx);
    const body = await res.json();

    expect(hits.some((u) => u.includes('sec.gov'))).toBe(false);
    expect(body.missing).toEqual(['TSTB']);
  });

  it('/fundamentals keys results back by the requested spelling and lists unknown codes as missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('finmindtrade.com') && String(url).includes('data_id=1113')) {
          return finmindEps([['2025-03-31', 1], ['2025-06-30', 1], ['2025-09-30', 1], ['2025-12-31', 1]]);
        }
        return new Response('', { status: 404 }); // 00713b 與 CIK 對照表都查不到
      })
    );

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1113,00713b,NOPE'), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200); // 缺資料仍回 200
    expect(body.items['1113'].epsTTM).toBe(4);
    expect(body.missing).toContain('00713b'); // ETF 沒有 EPS，照前端問的寫法回報
    expect(body.missing).toContain('NOPE');
    expect(body.partial).toBe(true);
  });

  it('/fundamentals survives an upstream failure without failing the whole request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1114'), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.missing).toEqual(['1114']);
    expect(body.partial).toBe(true);
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
