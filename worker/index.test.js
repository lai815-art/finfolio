import { describe, it, expect, vi, afterEach } from 'vitest';
import worker, { parseISINHtml } from './index.js';

const env = {};
// 收下背景工作並在每個測試結束時等它落地。丟掉不管的話，寫快取會在下一個測試進行中
// 才完成，變成偶發的跨測試污染（症狀是單獨跑會過、整批跑會紅）。
const pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

describe('finfolio-prices worker', () => {
  // Yahoo 的 cookie + crumb 快取 key 只帶日期、不帶代號，所以會跨測試殘留：
  // 不清掉的話，測「crumb 只取一次」與「crumb 被拒」時都會直接命中前一個測試留下的憑證。
  const clearYahooAuth = async () => {
    const d = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    try { await caches.default.delete(new Request(`https://ff-cache.local/yh-auth/v1/${d}`)); } catch (e) {}
  };
  const clearForward = async (code) => {
    const d = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    try { await caches.default.delete(new Request(`https://ff-cache.local/fwd/v1/${code}/${d}`)); } catch (e) {}
  };

  afterEach(async () => {
    await Promise.allSettled(pending.splice(0)); // 先等背景寫完，再拆 stub、清快取
    vi.unstubAllGlobals();
    await clearYahooAuth();
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
    // 季序列給前端的「年/季」切換用，依季底日期由舊到新
    expect(body.items['1111'].epsQuarters).toEqual([
      { end: '2024-03-31', val: 1 }, { end: '2024-06-30', val: 2 },
      { end: '2024-09-30', val: 3 }, { end: '2024-12-31', val: 4 },
      { end: '2025-03-31', val: 2 }, { end: '2025-06-30', val: 3 },
      { end: '2025-09-30', val: 4 }, { end: '2025-12-31', val: 5 },
    ]);
  });

  it('/fundamentals caps the quarterly series at the most recent 12 quarters', async () => {
    const rows = [];
    for (let y = 2020; y <= 2025; y++) {
      ['03-31', '06-30', '09-30', '12-31'].forEach((md, i) => rows.push([`${y}-${md}`, i + 1]));
    }
    vi.stubGlobal('fetch', vi.fn(async (url) =>
      String(url).includes('finmindtrade.com') ? finmindEps(rows) : new Response('', { status: 404 })));

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1115'), env, ctx);
    const body = await res.json();

    expect(body.items['1115'].epsQuarters).toHaveLength(12);
    expect(body.items['1115'].epsQuarters[0].end).toBe('2023-03-31'); // 只留最近三年
    expect(Object.keys(body.items['1115'].epsAnnual)).toHaveLength(6); // 年度不受影響
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

  // ── 分析師預估（Yahoo）─────────────────────────────────────────────────
  // quoteSummary 需要 cookie + crumb，整條路徑是 best-effort：拿不到只是少一個欄位。
  const yahooStub = (trendBySymbol, opts = {}) => {
    const seen = { crumb: 0, symbols: [] };
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('finmindtrade.com')) {
        return finmindEps([['2025-03-31', 1], ['2025-06-30', 1], ['2025-09-30', 1], ['2025-12-31', 1]]);
      }
      if (u.includes('fc.yahoo.com')) {
        return new Response('', { status: 200, headers: { 'Set-Cookie': 'A3=token; Path=/' } });
      }
      if (u.includes('getcrumb')) {
        seen.crumb++;
        return new Response(opts.crumb === null ? 'Too Many Requests' : 'abc123', { status: 200 });
      }
      if (u.includes('quoteSummary')) {
        const sym = decodeURIComponent(u.split('quoteSummary/')[1].split('?')[0]);
        seen.symbols.push(sym);
        const trend = trendBySymbol[sym];
        if (!trend) return new Response('', { status: 404 });
        return new Response(JSON.stringify({ quoteSummary: { result: [{ earningsTrend: { trend } }] } }), { status: 200 });
      }
      return new Response('', { status: 404 });
    }));
    return seen;
  };
  const est = (period, avg, n) => ({ period, earningsEstimate: { avg: { raw: avg }, numberOfAnalysts: { raw: n } } });

  it('/fundamentals attaches the Yahoo analyst estimate as forward', async () => {
    yahooStub({ '2211.TW': [est('0q', 2, 9), est('0y', 10, 30), est('+1y', 13, 32)] });

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=2211'), env, ctx);
    const body = await res.json();

    expect(body.items['2211'].forward).toEqual({ eps0y: 10, eps1y: 13, analysts: 32, symbol: '2211.TW' });
    expect(body.forwardSource).toBe('yahoo');
    expect(body.items['2211'].epsTTM).toBe(4); // 主資料照舊
  });

  // 實測 2330 只有 .TW 有、5274 只有 .TWO 有，猜錯後綴就是整檔 404
  it('/fundamentals falls back from .TW to .TWO for over-the-counter codes', async () => {
    const seen = yahooStub({ '2212.TWO': [est('0y', 20, 12), est('+1y', 30, 14)] });

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=2212'), env, ctx);
    const body = await res.json();

    expect(seen.symbols).toEqual(['2212.TW', '2212.TWO']); // 先試上市、再試上櫃
    expect(body.items['2212'].forward.symbol).toBe('2212.TWO');
  });

  it('/fundamentals omits forward when the stock has no analyst coverage', async () => {
    yahooStub({}); // 每個代號都 404

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=2213'), env, ctx);
    const body = await res.json();

    expect(body.items['2213'].forward).toBeUndefined();
    expect(body.items['2213'].epsAnnual).toEqual({ 2025: 4 }); // 主資料仍完整
    expect(body.forwardSource).toBe('yahoo'); // 有拿到 crumb，只是這檔沒人覆蓋
  });

  it('/fundamentals only needs one crumb for the whole batch', async () => {
    const seen = yahooStub({ '2214.TW': [est('0y', 5, 4), est('+1y', 6, 4)] });

    await worker.fetch(new Request('https://worker.example/fundamentals?codes=2214,2215,2216'), env, ctx);

    expect(seen.crumb).toBe(1); // 每檔各取一次會把 Yahoo 的限流打爆
  });

  // 被限流時 getcrumb 回的是「Too Many Requests」這串字，不是錯誤碼
  it('/fundamentals reports forwardSource unavailable when the crumb is rejected', async () => {
    yahooStub({ '2217.TW': [est('0y', 5, 4), est('+1y', 6, 4)] }, { crumb: null });

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=2217'), env, ctx);
    const body = await res.json();

    expect(body.forwardSource).toBe('unavailable');
    expect(body.items['2217'].forward).toBeUndefined();
    expect(body.items['2217'].epsTTM).toBe(4); // Yahoo 掛掉不影響 EPS 主資料
  });

  // 預估獨立日快取的重點：Yahoo 暫時掛掉不能被記成「這檔今天沒有預估」，
  // 否則綁在 EPS 的月快取裡會讓這檔整個月都沒有預估，前端按刷新也救不回來。
  it('/fundamentals retries the estimate after a Yahoo outage instead of caching the failure', async () => {
    await clearForward('2219');
    yahooStub({ '2219.TW': [est('0y', 5, 4), est('+1y', 6, 4)] }, { crumb: null }); // Yahoo 拿不到 crumb
    const bad = await (await worker.fetch(new Request('https://worker.example/fundamentals?codes=2219'), env, ctx)).json();
    expect(bad.forwardSource).toBe('unavailable');
    expect(bad.items['2219'].forward).toBeUndefined();

    await Promise.allSettled(pending.splice(0));
    vi.unstubAllGlobals();
    await clearYahooAuth();

    yahooStub({ '2219.TW': [est('0y', 5, 4), est('+1y', 6, 4)] }); // Yahoo 恢復
    const good = await (await worker.fetch(new Request('https://worker.example/fundamentals?codes=2219'), env, ctx)).json();
    expect(good.items['2219'].forward.eps1y).toBe(6); // 沒有被前一次失敗鎖住
    await clearForward('2219');
  });

  it('/fundamentals ignores an estimate that is missing the next-year figure', async () => {
    yahooStub({ '2218.TW': [est('0q', 2, 9), est('0y', 10, 30)] }); // 只有本年度，沒有 +1y

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=2218'), env, ctx);
    const body = await res.json();

    expect(body.items['2218'].forward).toBeUndefined(); // 算不出預估成長率
  });

  it('/fundamentals survives an upstream failure without failing the whole request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    const res = await worker.fetch(new Request('https://worker.example/fundamentals?codes=1114'), env, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.missing).toEqual(['1114']);
    expect(body.partial).toBe(true);
  });

  // ── /estimates（分析師預估明細）────────────────────────────────────────
  const clearEstimates = async (code) => {
    const d = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    try { await caches.default.delete(new Request(`https://ff-cache.local/est/v1/${code}/${d}`)); } catch (e) {}
  };
  const num = (v) => ({ raw: v, fmt: String(v) });
  const fullTrend = [
    { period: '0q', endDate: '2026-09-30', growth: num(0.6154),
      earningsEstimate: { avg: num(28.17), low: num(26.3), high: num(29.85), numberOfAnalysts: num(23), yearAgoEps: num(17.44) },
      epsTrend: { current: num(28.17), '30daysAgo': num(26.89), '90daysAgo': num(25.98) },
      epsRevisions: { upLast30days: num(18), downLast30days: num(0) } },
    { period: '+1q', endDate: '2026-12-31', growth: num(0.5877),
      earningsEstimate: { avg: num(30.96), low: num(28.2), high: num(33.17), numberOfAnalysts: num(23), yearAgoEps: num(19.5) },
      epsTrend: {}, epsRevisions: {} },
    { period: '0y', endDate: '2026-12-31', growth: num(0.6203),
      earningsEstimate: { avg: num(107.34), low: num(98.4), high: num(111.91), numberOfAnalysts: num(33), yearAgoEps: num(66.25) },
      epsTrend: { current: num(107.34), '30daysAgo': num(99.91), '90daysAgo': num(97.6) },
      epsRevisions: { upLast30days: num(26), downLast30days: num(0) } },
    { period: '+1y', endDate: '2027-12-31', growth: num(0.2896),
      earningsEstimate: { avg: num(138.43), low: num(93.3), high: num(159.67), numberOfAnalysts: num(36), yearAgoEps: num(107.34) },
      epsTrend: {}, epsRevisions: {} },
  ];
  const estStub = (bySymbol, opts = {}) => {
    const seen = { symbols: [] };
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('fc.yahoo.com')) return new Response('', { status: 200, headers: { 'Set-Cookie': 'A3=t; Path=/' } });
      if (u.includes('getcrumb')) return new Response(opts.crumb === null ? 'Too Many Requests' : 'abc123', { status: 200 });
      if (u.includes('quoteSummary')) {
        const sym = decodeURIComponent(u.split('quoteSummary/')[1].split('?')[0]);
        seen.symbols.push(sym);
        const payload = bySymbol[sym];
        if (!payload) return new Response('', { status: 404 });
        return new Response(JSON.stringify({ quoteSummary: { result: [payload] } }), { status: 200 });
      }
      return new Response('', { status: 404 });
    }));
    return seen;
  };

  it('/estimates shapes the analyst detail, keeping the low–high spread', async () => {
    await clearEstimates('3311');
    estStub({ '3311.TW': {
      earningsTrend: { trend: fullTrend },
      financialData: { targetMeanPrice: num(3141.6), targetHighPrice: num(4200), targetLowPrice: num(2147),
        numberOfAnalystOpinions: num(35), recommendationKey: 'strong_buy', financialCurrency: 'TWD' },
      recommendationTrend: { trend: [{ period: '0m', strongBuy: 9, buy: 25, hold: 1, sell: 0, strongSell: 0 }] },
    } });

    const res = await worker.fetch(new Request('https://worker.example/estimates?code=3311'), env, ctx);
    const b = await res.json();

    expect(b.source).toBe('yahoo');
    expect(b.symbol).toBe('3311.TW');
    expect(b.currency).toBe('TWD');
    expect(b.periods.map((p) => p.key)).toEqual(['0q', '+1q', '0y', '+1y']);
    // 區間是這個端點存在的理由——平均值 138.43 藏住了 93.3~159.67 的分歧
    const y1 = b.periods.find((p) => p.key === '+1y');
    expect([y1.low, y1.avg, y1.high]).toEqual([93.3, 138.43, 159.67]);
    expect(y1.analysts).toBe(36);
    const y0 = b.periods.find((p) => p.key === '0y');
    expect(y0.trend).toEqual({ current: 107.34, d30: 99.91, d90: 97.6 }); // 預估被調升
    expect(y0.revisions).toEqual({ up30: 26, down30: 0 });
    expect(b.target).toEqual({ mean: 3141.6, high: 4200, low: 2147, analysts: 35, key: 'strong_buy' });
    expect(b.ratings).toEqual({ strongBuy: 9, buy: 25, hold: 1, sell: 0, strongSell: 0 });
    await clearEstimates('3311');
  });

  it('/estimates falls back to the .TWO suffix', async () => {
    await clearEstimates('3312');
    const seen = estStub({ '3312.TWO': { earningsTrend: { trend: fullTrend } } });

    const b = await (await worker.fetch(new Request('https://worker.example/estimates?code=3312'), env, ctx)).json();

    expect(seen.symbols).toEqual(['3312.TW', '3312.TWO']);
    expect(b.symbol).toBe('3312.TWO');
    await clearEstimates('3312');
  });

  it('/estimates keeps the periods when the target and rating modules are absent', async () => {
    await clearEstimates('3313');
    estStub({ '3313.TW': { earningsTrend: { trend: fullTrend } } }); // 沒有 financialData / recommendationTrend

    const b = await (await worker.fetch(new Request('https://worker.example/estimates?code=3313'), env, ctx)).json();

    expect(b.periods).toHaveLength(4);
    expect(b.target).toBeNull();
    expect(b.ratings).toBeNull();
    await clearEstimates('3313');
  });

  it('/estimates returns 200 with an empty shape when the stock has no coverage', async () => {
    await clearEstimates('3314');
    estStub({}); // 每個後綴都 404

    const res = await worker.fetch(new Request('https://worker.example/estimates?code=3314'), env, ctx);
    const b = await res.json();

    expect(res.status).toBe(200);
    expect(b.periods).toEqual([]);
    expect(b.source).toBe('yahoo'); // 拿得到 crumb，只是這檔沒人覆蓋
    await clearEstimates('3314');
  });

  it('/estimates reports source unavailable and does not cache when Yahoo is rate-limited', async () => {
    await clearEstimates('3315');
    estStub({ '3315.TW': { earningsTrend: { trend: fullTrend } } }, { crumb: null });
    const bad = await (await worker.fetch(new Request('https://worker.example/estimates?code=3315'), env, ctx)).json();
    expect(bad.source).toBe('unavailable');
    expect(bad.periods).toEqual([]);

    await Promise.allSettled(pending.splice(0));
    vi.unstubAllGlobals();
    await clearYahooAuth();

    estStub({ '3315.TW': { earningsTrend: { trend: fullTrend } } }); // Yahoo 恢復
    const good = await (await worker.fetch(new Request('https://worker.example/estimates?code=3315'), env, ctx)).json();
    expect(good.periods).toHaveLength(4); // 失敗沒有被寫進快取
    await clearEstimates('3315');
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

  // TWSE ISIN 的分類標題是 <B> 股票 <B>——沒有收尾標籤。曾經因為正則要求 </b> 而永遠比不中，
  // 分類一直是空字串，權證的排除條件形同虛設，/stocks 回了四萬多筆、其中三萬八是權證。
  // 這裡測的是解析後的 HTML 字串（Big5 編碼在 Node 端做不出來，所以不從 fetch 那層測）。
  describe('parseISINHtml', () => {
    const row = (code, name) => `<tr><td bgcolor=#FAFAD2>${code}　${name}</td><td bgcolor=#FAFAD2>TW000${code}</td></tr>`;
    const header = (cat) => `<tr><td bgcolor=#FAFAD2 colspan=7 ><B> ${cat} <B> </td></tr>`;
    const html =
      header('股票') + row('1101', '台泥') +
      header('上市認購(售)權證') + row('03001T', '啟碁台新5A售02') +
      header('ETF') + row('0050', '元大台灣50');

    it('keeps 股票 and ETF rows', () => {
      expect(parseISINHtml(html)).toEqual([
        { code: '1101', name: '台泥' },
        { code: '0050', name: '元大台灣50' },
      ]);
    });

    it('drops rows under a 權證 category', () => {
      expect(parseISINHtml(html).some((s) => s.code === '03001T')).toBe(false);
    });
  });
});
