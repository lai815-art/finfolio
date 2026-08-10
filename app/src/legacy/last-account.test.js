import { describe, it, expect, beforeEach } from 'vitest';
import { ffLastAccountFor, ffRememberAccount } from './last-account.js';

const ACCTS = ['現金', '富邦銀行', '信用卡 A', '主要存款帳戶'];

beforeEach(() => localStorage.clear());

describe('ffRememberAccount / ffLastAccountFor', () => {
  it('記住支出項目用的帳戶後可以讀回', () => {
    ffRememberAccount('exp', '早餐', { account: '現金' });
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toEqual({ account: '現金' });
  });

  it('同大類的不同項目各自記各自的帳戶', () => {
    ffRememberAccount('exp', '早餐', { account: '現金' });
    ffRememberAccount('exp', '午餐', { account: '信用卡 A' });
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toEqual({ account: '現金' });
    expect(ffLastAccountFor('exp', '午餐', ACCTS)).toEqual({ account: '信用卡 A' });
  });

  it('收入與支出的同名分類互不干擾', () => {
    ffRememberAccount('exp', '其他', { account: '現金' });
    ffRememberAccount('inc', '其他', { account: '富邦銀行' });
    expect(ffLastAccountFor('exp', '其他', ACCTS)).toEqual({ account: '現金' });
    expect(ffLastAccountFor('inc', '其他', ACCTS)).toEqual({ account: '富邦銀行' });
  });

  it('轉帳同時記住轉出與轉入帳戶', () => {
    ffRememberAccount('xfer', '繳卡費', { fromAccount: '主要存款帳戶', toAccount: '信用卡 A' });
    expect(ffLastAccountFor('xfer', '繳卡費', ACCTS)).
    toEqual({ fromAccount: '主要存款帳戶', toAccount: '信用卡 A' });
  });

  it('後記的帳戶覆蓋先前記住的', () => {
    ffRememberAccount('exp', '早餐', { account: '現金' });
    ffRememberAccount('exp', '早餐', { account: '信用卡 A' });
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toEqual({ account: '信用卡 A' });
  });

  it('記住的帳戶已從主檔刪掉就不帶入', () => {
    ffRememberAccount('exp', '早餐', { account: '悠遊卡' });
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toBeNull();
  });

  it('轉帳只有一邊的帳戶還存在時，只帶入還有效的那一欄', () => {
    ffRememberAccount('xfer', '繳卡費', { fromAccount: '主要存款帳戶', toAccount: '已刪除的卡' });
    expect(ffLastAccountFor('xfer', '繳卡費', ACCTS)).toEqual({ fromAccount: '主要存款帳戶' });
  });

  it('沒記錄過的分類回傳 null', () => {
    expect(ffLastAccountFor('exp', '沒記過的分類', ACCTS)).toBeNull();
  });

  it('localStorage 內容損壞時回傳 null 而不丟錯', () => {
    localStorage.setItem('ff_last_acct_by_cat', '{壞掉的 JSON');
    expect(() => ffLastAccountFor('exp', '早餐', ACCTS)).not.toThrow();
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toBeNull();
  });

  it('分類為空時不寫入也不讀出', () => {
    ffRememberAccount('exp', '', { account: '現金' });
    expect(localStorage.getItem('ff_last_acct_by_cat')).toBeNull();
    expect(ffLastAccountFor('exp', '', ACCTS)).toBeNull();
  });

  it('帳戶是空值時不寫入', () => {
    ffRememberAccount('exp', '早餐', { account: '' });
    expect(ffLastAccountFor('exp', '早餐', ACCTS)).toBeNull();
  });
});
