/* ── 股票類別配色 ──────────────────────────────────────────────────
   同一個股票類別（股票/債券/市值 ETF/…）在資產配置圓餅、投資主頁持倉卡、
   投資配置頁三個地方要是同一個顏色。顏色依類別在主檔 asset_class 裡的
   「順序」指派，不看市值——市值排名會隨報價變動，顏色就跟著跳。
   純邏輯、無 React/DOM，方便單獨做單元測試。 */

// 調色盤：冷暖交錯，且避開資產配置圓餅裡固定的 現金(綠)/存款(深藍)。
// 用 token key + hex fallback：Design System 頁改 token 會連動，測試環境沒有
// window.TOKENS 時也能跑。
const PALETTE_TOKENS = ['orange', 'indigo', 'red', 'teal', 'gold2', 'blue', 'inv5', 'green2'];
const PALETTE_FALLBACK = ['#C4854A', '#7A6EA2', '#B85C4A', '#5A8E88', '#D4B87A', '#7AAFC4', '#B09458', '#7DAD79'];

export function ffAssetClassPalette(tokens) {
  const t = tokens || (typeof window !== 'undefined' && window.TOKENS) || {};
  return PALETTE_TOKENS.map((key, i) => t[key] || PALETTE_FALLBACK[i]);
}

// 類別名 → 顏色。names 由呼叫端組成「主檔順序在前、只出現在持倉的類別接在後面」。
export function ffAssetClassColorMap(names, palette) {
  const pal = palette && palette.length ? palette : ffAssetClassPalette();
  const map = {};
  [...new Set((names || []).filter(Boolean))].forEach((name, i) => {
    map[name] = pal[i % pal.length];
  });
  return map;
}

// 把 hex 往白(t>0)或黑(t<0)混。t 介於 -1~1；非 6 碼 hex 原樣回傳。
export function ffMixHex(hex, t) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const target = t >= 0 ? 255 : 0;
  const ratio = Math.min(1, Math.abs(t));
  const ch = (shift) => {
    const v = n >> shift & 255;
    return Math.round(v + (target - v) * ratio);
  };
  return '#' + [ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// 同一類別內第 i 檔（共 n 檔，依市值由大到小）的顏色：
// 最大的那檔用類別基準色，其餘依序往亮的方向漸層，最多混到 55% 白。
export function ffClassShade(baseHex, i, n) {
  if (n <= 1 || i <= 0) return baseHex;
  return ffMixHex(baseHex, i / (n - 1) * 0.55);
}
