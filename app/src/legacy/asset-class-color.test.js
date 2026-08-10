import { describe, it, expect } from 'vitest';
import { ffAssetClassPalette, ffAssetClassColorMap, ffMixHex, ffClassShade } from './asset-class-color.js';

const CLASSES = ['股票', '債券', '市值 ETF', '主動 ETF', '特別股'];

describe('ffAssetClassColorMap', () => {
  it('每個類別拿到不同顏色，且同一份清單重跑結果一致', () => {
    const a = ffAssetClassColorMap(CLASSES);
    const b = ffAssetClassColorMap(CLASSES);
    expect(a).toEqual(b);
    expect(new Set(Object.values(a)).size).toBe(CLASSES.length);
  });

  it('顏色不隨市值排序改變——只看清單順序，不看誰市值大', () => {
    const byMaster = ffAssetClassColorMap(CLASSES);
    // 主檔順序固定，所以無論持倉怎麼排，同一個類別都拿到同一色
    const withHoldingsAppended = ffAssetClassColorMap([...CLASSES, '債券', '股票', '特別股']);
    expect(withHoldingsAppended).toEqual(byMaster);
  });

  it('重複的類別名只佔一個顏色', () => {
    const map = ffAssetClassColorMap(['股票', '股票', '債券']);
    expect(Object.keys(map)).toEqual(['股票', '債券']);
  });

  it('類別數超過調色盤長度時循環取色', () => {
    const pal = ['#111111', '#222222'];
    expect(ffAssetClassColorMap(['a', 'b', 'c'], pal)).toEqual({ a: '#111111', b: '#222222', c: '#111111' });
  });

  it('忽略空值，不會產生 undefined 的 key', () => {
    const map = ffAssetClassColorMap(['股票', '', null, undefined, '債券']);
    expect(Object.keys(map)).toEqual(['股票', '債券']);
  });

  it('沒有類別時回傳空 map', () => {
    expect(ffAssetClassColorMap([])).toEqual({});
    expect(ffAssetClassColorMap(undefined)).toEqual({});
  });
});

describe('ffAssetClassPalette', () => {
  it('沒有 TOKENS 時用 fallback hex', () => {
    const pal = ffAssetClassPalette({});
    expect(pal).toHaveLength(8);
    pal.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('有 token 值時優先用 token（Design System 可覆寫）', () => {
    expect(ffAssetClassPalette({ orange: '#ABCDEF' })[0]).toBe('#ABCDEF');
  });
});

describe('ffMixHex', () => {
  it('t=0 回原色', () => {
    expect(ffMixHex('#4E7FA0', 0)).toBe('#4e7fa0');
  });

  it('t>0 混白、t=1 變全白', () => {
    expect(ffMixHex('#000000', 0.5)).toBe('#808080');
    expect(ffMixHex('#4E7FA0', 1)).toBe('#ffffff');
  });

  it('t<0 混黑、t=-1 變全黑', () => {
    expect(ffMixHex('#ffffff', -0.5)).toBe('#808080');
    expect(ffMixHex('#4E7FA0', -1)).toBe('#000000');
  });

  it('非 6 碼 hex 原樣回傳，不會壞掉', () => {
    expect(ffMixHex('rgba(0,0,0,0.5)', 0.3)).toBe('rgba(0,0,0,0.5)');
    expect(ffMixHex(undefined, 0.3)).toBe(undefined);
  });
});

describe('ffClassShade', () => {
  const base = '#4E7FA0';

  it('類別內只有一檔時就用基準色', () => {
    expect(ffClassShade(base, 0, 1)).toBe(base);
  });

  it('類別內市值最大的那檔用基準色', () => {
    expect(ffClassShade(base, 0, 4)).toBe(base);
  });

  it('同類別內各檔顏色都不同，且越後面越亮', () => {
    const shades = [0, 1, 2, 3].map((i) => ffClassShade(base, i, 4));
    expect(new Set(shades).size).toBe(4);
    const lum = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    for (let i = 1; i < shades.length; i++) expect(lum(shades[i])).toBeGreaterThan(lum(shades[i - 1]));
  });

  it('最亮的一檔仍保有色相，不會整個洗成白色', () => {
    const lightest = ffClassShade(base, 5, 6);
    expect(lightest).not.toBe('#ffffff');
  });
});
