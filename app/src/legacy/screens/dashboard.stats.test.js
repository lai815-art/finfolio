import { describe, it, expect } from 'vitest';
import {
  ffCatGroupOf, ffCatTotals, ffGroupColorMap, ffStatsPeriod,
} from './dashboard.jsx';

// 帳戶 currency 不特別指定時 buildCurMap 當 TWD（匯率 1），測資可以直接用面額。
// 「台股」在 cat_exp 與 cat_inc 各出現一次（真實主檔就是這樣：賣股虧損記支出、獲利記收入）。
const masterData = {
  cat_exp: [
    { name: '早餐', group: '餐飲' },
    { name: '飲料', group: '餐飲' },
    { name: '捷運', group: '交通' },
    { name: '台股', group: '投資損失' },
  ],
  cat_inc: [
    { name: '薪資', group: '主動' },
    { name: '股息', group: '被動' },
    { name: '台股', group: '投資收入' },
  ],
  exp_groups: [
    { name: '餐飲', color: '#B85C4A' },
    { name: '交通', color: '#4E7FA0' },
    { name: '投資損失', color: '#C4854A' },
    { name: '其他' }, // 沒設 color
  ],
  inc_groups: [
    { name: '主動', color: '#4A6E8C' },
    { name: '被動', color: '#5A8E88' },
    { name: '投資收入', color: '#D4B87A' },
  ],
  accounts: [{ name: '現金', currency: 'TWD' }, { name: '美金戶', currency: 'USD' }],
};

function flow(kind, cat, amount, dateStr, extra) {
  return { kind, cat, amount, account: '現金', date: dateStr, ...extra };
}

describe('ffCatGroupOf', () => {
  it('支出依 group 對應，查不到的 cat 落到「其他」', () => {
    const groupOf = ffCatGroupOf(masterData, 'exp');
    expect(groupOf('早餐')).toBe('餐飲');
    expect(groupOf('台股')).toBe('投資損失');
    expect(groupOf('不存在的分類')).toBe('其他');
  });

  it('收入套用 INC_GROUP_LABEL 顯示名', () => {
    const groupOf = ffCatGroupOf(masterData, 'inc');
    expect(groupOf('薪資')).toBe('主動收入');
    expect(groupOf('股息')).toBe('被動收入');
    expect(groupOf('台股')).toBe('投資收入'); // 顯示名與原名相同
    expect(groupOf('不存在的分類')).toBe('其他');
  });

  it('舊資料的純字串分類：支出以自己為大類，收入歸「其他」', () => {
    const legacy = { cat_exp: ['餐飲', '交通'], cat_inc: ['薪資'] };
    expect(ffCatGroupOf(legacy, 'exp')('餐飲')).toBe('餐飲');
    expect(ffCatGroupOf(legacy, 'inc')('薪資')).toBe('其他');
  });
});

