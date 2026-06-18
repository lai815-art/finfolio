// 股票資料：US 精選清單 + 台股靜態備援（僅保留確認正確名稱）+ TWSE/TPEX API
(function () {

/* ── 美股 / 美股 ETF 精選清單 ── */
window.US_STOCK_LIST = [
  { code:'AAPL',  name:'Apple',                class:'美股' },
  { code:'MSFT',  name:'Microsoft',             class:'美股' },
  { code:'GOOGL', name:'Alphabet A',            class:'美股' },
  { code:'GOOG',  name:'Alphabet C',            class:'美股' },
  { code:'AMZN',  name:'Amazon',                class:'美股' },
  { code:'META',  name:'Meta',                  class:'美股' },
  { code:'NVDA',  name:'Nvidia',                class:'美股' },
  { code:'TSLA',  name:'Tesla',                 class:'美股' },
  { code:'AVGO',  name:'Broadcom',              class:'美股' },
  { code:'ORCL',  name:'Oracle',                class:'美股' },
  { code:'AMD',   name:'AMD',                   class:'美股' },
  { code:'INTC',  name:'Intel',                 class:'美股' },
  { code:'QCOM',  name:'Qualcomm',              class:'美股' },
  { code:'TXN',   name:'Texas Instruments',     class:'美股' },
  { code:'MU',    name:'Micron',                class:'美股' },
  { code:'AMAT',  name:'Applied Materials',     class:'美股' },
  { code:'LRCX',  name:'Lam Research',          class:'美股' },
  { code:'KLAC',  name:'KLA Corp',              class:'美股' },
  { code:'ASML',  name:'ASML Holding',          class:'美股' },
  { code:'TSM',   name:'TSMC ADR',              class:'美股' },
  { code:'CRM',   name:'Salesforce',            class:'美股' },
  { code:'ADBE',  name:'Adobe',                 class:'美股' },
  { code:'NOW',   name:'ServiceNow',            class:'美股' },
  { code:'NFLX',  name:'Netflix',               class:'美股' },
  { code:'UBER',  name:'Uber',                  class:'美股' },
  { code:'SHOP',  name:'Shopify',               class:'美股' },
  { code:'PLTR',  name:'Palantir',              class:'美股' },
  { code:'SNOW',  name:'Snowflake',             class:'美股' },
  { code:'NET',   name:'Cloudflare',            class:'美股' },
  { code:'BRK.B', name:'Berkshire Hathaway B',  class:'美股' },
  { code:'JPM',   name:'JPMorgan Chase',        class:'美股' },
  { code:'BAC',   name:'Bank of America',       class:'美股' },
  { code:'WFC',   name:'Wells Fargo',           class:'美股' },
  { code:'GS',    name:'Goldman Sachs',         class:'美股' },
  { code:'MS',    name:'Morgan Stanley',        class:'美股' },
  { code:'V',     name:'Visa',                  class:'美股' },
  { code:'MA',    name:'Mastercard',            class:'美股' },
  { code:'AXP',   name:'American Express',      class:'美股' },
  { code:'C',     name:'Citigroup',             class:'美股' },
  { code:'LLY',   name:'Eli Lilly',             class:'美股' },
  { code:'JNJ',   name:'Johnson & Johnson',     class:'美股' },
  { code:'UNH',   name:'UnitedHealth',          class:'美股' },
  { code:'PFE',   name:'Pfizer',                class:'美股' },
  { code:'MRK',   name:'Merck',                 class:'美股' },
  { code:'ABBV',  name:'AbbVie',                class:'美股' },
  { code:'AMGN',  name:'Amgen',                 class:'美股' },
  { code:'WMT',   name:'Walmart',               class:'美股' },
  { code:'HD',    name:'Home Depot',            class:'美股' },
  { code:'COST',  name:'Costco',                class:'美股' },
  { code:'TGT',   name:'Target',               class:'美股' },
  { code:'NKE',   name:'Nike',                  class:'美股' },
  { code:'SBUX',  name:'Starbucks',             class:'美股' },
  { code:'MCD',   name:"McDonald's",            class:'美股' },
  { code:'KO',    name:'Coca-Cola',             class:'美股' },
  { code:'PEP',   name:'PepsiCo',               class:'美股' },
  { code:'PG',    name:'Procter & Gamble',      class:'美股' },
  { code:'XOM',   name:'ExxonMobil',            class:'美股' },
  { code:'CVX',   name:'Chevron',               class:'美股' },
  { code:'DIS',   name:'Disney',                class:'美股' },
  // 美股 ETF
  { code:'SPY',   name:'SPDR S&P 500',                class:'美股ETF' },
  { code:'QQQ',   name:'Invesco Nasdaq 100',          class:'美股ETF' },
  { code:'VTI',   name:'Vanguard Total Market',       class:'美股ETF' },
  { code:'VOO',   name:'Vanguard S&P 500',            class:'美股ETF' },
  { code:'IVV',   name:'iShares S&P 500',             class:'美股ETF' },
  { code:'VEA',   name:'Vanguard Dev Markets',        class:'美股ETF' },
  { code:'VWO',   name:'Vanguard Emerging',           class:'美股ETF' },
  { code:'BND',   name:'Vanguard Total Bond',         class:'美股ETF' },
  { code:'AGG',   name:'iShares Core US Agg Bond',    class:'美股ETF' },
  { code:'TLT',   name:'iShares 20+ Year Treasury',   class:'美股ETF' },
  { code:'IEF',   name:'iShares 7-10Y Treasury',      class:'美股ETF' },
  { code:'LQD',   name:'iShares IG Corporate Bond',   class:'美股ETF' },
  { code:'HYG',   name:'iShares High Yield Bond',     class:'美股ETF' },
  { code:'SCHD',  name:'Schwab US Dividend',          class:'美股ETF' },
  { code:'JEPI',  name:'JPMorgan Premium Income',     class:'美股ETF' },
  { code:'JEPQ',  name:'JPMorgan Nasdaq Premium',     class:'美股ETF' },
  { code:'VYM',   name:'Vanguard High Dividend',      class:'美股ETF' },
  { code:'DVY',   name:'iShares Select Dividend',     class:'美股ETF' },
  { code:'SOXX',  name:'iShares Semiconductor',       class:'美股ETF' },
  { code:'SMH',   name:'VanEck Semiconductor',        class:'美股ETF' },
  { code:'XLK',   name:'Technology Select SPDR',      class:'美股ETF' },
  { code:'XLF',   name:'Financial Select SPDR',       class:'美股ETF' },
  { code:'XLE',   name:'Energy Select SPDR',          class:'美股ETF' },
  { code:'ARKK',  name:'ARK Innovation',              class:'美股ETF' },
  { code:'VNQ',   name:'Vanguard Real Estate',        class:'美股ETF' },
  { code:'GLD',   name:'SPDR Gold Shares',            class:'美股ETF' },
  { code:'SLV',   name:'iShares Silver',              class:'美股ETF' },
];

/* ── 台股靜態備援（僅保留已確認名稱）── */
window.TW_STOCK_FALLBACK = [
  // 大型權值股
  {code:'2330',name:'台積電',    class:'台股'},{code:'2317',name:'鴻海',     class:'台股'},
  {code:'2454',name:'聯發科',    class:'台股'},{code:'2382',name:'廣達',     class:'台股'},
  {code:'2308',name:'台達電',    class:'台股'},{code:'2303',name:'聯電',     class:'台股'},
  {code:'3711',name:'日月光投控',class:'台股'},{code:'2002',name:'中鋼',     class:'台股'},
  {code:'1301',name:'台塑',      class:'台股'},{code:'1303',name:'南亞',     class:'台股'},
  {code:'2412',name:'中華電',    class:'台股'},{code:'2892',name:'第一金',   class:'台股'},
  {code:'2880',name:'華南金',    class:'台股'},{code:'2881',name:'富邦金',   class:'台股'},
  {code:'2882',name:'國泰金',    class:'台股'},{code:'2883',name:'開發金',   class:'台股'},
  {code:'2884',name:'玉山金',    class:'台股'},{code:'2885',name:'元大金',   class:'台股'},
  {code:'2886',name:'兆豐金',    class:'台股'},{code:'2887',name:'台新金',   class:'台股'},
  {code:'2888',name:'新光金',    class:'台股'},{code:'2891',name:'中信金',   class:'台股'},
  {code:'5880',name:'合庫金',    class:'台股'},{code:'2395',name:'研華',     class:'台股'},
  {code:'3034',name:'聯詠',      class:'台股'},{code:'2408',name:'南亞科',   class:'台股'},
  {code:'6669',name:'緯穎',      class:'台股'},{code:'2379',name:'瑞昱',     class:'台股'},
  {code:'3008',name:'大立光',    class:'台股'},{code:'4938',name:'和碩',     class:'台股'},
  {code:'2357',name:'華碩',      class:'台股'},{code:'2353',name:'宏碁',     class:'台股'},
  {code:'2376',name:'技嘉',      class:'台股'},{code:'3231',name:'緯創',     class:'台股'},
  {code:'6505',name:'台塑石化',  class:'台股'},{code:'1326',name:'台化',     class:'台股'},
  {code:'2105',name:'正新',      class:'台股'},{code:'9910',name:'豐泰',     class:'台股'},
  {code:'2207',name:'和泰車',    class:'台股'},{code:'2345',name:'智邦',     class:'台股'},
  {code:'3045',name:'台灣大',    class:'台股'},{code:'4904',name:'遠傳',     class:'台股'},
  {code:'2498',name:'宏達電',    class:'台股'},{code:'2347',name:'聯強',     class:'台股'},
  {code:'4966',name:'譜瑞-KY',   class:'台股'},{code:'6415',name:'矽力-KY',  class:'台股'},
  {code:'3661',name:'世芯-KY',   class:'台股'},{code:'6446',name:'藥華藥',   class:'台股'},
  // 台股市值 / 主題 ETF（已確認名稱）
  {code:'0050',  name:'元大台灣50',        class:'台股ETF'},
  {code:'0051',  name:'元大中型100',       class:'台股ETF'},
  {code:'0052',  name:'富邦科技',          class:'台股ETF'},
  {code:'0053',  name:'元大電子',          class:'台股ETF'},
  {code:'0055',  name:'元大MSCI金融',      class:'台股ETF'},
  {code:'0056',  name:'元大高股息',        class:'台股ETF'},
  {code:'0061',  name:'元大寶滬深',        class:'台股ETF'},
  {code:'006205',name:'FB上証',            class:'台股ETF'},
  {code:'006208',name:'富邦台灣50',        class:'台股ETF'},
  {code:'00631L',name:'元大台灣50正2',     class:'台股ETF'},
  {code:'00632R',name:'元大台灣50反1',     class:'台股ETF'},
  {code:'00646', name:'元大S&P500',        class:'台股ETF'},
  {code:'00647L',name:'元大S&P500正2',     class:'台股ETF'},
  {code:'00648R',name:'元大S&P500反1',     class:'台股ETF'},
  {code:'00661', name:'元大日經225',       class:'台股ETF'},
  {code:'00662', name:'富邦NASDAQ',        class:'台股ETF'},
  {code:'00668', name:'國泰美國道瓊',      class:'台股ETF'},
  {code:'00692', name:'富邦公司治理',      class:'台股ETF'},
  {code:'00701', name:'國泰低碳100',       class:'台股ETF'},
  {code:'00713', name:'元大台灣高息低波',  class:'台股ETF'},
  {code:'00730', name:'富邦臺灣優質高息',  class:'台股ETF'},
  {code:'00850', name:'元大臺灣ESG永續',   class:'台股ETF'},
  {code:'00878', name:'國泰永續高股息',    class:'台股ETF'},
  {code:'00881', name:'國泰臺灣5G+',       class:'台股ETF'},
  {code:'00882', name:'中信中國高股息',    class:'台股ETF'},
  {code:'00891', name:'中信關鍵半導體',    class:'台股ETF'},
  {code:'00892', name:'富邦臺灣半導體',    class:'台股ETF'},
  {code:'00893', name:'國泰智能電動車',    class:'台股ETF'},
  {code:'00900', name:'富邦特選高股息30',  class:'台股ETF'},
  {code:'00905', name:'FT臺灣Smart',       class:'台股ETF'},
  {code:'00907', name:'永豐優息存股',      class:'台股ETF'},
  {code:'00915', name:'凱基優選高股息30',  class:'台股ETF'},
  {code:'00916', name:'國泰全球品牌50',    class:'台股ETF'},
  {code:'00919', name:'群益台灣精選高息',  class:'台股ETF'},
  {code:'00929', name:'復華台灣科技優息',  class:'台股ETF'},
  {code:'00934', name:'中信成長高股息',    class:'台股ETF'},
  {code:'00939', name:'中信台灣高股息',    class:'台股ETF'},
  {code:'00940', name:'元大台灣價值高息',  class:'台股ETF'},
  // 使用者確認的代號
  {code:'00981A',name:'主動統一台股增長',  class:'台股ETF'},
  // 台股債券 ETF（已確認名稱）
  {code:'00679B',name:'元大美債20年',          class:'台股ETF'},
  {code:'00680B',name:'元大美債20年正2',        class:'台股ETF'},
  {code:'00697B',name:'元大美債20年反1',        class:'台股ETF'},
  {code:'00719B',name:'元大美債7-10年',         class:'台股ETF'},
  {code:'00720B',name:'元大投資級公司債',       class:'台股ETF'},
  {code:'00724B',name:'群益投資級公司債',       class:'台股ETF'},
  {code:'00725B',name:'國泰投資級公司債',       class:'台股ETF'},
  {code:'00726B',name:'富邦投資級公司債',       class:'台股ETF'},
  {code:'00750B',name:'FB投資級公司債',         class:'台股ETF'},
  {code:'00751B',name:'元大AAA至A公司債',       class:'台股ETF'},
  {code:'00754B',name:'群益7-10年投資級公司債', class:'台股ETF'},
  {code:'00772B',name:'中信高評公司債',         class:'台股ETF'},
  {code:'00773B',name:'中信彭博高收益債',       class:'台股ETF'},
  {code:'00780B',name:'富邦全球投資級',         class:'台股ETF'},
  {code:'00782B',name:'凱基25年美債',           class:'台股ETF'},
  {code:'00793B',name:'中信ESG投等債',          class:'台股ETF'},
  {code:'00830B',name:'元大MSCI投等債',         class:'台股ETF'},
  {code:'00836B',name:'元大美元IG15年',         class:'台股ETF'},
  {code:'00860B',name:'國泰20年美債',           class:'台股ETF'},
  {code:'00937B',name:'群益ESG投等債20+',       class:'台股ETF'},
];

/* ── 台股：從 TWSE / TPEX 完整清單 API 抓取 + 24h 快取 ── */
const TW_CACHE_KEY = 'ff_tw_stocks_v5';
const TW_CACHE_TTL = 24 * 60 * 60 * 1000;

function extractName(s) {
  return (s.Name || s.name || s.CompanyName || s.company_name ||
          s.SecuritiesCompanyAbbreviatedName || s.StockName || s['證券名稱'] || '').trim();
}
function extractCode(s) {
  return (s.Code || s.code || s.SecuritiesCompanyCode || s.StockCode || s['有價證券代號'] || '').trim();
}

window.loadTWStocks = async function () {
  try {
    const cached = JSON.parse(localStorage.getItem(TW_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < TW_CACHE_TTL && cached.data.length > 50)
      return cached.data;
  } catch {}

  // Preferred: the CORS-enabled price Worker returns the full TW list (incl. ETFs/bonds).
  try {
    if (window.FF_PRICE_API) {
      const r = await fetch(window.FF_PRICE_API + '/stocks');
      if (r.ok) {
        const d = await r.json();
        if (d && Array.isArray(d.stocks) && d.stocks.length > 50) {
          try { localStorage.setItem(TW_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d.stocks })); } catch {}
          return d.stocks;
        }
      }
    }
  } catch {}

  const seen = new Set();
  const stocks = [];
  const add = (code, name, cls) => {
    if (!code || !name || seen.has(code)) return;
    seen.add(code); stocks.push({ code, name, class: cls });
  };

  // TWSE 當日交易
  try {
    const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
    if (r.ok) { const d = await r.json(); (Array.isArray(d)?d:[]).forEach(s => add(extractCode(s), extractName(s), '台股')); }
  } catch {}

  // TWSE 所有上市公司
  try {
    const r = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/LISTED_COMPANY_INFO');
    if (r.ok) { const d = await r.json(); (Array.isArray(d)?d:[]).forEach(s => add(extractCode(s), extractName(s), '台股')); }
  } catch {}

  // TPEX 上櫃當日
  try {
    const r = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes');
    if (r.ok) { const d = await r.json(); (Array.isArray(d)?d:[]).forEach(s => add(extractCode(s), extractName(s), '台股')); }
  } catch {}

  // TPEX 所有上櫃公司
  try {
    const r = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis');
    if (r.ok) { const d = await r.json(); (Array.isArray(d)?d:[]).forEach(s => add(extractCode(s), extractName(s), '台股')); }
  } catch {}

  // 靜態備援補上 API 沒抓到的（優先保留靜態名稱作為覆蓋）
  (window.TW_STOCK_FALLBACK || []).forEach(s => {
    if (!seen.has(s.code)) add(s.code, s.name, s.class);
    else {
      // 若靜態清單中有確認名稱，覆蓋 API 回傳
      const idx = stocks.findIndex(x => x.code === s.code);
      if (idx >= 0) stocks[idx].name = s.name;
    }
  });

  const result = stocks.length > 50 ? stocks : (window.TW_STOCK_FALLBACK || []);
  try { localStorage.setItem(TW_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result })); } catch {}
  return result;
};

window._twStockPromise = window.loadTWStocks();

})();
