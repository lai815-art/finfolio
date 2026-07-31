import { describe, it, expect } from 'vitest';
import { parseUtterance } from './voice-parse.js';

const masterData = {
  accounts: [
    { name: '國泰銀行', kind: '銀行' },
    { name: '台新信用卡', kind: '信用卡' },
  ],
  settle: [],
  cat_exp: [{ name: '飲料', group: '餐飲' }, { name: '其他', group: '其他' }],
  cat_inc: [{ name: '薪資', group: '主動' }],
};

describe('parseUtterance — stock buy/sell detection', () => {
  it('recognizes a buy by ticker code, share count and price', () => {
    const r = parseUtterance('買進2330 1000股 成交價500', masterData);
    expect(r.intent).toBe('stock');
    expect(r.apply.side).toBe('buy');
    expect(r.apply.code).toBe('2330');
    expect(r.apply.shares).toBe('1000');
    expect(r.apply.price).toBe('500');
  });

  it('recognizes a sell', () => {
    const r = parseUtterance('賣出0050 500股 @35', masterData);
    expect(r.intent).toBe('stock');
    expect(r.apply.side).toBe('sell');
    expect(r.apply.code).toBe('0050');
    expect(r.apply.shares).toBe('500');
    expect(r.apply.price).toBe('35');
  });

  it('converts 張 (lots) to shares — 1 張 = 1000 股', () => {
    const r = parseUtterance('買進2330 一張 成交價600', masterData);
    expect(r.apply.shares).toBe('1000');
  });

  it('converts Chinese numerals combined with 股', () => {
    const r = parseUtterance('買進2330 五百股 成交價500', masterData);
    expect(r.apply.shares).toBe('500');
  });
});

describe('parseUtterance — transfer detection', () => {
  it('splits "A轉帳...到B" into fromAccount/toAccount', () => {
    const r = parseUtterance('國泰銀行轉帳5000到台新信用卡', masterData);
    expect(r.intent).toBe('flow');
    expect(r.apply.kind).toBe('xfer');
    expect(r.apply.fromAccount).toBe('國泰銀行');
    expect(r.apply.toAccount).toBe('台新信用卡');
    expect(r.apply.amount).toBe('5000');
  });
});

describe('parseUtterance — category/account fuzzy matching', () => {
  it('maps a spoken brand name to its category via the keyword table, not an exact name match', () => {
    // "星巴克" isn't a category name in masterData.cat_exp — only the EXP_KW_V
    // keyword table connects it to the "飲料" leaf that *is* in cat_exp.
    const r = parseUtterance('星巴克咖啡85元', masterData);
    expect(r.intent).toBe('flow');
    expect(r.apply.kind).toBe('exp');
    expect(r.apply.category).toBe('飲料');
    expect(r.apply.amount).toBe('85');
  });

  it('resolves an account from a payment-method keyword when the account name is never spoken', () => {
    const r = parseUtterance('刷信用卡買東西300元', masterData);
    expect(r.apply.account).toBe('台新信用卡');
  });

  it('treats income keywords (薪水/薪資/...) as income, everything else as expense', () => {
    const r = parseUtterance('這個月薪水入帳50000', masterData);
    expect(r.apply.kind).toBe('inc');
  });
});

describe('parseUtterance — amount and note extraction', () => {
  it('picks the largest number in the sentence as the amount', () => {
    const r = parseUtterance('午餐花了120元', masterData);
    expect(r.apply.amount).toBe('120');
  });

  it('extracts an explicit 備註 clause and strips it from parsing', () => {
    const r = parseUtterance('午餐120元 備註：跟同事聚餐', masterData);
    expect(r.apply.note).toBe('跟同事聚餐');
  });

  it('falls back to a recognized merchant name as the note when there is no explicit 備註', () => {
    const r = parseUtterance('星巴克咖啡85元', masterData);
    expect(r.apply.note).toBe('星巴克');
  });
});
