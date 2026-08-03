import { describe, it, expect, beforeEach } from 'vitest';
import { ffDueMonths, ffInitialLastRun, ffMonthsAfter, ffRecurringDay, ffRunRecurring } from './recurring.js';

const expenseRule = (over) => ({
  id: 'r1', type: 'expense', name: '房租', enabled: true, dayOfMonth: 5,
  amount: 12000, category: '居住', account: '台銀', lastRun: '', ...over });

const transferRule = (over) => ({
  id: 'r2', type: 'transfer', name: '投資轉帳', enabled: true, dayOfMonth: 15,
  amount: 5000, fromAccount: '台銀', toAccount: '證券交割戶', lastRun: '', ...over });

const setRules = (rules) => localStorage.setItem('ff_recurring', JSON.stringify(rules));
const getRules = () => JSON.parse(localStorage.getItem('ff_recurring'));

beforeEach(() => localStorage.clear());

describe('ffRecurringDay', () => {
  it('把扣款日夾在 1–28', () => {
    expect(ffRecurringDay({ dayOfMonth: 31 })).toBe(28);
    expect(ffRecurringDay({ dayOfMonth: 0 })).toBe(1);
    expect(ffRecurringDay({ dayOfMonth: '15' })).toBe(15);
    expect(ffRecurringDay({})).toBe(1);
  });
});

describe('ffInitialLastRun', () => {
  it('扣款日還沒到 → lastRun 記上個月，本月當天才會扣', () => {
    expect(ffInitialLastRun(5, new Date(2026, 7, 3))).toBe('2026-07');
  });
  it('扣款日已過 → lastRun 記本月，下個月才扣', () => {
    expect(ffInitialLastRun(5, new Date(2026, 7, 20))).toBe('2026-08');
  });
  it('跨年時上個月是去年 12 月', () => {
    expect(ffInitialLastRun(10, new Date(2026, 0, 3))).toBe('2025-12');
  });
});

describe('ffMonthsAfter', () => {
  it('列出 lastRun 之後到本月為止的每個月', () => {
    expect(ffMonthsAfter('2026-05', new Date(2026, 7, 20))).
    toEqual(['2026-06', '2026-07', '2026-08']);
  });
  it('lastRun 已是本月 → 沒有待處理月份', () => {
    expect(ffMonthsAfter('2026-08', new Date(2026, 7, 20))).toEqual([]);
  });
});

describe('ffDueMonths — 日期還沒到就不扣款', () => {
  it('本月扣款日還沒到 → 不列入本月', () => {
    expect(ffDueMonths(expenseRule({ dayOfMonth: 5, lastRun: '2026-07' }), new Date(2026, 7, 3))).
    toEqual([]);
  });
  it('剛好是扣款日當天 → 列入本月', () => {
    expect(ffDueMonths(expenseRule({ dayOfMonth: 5, lastRun: '2026-07' }), new Date(2026, 7, 5))).
    toEqual(['2026-08']);
  });
  it('扣款日已過 → 列入本月', () => {
    expect(ffDueMonths(expenseRule({ dayOfMonth: 5, lastRun: '2026-07' }), new Date(2026, 7, 20))).
    toEqual(['2026-08']);
  });
  it('久沒開 App → 補記過去月份，但本月日期沒到仍不補', () => {
    expect(ffDueMonths(expenseRule({ dayOfMonth: 25, lastRun: '2026-05' }), new Date(2026, 7, 3))).
    toEqual(['2026-06', '2026-07']);
  });
});

describe('ffRunRecurring', () => {
  it('沒有規則時回傳 null', () => {
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toBeNull();
    setRules([]);
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toBeNull();
  });

  it('扣款日還沒到 → 不產生任何紀錄，也不動 lastRun', () => {
    setRules([expenseRule({ dayOfMonth: 5, lastRun: '2026-07' })]);
    expect(ffRunRecurring({ now: new Date(2026, 7, 3) })).toBeNull();
    expect(getRules()[0].lastRun).toBe('2026-07');
  });

  it('扣款日到了 → 產生一筆支出，日期落在扣款日並推進 lastRun', () => {
    setRules([expenseRule({ dayOfMonth: 5, lastRun: '2026-07' })]);
    const flows = ffRunRecurring({ now: new Date(2026, 7, 5) });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({
      kind: 'exp', amount: 12000, cat: '居住', account: '台銀',
      date: '2026-08-05', auto: true, recurringId: 'r1' });
    expect(getRules()[0].lastRun).toBe('2026-08');
  });

  it('同月重跑不會重複扣款', () => {
    setRules([expenseRule({ dayOfMonth: 5, lastRun: '2026-07' })]);
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toHaveLength(1);
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toBeNull();
  });

  it('久沒開 App → 只補過去月份，本月日期沒到不扣', () => {
    setRules([expenseRule({ dayOfMonth: 25, lastRun: '2026-05' })]);
    const flows = ffRunRecurring({ now: new Date(2026, 7, 3) });
    expect(flows.map((f) => f.date)).toEqual(['2026-06-25', '2026-07-25']);
    expect(getRules()[0].lastRun).toBe('2026-07');
  });

  it('停用的規則不扣款', () => {
    setRules([expenseRule({ enabled: false, lastRun: '2026-07' })]);
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toBeNull();
    expect(getRules()[0].lastRun).toBe('2026-07');
  });

  it('自動轉帳規則產生轉帳紀錄（含轉出/轉入帳戶、零手續費）', () => {
    setRules([transferRule({ dayOfMonth: 15, lastRun: '2026-07' })]);
    const flows = ffRunRecurring({ now: new Date(2026, 7, 15) });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({
      kind: 'xfer', amount: 5000, fromAccount: '台銀', toAccount: '證券交割戶',
      xferFee: 0, date: '2026-08-15', auto: true, recurringId: 'r2' });
  });

  it('同一天多條規則各自依自己的扣款日判斷', () => {
    setRules([
    expenseRule({ id: 'a', dayOfMonth: 5, lastRun: '2026-07' }), //  已過 → 扣
    expenseRule({ id: 'b', dayOfMonth: 25, lastRun: '2026-07' })] //  未到 → 不扣
    );
    const flows = ffRunRecurring({ now: new Date(2026, 7, 10) });
    expect(flows.map((f) => f.recurringId)).toEqual(['a']);
    const rules = getRules();
    expect(rules[0].lastRun).toBe('2026-08');
    expect(rules[1].lastRun).toBe('2026-07');
  });

  it('新建的規則存檔當下不會馬上被扣款（扣款日未到）', () => {
    const day = 25;
    setRules([expenseRule({ dayOfMonth: day, lastRun: ffInitialLastRun(day, new Date(2026, 7, 3)) })]);
    expect(ffRunRecurring({ now: new Date(2026, 7, 3) })).toBeNull();
  });

  it('第一次跑但沒有 lastRun 時，最多只補到本月（不回溯更早）', () => {
    setRules([expenseRule({ dayOfMonth: 5, lastRun: '' })]);
    const flows = ffRunRecurring({ now: new Date(2026, 7, 20) });
    expect(flows.map((f) => f.date)).toEqual(['2026-08-05']);
  });

  it('ff_recurring 內容壞掉時安靜跳過', () => {
    localStorage.setItem('ff_recurring', '{壞掉的 JSON');
    expect(ffRunRecurring({ now: new Date(2026, 7, 20) })).toBeNull();
  });
});
