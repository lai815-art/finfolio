import type { SavedFlow, SavedTrade, VoiceScenario } from './types';

export const TODAY = new Date(2026, 4, 27); // May 27, 2026 (anchor)

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Demo data cleared — the daily view only shows records the user enters via 記帳.
export function generateDayData(_date: Date): { flows: SavedFlow[]; trades: SavedTrade[] } {
  return { flows: [], trades: [] };
}

export const FLOW_ICONS: Record<string, string> = {
  餐飲: '🍔',
  交通: '🚕',
  生活雜貨: '🛒',
  娛樂: '🎬',
  醫療: '💊',
  住房: '🏠',
  教育: '📚',
  薪資: '💼',
  獎金: '💰',
  股利: '📈',
  紅利回饋: '🎁',
  轉帳: '↔️',
  其他: '📝',
};

export function nowStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const VOICE_SCENARIOS: VoiceScenario[] = [
  {
    intent: 'flow',
    text: '中午吃麥當勞 150 元 用信用卡 A 刷的',
    apply: { kind: 'exp', amount: '150', category: '餐飲', account: '信用卡 A', note: '麥當勞 · 午餐' },
    summary: [['類型', '支出'], ['金額', 'NT$ 150'], ['分類', '餐飲'], ['帳戶', '信用卡 A']],
  },
  {
    intent: 'stock',
    text: '買進台積電 100 股 成交價 1045',
    apply: { side: 'buy', code: '2330', name: '台積電', shares: '100', price: '1045', assetClass: '股票' },
    summary: [['方向', '買進'], ['股票', '2330 台積電'], ['股數', '100 股'], ['成交價', '1,045']],
  },
  {
    intent: 'flow',
    text: '從主要存款轉三萬塊到券商交割戶',
    apply: { kind: 'xfer', amount: '30000', category: '轉帳', fromAccount: '主要存款帳戶', toAccount: '券商交割戶', note: '加碼資金' },
    summary: [['類型', '轉帳'], ['金額', 'NT$ 30,000'], ['轉出', '主要存款帳戶'], ['轉入', '券商交割戶']],
  },
  {
    intent: 'stock',
    text: '買進美債 ETF 00679B 800 股 33',
    apply: { side: 'buy', code: '00679B', name: '元大美債20年', shares: '800', price: '33', assetClass: '債券' },
    summary: [['方向', '買進'], ['分類', '債券'], ['代號', '00679B'], ['股數', '800 股']],
  },
];
