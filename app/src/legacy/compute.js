/* ─── Data compute helpers ────────────────────────────────────────── */
// Pure calculation logic only — no React/DOM. Extracted out of app.jsx so
// it can be unit-tested without pulling in the ReactDOM.createRoot(...)
// mount call that lives at the bottom of that file. Still relies on the
// bare `window.*` globals set up by public/tokens.js (fxToTWD, floorAmt,
// calcAutoFee, buildCurMap) and `TOKENS`, same as the rest of the legacy code.

const KIND_TO_GID = {
  '銀行': 'bank', '信用卡': 'credit', '現金': 'cash',
  '電子支付': 'epay', '儲值卡': 'prepaid', '交割戶': 'bank', '證券戶': 'brokerage', '其他': 'other'
};
const ACCT_GROUP_META = {
  credit: { name: '信用卡', icon: 'CreditCard', color: TOKENS.catCredit, sign: -1, assetClass: 'debt' },
  cash: { name: '現金', icon: 'Banknote', color: TOKENS.catCash, sign: 1, assetClass: 'cash' },
  bank: { name: '銀行', icon: 'Wallet', color: TOKENS.catBank, sign: 1, assetClass: 'cash' },
  brokerage: { name: '證券戶', icon: 'TrendUp', color: TOKENS.catBrokerage, sign: 1, assetClass: 'stock' },
  prepaid: { name: '儲值卡', icon: 'Tag', color: TOKENS.catPrepaid, sign: 1, assetClass: 'cash' },
  epay: { name: '電子支付', icon: 'Smartphone', color: TOKENS.catEpay, sign: 1, assetClass: 'cash' },
  other: { name: '其他', icon: 'Key', color: TOKENS.catOther, sign: 1, assetClass: 'other' }
};
const GID_ORDER = ['credit', 'cash', 'bank', 'brokerage', 'prepaid', 'epay', 'other'];

export function computeAccounts(accounts, settleList, flows, trades, initialBalances) {
  if (!accounts || !flows || !trades) return GID_ORDER.map((gid) => ({ ...ACCT_GROUP_META[gid], id: gid, items: [] }));
  // Merge settle accounts that aren't already in accounts list
  const allAccts = [...accounts];
  (settleList || []).forEach((s) => {
    if (!allAccts.find((a) => a.name === s.name))
    allAccts.push({ name: s.name, kind: '銀行', sub: s.sub, currency: s.currency });
  });
  const bal = {};
  allAccts.forEach((a) => {bal[a.name] = parseFloat(initialBalances[a.name]) || 0;});
  // 未來日期的支出／收入／轉帳先不預先計入現有資產，等日期到了（<= 今天）才帶入餘額。
  const today = window.TODAY_DATE || new Date();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const isDue = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt) || dt <= todayEnd; // 日期解析失敗時不擋（保留舊資料相容）
  };
  flows.forEach((f) => {
    if (!isDue(f.date)) return;
    if (f.kind === 'exp') {if (bal[f.account] !== undefined) bal[f.account] -= f.amount;} else
    if (f.kind === 'inc') {if (bal[f.account] !== undefined) bal[f.account] += f.amount;} else
    if (f.kind === 'xfer') {
      const xfee = parseFloat(f.xferFee) || 0; // 手續費由轉出帳戶額外負擔
      if (bal[f.fromAccount] !== undefined) bal[f.fromAccount] -= f.amount + xfee;
      if (bal[f.toAccount] !== undefined) bal[f.toAccount] += f.amount;
    }
  });
  // 新版買進會自動產生 T+2「投資轉帳」流水從交割戶扣款（與賣出對稱），扣款改由該流水處理；
  // 這些買進在此不可再直接扣款，否則雙重扣。舊資料的買進沒有流水，仍走下面的即時扣款。
  const buyXferJAs = new Set(flows.filter((f) => f._buyXfer).map((f) => f._linkedTradeJA));
  trades.forEach((t) => {
    // Only buys deduct from settlement; sells are handled via auto-generated flow entries
    if (t.side !== 'buy') return;
    if (buyXferJAs.has(t._justAdded)) return; // 已有自動投資轉帳流水 → 扣款由流水負責（T+2）
    const sh = parseFloat(t.shares) || 0,pr = parseFloat(t.price) || 0;
    const gross = window.floorAmt(sh * pr);
    const fee = t.fee != null && t.fee > 0 ? t.fee : window.calcAutoFee(gross, sh, 0.1425, 1);
    const debit = t.net != null && t.net > 0 ? t.net : gross + fee;
    const broker = t.settleAccount || t.broker;
    if (broker && bal[broker] !== undefined) bal[broker] -= debit;
  });
  const groups = {};
  GID_ORDER.forEach((gid) => {groups[gid] = { ...ACCT_GROUP_META[gid], id: gid, items: [] };});
  accounts.forEach((a) => {
    const gid = KIND_TO_GID[a.kind] || 'other';
    const cur = a.currency || 'TWD';
    // 信用卡等負債群組：餘額以「應繳金額」正值表示（消費 → 增加欠款）
    const raw = bal[a.name] || 0;
    const amt = ACCT_GROUP_META[gid].sign < 0 ? -raw : raw;
    groups[gid].items.push({ name: a.name, sub: a.sub || a.kind, amount: amt,
      currency: cur, amountTWD: window.fxToTWD(amt, cur), badge: a.name.slice(0, 2) });
  });
  // Settle accounts not in the accounts list are bank-side 交割戶 → list them with 銀行
  (settleList || []).forEach((s) => {
    if (!accounts.find((a) => a.name === s.name)) {
      const cur = s.currency || 'TWD';
      groups['bank'].items.push({ name: s.name, sub: s.sub || '交割戶', amount: bal[s.name] || 0,
        currency: cur, amountTWD: window.fxToTWD(bal[s.name] || 0, cur), badge: s.name.slice(0, 2) });
    }
  });
  return GID_ORDER.map((gid) => groups[gid]);
}

