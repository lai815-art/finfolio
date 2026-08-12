/* ── 估值指標（本益比與本益成長比）──────────────────────────────────
   PEG = 本益比 ÷ EPS 成長率(%)。同一個本益比，成長越快代表越划算。

   Worker 只回原始 EPS（年度與 TTM），本益比與 PEG 一律在這裡算：現價本來就在
   前端手上，而且使用者要能手動覆寫成長率，指標留在同一個地方才有單一計算點。

   兩個成長率並列，因為免費資料源都沒有法人預估值：
     歷史成長率 = 近幾年「年度 EPS」的年化成長率（CAGR），看的是後照鏡
     近期成長率 = TTM EPS 相對前一個 TTM 的年增率，反應最近四季的動能
   兩者都可被使用者手動覆寫——覆寫就是「填自己的預估」的入口。

   純邏輯、無 React/DOM，方便單獨做單元測試。 */

// PEG 的參考分區門檻。低於 1 一般視為相對便宜，高於 2 視為偏貴。
const PEG_LOW = 1;
const PEG_HIGH = 2;

const isNum = (n) => typeof n === 'number' && isFinite(n);

// 年度 EPS map（{ '2023': 32.34, ... }）→ 近 years 年的年化成長率(%)。
// 起點 EPS <= 0 時 CAGR 沒有意義（由虧轉盈算不出倍數），回 null 而不是硬算一個天文數字。
export function ffEpsCagr(epsAnnual, years = 3) {
  const ys = Object.keys(epsAnnual || {}).filter((y) => isNum(epsAnnual[y])).sort();
  if (ys.length < 2 || years < 1) return null;
  const span = Math.min(years, ys.length - 1);
  const first = epsAnnual[ys[ys.length - 1 - span]];
  const last = epsAnnual[ys[ys.length - 1]];
  if (first <= 0 || last <= 0) return null;
  return (Math.pow(last / first, 1 / span) - 1) * 100;
}

// TTM EPS 相對前一個 TTM 的年增率(%)。前期 <= 0 一樣算不出有意義的成長率。
export function ffTtmYoy(epsTTM, epsTTMPrev) {
  if (!isNum(epsTTM) || !isNum(epsTTMPrev) || epsTTMPrev <= 0) return null;
  return (epsTTM - epsTTMPrev) / epsTTMPrev * 100;
}

// 本益比 = 現價 ÷ TTM EPS。虧損（EPS <= 0）沒有本益比可談。
export function ffPe(price, epsTTM) {
  if (!isNum(price) || price <= 0 || !isNum(epsTTM) || epsTTM <= 0) return null;
  return price / epsTTM;
}

// PEG = 本益比 ÷ 成長率(%)。成長率 <= 0 時 PEG 會變負數或無限大，一律回 null。
export function ffPeg(pe, growthPct) {
  if (!isNum(pe) || !isNum(growthPct) || growthPct <= 0) return null;
  return pe / growthPct;
}

// PEG 落在哪個參考區間。純資訊性分區，不是買賣訊號。
export function ffPegZone(peg) {
  if (!isNum(peg) || peg <= 0) return null;
  if (peg < PEG_LOW) return 'low';
  if (peg <= PEG_HIGH) return 'fair';
  return 'high';
}

/* 組出估值列表的一列。
   fund     = Worker /fundamentals 回的 { epsAnnual, epsTTM, epsTTMPrev }
   price    = 現價（同幣別，不換算——本益比是比值，換不換算結果一樣）
   override = 使用者手動覆寫 { cagr, yoy }，任一為數字就蓋掉自動值

   覆寫在這裡收斂成單一計算點，UI 只要讀 cagrOverridden / yoyOverridden 標記。*/
export function ffValuationRow(code, fund, price, override, cagrYears = 3) {
  const f = fund || {};
  const ov = override || {};
  const epsTTM = isNum(f.epsTTM) ? f.epsTTM : null;

  const autoCagr = ffEpsCagr(f.epsAnnual, cagrYears);
  const autoYoy = ffTtmYoy(epsTTM, f.epsTTMPrev);
  const cagrOverridden = isNum(ov.cagr);
  const yoyOverridden = isNum(ov.yoy);
  const cagr = cagrOverridden ? ov.cagr : autoCagr;
  const yoy = yoyOverridden ? ov.yoy : autoYoy;

  const pe = ffPe(price, epsTTM);
  const pegCagr = ffPeg(pe, cagr);
  const pegYoy = ffPeg(pe, yoy);

  return {
    code,
    price: isNum(price) && price > 0 ? price : null,
    epsAnnual: f.epsAnnual || {},
    epsQuarters: f.epsQuarters || [], // 圖表切「季」時用；舊快取沒有這個欄位就是空陣列
    epsTTM, pe,
    cagr, yoy, cagrOverridden, yoyOverridden,
    pegCagr, pegYoy,
    zone: ffPegZone(pegCagr != null ? pegCagr : pegYoy),
    // UI 要能分辨「還沒抓」「這檔沒有 EPS（ETF/債券）」「有 EPS 但在虧損」三種空白
    hasFundamentals: epsTTM != null || Object.keys(f.epsAnnual || {}).length > 0,
  };
}

// 依 PEG 由小到大排序用的比較子。算不出 PEG 的一律排在最後，不要混在便宜的那一頭。
export function ffComparePeg(a, b) {
  const av = isNum(a && a.pegCagr) ? a.pegCagr : isNum(a && a.pegYoy) ? a.pegYoy : null;
  const bv = isNum(b && b.pegCagr) ? b.pegCagr : isNum(b && b.pegYoy) ? b.pegYoy : null;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return av - bv;
}
