import { describe, it, expect, afterEach } from 'vitest';
import {
  ffIncomeForYear, ffIncomeForMonth, ffIncomeForQuarter,
  ffMonthlyBalance, ffYearlyBalance, ffQuarterlyBalance,
  ffResolvePeriodTarget, ffAchievementHistory,
  computeGoalProgress,
} from './dashboard.jsx';

// 所有帳戶都不特別指定 currency，buildCurMap 找不到就當 TWD（匯率 1），
// 這樣測試資料可以直接用面額，不用另外算匯率。
const masterData = {
  cat_inc: [
    { name: '薪資', group: '主動' },
    { name: '股息', group: '被動' },
    { name: '債息', group: '被動' },
  ],
  brokers: [{ name: '永豐證券', currency: 'TWD' }],
  accounts: [{ name: '現金', currency: 'TWD' }],
};

function flow(kind, cat, amount, dateStr, extra) {
  return { kind, cat, amount, account: '現金', date: dateStr, ...extra };
}

describe('ffIncomeForYear / ffIncomeForMonth', () => {
  const flows = [
    flow('inc', '股息', 1000, '2024-03-10'),
    flow('inc', '債息', 500, '2024-03-20'),
    flow('inc', '薪資', 5000, '2024-03-15'), // 主動
    flow('exp', '股息', 999, '2024-03-01'),  // 支出，不算（kind!=='inc'）
    flow('inc', '股息', 300, '2023-12-25'),  // 不同年
  ];

  it('不指定 group 時預設只加總「被動」大類的當年金額（沿用舊行為）', () => {
    expect(ffIncomeForYear(flows, masterData, 2024)).toBe(1500);
  });

  it('不指定 group 時預設只加總「被動」大類的當月金額', () => {
    expect(ffIncomeForMonth(flows, masterData, 2024, 3)).toBe(1500);
    expect(ffIncomeForMonth(flows, masterData, 2024, 4)).toBe(0);
  });

  it('指定 group 為「主動」時只加總主動大類', () => {
    expect(ffIncomeForYear(flows, masterData, 2024, '主動')).toBe(5000);
  });

  it('group 為 total 時不分大類，加總全部收入', () => {
    expect(ffIncomeForYear(flows, masterData, 2024, 'total')).toBe(1000 + 500 + 5000);
    expect(ffIncomeForMonth(flows, masterData, 2024, 3, 'total')).toBe(1000 + 500 + 5000);
  });

  it('沒有資料的年份回傳 0', () => {
    expect(ffIncomeForYear(flows, masterData, 2020)).toBe(0);
  });
});

describe('ffIncomeForQuarter', () => {
  const flows = [
    flow('inc', '股息', 1000, '2024-03-10'), // Q1
    flow('inc', '股息', 700, '2024-04-05'),  // Q2
    flow('inc', '薪資', 5000, '2024-03-15'), // Q1，主動
  ];

  it('只加總指定年季的「被動」大類（預設 group）', () => {
    expect(ffIncomeForQuarter(flows, masterData, 2024, 1)).toBe(1000);
    expect(ffIncomeForQuarter(flows, masterData, 2024, 2)).toBe(700);
    expect(ffIncomeForQuarter(flows, masterData, 2024, 3)).toBe(0);
  });

  it('group 為 total 時不分大類，加總該季全部收入', () => {
    expect(ffIncomeForQuarter(flows, masterData, 2024, 1, 'total')).toBe(1000 + 5000);
  });
});

describe('ffMonthlyBalance / ffYearlyBalance', () => {
  const flows = [
    flow('inc', '薪資', 1000, '2024-01-05'),
    flow('exp', '股息', 400, '2024-01-10'),
    flow('inc', '薪資', 500, '2024-02-05'),
    flow('exp', '股息', 100, '2024-02-10'),
  ];

  it('算指定年月的 inc - exp', () => {
    expect(ffMonthlyBalance(flows, masterData, 2024, 1)).toBe(600);
    expect(ffMonthlyBalance(flows, masterData, 2024, 2)).toBe(400);
  });

  it('算整年的 inc - exp', () => {
    expect(ffYearlyBalance(flows, masterData, 2024)).toBe(1000);
  });
});

describe('ffQuarterlyBalance', () => {
  const flows = [
    flow('inc', '薪資', 1000, '2024-01-05'), // Q1
    flow('exp', '股息', 400, '2024-01-10'),  // Q1
    flow('inc', '薪資', 500, '2024-04-05'),  // Q2
  ];

  it('算指定年季的 inc - exp', () => {
    expect(ffQuarterlyBalance(flows, masterData, 2024, 1)).toBe(600);
    expect(ffQuarterlyBalance(flows, masterData, 2024, 2)).toBe(500);
  });
});

