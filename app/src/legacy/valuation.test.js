import { describe, it, expect } from 'vitest';
import { ffEpsCagr, ffTtmYoy, ffPe, ffPeg, ffPegZone, ffValuationRow, ffComparePeg } from './valuation.js';

// 三年剛好翻倍 → 年化約 26%
const GROWING = { 2022: 10, 2023: 12, 2024: 16, 2025: 20 };

describe('ffEpsCagr', () => {
  it('用最近 N 年的年度 EPS 算年化成長率', () => {
    expect(ffEpsCagr(GROWING, 3)).toBeCloseTo(26.0, 1); // (20/10)^(1/3)-1
    expect(ffEpsCagr(GROWING, 1)).toBeCloseTo(25.0, 1); // (20/16)-1
  });

  it('年數不足時就用手上有的年份，不會回 null', () => {
    expect(ffEpsCagr({ 2024: 10, 2025: 12 }, 5)).toBeCloseTo(20.0, 1);
  });

  it('只有一年或沒有資料時回 null', () => {
    expect(ffEpsCagr({ 2025: 10 }, 3)).toBeNull();
    expect(ffEpsCagr({}, 3)).toBeNull();
    expect(ffEpsCagr(undefined, 3)).toBeNull();
  });

  // 由虧轉盈算不出倍數，硬算會得到天文數字或虛數
  it('起點或終點 EPS <= 0 時回 null', () => {
    expect(ffEpsCagr({ 2022: -2, 2025: 10 }, 3)).toBeNull();
    expect(ffEpsCagr({ 2022: 10, 2025: -2 }, 3)).toBeNull();
    expect(ffEpsCagr({ 2022: 0, 2025: 10 }, 3)).toBeNull();
  });

  it('衰退時回負成長率', () => {
    expect(ffEpsCagr({ 2024: 20, 2025: 10 }, 1)).toBeCloseTo(-50.0, 1);
  });
});

describe('ffTtmYoy', () => {
  it('算 TTM 相對前期的年增率', () => {
    expect(ffTtmYoy(12, 10)).toBeCloseTo(20.0, 5);
    expect(ffTtmYoy(8, 10)).toBeCloseTo(-20.0, 5);
  });

  it('前期 <= 0 或任一為空時回 null', () => {
    expect(ffTtmYoy(12, 0)).toBeNull();
    expect(ffTtmYoy(12, -3)).toBeNull();
    expect(ffTtmYoy(null, 10)).toBeNull();
    expect(ffTtmYoy(12, null)).toBeNull();
  });
});

describe('ffPe', () => {
  it('本益比 = 現價 / TTM EPS', () => {
    expect(ffPe(300, 10)).toBeCloseTo(30, 5);
  });

  it('虧損（EPS <= 0）沒有本益比', () => {
    expect(ffPe(300, 0)).toBeNull();
    expect(ffPe(300, -2)).toBeNull();
  });

  it('沒有現價或 EPS 時回 null', () => {
    expect(ffPe(0, 10)).toBeNull();
    expect(ffPe(null, 10)).toBeNull();
    expect(ffPe(300, null)).toBeNull();
  });
});

describe('ffPeg', () => {
  it('PEG = 本益比 / 成長率', () => {
    expect(ffPeg(30, 30)).toBeCloseTo(1, 5);
    expect(ffPeg(30, 15)).toBeCloseTo(2, 5);
  });

  it('成長率 <= 0 時 PEG 沒有意義，回 null', () => {
    expect(ffPeg(30, 0)).toBeNull();
    expect(ffPeg(30, -10)).toBeNull();
  });

  it('沒有本益比時回 null', () => {
    expect(ffPeg(null, 20)).toBeNull();
  });
});

describe('ffPegZone', () => {
  it('分區門檻落在 1 與 2', () => {
    expect(ffPegZone(0.8)).toBe('low');
    expect(ffPegZone(1)).toBe('fair'); // 剛好 1 算合理，不算便宜
    expect(ffPegZone(1.5)).toBe('fair');
    expect(ffPegZone(2)).toBe('fair'); // 剛好 2 仍算合理
    expect(ffPegZone(2.01)).toBe('high');
  });

  it('沒有 PEG 或非正值時沒有分區', () => {
    expect(ffPegZone(null)).toBeNull();
    expect(ffPegZone(0)).toBeNull();
    expect(ffPegZone(-1)).toBeNull();
  });
});

