// Single source of truth for portfolio holdings, balances & allocation.
// Consumed by accounts.jsx (display), advisor.jsx (health check) and dashboard.jsx (widget).
// All item arrays start empty — data enters only via the 記帳 feature.

window.PORTFOLIO_CLASS_META = {
  cash:  { label: '現金 / 存款', color: '#A8BD8C' },
  stock: { label: '股票',        color: '#D97757' },
  bond:  { label: '債券',        color: '#BFA176' },
  other: { label: '其他資產',    color: '#8FA86F' },
};

// Used by dashboard widget + advisor health check
window.PORTFOLIO_GROUPS = [
  { id: 'stocks', name: '股票持倉',       color: '#D97757', icon: 'TrendUp',   sign: 1, assetClass: 'stock', detail: 'holding', items: [] },
  { id: 'bonds',  name: '債券',           color: '#BFA176', icon: 'Activity',  sign: 1, assetClass: 'bond',  detail: 'holding', items: [] },
  { id: 'cash',   name: '現金',           color: '#A8BD8C', icon: 'Wallet',    sign: 1, assetClass: 'cash',  items: [] },
  { id: 'bank',   name: '銀行',           color: '#D4B87A', icon: 'Banknote',  sign: 1, assetClass: 'cash',  items: [] },
  { id: 'epay',   name: '儲值/電子支付', color: '#C5A07D', icon: 'Smartphone',sign: 1, assetClass: 'cash',  items: [] },
  { id: 'other',  name: '其他',           color: '#8FA86F', icon: 'Key',       sign: 1, assetClass: 'other', items: [] },
  { id: 'credit', name: '信用卡 (負債)',  color: '#D88770', icon: 'CreditCard',sign:-1, assetClass: 'debt',  items: [] },
];

// ─── 資產頁帳戶分類（依帳戶種類）─────────────────────────────────────────
window.ASSET_GROUPS = [
  {
    id: 'credit', name: '信用卡', icon: 'CreditCard', color: '#D88770',
    sign: -1, assetClass: 'debt',
    items: [],
  },
  {
    id: 'cash', name: '現金', icon: 'Banknote', color: '#A8BD8C',
    sign: 1, assetClass: 'cash',
    items: [],
  },
  {
    id: 'bank', name: '銀行', icon: 'Wallet', color: '#D4B87A',
    sign: 1, assetClass: 'cash',
    items: [],
  },
  {
    id: 'brokerage', name: '證券戶', icon: 'TrendUp', color: '#D97757',
    sign: 1, assetClass: 'stock',
    items: [],
  },
  {
    id: 'prepaid', name: '儲值卡', icon: 'Tag', color: '#8FA86F',
    sign: 1, assetClass: 'cash',
    items: [],
  },
  {
    id: 'epay', name: '電子支付', icon: 'Smartphone', color: '#C5A07D',
    sign: 1, assetClass: 'cash',
    items: [],
  },
  {
    id: 'other', name: '其他', icon: 'Key', color: '#BFA176',
    sign: 1, assetClass: 'other',
    items: [],
  },
];

// ─── 投資頁持倉（依投資類型）─────────────────────────────────────────────
window.INVEST_HOLDINGS = [
  { id: 'stock',      name: '股票',    color: '#D97757', items: [] },
  { id: 'bond-etf',   name: '債券ETF', color: '#BFA176', items: [] },
  { id: 'market-etf', name: '大盤ETF', color: '#A8BD8C', items: [] },
  { id: 'active-etf', name: '主動ETF', color: '#D4B87A', items: [] },
  { id: 'theme-etf',  name: '主題ETF', color: '#C5A07D', items: [] },
];

// Enrich holdings (stock/bond) with market value + P&L, resolve icons, roll up allocation.
window.computePortfolio = function computePortfolio() {
  const Icons = window.Icons || {};
  const groups = window.PORTFOLIO_GROUPS.map((g) => {
    let items = g.items;
    if (g.id === 'stocks' || g.id === 'bonds') {
      items = g.items.map((s) => {
        const amount = Math.round(s.qty * s.price);
        const pnl = (s.price - s.avg) * s.qty;
        const pct = (s.price - s.avg) / s.avg * 100;
        return {
          ...s,
          badge: g.id === 'stocks' ? s.code.slice(-2) : s.badge,
          sub: `${s.qty.toLocaleString()} 股 · 均價 ${s.avg}`,
          amount,
          extra: { pnl: Math.round(pnl), pct: pct.toFixed(1) },
        };
      });
    }
    return { ...g, Icon: Icons[g.icon], items };
  });

  const totals = { cash: 0, stock: 0, bond: 0, other: 0, debt: 0 };
  groups.forEach((g) => {
    const sum = g.items.reduce((a, x) => a + (x.amount || 0), 0);
    if (totals[g.assetClass] !== undefined) totals[g.assetClass] += sum;
  });
  const totalAssets = totals.cash + totals.stock + totals.bond + totals.other;
  const netWorth = totalAssets - totals.debt;

  const classMeta = window.PORTFOLIO_CLASS_META;
  // Guard: avoid NaN when totalAssets === 0
  const pie = Object.entries(classMeta).map(([k, m]) => ({
    key: k, label: m.label, color: m.color,
    value: totals[k] || 0,
    pct: totalAssets > 0 ? (totals[k] || 0) / totalAssets * 100 : 0,
  }));

  const pctOf = (k) => totalAssets > 0 ? (totals[k] || 0) / totalAssets * 100 : 0;
  const alloc = {
    stockPct: pctOf('stock'),
    bondPct:  pctOf('bond'),
    cashPct:  pctOf('cash'),
    otherPct: pctOf('other'),
  };

  return { groups, totals, totalAssets, netWorth, pie, classMeta, alloc };
};
