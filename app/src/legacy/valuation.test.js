import { describe, it, expect } from 'vitest';
import { ffEpsCagr, ffTtmYoy, ffForwardGrowth, ffUpside, ffPe, ffPeg, ffPegZone, ffValuationRow, ffComparePeg } from './valuation.js';

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

describe('ffForwardGrowth', () => {
  it('算下年度預估相對本年度預估的成長率', () => {
    expect(ffForwardGrowth(100, 130)).toBeCloseTo(30.0, 5);
    expect(ffForwardGrowth(100, 80)).toBeCloseTo(-20.0, 5); // 法人也會預估衰退
  });

  it('本年度預估 <= 0 或任一為空時回 null', () => {
    expect(ffForwardGrowth(0, 130)).toBeNull();
    expect(ffForwardGrowth(-5, 130)).toBeNull();
    expect(ffForwardGrowth(undefined, 130)).toBeNull();
    expect(ffForwardGrowth(100, undefined)).toBeNull();
  });
});

describe('ffUpside', () => {
  it('算目標價相對現價的上漲空間', () => {
    expect(ffUpside(2415, 3141.6)).toBeCloseTo(30.1, 1);
  });

  it('目標價低於現價時回負值，照實呈現', () => {
    expect(ffUpside(100, 80)).toBeCloseTo(-20.0, 5);
  });

  it('現價或目標價無效時回 null', () => {
    expect(ffUpside(0, 100)).toBeNull();
    expect(ffUpside(100, 0)).toBeNull();
    expect(ffUpside(null, 100)).toBeNull();
    expect(ffUpside(100, undefined)).toBeNull();
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

  // 分析師預估是唯一真正前瞻的分母，有的話主數字就用它
  it('有法人預估時主數字用預估 PEG，並標示 pegBasis', () => {
    const withFwd = { ...fund, forward: { eps0y: 25, eps1y: 30, analysts: 12 } };
    const r = ffValuationRow('2330', withFwd, 600);
    expect(r.hasForward).toBe(true);
    expect(r.analysts).toBe(12);
    expect(r.fwdPe).toBeCloseTo(24, 5); // 600 / 25（本年度預估），不是 trailing EPS
    expect(r.fwdGrowth).toBeCloseTo(20, 5); // (30-25)/25
    expect(r.pegFwd).toBeCloseTo(1.2, 5);
    expect(r.pegMain).toBe(r.pegFwd);
    expect(r.pegBasis).toBe('forward');
    expect(r.pegCagr).not.toBeNull(); // trailing 仍然算得出來，只是不當主數字
  });

  it('沒有法人預估時主數字退回歷史 PEG', () => {
    const r = ffValuationRow('2330', fund, 600);
    expect(r.hasForward).toBe(false);
    expect(r.analysts).toBeNull();
    expect(r.pegFwd).toBeNull();
    expect(r.pegMain).toBe(r.pegCagr);
    expect(r.pegBasis).toBe('cagr');
  });

  it('法人預估衰退時算不出預估 PEG，主數字退回歷史', () => {
    const r = ffValuationRow('2330', { ...fund, forward: { eps0y: 30, eps1y: 25, analysts: 4 } }, 600);
    expect(r.fwdGrowth).toBeCloseTo(-16.67, 1);
    expect(r.pegFwd).toBeNull();
    expect(r.pegBasis).toBe('cagr');
    expect(r.hasForward).toBe(true); // 有預估資料，只是成長率是負的
  });

  it('可以手動覆寫預估成長率', () => {
    const withFwd = { ...fund, forward: { eps0y: 25, eps1y: 30, analysts: 12 } };
    const r = ffValuationRow('2330', withFwd, 600, { fwd: 40 });
    expect(r.fwdGrowth).toBe(40);
    expect(r.fwdOverridden).toBe(true);
    expect(r.pegFwd).toBeCloseTo(0.6, 5); // 24 / 40
    expect(r.pegBasis).toBe('forward');
  });

  it('沒有歷史 PEG 時分區退而用近期 PEG', () => {
    const r = ffValuationRow('2330', { epsAnnual: { 2025: 20 }, epsTTM: 20, epsTTMPrev: 16 }, 600);
    expect(r.pegCagr).toBeNull(); // 只有一年，算不出 CAGR
    expect(r.pegYoy).toBeCloseTo(1.2, 1);
    expect(r.zone).toBe('fair');
  });
});

describe('ffComparePeg', () => {
  const row = (pegMain, tag) => ({ pegMain, tag });

  it('PEG 小的排前面', () => {
    expect([row(2), row(0.5), row(1.2)].sort(ffComparePeg).map((r) => r.pegMain)).toEqual([0.5, 1.2, 2]);
  });

  it('算不出 PEG 的一律排在最後', () => {
    const sorted = [row(null), row(1.5), row(null), row(0.3)].sort(ffComparePeg);
    expect(sorted.map((r) => r.pegMain)).toEqual([0.3, 1.5, null, null]);
  });

  // 排序用的值必須跟畫面上那個大數字是同一個，否則「PEG 由低到高」看起來會像亂排
  it('用主數字排序——有預估的用預估 PEG 參與比較', () => {
    const fwd = ffValuationRow('A', { epsAnnual: { 2024: 10, 2025: 12 }, epsTTM: 12, epsTTMPrev: 10,
      forward: { eps0y: 20, eps1y: 30, analysts: 5 } }, 200);
    const trailing = ffValuationRow('B', { epsAnnual: { 2024: 10, 2025: 12 }, epsTTM: 12, epsTTMPrev: 10 }, 200);
    expect(fwd.pegMain).toBe(fwd.pegFwd);
    expect(trailing.pegMain).toBe(trailing.pegCagr);
    const sorted = [trailing, fwd].sort(ffComparePeg);
    expect(sorted[0].pegMain).toBeLessThanOrEqual(sorted[1].pegMain);
  });
});
