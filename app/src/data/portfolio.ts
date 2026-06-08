// Single source of truth for portfolio holdings, balances & allocation.
// All item arrays start empty — data enters only via the 記帳 feature.
import type { PieSlice } from './types';

export type ClassKey = 'cash' | 'stock' | 'bond' | 'other';
export type ClassKeyOrDebt = ClassKey | 'debt';

export interface HoldingItem {
  code: string;
  name: string;
  qty: number;
  avg: number;
  price: number;
  broker: string;
  badge?: string;
}

export interface AccountEntry {
  name: string;
  sub?: string;
  amount: number;
  extra?: { used?: number; limit?: number };
}

export interface PortfolioGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  sign: 1 | -1;
  assetClass: ClassKeyOrDebt;
  detail?: 'holding';
  items: HoldingItem[];
}

export interface AssetGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  sign: 1 | -1;
  assetClass: ClassKeyOrDebt;
  items: AccountEntry[];
}

export interface InvestGroup {
  id: string;
  name: string;
  color: string;
  items: HoldingItem[];
}

export const PORTFOLIO_CLASS_META: Record<ClassKey, { label: string; color: string }> = {
  cash: { label: '現金 / 存款', color: '#A8BD8C' },
  stock: { label: '股票', color: '#D97757' },
  bond: { label: '債券', color: '#BFA176' },
  other: { label: '其他資產', color: '#8FA86F' },
};

// Used by advisor health check (and the dashboard hero net-worth roll-up)
export const PORTFOLIO_GROUPS: PortfolioGroup[] = [
  { id: 'stocks', name: '股票持倉', color: '#D97757', icon: 'TrendUp', sign: 1, assetClass: 'stock', detail: 'holding', items: [] },
  { id: 'bonds', name: '債券', color: '#BFA176', icon: 'Activity', sign: 1, assetClass: 'bond', detail: 'holding', items: [] },
  { id: 'cash', name: '現金', color: '#A8BD8C', icon: 'Wallet', sign: 1, assetClass: 'cash', items: [] },
  { id: 'bank', name: '銀行', color: '#D4B87A', icon: 'Banknote', sign: 1, assetClass: 'cash', items: [] },
  { id: 'epay', name: '儲值/電子支付', color: '#C5A07D', icon: 'Smartphone', sign: 1, assetClass: 'cash', items: [] },
  { id: 'other', name: '其他', color: '#8FA86F', icon: 'Key', sign: 1, assetClass: 'other', items: [] },
  { id: 'credit', name: '信用卡 (負債)', color: '#D88770', icon: 'CreditCard', sign: -1, assetClass: 'debt', items: [] },
];

// 資產頁帳戶分類（依帳戶種類）
export const ASSET_GROUPS: AssetGroup[] = [
  { id: 'credit', name: '信用卡', icon: 'CreditCard', color: '#D88770', sign: -1, assetClass: 'debt', items: [] },
  { id: 'cash', name: '現金', icon: 'Banknote', color: '#A8BD8C', sign: 1, assetClass: 'cash', items: [] },
  { id: 'bank', name: '銀行', icon: 'Wallet', color: '#D4B87A', sign: 1, assetClass: 'cash', items: [] },
  { id: 'brokerage', name: '證券戶', icon: 'TrendUp', color: '#D97757', sign: 1, assetClass: 'stock', items: [] },
  { id: 'prepaid', name: '儲值卡', icon: 'Tag', color: '#8FA86F', sign: 1, assetClass: 'cash', items: [] },
  { id: 'epay', name: '電子支付', icon: 'Smartphone', color: '#C5A07D', sign: 1, assetClass: 'cash', items: [] },
  { id: 'other', name: '其他', icon: 'Key', color: '#BFA176', sign: 1, assetClass: 'other', items: [] },
];

// 投資頁持倉（依投資類型）
export const INVEST_HOLDINGS: InvestGroup[] = [
  { id: 'stock', name: '股票', color: '#D97757', items: [] },
  { id: 'bond-etf', name: '債券ETF', color: '#BFA176', items: [] },
  { id: 'market-etf', name: '大盤ETF', color: '#A8BD8C', items: [] },
  { id: 'active-etf', name: '主動ETF', color: '#D4B87A', items: [] },
  { id: 'theme-etf', name: '主題ETF', color: '#C5A07D', items: [] },
];

export interface CompItem extends HoldingItem {
  amount: number;
  sub: string;
  extra: { pnl: number; pct: string };
}

export interface PortfolioResult {
  totals: Record<ClassKeyOrDebt, number>;
  totalAssets: number;
  netWorth: number;
  pie: PieSlice[];
  alloc: { stockPct: number; bondPct: number; cashPct: number; otherPct: number };
}

// Enrich holdings with market value + P&L, roll up allocation.
export function computePortfolio(): PortfolioResult {
  const totals: Record<ClassKeyOrDebt, number> = { cash: 0, stock: 0, bond: 0, other: 0, debt: 0 };
  PORTFOLIO_GROUPS.forEach((g) => {
    const sum =
      g.id === 'stocks' || g.id === 'bonds'
        ? g.items.reduce((a, s) => a + Math.round(s.qty * s.price), 0)
        : g.items.reduce((a, s) => a + Math.round(s.qty * s.price), 0);
    totals[g.assetClass] += sum;
  });
  const totalAssets = totals.cash + totals.stock + totals.bond + totals.other;
  const netWorth = totalAssets - totals.debt;

  const pctOf = (k: ClassKey) => (totalAssets > 0 ? (totals[k] || 0) / totalAssets * 100 : 0);
  const pie: PieSlice[] = (Object.entries(PORTFOLIO_CLASS_META) as [ClassKey, { label: string; color: string }][]).map(
    ([k, m]) => ({ key: k, label: m.label, color: m.color, value: totals[k] || 0, pct: pctOf(k) }),
  );

  return {
    totals,
    totalAssets,
    netWorth,
    pie,
    alloc: { stockPct: pctOf('stock'), bondPct: pctOf('bond'), cashPct: pctOf('cash'), otherPct: pctOf('other') },
  };
}
