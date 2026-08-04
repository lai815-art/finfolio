import { describe, it, expect, beforeEach } from 'vitest';
import { computeAccounts, computeHoldings, computeStockTrade, defaultTaxRate, mergeHoldingsByCode,
  excludeHiddenAccounts, excludeHiddenHoldings } from './compute.js';

describe('computeAccounts', () => {
  beforeEach(() => {
    window.TODAY_DATE = new Date('2024-06-15');
  });

  const accounts = [
    { name: '國泰銀行', kind: '銀行' },
    { name: '台新信用卡', kind: '信用卡' },
  ];
  const initialBalances = { 國泰銀行: 1000, 台新信用卡: 0 };

  it('applies income and expense to the right account', () => {
    const flows = [
      { kind: 'exp', account: '國泰銀行', amount: 100, date: '2024-06-01' },
      { kind: 'inc', account: '國泰銀行', amount: 500, date: '2024-06-01' },
    ];
    const groups = computeAccounts(accounts, [], flows, [], initialBalances);
    const bank = groups.find((g) => g.id === 'bank');
    expect(bank.items.find((i) => i.name === '國泰銀行').amount).toBe(1400);
  });

  it('flips sign on credit-card spend so it displays as amount owed', () => {
    const flows = [{ kind: 'exp', account: '台新信用卡', amount: 200, date: '2024-06-01' }];
    const groups = computeAccounts(accounts, [], flows, [], initialBalances);
    const credit = groups.find((g) => g.id === 'credit');
    expect(credit.items.find((i) => i.name === '台新信用卡').amount).toBe(200);
  });

  it('ignores flows dated after today', () => {
    const flows = [{ kind: 'exp', account: '國泰銀行', amount: 999, date: '2099-01-01' }];
    const groups = computeAccounts(accounts, [], flows, [], initialBalances);
    const bank = groups.find((g) => g.id === 'bank');
    expect(bank.items.find((i) => i.name === '國泰銀行').amount).toBe(1000);
  });

  it('charges transfer fee to the sending account only', () => {
    const flows = [
      { kind: 'xfer', fromAccount: '國泰銀行', toAccount: '台新信用卡', amount: 300, xferFee: 15, date: '2024-06-01' },
    ];
    const groups = computeAccounts(accounts, [], flows, [], initialBalances);
    const bank = groups.find((g) => g.id === 'bank');
    const credit = groups.find((g) => g.id === 'credit');
    expect(bank.items.find((i) => i.name === '國泰銀行').amount).toBe(1000 - 300 - 15);
    // receiving account is a credit card: incoming transfer reduces what's owed
    expect(credit.items.find((i) => i.name === '台新信用卡').amount).toBe(-300);
  });
});

describe('computeHoldings', () => {
  const masterData = { accounts: [], settle: [], brokers: [] };

  it('computes FIFO cost basis and P&L after a partial sell', () => {
    const trades = [
      { code: '2330', name: '台積電', side: 'buy', shares: 1000, price: 500, date: '2024-01-01', assetClass: '股票' },
      { code: '2330', name: '台積電', side: 'sell', shares: 400, price: 600, date: '2024-02-01', assetClass: '股票' },
    ];
    const groups = computeHoldings(trades, masterData, { 2330: 550 });
    const holding = groups.find((g) => g.id === '股票').items.find((i) => i.code === '2330');

    expect(holding.qty).toBe(600);
    expect(holding.avg).toBe(500.7); // (gross+fee)/shares from the remaining FIFO lot
    expect(holding.mv).toBe(330000); // 600 * live price 550
    expect(holding.pnl).toBe(29573);
  });

  it('drops a stock from the list once fully sold', () => {
    const trades = [
      { code: '2330', side: 'buy', shares: 1000, price: 500, date: '2024-01-01', assetClass: '股票' },
      { code: '2330', side: 'sell', shares: 1000, price: 600, date: '2024-02-01', assetClass: '股票' },
    ];
    const groups = computeHoldings(trades, masterData, {});
    expect(groups.find((g) => g.id === '股票')).toBeUndefined();
  });

  it('falls back to last trade price when no live quote is available', () => {
    const trades = [{ code: '0050', side: 'buy', shares: 1000, price: 100, date: '2024-01-01', assetClass: 'ETF' }];
    const groups = computeHoldings(trades, masterData, {});
    const holding = groups.find((g) => g.id === 'ETF').items.find((i) => i.code === '0050');
    expect(holding.price).toBe(100);
  });

  it('keeps the same stock held at different brokers as separate holdings', () => {
    const trades = [
      { code: '2330', name: '台積電', side: 'buy', shares: 200, price: 2000, date: '2024-01-01', assetClass: '股票', broker: '凱基證券' },
      { code: '2330', name: '台積電', side: 'buy', shares: 5000, price: 500, date: '2024-01-01', assetClass: '股票', broker: '元大證券' },
    ];
    const groups = computeHoldings(trades, masterData, {});
    const items = groups.find((g) => g.id === '股票').items.filter((i) => i.code === '2330');

    expect(items).toHaveLength(2);
    const kgi = items.find((i) => i.broker === '凱基證券');
    const yuanta = items.find((i) => i.broker === '元大證券');
    expect(kgi.qty).toBe(200);
    expect(yuanta.qty).toBe(5000);
  });
});

