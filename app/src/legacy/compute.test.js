import { describe, it, expect, beforeEach } from 'vitest';
import { computeAccounts, computeHoldings, computeStockTrade, defaultTaxRate } from './compute.js';

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