describe('ffCatTotals', () => {
  const flows = [
    flow('exp', '早餐', 100, '2024-03-05'),
    flow('exp', '飲料', 50, '2024-03-06'),
    flow('exp', '捷運', 30, '2024-03-07'),
    flow('exp', '台股', 8000, '2024-03-08'), // 投資損失
    flow('exp', '早餐', 90, '2024-04-05'),   // 同年不同月
    flow('exp', '早餐', 80, '2023-03-05'),   // 不同年
    flow('inc', '薪資', 60000, '2024-03-10'),
    flow('inc', '股息', 1000, '2024-03-11'),
    flow('inc', '台股', 5000, '2024-03-12'), // 投資收入
  ];

  it('月粒度：依大類加總，其他月/年/kind 的紀錄不算', () => {
    expect(ffCatTotals(flows, masterData, 'exp', 2024, 3)).toEqual({
      '餐飲': 150, '交通': 30, '投資損失': 8000,
    });
  });

  it('month=null 代表整年，等於該年各月的總和', () => {
    const year = ffCatTotals(flows, masterData, 'exp', 2024, null);
    expect(year['餐飲']).toBe(240); // 3 月 150 + 4 月 90
    const sum = Array.from({ length: 12 }, (_, i) =>
      ffCatTotals(flows, masterData, 'exp', 2024, i + 1)['餐飲'] || 0,
    ).reduce((a, v) => a + v, 0);
    expect(sum).toBe(year['餐飲']);
  });

  it('投資損失有被納入支出（不再像舊版消費分析那樣排除）', () => {
    expect(ffCatTotals(flows, masterData, 'exp', 2024, 3)['投資損失']).toBe(8000);
  });

  it('同名的「台股」在支出與收入之間不互相污染', () => {
    expect(ffCatTotals(flows, masterData, 'exp', 2024, 3)['投資損失']).toBe(8000);
    expect(ffCatTotals(flows, masterData, 'inc', 2024, 3)['投資收入']).toBe(5000);
  });

  it('收入依大類顯示名加總，不在 cat_inc 的分類落到「其他」', () => {
    const withUnknown = [...flows, flow('inc', '中獎', 200, '2024-03-13')];
    expect(ffCatTotals(withUnknown, masterData, 'inc', 2024, 3)).toEqual({
      '主動收入': 60000, '被動收入': 1000, '投資收入': 5000, '其他': 200,
    });
  });

  it('帶 group 時回該大類底下的子分類（key 是實際 cat 名）', () => {
    expect(ffCatTotals(flows, masterData, 'exp', 2024, 3, '餐飲')).toEqual({ '早餐': 100, '飲料': 50 });
    expect(ffCatTotals(flows, masterData, 'exp', 2024, null, '餐飲')).toEqual({ '早餐': 190, '飲料': 50 });
  });

  it('不存在的 group、空的 flows 都回空物件；缺 date 的紀錄略過', () => {
    expect(ffCatTotals(flows, masterData, 'exp', 2024, 3, '娛樂')).toEqual({});
    expect(ffCatTotals([], masterData, 'exp', 2024, 3)).toEqual({});
    expect(ffCatTotals(null, masterData, 'exp', 2024, 3)).toEqual({});
    expect(ffCatTotals([{ kind: 'exp', cat: '早餐', amount: 100 }], masterData, 'exp', 2024, 3)).toEqual({});
  });

  it('外幣帳戶依匯率換算台幣，不是直接加面額', () => {
    const usd = [flow('exp', '早餐', 10, '2024-03-05', { account: '美金戶' })];
    expect(ffCatTotals(usd, masterData, 'exp', 2024, 3)['餐飲']).toBe(325); // 10 × 32.5
  });
});

describe('ffStatsPeriod', () => {
  const now = new Date(2026, 0, 15); // 2026-01-15

  it('month 粒度會跨年往前推', () => {
    expect(ffStatsPeriod(now, 'month', 0)).toEqual({ year: 2026, month: 1, label: '2026 年 1 月' });
    expect(ffStatsPeriod(now, 'month', -1)).toEqual({ year: 2025, month: 12, label: '2025 年 12 月' });
    expect(ffStatsPeriod(now, 'month', -14)).toEqual({ year: 2024, month: 11, label: '2024 年 11 月' });
  });

  it('year 粒度 month 為 null', () => {
    expect(ffStatsPeriod(now, 'year', -2)).toEqual({ year: 2024, month: null, label: '2024 年' });
  });

  it('decade 粒度回 10 個年份與區間 label', () => {
    const cur = ffStatsPeriod(now, 'decade', 0);
    expect(cur.years).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    expect(cur.label).toBe('2017–2026');
    expect(ffStatsPeriod(now, 'decade', -1).years[0]).toBe(2007);
  });

  it('上一期就是 offset-1，比較期不用另外寫日期算術', () => {
    // 1 月的上一期是去年 12 月
    expect(ffStatsPeriod(now, 'month', 0 - 1).label).toBe('2025 年 12 月');
    expect(ffStatsPeriod(now, 'year', 0 - 1).label).toBe('2025 年');
  });
});

describe('ffGroupColorMap', () => {
  it('支出用 exp_groups 設定的顏色', () => {
    const map = ffGroupColorMap(masterData, 'exp');
    expect(map['投資損失']).toBe('#C4854A');
    expect(map['餐飲']).toBe('#B85C4A');
  });

  it('收入的 key 是顯示名而非主檔原名', () => {
    const map = ffGroupColorMap(masterData, 'inc');
    expect(map['主動收入']).toBe('#4A6E8C');
    expect(map['主動']).toBeUndefined();
  });

  it('沒設 color 的大類、以及主檔已刪除的大類都回 undefined 而不丟例外', () => {
    const map = ffGroupColorMap(masterData, 'exp');
    expect(map['其他']).toBeUndefined();
    expect(map['已刪除的大類']).toBeUndefined();
    expect(ffGroupColorMap({}, 'exp')).toEqual({});
  });
});
