// Demo data model + deterministic per-date generation for the dashboard.

export type FlowKind = 'exp' | 'inc' | 'xfer';
export type Side = 'buy' | 'sell';

/* ---------- form state shapes (記帳) ---------- */
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

/* ---------- display shapes (看板) ---------- */
export interface DayFlow {
  kind: FlowKind;
  amount: number;
  cat: string;
  merchant: string;
  account: string;
  icon: string;
  time: string;
  date?: Date;
  _justAdded?: number;
}

export interface DayTrade {
  side: Side;
  code: string;
  name: string;
  shares: number;
  price: number;
  time: string;
  broker: string;
  pnl?: number;
  date?: Date;
  _justAdded?: number;
}

export interface PieSlice {
  label: string;
  color: string;
  pct: number;
  value?: number;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Deterministic per-date data generation
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function seedFor(d: Date): number {
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}
function mulberry(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TODAY = new Date(2026, 4, 27); // May 27, 2026 (anchor)

interface FlowTemplate {
  icon: string;
  cat: string;
  merchant: string;
  account: string;
  range: [number, number];
}

const EXP_TEMPLATES: FlowTemplate[] = [
  { icon: '🍞', cat: '早餐', merchant: '便利商店', account: '信用卡 A', range: [60, 130] },
  { icon: '🍔', cat: '午餐', merchant: '麥當勞', account: '信用卡 A', range: [120, 280] },
  { icon: '🍱', cat: '午餐', merchant: '自助餐', account: '現金', range: [90, 150] },
  { icon: '🍜', cat: '晚餐', merchant: '拉麵店', account: '信用卡 A', range: [220, 380] },
  { icon: '☕', cat: '飲料', merchant: '星巴克', account: '信用卡 B', range: [85, 180] },
  { icon: '🛒', cat: '生活雜貨', merchant: '全家便利商店', account: '信用卡 A', range: [200, 1500] },
  { icon: '🚕', cat: '交通', merchant: '計程車', account: '現金', range: [180, 420] },
  { icon: '🚇', cat: '交通', merchant: '悠遊卡儲值', account: '主要存款帳戶', range: [500, 500] },
  { icon: '🎬', cat: '娛樂', merchant: '電影院', account: '信用卡 B', range: [320, 320] },
  { icon: '💊', cat: '醫療', merchant: '藥局', account: '現金', range: [180, 580] },
  { icon: '⛽', cat: '交通', merchant: '加油站', account: '信用卡 A', range: [800, 1800] },
];
const INC_TEMPLATES: FlowTemplate[] = [
  { icon: '💼', cat: '薪資', merchant: '公司轉帳', account: '主要存款帳戶', range: [52000, 52000] },
  { icon: '💰', cat: '獎金', merchant: '績效獎金', account: '主要存款帳戶', range: [8000, 18000] },
  { icon: '🎁', cat: '紅利', merchant: '信用卡回饋', account: '信用卡 A', range: [240, 580] },
  { icon: '📈', cat: '股利', merchant: '股票股利', account: '券商交割戶', range: [1800, 5200] },
];
const XFER_TEMPLATES: FlowTemplate[] = [
  { icon: '↔', cat: '轉帳', merchant: '至證券交割戶', account: '主要 → 證券', range: [20000, 80000] },
  { icon: '↔', cat: '轉帳', merchant: '繳信用卡', account: '主要 → 信用卡 A', range: [15000, 35000] },
  { icon: '↔', cat: '轉帳', merchant: '至數位帳戶', account: '主要 → 數位', range: [10000, 60000] },
];
const STOCKS = [
  { code: '2330', name: '台積電', range: [1015, 1075], cost: 580 },
  { code: '2454', name: '聯發科', range: [1340, 1410], cost: 850 },
  { code: '0050', name: '元大台灣50', range: [188, 200], cost: 142 },
  { code: '2412', name: '中華電', range: [124, 128], cost: 118 },
  { code: '2317', name: '鴻海', range: [205, 220], cost: 165 },
];

export function generateDayData(date: Date): { flows: DayFlow[]; trades: DayTrade[] } {
  const rand = mulberry(seedFor(date));
  const dow = date.getDay();
  const isPayday = date.getDate() === 5;
  const isWeekend = dow === 0 || dow === 6;

  // Expenses: 3-7 on weekdays, 2-5 on weekends
  const expCount = Math.floor(rand() * 5) + (isWeekend ? 2 : 3);
  const expenses: DayFlow[] = [];
  for (let i = 0; i < expCount; i++) {
    const t = EXP_TEMPLATES[Math.floor(rand() * EXP_TEMPLATES.length)];
    const amt = Math.round(t.range[0] + rand() * (t.range[1] - t.range[0]));
    const h = String(8 + Math.floor(rand() * 12)).padStart(2, '0');
    const m = String(Math.floor(rand() * 60)).padStart(2, '0');
    expenses.push({ ...t, kind: 'exp', time: `${h}:${m}`, amount: amt });
  }
  // Incomes
  const incomes: DayFlow[] = [];
  if (isPayday) {
    incomes.push({ ...INC_TEMPLATES[0], kind: 'inc', time: '10:30', amount: 52000 });
  }
  if (rand() < 0.18) {
    const t = INC_TEMPLATES[1 + Math.floor(rand() * 3)];
    const amt = Math.round(t.range[0] + rand() * (t.range[1] - t.range[0]));
    incomes.push({ ...t, kind: 'inc', time: '14:20', amount: amt });
  }
  // Transfers
  const transfers: DayFlow[] = [];
  if (rand() < 0.22) {
    const t = XFER_TEMPLATES[Math.floor(rand() * XFER_TEMPLATES.length)];
    const amt = Math.round(t.range[0] + rand() * (t.range[1] - t.range[0]));
    transfers.push({ ...t, kind: 'xfer', time: '15:00', amount: amt });
  }
  const flows = [...expenses, ...incomes, ...transfers].sort((a, b) => a.time.localeCompare(b.time));

  // Stock trades: only weekdays, ~40% chance
  const trades: DayTrade[] = [];
  if (!isWeekend && rand() < 0.4) {
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const s = STOCKS[Math.floor(rand() * STOCKS.length)];
      const side: Side = rand() < 0.55 ? 'buy' : 'sell';
      const shares = [50, 100, 200, 500, 1000][Math.floor(rand() * 5)];
      const price = Math.round((s.range[0] + rand() * (s.range[1] - s.range[0])) * 10) / 10;
      const h = String(9 + Math.floor(rand() * 4)).padStart(2, '0');
      const m = String(Math.floor(rand() * 60)).padStart(2, '0');
      const trade: DayTrade = { side, code: s.code, name: s.name, shares, price, time: `${h}:${m}`, broker: '券商交割戶' };
      if (side === 'sell') trade.pnl = Math.round((price - s.cost) * shares * (0.5 + rand() * 0.5));
      trades.push(trade);
    }
    trades.sort((a, b) => a.time.localeCompare(b.time));
  }

  return { flows, trades };
}