describe('mergeHoldingsByCode', () => {
  // computeHoldings 依 code|broker 拆開（投資頁要分券商看）；投資配置要的是合併後的整體配置。
  const twdItem = (over) => ({
    code: '2330', name: '台積電', assetClass: '股票', currency: 'TWD',
    qty: 0, mv: 0, cost: 0, pnl: 0, mvT: 0, costT: 0, pnlT: 0, ...over,
  });

  it('merges the same stock held at two brokers into one row', () => {
    const merged = mergeHoldingsByCode([
      twdItem({ broker: '凱基證券', qty: 200, mv: 220000, cost: 200000, pnl: 20000, mvT: 220000, costT: 200000, pnlT: 20000 }),
      twdItem({ broker: '元大證券', qty: 1000, mv: 1100000, cost: 900000, pnl: 200000, mvT: 1100000, costT: 900000, pnlT: 200000 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(1200);
    expect(merged[0].mvT).toBe(1320000);
    expect(merged[0].costT).toBe(1100000);
    expect(merged[0].pnlT).toBe(220000);
    expect(merged[0].brokers).toEqual(['凱基證券', '元大證券']);
  });

  it('recomputes average cost and return % from the combined position', () => {
    const merged = mergeHoldingsByCode([
      twdItem({ broker: 'A', qty: 100, avg: 100, mvT: 12000, costT: 10000, pnlT: 2000, pct: 20 }),
      twdItem({ broker: 'B', qty: 300, avg: 200, mvT: 66000, costT: 60000, pnlT: 6000, pct: 10 }),
    ]);

    expect(merged[0].avg).toBe(175); // 70000 / 400
    expect(merged[0].pct).toBeCloseTo(8000 / 70000 * 100, 6);
  });

  it('keeps different stocks apart and preserves market-value order input', () => {
    const merged = mergeHoldingsByCode([
      twdItem({ broker: 'A', qty: 100, mvT: 1000 }),
      twdItem({ code: '0050', name: '元大台灣50', broker: 'A', qty: 500, mvT: 90000 }),
      twdItem({ broker: 'B', qty: 100, mvT: 1000 }),
    ]);

    expect(merged.map((m) => m.code)).toEqual(['2330', '0050']);
    expect(merged[0].qty).toBe(200);
    expect(merged[1].qty).toBe(500);
  });

  it('falls back to TWD figures when the same code is held in two currencies', () => {
    const merged = mergeHoldingsByCode([
      twdItem({ code: 'VT', broker: '台股複委託', currency: 'TWD', qty: 10, mv: 32500, cost: 30000, pnl: 2500, mvT: 32500, costT: 30000, pnlT: 2500 }),
      twdItem({ code: 'VT', broker: '海外券商', currency: 'USD', qty: 10, mv: 1000, cost: 900, pnl: 100, mvT: 32500, costT: 29250, pnlT: 3250 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].currency).toBeNull(); // 幣別不一致 → 不再標示單一幣別
    expect(merged[0].mv).toBe(merged[0].mvT); // 原幣欄位改用台幣值，不會把 1000 美元當 1000 元加進去
    expect(merged[0].mvT).toBe(65000);
  });

  it('leaves a single-broker holding untouched apart from the brokers list', () => {
    const merged = mergeHoldingsByCode([
      twdItem({ broker: '凱基證券', qty: 200, avg: 1000, mvT: 220000, costT: 200000, pnlT: 20000, pct: 10 }),
    ]);

    expect(merged[0].avg).toBe(1000);
    expect(merged[0].pct).toBe(10);
    expect(merged[0].brokers).toEqual(['凱基證券']);
  });
});

describe('defaultTaxRate', () => {
  it('picks 0% for bond-flavored asset classes', () => {
    expect(defaultTaxRate('債券')).toBe(0);
    expect(defaultTaxRate('美債 ETF')).toBe(0);
  });

  it('picks 0% for US stocks (no Taiwan securities transaction tax)', () => {
    expect(defaultTaxRate('美股')).toBe(0);
  });

  it('picks 0.1% for ETF / 權證 / 型-suffixed classes', () => {
    expect(defaultTaxRate('市值 ETF')).toBe(0.001);
    expect(defaultTaxRate('主動型')).toBe(0.001);
    expect(defaultTaxRate('權證')).toBe(0.001);
  });

  it('falls back to the general 0.3% rate for plain stocks', () => {
    expect(defaultTaxRate('股票')).toBe(0.003);
    expect(defaultTaxRate(undefined)).toBe(0.003);
  });
});

describe('computeStockTrade', () => {
  it('computes the auto fee from the broker fee rate with no discount', () => {
    const t = computeStockTrade({
      side: 'buy', shares: 1000, price: 500,
      brokerObj: { name: '國泰證券' }, // no feeRate/discount set → defaults 0.1425% / no discount
    });
    expect(t.gross).toBe(500000);
    expect(t.feeRate).toBe(0.1425);
    expect(t.autoFee).toBe(712); // floor(500000 * 0.001425)
    expect(t.fee).toBe(712);
    expect(t.feeOverridden).toBe(false);
    expect(t.net).toBe(500712); // buy: gross + fee
  });

  it('applies the broker discount as a multiplier on the fee', () => {
    const t = computeStockTrade({
      side: 'buy', shares: 1000, price: 500,
      brokerObj: { name: '網路券商', feeRate: '0.1425', discount: '6' }, // 六折
    });
    expect(t.feeMult).toBe(0.6);
    expect(t.autoFee).toBe(427); // floor(500000 * 0.001425 * 0.6)
  });

  it('lets a manual fee override win over the auto-calculated fee', () => {
    const t = computeStockTrade({
      side: 'buy', shares: 1000, price: 500,
      brokerObj: { name: '國泰證券' }, feeOverride: '99',
    });
    expect(t.feeOverridden).toBe(true);
    expect(t.fee).toBe(99);
    expect(t.net).toBe(500099);
  });

  it('applies one of the four preset tax rates on a sell, defaulting by asset class', () => {
    const t = computeStockTrade({
      side: 'sell', shares: 1000, price: 500, brokerObj: { name: '國泰證券' }, assetClass: '股票',
    });
    expect(t.taxRate).toBe(0.003); // 一般 0.3%
    expect(t.autoTax).toBe(1500);
    expect(t.net).toBe(500000 - t.fee - 1500); // sell: gross - fee - tax
  });

  it('lets taxRateMode override the asset-class default (e.g. 當沖 0.15%)', () => {
    const t = computeStockTrade({
      side: 'sell', shares: 1000, price: 500, brokerObj: { name: '國泰證券' },
      assetClass: '股票', taxRateMode: 0.0015,
    });
    expect(t.taxRate).toBe(0.0015);
    expect(t.autoTax).toBe(750);
  });

  it('lets a manual tax override win over the auto-calculated tax', () => {
    const t = computeStockTrade({
      side: 'sell', shares: 1000, price: 500, brokerObj: { name: '國泰證券' },
      assetClass: '股票', taxOverride: '1',
    });
    expect(t.taxOverridden).toBe(true);
    expect(t.tax).toBe(1);
  });

  it('never charges securities transaction tax on a buy', () => {
    const t = computeStockTrade({
      side: 'buy', shares: 1000, price: 500, brokerObj: { name: '國泰證券' }, assetClass: '股票',
    });
    expect(t.taxRate).toBe(0);
    expect(t.tax).toBe(0);
  });
});

describe('開發者隱藏：只從清單與加總排除，不動計算', () => {
  beforeEach(() => {
    window.TODAY_DATE = new Date('2024-06-15');
  });

  const accounts = [
    { name: '台新銀行', kind: '銀行' },
    { name: '國泰銀行', kind: '銀行' },
  ];
  const initialBalances = { 台新銀行: 50000, 國泰銀行: 1000 };
  const emptyMaster = { accounts: [], settle: [], brokers: [] };

  it('隱藏帳戶的轉帳不會讓對手帳戶的錢憑空消失', () => {
    const flows = [
      { kind: 'xfer', fromAccount: '台新銀行', toAccount: '國泰銀行', amount: 10000, date: '2024-06-01' },
    ];
    // 計算吃完整流水，算完才摘掉隱藏帳戶
    const visible = excludeHiddenAccounts(
      computeAccounts(accounts, [], flows, [], initialBalances), new Set(['台新銀行']));
    const bank = visible.find((g) => g.id === 'bank');

    expect(bank.items.map((i) => i.name)).toEqual(['國泰銀行']);
    expect(bank.items[0].amount).toBe(11000); // 收到的 10000 還在
  });

  it('隱藏個股的買進仍從交割戶扣款', () => {
    const trades = [
      { code: '2330', side: 'buy', shares: 10, price: 10, fee: 20, date: '2024-06-01', settleAccount: '國泰銀行' },
    ];
    const groups = computeAccounts(accounts, [], [], trades, initialBalances);
    const bank = groups.find((g) => g.id === 'bank');

    expect(bank.items.find((i) => i.name === '國泰銀行').amount).toBe(880); // 1000 - (100 + 20)
  });

  it('隱藏併進銀行群組的交割戶也會從清單消失', () => {
    const settle = [{ name: '永豐交割戶', sub: '交割戶' }];
    const visible = excludeHiddenAccounts(
      computeAccounts(accounts, settle, [], [], initialBalances), new Set(['永豐交割戶']));

    expect(visible.find((g) => g.id === 'bank').items.map((i) => i.name)).toEqual(['台新銀行', '國泰銀行']);
  });

  it('沒有隱藏項目時原樣回傳', () => {
    const groups = computeAccounts(accounts, [], [], [], initialBalances);
    expect(excludeHiddenAccounts(groups, new Set())).toBe(groups);
    expect(excludeHiddenHoldings(groups, new Set(), new Set())).toBe(groups);
  });

  it('持倉只依代號與券商排除——隱藏銀行交割戶不會弄掉持倉', () => {
    const trades = [
      { code: '2330', name: '台積電', side: 'buy', shares: 1000, price: 500, date: '2024-01-01',
        assetClass: '股票', broker: '凱基證券', settleAccount: '國泰銀行' },
      { code: '0050', name: '元大台灣50', side: 'buy', shares: 1000, price: 100, date: '2024-01-01',
        assetClass: 'ETF', broker: '元大證券', settleAccount: '國泰銀行' },
    ];
    const groups = computeHoldings(trades, emptyMaster, {});

    // 隱藏的是銀行交割戶（不是券商）→ 持倉全數保留
    expect(excludeHiddenHoldings(groups, new Set(), new Set(['國泰銀行']))).toEqual(groups);
    // 隱藏券商 → 該券商持倉退出，空掉的資產類別群組也不留
    expect(excludeHiddenHoldings(groups, new Set(), new Set(['元大證券'])).map((g) => g.id)).toEqual(['股票']);
    // 隱藏個股 → 只有該檔退出（key 為 代號+券商）
    expect(excludeHiddenHoldings(groups, new Set(['2330|凱基證券']), new Set()).map((g) => g.id)).toEqual(['ETF']);
  });

  it('同一檔股票分屬兩家券商時，只隱藏其中一家不會連帶隱藏另一家', () => {
    const trades = [
      { code: '2330', name: '台積電', side: 'buy', shares: 1000, price: 500, date: '2024-01-01',
        assetClass: '股票', broker: '凱基證券', settleAccount: '國泰銀行' },
      { code: '2330', name: '台積電', side: 'buy', shares: 2000, price: 500, date: '2024-01-01',
        assetClass: '股票', broker: '元大證券', settleAccount: '國泰銀行' },
    ];
    const groups = computeHoldings(trades, emptyMaster, {});

    const visible = excludeHiddenHoldings(groups, new Set(['2330|凱基證券']), new Set());
    const items = visible.find((g) => g.id === '股票').items;
    expect(items.map((i) => i.broker)).toEqual(['元大證券']);
  });
});