describe('ffResolvePeriodTarget', () => {
  it('固定金額模式直接回傳 amount，不管上一期', () => {
    const goal = { targetMode: 'amount', amount: 5000 };
    expect(ffResolvePeriodTarget(goal, null)).toBe(5000);
    expect(ffResolvePeriodTarget(goal, 999999)).toBe(5000);
  });

  it('%成長模式：目標 = 上一期實際值 x (1+成長%)', () => {
    const goal = { targetMode: 'percent', percentValue: 4 };
    expect(ffResolvePeriodTarget(goal, 100000)).toBeCloseTo(104000);
  });

  it('%成長模式沒有上一期資料時回傳 null', () => {
    const goal = { targetMode: 'percent', percentValue: 4 };
    expect(ffResolvePeriodTarget(goal, null)).toBeNull();
  });

  it('%成長模式上一期是 0 或負值時回傳 null（沒有基準可算成長）', () => {
    const goal = { targetMode: 'percent', percentValue: 4 };
    expect(ffResolvePeriodTarget(goal, 0)).toBeNull();
    expect(ffResolvePeriodTarget(goal, -100)).toBeNull();
  });
});

describe('ffAchievementHistory', () => {
  it('固定金額模式：每期都跟同一個 amount 比', () => {
    const goal = { targetMode: 'amount', amount: 1000 };
    // newest-first，最後一筆只當「上一期」用，不會自己變成圓點
    const periods = [
      { label: '2023', value: 1200 },
      { label: '2022', value: 900 },
    ];
    const result = ffAchievementHistory(goal, periods);
    expect(result.total).toBe(1);
    expect(result.dots).toEqual([{ label: '2023', achieved: true }]);
    expect(result.achievedCount).toBe(1);
  });

  it('%成長模式：跟上一期滾動比較，畫面上舊到新排列', () => {
    const goal = { targetMode: 'percent', percentValue: 4 };
    const periods = [
      { label: '2023', value: 520000 }, // 上一期(2022)*1.04 = 520000 → 剛好達成
      { label: '2022', value: 500000 }, // 上一期(2021)*1.04 = 416000 → 500000 達成
      { label: '2021', value: 400000 }, // 只拿來當 2022 的基準，不會自己變圓點
    ];
    const result = ffAchievementHistory(goal, periods);
    expect(result.total).toBe(2);
    expect(result.dots.map((d) => d.label)).toEqual(['2022', '2023']); // 舊→新
    expect(result.dots.every((d) => d.achieved)).toBe(true);
    expect(result.achievedCount).toBe(2);
  });

  it('%成長模式遇到沒有基準的期間就提前停止，不生出假圓點', () => {
    const goal = { targetMode: 'percent', percentValue: 4 };
    const periods = [
      { label: '2023', value: 100 },
      { label: '2022', value: 0 }, // 上一期是 0，無法算成長 → 2023 這個圓點也不畫
    ];
    const result = ffAchievementHistory(goal, periods);
    expect(result.total).toBe(0);
    expect(result.dots).toEqual([]);
  });
});