// 交易依時間序排序（日期→建立時間），FIFO 計算用
export const tradeChrono = (a, b) => {
  const da = new Date(a.date) - new Date(b.date);
  if (da !== 0) return da;
  return (a._justAdded || 0) - (b._justAdded || 0);
};

// FIFO 消耗：從 lots 前端取 n 股，回傳取出的成本
export function fifoConsume(lots, n) {
  let left = n,cost = 0;
  while (left > 0 && lots.length) {
    const lot = lots[0];
    const take = Math.min(lot.qty, left);
    cost += take * lot.price;
    lot.qty -= take;left -= take;
    if (lot.qty <= 0) lots.shift();
  }
  return { cost, uncovered: left };
}

// 證交稅率依股票類型：一般股票 0.3% / 當沖 0.15% / 一般 ETF・權證 0.1% / 原型債券 ETF・公司債 0%。
export const TAX_RATES = [
  { r: 0.003, label: '一般 0.3%' },
  { r: 0.0015, label: '當沖 0.15%' },
  { r: 0.001, label: 'ETF 0.1%' },
  { r: 0, label: '免稅 0%' },
];

// 依「股票類別」給預設值：債券型→0%、其它 ETF 型→0.1%、美股(無台灣證交稅)→0%、個股→0.3%。
export function defaultTaxRate(assetClass) {
  const s = String(assetClass || '');
  if (/債/.test(s)) return 0;
  if (s === '美股') return 0;
  if (/型$/.test(s) || /ETF/i.test(s) || /權證/.test(s)) return 0.001;
  return 0.003;
}

