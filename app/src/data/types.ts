// Shared domain types for the FinFolio app.

export type FlowKind = 'exp' | 'inc' | 'xfer';
export type Side = 'buy' | 'sell';

/* ---------- 記帳 form state ---------- */
export interface FlowState {
  kind: FlowKind;
  amount: string;
  category: string;
  account: string;
  fromAccount: string;
  toAccount: string;
  date: Date;
  note: string;
}

export interface StockState {
  side: Side;
  code: string;
  name: string;
  shares: string;
  price: string;
  assetClass: string;
  broker: string;
  settleAccount: string;
  date: Date;
  note: string;
}

/* ---------- saved records (live in App state) ---------- */
export interface SavedFlow {
  kind: FlowKind;
  amount: number;
  cat: string;
  merchant: string;
  account: string;
  date: Date;
  time?: string;
  icon: string;
  _justAdded?: number;
  fromAccount?: string;
  toAccount?: string;
  _id?: string;
}

export interface SavedTrade {
  side: Side;
  code: string;
  name: string;
  shares: number;
  price: number;
  broker: string;
  date: Date;
  time?: string;
  pnl?: number;
  _justAdded?: number;
  _id?: string;
}

/* ---------- voice / edit draft passed to the record sheet ---------- */
export interface VoiceScenario {
  intent: 'flow' | 'stock';
  text: string;
  apply: Partial<FlowState> & Partial<StockState>;
  summary: [string, string][];
}

export interface Draft {
  intent: 'flow' | 'stock';
  apply: Partial<FlowState> & Partial<StockState>;
  edit?: boolean;
  recordId?: string;
  text?: string;
  summary?: [string, string][];
}

/* ---------- Settings master data ---------- */
export interface AccountItem {
  name: string;
  kind: string;
}
export interface KVItem {
  name: string;
  sub: string;
}
export interface MasterData {
  cat_exp: string[];
  cat_inc: string[];
  cat_xfer: string[];
  asset_class: string[];
  accounts: AccountItem[];
  brokers: KVItem[];
  settle: KVItem[];
}

/* ---------- pie slice (shared by donuts) ---------- */
export interface PieSlice {
  key?: string;
  label: string;
  color: string;
  pct: number;
  value?: number;
}