describe('computeGoalProgress', () => {
  const savedFlows = [
    flow('inc', '股息', 480000, '2023-06-01'),
    flow('inc', '股息', 350000, '2024-06-01'),
  ];
  const computedAcctGroups = [
    { id: 'bank', name: '銀行', items: [{ name: '國泰銀行', amountTWD: 200000, amount: 200000 }] },
    { id: 'brokerage', name: '證券戶', items: [{ name: '永豐證券', amountTWD: 50000, amount: 50000 }] },
  ];
  const computedHoldings = [
    { name: '股票', items: [{ broker: '永豐證券', mvTWD: 300000, mv: 300000 }] },
  ];
  const baseCtx = { totalAssets: 900000, computedAcctGroups, computedHoldings, savedFlows, masterData };

  afterEach(() => { delete window.TODAY_DATE; });

  it('networth 類型：進度 = totalAssets / amount，未到期時顯示「西元 X 年 X 月達成目標」', () => {
    window.TODAY_DATE = new Date(2024, 0, 15); // 2024-01-15
    const goal = { type: 'networth', amount: 1000000, targetYear: 2024, targetMonth: 7 };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(900000);
    expect(p.target).toBe(1000000);
    expect(p.pct).toBeCloseTo(90);
    expect(p.done).toBe(false);
    expect(p.subtitle).toBe('西元 2024 年 7 月達成目標');
  });

  it('networth 類型：目標年月已過顯示「已到期」', () => {
    window.TODAY_DATE = new Date(2024, 0, 15); // 2024-01-15
    const goal = { type: 'networth', amount: 1000000, targetYear: 2023, targetMonth: 12 };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.subtitle).toBe('已到期');
  });

  it('networth 類型：只填年或都沒填，顯示原始年月文字', () => {
    window.TODAY_DATE = new Date(2024, 0, 15);
    expect(computeGoalProgress({ type: 'networth', amount: 100, targetYear: 2030, targetMonth: null }, baseCtx).subtitle).toBe('2030 年');
    expect(computeGoalProgress({ type: 'networth', amount: 100, targetYear: null, targetMonth: 6 }, baseCtx).subtitle).toBe('6 月');
    expect(computeGoalProgress({ type: 'networth', amount: 100, targetYear: null, targetMonth: null }, baseCtx).subtitle).toBe('未設定目標年月');
  });

  it('account 類型：一般帳戶直接用 amountTWD', () => {
    const goal = { type: 'account', amount: 100000, accountName: '國泰銀行' };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(200000);
    expect(p.done).toBe(true);
    expect(p.subtitle).toBe('國泰銀行');
  });

  it('account 類型：證券戶要把交割戶現金 + 持倉市值加在一起', () => {
    const goal = { type: 'account', amount: 400000, accountName: '永豐證券' };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(50000 + 300000); // 交割戶現金 + 持倉市值
  });

  it('account 類型：帳戶找不到時顯示 0 且不當機', () => {
    const goal = { type: 'account', amount: 100000, accountName: '不存在的帳戶' };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(0);
    expect(p.subtitle).toBe('帳戶找不到');
    expect(p.done).toBe(false);
  });

  it('passive_income 類型（年）：本期進度 + 固定金額目標', () => {
    window.TODAY_DATE = new Date(2024, 5, 15); // 2024-06-15
    const goal = { type: 'passive_income', periodUnit: 'year', targetMode: 'amount', amount: 400000 };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(350000); // 2024 年股息
    expect(p.target).toBe(400000);
    expect(p.noBaseline).toBe(false);
  });

  it('passive_income 類型（年）：%成長模式跟去年比', () => {
    window.TODAY_DATE = new Date(2024, 5, 15);
    const goal = { type: 'passive_income', periodUnit: 'year', targetMode: 'percent', percentValue: 4 };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(350000);
    expect(p.target).toBeCloseTo(480000 * 1.04); // 去年 480000 * 1.04
    expect(p.done).toBe(false);
  });

  it('passive_income 類型（季）：本季進度 + 固定金額目標', () => {
    window.TODAY_DATE = new Date(2024, 5, 15); // 2024-06-15 → Q2
    // baseCtx.savedFlows 已有一筆 2024-06-01 350000（Q2）
    const goal = { type: 'passive_income', periodUnit: 'quarter', targetMode: 'amount', amount: 100000 };
    const p = computeGoalProgress(goal, baseCtx);
    expect(p.current).toBe(350000); // 2024 Q2 股息
    expect(p.target).toBe(100000);
    expect(p.done).toBe(true);
  });

  it('沒有上一期資料時 noBaseline 為 true，不算百分比', () => {
    window.TODAY_DATE = new Date(2024, 5, 15);
    const ctxNoHistory = { ...baseCtx, savedFlows: [flow('inc', '股息', 100000, '2024-06-01')] };
    const goal = { type: 'passive_income', periodUnit: 'year', targetMode: 'percent', percentValue: 4 };
    const p = computeGoalProgress(goal, ctxNoHistory);
    expect(p.noBaseline).toBe(true);
    expect(p.pct).toBe(0);
    expect(p.done).toBe(false);
  });

  it('passive_income 類型指定 incomeGroup 時依該大類彙總，不再固定只算被動收入', () => {
    window.TODAY_DATE = new Date(2024, 5, 15);
    const ctxMixed = { ...baseCtx, savedFlows: [...savedFlows, flow('inc', '薪資', 200000, '2024-06-01')] };
    const goal = { type: 'passive_income', periodUnit: 'year', targetMode: 'amount', amount: 100000, incomeGroup: '主動' };
    const p = computeGoalProgress(goal, ctxMixed);
    expect(p.current).toBe(200000); // 只算薪資（主動），不含股息
  });

  it('passive_income 類型 incomeGroup 為 total 時不分大類全部加總', () => {
    window.TODAY_DATE = new Date(2024, 5, 15);
    const ctxMixed = { ...baseCtx, savedFlows: [...savedFlows, flow('inc', '薪資', 200000, '2024-06-01')] };
    const goal = { type: 'passive_income', periodUnit: 'year', targetMode: 'amount', amount: 100000, incomeGroup: 'total' };
    const p = computeGoalProgress(goal, ctxMixed);
    expect(p.current).toBe(350000 + 200000); // 2024 年股息 + 薪資
  });
});