// StockForm 的手續費／證交稅試算——抽成純函式（無 React）方便單元測試。
// 手續費：依所選券商設定，費率預設 0.1425%，折扣以「折」表示（6 = 六折，空白/10 = 無折扣）。
// 手續費／證交稅一旦被使用者手動修改（含清空成空字串）就以其輸入為準，null 才代表沿用自動試算。
export function computeStockTrade({ side, shares, price, brokerObj, assetClass, feeOverride, taxOverride, taxRateMode }) {
  const sh = parseFloat(shares) || 0;
  const pr = parseFloat(price) || 0;
  const gross = window.floorAmt(sh * pr);
  const feeRate = brokerObj && brokerObj.feeRate != null && String(brokerObj.feeRate).trim() !== '' ? parseFloat(brokerObj.feeRate) : 0.1425;
  const feeDisc = brokerObj && brokerObj.discount != null && String(brokerObj.discount).trim() !== '' ? parseFloat(brokerObj.discount) : 10;
  const feeMult = feeDisc > 0 && feeDisc <= 10 ? feeDisc / 10 : 1;
  const autoFee = sh > 0 && pr > 0 ? window.calcAutoFee(gross, sh, feeRate, feeMult) : 0;
  const feeOverridden = feeOverride != null;
  const fee = feeOverridden ? (Math.floor(parseFloat(feeOverride)) || 0) : autoFee;
  const taxRate = side === 'sell' ? (taxRateMode != null ? taxRateMode : defaultTaxRate(assetClass)) : 0;
  const autoTax = side === 'sell' ? window.calcAutoTax(gross, taxRate) : 0;
  const taxOverridden = side === 'sell' && taxOverride != null;
  const tax = taxOverridden ? (Math.floor(parseFloat(taxOverride)) || 0) : autoTax;
  const net = side === 'buy' ? gross + fee : gross - fee - tax;
  return { gross, feeRate, feeDisc, feeMult, autoFee, fee, feeOverridden, taxRate, autoTax, tax, taxOverridden, net };
}

export function computeHoldings(trades, masterData, livePrices = {}) {
  if (!trades) return [];
  const curMap = window.buildCurMap(masterData);
  const stocks = {};
  trades.slice().sort(tradeChrono).forEach((t) => {
    if (!t.code) return;
    if (!stocks[t.code]) stocks[t.code] = {
      code: t.code, name: t.name || t.code, qty: 0, lots: [],
      assetClass: t.assetClass || '股票', broker: t.broker || t.settleAccount || '',
      lastPrice: parseFloat(t.price) || 0
    };
    const s = stocks[t.code];
    const sh = parseFloat(t.shares) || 0,pr = parseFloat(t.price) || 0;
    if (t.side === 'buy') {
      const gross = window.floorAmt(sh * pr);
      // 有明確記錄手續費就採用（含 0，匯入資料的成本已內含費用）；只有完全沒有 fee 欄位
      // 的舊資料才回頭推算，避免對已含費用的成本再加一次手續費、灌大成本。
      const fee = t.fee != null ? t.fee : window.calcAutoFee(gross, sh, 0.1425, 1);
      const costPerShare = sh > 0 ? (gross + fee) / sh : pr;
      s.lots.push({ qty: sh, price: costPerShare });
      s.qty += sh;
    } else {fifoConsume(s.lots, sh);s.qty -= sh;}
    s.lastPrice = pr;
    if (t.assetClass) s.assetClass = t.assetClass;
  });
  // Group dynamically by assetClass
  const groups = {};
  Object.values(stocks).forEach((s) => {
    if (s.qty <= 0) return;
    const totalCost = s.lots.reduce((a, l) => a + l.qty * l.price, 0);
    const key = s.assetClass || '股票';
    if (!groups[key]) groups[key] = { id: key, name: key, items: [] };
    const avg = s.qty > 0 ? totalCost / s.qty : 0;
    const price = livePrices[s.code] || s.lastPrice || 0,mv = s.qty * price,pnl = mv - totalCost;
    const cur = curMap[s.broker] || 'TWD';
    groups[key].items.push({
      code: s.code, name: s.name,
      qty: Math.round(s.qty * 1000) / 1000, avg: Math.round(avg * 10) / 10,
      price, mv: Math.round(mv), pnl: Math.round(pnl),
      currency: cur,
      mvTWD: Math.round(window.fxToTWD(mv, cur)),
      costTWD: Math.round(window.fxToTWD(totalCost, cur)),
      pnlTWD: Math.round(window.fxToTWD(pnl, cur)),
      pct: totalCost > 0 ? pnl / totalCost * 100 : 0, broker: s.broker
    });
  });
  return Object.values(groups);
}