describe('ffValuationRow', () => {
  const fund = { epsAnnual: GROWING, epsTTM: 20, epsTTMPrev: 16 };

  it('把本益比、兩個成長率與兩個 PEG 一起組出來', () => {
    const r = ffValuationRow('2330', fund, 600);
    expect(r.pe).toBeCloseTo(30, 5); // 600 / 20
    expect(r.cagr).toBeCloseTo(26.0, 1);
    expect(r.yoy).toBeCloseTo(25.0, 1); // (20-16)/16
    expect(r.pegCagr).toBeCloseTo(30 / 25.99, 1);
    expect(r.pegYoy).toBeCloseTo(1.2, 1);
    expect(r.zone).toBe('fair');
    expect(r.hasFundamentals).toBe(true);
  });

  // 圖表的「年/季」切換要靠這個欄位；舊快取沒有它，不能讓畫面爆掉
  it('帶出季 EPS 序列，沒有時給空陣列', () => {
    const q = [{ end: '2025-09-30', val: 4 }, { end: '2025-12-31', val: 5 }];
    expect(ffValuationRow('2330', { ...fund, epsQuarters: q }, 600).epsQuarters).toEqual(q);
    expect(ffValuationRow('2330', fund, 600).epsQuarters).toEqual([]);
    expect(ffValuationRow('0050', null, 200).epsQuarters).toEqual([]);
  });

  it('手動覆寫優先於自動值，並標記哪一個被覆寫', () => {
    const r = ffValuationRow('2330', fund, 600, { cagr: 60 });
    expect(r.cagr).toBe(60);
    expect(r.cagrOverridden).toBe(true);
    expect(r.pegCagr).toBeCloseTo(0.5, 5); // 30 / 60
    expect(r.zone).toBe('low');
    expect(r.yoyOverridden).toBe(false); // 只覆寫了一個
    expect(r.yoy).toBeCloseTo(25.0, 1);
  });

  it('覆寫成 0 或負數會被採用（使用者就是認為不會成長），PEG 則變成 null', () => {
    const r = ffValuationRow('2330', fund, 600, { cagr: 0 });
    expect(r.cagr).toBe(0);
    expect(r.cagrOverridden).toBe(true);
    expect(r.pegCagr).toBeNull();
  });

  // ETF、債券 ETF 沒有 EPS 可談，UI 要能跟「還沒抓到」分開顯示
  it('沒有基本面資料時 hasFundamentals 為 false，各項指標為 null', () => {
    const r = ffValuationRow('0050', null, 200);
    expect(r.hasFundamentals).toBe(false);
    expect(r.pe).toBeNull();
    expect(r.pegCagr).toBeNull();
    expect(r.zone).toBeNull();
  });

  it('虧損股有 EPS 資料但沒有本益比', () => {
    const r = ffValuationRow('9999', { epsAnnual: { 2025: -3 }, epsTTM: -3, epsTTMPrev: -1 }, 50);
    expect(r.hasFundamentals).toBe(true);
    expect(r.pe).toBeNull();
    expect(r.pegCagr).toBeNull();
  });

  it('沒有現價時算不出本益比，但成長率照樣看得到', () => {
    const r = ffValuationRow('2330', fund, null);
    expect(r.pe).toBeNull();
    expect(r.cagr).toBeCloseTo(26.0, 1);
  });

  it('沒有歷史 PEG 時分區退而用近期 PEG', () => {
    const r = ffValuationRow('2330', { epsAnnual: { 2025: 20 }, epsTTM: 20, epsTTMPrev: 16 }, 600);
    expect(r.pegCagr).toBeNull(); // 只有一年，算不出 CAGR
    expect(r.pegYoy).toBeCloseTo(1.2, 1);
    expect(r.zone).toBe('fair');
  });
});

describe('ffComparePeg', () => {
  const row = (pegCagr, pegYoy = null) => ({ pegCagr, pegYoy });

  it('PEG 小的排前面', () => {
    expect([row(2), row(0.5), row(1.2)].sort(ffComparePeg).map((r) => r.pegCagr)).toEqual([0.5, 1.2, 2]);
  });

  it('算不出 PEG 的一律排在最後', () => {
    const sorted = [row(null), row(1.5), row(null), row(0.3)].sort(ffComparePeg);
    expect(sorted.map((r) => r.pegCagr)).toEqual([0.3, 1.5, null, null]);
  });

  it('沒有歷史 PEG 時退而比近期 PEG', () => {
    const sorted = [row(null, 3), row(1)].sort(ffComparePeg);
    expect(sorted[0].pegCagr).toBe(1);
  });
});
