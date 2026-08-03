import { describe, it, expect, beforeEach } from 'vitest';
import { migrateSchema, SCHEMA_VERSION } from './schema-migration.js';

describe('migrateSchema', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('bumps ff_schema_version to the current version on first run', () => {
    migrateSchema();
    expect(localStorage.getItem('ff_schema_version')).toBe(String(SCHEMA_VERSION));
  });

  it('regroups old income categories into 被動/投資收入 and fills in missing ones', () => {
    localStorage.setItem(
      'ff_master_data',
      JSON.stringify({ cat_inc: [{ name: '薪資', group: '主動' }, { name: '股息', group: '其他' }, { name: '利息', group: '其他' }, { name: '美股', group: '其他' }] })
    );

    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    const byName = Object.fromEntries(md.cat_inc.map((c) => [c.name, c.group]));
    expect(byName['股息']).toBe('被動');
    expect(byName['利息']).toBe('被動');
    expect(byName['債息']).toBe('被動'); // missing item, inserted by migration
    expect(byName['美股']).toBe('投資收入');
    expect(byName['台股']).toBe('投資收入'); // missing item, inserted by migration
    expect(byName['薪資']).toBe('主動'); // untouched
  });

  it('is idempotent — running it twice does not duplicate categories', () => {
    localStorage.setItem('ff_master_data', JSON.stringify({ cat_inc: [{ name: '股息', group: '其他' }] }));

    migrateSchema();
    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    const count = (name) => md.cat_inc.filter((c) => c.name === name).length;
    expect(count('股息')).toBe(1);
    expect(count('債息')).toBe(1);
    expect(count('台股')).toBe(1);
    expect(count('美股')).toBe(1);
  });

  it('self-heals a restored backup that is already on v4 but missing the newer categories', () => {
    localStorage.setItem('ff_schema_version', '4');
    localStorage.setItem('ff_master_data', JSON.stringify({ cat_inc: [{ name: '薪資', group: '主動' }] }));

    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    const names = md.cat_inc.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['債息', '台股', '美股', '投資收入']));
  });

  it('fills in a default fee rate for brokers missing one, without touching brokers that already have one', () => {
    localStorage.setItem(
      'ff_master_data',
      JSON.stringify({ brokers: [{ name: '國泰證券' }, { name: '元大證券', feeRate: '0.06' }] })
    );

    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    expect(md.brokers.find((b) => b.name === '國泰證券').feeRate).toBe('0.1425');
    expect(md.brokers.find((b) => b.name === '元大證券').feeRate).toBe('0.06');
  });

  it('backfills exp_groups/inc_groups for old data missing them, without touching existing ones', () => {
    localStorage.setItem(
      'ff_master_data',
      JSON.stringify({ cat_exp: [], inc_groups: [{ name: '自訂', color: '#111111' }] })
    );

    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    expect(md.exp_groups.map((g) => g.name)).toEqual(
      expect.arrayContaining(['餐飲', '交通', '日常', '娛樂', '醫療', '教育', '金融保險', '投資損失', '其他'])
    );
    expect(md.inc_groups).toEqual([{ name: '自訂', color: '#111111' }]); // already present, untouched
  });

  it('resorts existing exp_groups/inc_groups so locked groups lead and 其他 trails, without reordering the rest', () => {
    localStorage.setItem(
      'ff_master_data',
      JSON.stringify({
        exp_groups: [
          { name: '娛樂', color: '#1' }, { name: '其他', color: '#2' }, { name: '交通', color: '#3' },
          { name: '餐飲', color: '#4' }, { name: '醫療', color: '#5' }, { name: '投資損失', color: '#6' }, { name: '日常', color: '#7' }
        ],
        inc_groups: [
          { name: '其他', color: '#8' }, { name: '投資收入', color: '#9' }, { name: '主動', color: '#10' }, { name: '被動', color: '#11' }
        ]
      })
    );

    migrateSchema();

    const md = JSON.parse(localStorage.getItem('ff_master_data'));
    expect(md.exp_groups.map((g) => g.name)).toEqual(['餐飲', '交通', '日常', '投資損失', '娛樂', '醫療', '其他']);
    expect(md.inc_groups.map((g) => g.name)).toEqual(['主動', '被動', '投資收入', '其他']);
  });

  // 歷史匯入以前是照檔案原樣寫入代號的，帶字母尾碼的債券 ETF 可能存成小寫（00720b）。
  // 小寫代號抓不到收盤價，同一檔混用大小寫還會在持股頁被拆成兩列。
  it('upper-cases stock codes in existing trades, leaving already-upper-case ones untouched', () => {
    localStorage.setItem(
      'ff_trades',
      JSON.stringify([
        { code: '00720b', side: 'buy', shares: 1000 },
        { code: ' 00751b ', side: 'buy', shares: 500 },
        { code: '2330', side: 'buy', shares: 100 },
        { side: 'buy', shares: 10 } // 沒有代號的紀錄不能被動到
      ])
    );

    migrateSchema();

    const trades = JSON.parse(localStorage.getItem('ff_trades'));
    expect(trades.map((t) => t.code)).toEqual(['00720B', '00751B', '2330', undefined]);
  });

  it('does nothing harmful when there is no master data at all', () => {
    expect(() => migrateSchema()).not.toThrow();
    expect(localStorage.getItem('ff_schema_version')).toBe(String(SCHEMA_VERSION));
  });
});
