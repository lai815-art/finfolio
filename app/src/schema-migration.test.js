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

  it('does nothing harmful when there is no master data at all', () => {
    expect(() => migrateSchema()).not.toThrow();
    expect(localStorage.getItem('ff_schema_version')).toBe(String(SCHEMA_VERSION));
  });
});
