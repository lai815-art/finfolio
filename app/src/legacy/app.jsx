// Main App + Tab Bar (6 tabs, center FAB for 記帳 → bottom sheet)
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

/* ─── Data compute helpers ────────────────────────────────────────── */
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

function computeAccounts(accounts, settleList, flows, trades, initialBalances) {
  if (!accounts || !flows || !trades) return GID_ORDER.map((gid) => ({ ...ACCT_GROUP_META[gid], id: gid, items: [] }));
  // Merge settle accounts that aren't already in accounts list
  const allAccts = [...accounts];
  (settleList || []).forEach((s) => {
    if (!allAccts.find((a) => a.name === s.name))
    allAccts.push({ name: s.name, kind: '銀行', sub: s.sub, currency: s.currency });
  });
  const bal = {};
  allAccts.forEach((a) => {bal[a.name] = parseFloat(initialBalances[a.name]) || 0;});
  flows.forEach((f) => {
    if (f.kind === 'exp') {if (bal[f.account] !== undefined) bal[f.account] -= f.amount;} else
    if (f.kind === 'inc') {if (bal[f.account] !== undefined) bal[f.account] += f.amount;} else
    if (f.kind === 'xfer') {
      const xfee = parseFloat(f.xferFee) || 0; // 手續費由轉出帳戶額外負擔
      if (bal[f.fromAccount] !== undefined) bal[f.fromAccount] -= f.amount + xfee;
      if (bal[f.toAccount] !== undefined) bal[f.toAccount] += f.amount;
    }
  });
  trades.forEach((t) => {
    // Only buys deduct from settlement; sells are handled via auto-generated flow entries
    if (t.side !== 'buy') return;
    const sh = parseFloat(t.shares) || 0,pr = parseFloat(t.price) || 0;
    const gross = sh * pr;
    const fee = t.fee != null && t.fee > 0 ? t.fee : sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
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

const TAB_COLORS = [TOKENS.ink2, TOKENS.gray3, TOKENS.gray2, TOKENS.gray4, TOKENS.gray1, TOKENS.ink];

// 交易依時間序排序（日期→建立時間），FIFO 計算用
const tradeChrono = (a, b) => {
  const da = new Date(a.date) - new Date(b.date);
  if (da !== 0) return da;
  return (a._justAdded || 0) - (b._justAdded || 0);
};

// FIFO 消耗：從 lots 前端取 n 股，回傳取出的成本
function fifoConsume(lots, n) {
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

// 模擬即時報價：外部報價 API 在預覽環境會被 CORS 擋下，
// 取不到真實報價時，依股票代號產生穩定且合理的「現價」做為備援。
function simCurrentPrice(code, base) {
  if (!base || base <= 0) return base || 0;
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  const r = ((h >>> 0) % 1000) / 1000; // 0..1, 穩定
  const delta = (r - 0.42) * 0.18; // 約 -7.6% ~ +10.4%
  const p = base * (1 + delta);
  return base >= 100 ? Math.round(p * 10) / 10 : Math.round(p * 100) / 100;
}

function computeHoldings(trades, masterData, livePrices = {}) {
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
      const gross = sh * pr;
      const fee = t.fee != null && t.fee > 0 ? t.fee : sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
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

function StatusBar() {
  const [now, setNow] = useStateApp(() => new Date());
  useEffectApp(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div style={{
      height: 62, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: PAD('0 28px 8px'), color: TOKENS.ink, position: 'relative', zIndex: 5
    }}>
      <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: FS(20), fontWeight: 600 }}>{clock}</span>
      <div style={{ display: 'flex', gap: SP(6), alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill={TOKENS.ink}>
          <rect x="0" y="7" width="3" height="4" rx="0.7" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.7" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={TOKENS.ink} strokeWidth="1.2">
          <path d="M1 4a10 10 0 0 1 14 0M3 6a7 7 0 0 1 10 0M5 8a4 4 0 0 1 6 0" />
          <circle cx="8" cy="10" r="1" fill={TOKENS.ink} />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={TOKENS.ink} strokeOpacity="0.5" fill="none" />
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill={TOKENS.green} />
          <path d="M24 4v4c.8-.3 1.5-1.2 1.5-2s-.7-1.7-1.5-2Z" fill={TOKENS.ink} fillOpacity="0.5" />
        </svg>
      </div>
    </div>);

}

function NavHeader({ tab, onSettings, hideAmounts, setHideAmounts }) {
  const { Settings, Eye, EyeOff } = window.Icons;
  const titles = {
    dashboard: 'FinFolio',
    accounts: '資產帳戶',
    invest: '投資組合',
    advisor: 'AI 財富導師'
  };
  const headBtn = {
    borderRadius: "20px", marginBottom: SP(2), flexShrink: 0,
    background: 'rgba(0,0,0,0.09)',
    color: 'rgba(44,44,50,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: "40px", height: "40px", margin: "1px 0px 2px",
    border: "1px solid rgba(0, 0, 0, 0.12)", lineHeight: "1.5"
  };
  return (
    <div style={{ ...{ padding: PAD('6px 18px 12px'), display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }, padding: "1px 14px 5px", height: "54px" }}>
      <div style={{ fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, fontSize: FS(30), lineHeight: "1.55" }}>
        {titles[tab] || 'FinFolio'}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: SP(8) }}>
        {setHideAmounts &&
        <button onClick={() => setHideAmounts(!hideAmounts)} aria-label="切換金額顯示" style={headBtn}>
          {hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        }
        <button onClick={onSettings} style={headBtn}><Settings size={18} /></button>
      </div>
    </div>);

}

function TabBar({ tab, setTab, onVoice, onManualRecord }) {
  const { LayoutGrid, PiggyBank, Plus, Mic, Sparkles } = window.Icons;
  const pressTimer = React.useRef(null);
  const longFired = React.useRef(false);
  const [holding, setHolding] = useStateApp(false);

  const startPress = (e) => {
    e.preventDefault();
    longFired.current = false;
    setHolding(true);
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      setHolding(false);
      onVoice(); // long-press → AI voice record
    }, 450);
  };
  const endPress = () => {
    setHolding(false);
    if (pressTimer.current) {clearTimeout(pressTimer.current);pressTimer.current = null;}
    if (!longFired.current) onManualRecord(); // tap → manual record
  };
  const cancelPress = () => {
    setHolding(false);
    if (pressTimer.current) {clearTimeout(pressTimer.current);pressTimer.current = null;}
  };

  const { TrendUp: TrendUpTab } = window.Icons;
  const tabs = [
  { id: 'dashboard', label: '看板', Icon: LayoutGrid },
  { id: 'accounts', label: '資產', Icon: PiggyBank },
  { id: 'record', label: '記帳', Icon: Plus, special: true },
  { id: 'invest', label: '投資', Icon: TrendUpTab },
  { id: 'advisor', label: 'AI 顧問', Icon: Sparkles }];

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: SP(24), pointerEvents: 'none',
      background: `linear-gradient(to top, ${TOKENS.bgWarm} 55%, rgba(38,38,36,0))`
    }}>
      <div style={{ ...{
          margin: PAD('0 14px'), position: 'relative', pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: RS(26),
          border: '1px solid rgba(0,0,0,0.14)',
          boxShadow: SH('0 12px 32px rgba(0,0,0,0.12)'),
          padding: PAD('6px 6px'), display: 'flex', alignItems: 'center', gap: SP(2)
        }, borderRadius: "20px" }}>
        {tabs.map((t) => {
          if (t.special) {
            return (
              <button key={t.id}
              onPointerDown={startPress}
              onPointerUp={endPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                flex: '0 0 auto', width: 68, height: 84, borderRadius: RS(34),
                marginTop: -32, marginLeft: SP(2), marginRight: SP(2),
                background: TOKENS.gradDark,
                border: `3px solid ${TOKENS.bg}`,
                color: TOKENS.surface, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: holding ?
                '0 0 0 6px rgba(0,0,0,0.20), 0 10px 24px rgba(217, 119, 87,0.5)' :
                '0 10px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.14)',
                transform: holding ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 140ms, box-shadow 200ms',
                touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none'
              }}>
                {holding &&
                <span style={{ position: 'absolute', inset: -3, borderRadius: RS(33),
                  border: '2px solid rgba(0,0,0,0.84)',
                  animation: 'pulse 0.9s ease-out infinite' }} />
                }
                <t.Icon size={34} strokeWidth={2.4} />
                {/* mic badge — signals long-press voice record */}
                <span style={{
                  position: 'absolute', right: -5, bottom: -5,
                  width: 30, height: 30, borderRadius: RS(20),
                  background: TOKENS.surface2, border: `2px solid ${TOKENS.bgWarm}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: TOKENS.gray4
                }}>
                  <Mic size={20} strokeWidth={2.2} />
                </span>
              </button>);

          }
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...{
                flex: 1, minWidth: 0, minHeight: 70, borderRadius: RS(18),
                background: active ? TOKENS.ink2 : 'transparent',
                border: active ? `1px solid ${TOKENS.accent}` : '1px solid transparent',
                color: active ? TOKENS.surface : 'rgba(0,0,0,0.90)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: SP(3), transition: 'all 200ms', cursor: 'pointer', padding: SP(0), width: "70px"
              }, border: "1px solid rgba(255, 255, 255, 0)" }}>
              <t.Icon size={32} strokeWidth={active ? 2 : 1.6} />
              <span style={{ ...{ fontSize: FS(13), fontWeight: active ? 600 : 500, letterSpacing: 0.2 }, fontSize: "13px" }}>{t.label}</span>
            </button>);

        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: SP(8) }}>
        <div style={{ width: 134, height: 5, borderRadius: RS(100), background: 'rgba(0,0,0,0.86)' }} />
      </div>
    </div>);

}

function RecordSheet({ open, draft, onClose, onSaved, onDelete, masterData, computedHoldings }) {
  const { X, Mic, Plus, Sparkles, Pencil } = window.Icons;
  // Mount-only animation
  const [shown, setShown] = useStateApp(false);
  useEffectApp(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    } else {
      setShown(false);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: '92%',
        background: TOKENS.bg,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'),
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: PAD('8px 18px 12px')
        }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 600, color: TOKENS.ink,
              display: 'flex', alignItems: 'center', gap: SP(8) }}>
              {draft ? draft.edit ? <><Pencil size={18} /> 編輯紀錄</> : <><Sparkles size={18} /> 確認記帳內容</> : '記一筆'}
            </div>
            <div style={{ fontSize: FS(17), color: 'rgba(0,0,0,0.86)', marginTop: SP(2) }}>
              {draft ? draft.edit ? '修改欄位後儲存' : 'AI 已解析並帶入，確認後送出' : '手動填寫收支、轉帳或股票'}
            </div>
          </div>
          <button onClick={onClose} style={{ ...{
              width: 36, height: 46, borderRadius: RS(18), flexShrink: 0,
              background: 'rgba(0,0,0,0.14)', border: 'none',
              color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }, width: "40px", height: "40px", borderRadius: "18px" }}><X size={18} /></button>
        </div>
        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: SP(32) }}>
          <AccountingScreen onSaved={onSaved} onDelete={onDelete} initialDraft={draft} masterData={masterData} computedHoldings={computedHoldings} />
        </div>
      </div>
    </div>);

}

/* ============= Voice listening overlay (long-press) ============= */
// 把一句話解析成記帳草稿（語音或打字皆用）。一律回傳草稿（金額可空，讓使用者補）。
const INC_WORDS_V = ['薪水', '薪資', '獎金', '股息', '股利', '利息', '收入', '入帳', '退款', '租金', '分紅', '紅利', '中獎'];
function parseUtterance(text, masterData = {}) {
  const t = (text || '').trim();
  const nums = (t.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((s) => parseFloat(s.replace(/,/g, '')));
  const sideSell = /賣出|賣掉|賣股|出脫|賣/.test(t);
  const sideBuy = /買進|買入|買股|加碼|買/.test(t);
  const codeM = t.match(/\b\d{4,6}[A-Z]?\b/);
  if ((sideBuy || sideSell) && codeM && /股/.test(t)) {
    const code = codeM[0];
    const shM = t.match(/(\d[\d,]*)\s*股/);
    const shares = shM ? shM[1].replace(/,/g, '') : '';
    const leftover = nums.filter((n) => String(n) !== code && String(n) !== shares);
    const prM = t.match(/(?:成交價|單價|價|@)\s*(\d[\d,]*(?:\.\d+)?)/);
    const price = prM ? prM[1].replace(/,/g, '') : leftover.length ? String(leftover[leftover.length - 1]) : '';
    return { intent: 'stock', edit: false, text: t, summary: [],
      apply: { side: sideSell ? 'sell' : 'buy', code, name: '', shares: String(shares || ''), price: String(price || '') } };
  }
  const amount = nums.length ? Math.max.apply(null, nums) : '';
  const kind = INC_WORDS_V.some((w) => t.includes(w)) ? 'inc' : 'exp';
  const cats = kind === 'inc' ?
  (masterData.cat_inc || []).map((c) => typeof c === 'string' ? c : c.name) :
  (masterData.cat_exp || []).map((c) => typeof c === 'string' ? c : c.name);
  const category = (cats || []).find((c) => c && t.includes(c)) || '';
  const note = t.replace(/\d[\d,]*(?:\.\d+)?\s*(?:元|塊|\$)?/g, '').replace(/\s+/g, ' ').trim();
  return { intent: 'flow', edit: false, text: t, summary: [],
    apply: { kind, amount: String(amount), category, note } };
}

function VoiceListenOverlay({ open, onDone, onCancel, masterData }) {
  const { Mic, X, Volume, Sparkles, Check } = window.Icons;
  const [phase, setPhase] = useStateApp('listening'); // listening | parsing | typing
  const [text, setText] = useStateApp('');
  const [shown, setShown] = useStateApp(false);
  const recRef = React.useRef(null);
  const finalRef = React.useRef('');
  const doneRef = React.useRef(false);

  useEffectApp(() => {
    if (!open) {setShown(false);return;}
    setShown(true);setPhase('listening');setText('');finalRef.current = '';doneRef.current = false;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {setPhase('typing');return;} // 不支援語音 → 改用打字

    let rec;
    try {
      rec = new SR();
      rec.lang = 'zh-TW';
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        let finalT = '',interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalT += r[0].transcript;else interim += r[0].transcript;
        }
        finalRef.current = finalT;
        setText((finalT + interim).trim());
      };
      rec.onerror = () => {setPhase('typing');};
      rec.onend = () => {
        const t = (finalRef.current || '').trim();
        if (!doneRef.current && t) {finishWith(t);} else
        if (!doneRef.current) {setPhase('typing');} // 沒聽到內容 → 改打字
      };
      recRef.current = rec;
      rec.start();
    } catch (err) {setPhase('typing');}

    return () => {try {doneRef.current = true;recRef.current && recRef.current.abort();} catch {}};
  }, [open]);

  const finishWith = (t) => {
    if (doneRef.current && phase === 'parsing') return;
    doneRef.current = true;
    try {recRef.current && recRef.current.stop();} catch {}
    const v = (t || '').trim();
    if (!v) {setPhase('typing');doneRef.current = false;return;}
    setPhase('parsing');
    setTimeout(() => onDone(parseUtterance(v, masterData)), 350);
  };

  if (!open) return null;
  const isTyping = phase === 'typing';
  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: shown ? 'rgba(24,17,12,0.66)' : 'rgba(24,17,12,0)',
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      transition: 'background 220ms ease-out',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: PAD('0 28px')
    }}>
      {/* Mic orb */}
      <div style={{
        width: 116, height: 116, borderRadius: RS(60), position: 'relative',
        background: phase === 'parsing' ? TOKENS.gradSage : TOKENS.gradDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: TOKENS.surface, boxShadow: SH('0 16px 40px rgba(0,0,0,0.30)'),
        transition: 'background 300ms'
      }} onClick={(e) => e.stopPropagation()}>
        {phase === 'listening' &&
        <>
            <span style={{ position: 'absolute', inset: -14, borderRadius: RS(72),
            border: '2px solid rgba(232, 152, 120,0.55)', animation: 'pulse 1.5s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: -6, borderRadius: RS(66),
            border: '2px solid rgba(232, 152, 120,0.75)', animation: 'pulse 1.5s ease-out infinite .4s' }} />
          </>
        }
        {phase === 'parsing' ?
        <Sparkles size={44} strokeWidth={2} /> :
        <Mic size={48} strokeWidth={2} />}
      </div>

      {/* Status */}
      <div style={{ marginTop: SP(26), fontSize: FS(20), fontWeight: 600, color: TOKENS.onAccent,
        display: 'flex', alignItems: 'center', gap: SP(8) }}>
        {phase === 'parsing' ? <><Sparkles size={16} /> 解析中…</> : isTyping ? '說不出口？直接打字' : '正在聆聽…'}
      </div>

      {/* Transcript / text input */}
      <div style={{
        marginTop: SP(16), width: '100%', maxWidth: 340, minHeight: 52, padding: PAD('14px 18px'), borderRadius: RS(20),
        background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
        color: TOKENS.onAccent, fontSize: FS(20), lineHeight: 1.5, textAlign: 'center', boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6),
          fontSize: FS(17), color: 'rgba(255,246,238,0.55)', letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: SP(6) }}>
          <Volume size={12} /> {isTyping ? '輸入消費或交易' : '語音轉文字'}
        </div>
        {isTyping ?
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {if (e.key === 'Enter') finishWith(text);}}
        placeholder="例：午餐 120 / 買進 2330 1000股 1045"
        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none',
          color: TOKENS.onAccent, fontSize: FS(19), textAlign: 'center', boxSizing: 'border-box' }} /> :
        <>
            {text || <span style={{ opacity: 0.4 }}>請說出你的消費或交易…</span>}
            {phase === 'listening' &&
          <span style={{ display: 'inline-block', width: 2, height: 16, background: TOKENS.gray4,
            marginLeft: SP(2), animation: 'blink 0.8s steps(2) infinite', verticalAlign: 'text-bottom' }} />
          }
          </>
        }
      </div>

      <div style={{ marginTop: SP(14), fontSize: FS(17), color: 'rgba(255,246,238,0.5)' }}>
        {phase === 'parsing' ? '即將帶入記帳畫面' : isTyping ? '輸入後按完成' : '說完後按完成，或會自動解析'}
      </div>

      {/* Actions: 完成 + 取消 */}
      {phase !== 'parsing' &&
      <div style={{ marginTop: SP(24), display: 'flex', alignItems: 'center', gap: SP(16) }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onCancel} style={{
          width: 52, height: 52, borderRadius: RS(30),
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          color: TOKENS.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><X size={22} /></button>
        <button onClick={() => finishWith(text)} disabled={!text.trim()} style={{
          height: 52, padding: PAD('0 24px'), borderRadius: RS(30),
          background: text.trim() ? TOKENS.gradSage : 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: TOKENS.onAccent, fontSize: FS(18), fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
          opacity: text.trim() ? 1 : 0.6 }}><Check size={20} /> 完成</button>
      </div>
      }
    </div>);

}

/* ─── Settings full-screen overlay ──────────────────────────────────── */
function SettingsOverlay({ open, onClose, masterData, setMasterData, dashWidget, setDashWidget, initialBalances, setInitialBalances, savedFlows, savedTrades, setSavedFlows, setSavedTrades }) {
  const { ChevronRight } = window.Icons;
  const [shown, setShown] = useStateApp(false);
  useEffectApp(() => {
    if (open) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg,
      transform: shown ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ height: 62, flexShrink: 0 }} />
      <div style={{ ...{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('4px 16px 10px'), height: "60px" }, padding: "3px 13px 4px" }}>
        <button onClick={onClose} style={{ ...{
            width: 40, borderRadius: RS(14), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: "40px"
          }, height: "40px", width: "40px", borderRadius: "20px" }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ fontSize: FS(30), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: "1.4" }}>設定</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SettingsScreen masterData={masterData} setMasterData={setMasterData}
        dashWidget={dashWidget} setDashWidget={setDashWidget}
        savedFlows={savedFlows} savedTrades={savedTrades}
        setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
        initialBalances={initialBalances} setInitialBalances={setInitialBalances} />
      </div>
    </div>);

}

function App() {
  const [tab, setTab] = useStateApp('dashboard');
  const [, _bumpTokens] = useStateApp(0);
  useEffectApp(() => {
    const h = () => _bumpTokens((n) => n + 1);
    window.addEventListener('ff-tokens-changed', h);
    return () => window.removeEventListener('ff-tokens-changed', h);
  }, []);
  const [settingsOpen, setSettingsOpen] = useStateApp(false);
  const [statsOpen, setStatsOpen] = useStateApp(false);
  const [netWorthOpen, setNetWorthOpen] = useStateApp(false);
  const [investBreakdownOpen, setInvestBreakdownOpen] = useStateApp(false);
  const [acctDetail, setAcctDetail] = useStateApp(null);
  const [investDetail, setInvestDetail] = useStateApp(null);
  const [acctOverrides, setAcctOverrides] = useStateApp({});

  const appMask = (n) => hideAmounts ? '••••••' : Math.round(n).toLocaleString();

  const handleSaveAcctItem = (groupId, origItem, patch) => {
    const key = `${groupId}::${origItem.name}`;
    setAcctOverrides((prev) => ({ ...prev, [key]: patch }));
    setAcctDetail((prev) => prev ? { ...prev, item: { ...prev.item, ...patch } } : null);
  };

  // (computedAcctGroups and computedHoldings are declared after all state hooks below)
  const [hideAmounts, setHideAmounts] = useStateApp(() => {
    try {return localStorage.getItem('ff_hide_amounts') === 'true';} catch {return false;}
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_hide_amounts', String(hideAmounts));} catch {}
  }, [hideAmounts]);
  const [livePrices, setLivePrices] = useStateApp(() => {
    try {
      const s = JSON.parse(localStorage.getItem('ff_prices') || 'null');
      if (s && s.prices) { if (s.fx && s.fx.USD) window.FX_RATES.USD = s.fx.USD; return s.prices; }
    } catch (e) {}
    return {};
  });
  const [pricesFetchedAt, setPricesFetchedAt] = useStateApp(() => {
    try { const s = JSON.parse(localStorage.getItem('ff_prices') || 'null'); if (s && s.date) return new Date(s.date); } catch (e) {}
    return null;
  });
  const savedTradesRef = React.useRef([]);

  // Daily-close prices via the FinFolio price Worker (sends only stock codes).
  // Shows cached prices instantly; this refreshes in the background / on demand.
  // If the service is unset or unreachable, holdings fall back to the
  // transaction price (see computeHoldings).
  const fetchLivePrices = React.useCallback(async () => {
    const codes = [...new Set(
      savedTradesRef.current.filter((t) => t.code).map((t) => t.code)
    )];
    if (!codes.length) return;
    const base = window.FF_PRICE_API;
    if (!base) return; // price service not configured yet
    try {
      const res = await fetch(base + '/quotes?codes=' + encodeURIComponent(codes.join(',')));
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.fx && data.fx.USD) window.FX_RATES.USD = data.fx.USD;
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        setLivePrices((prev) => {
          const merged = { ...prev, ...data.prices };
          try { localStorage.setItem('ff_prices', JSON.stringify({ prices: merged, fx: data.fx || {}, date: data.date || null })); } catch (e) {}
          return merged;
        });
        setPricesFetchedAt(data.date ? new Date(data.date) : new Date());
      }
    } catch (e) { /* offline / blocked — keep cached prices */ }
  }, []);

  const [recordOpen, setRecordOpen] = useStateApp(false);
  const [recordDraft, setRecordDraft] = useStateApp(null);
  const [recordReturnTab, setRecordReturnTab] = useStateApp('dashboard');
  const [recordReturnAcctDetail, setRecordReturnAcctDetail] = useStateApp(null);
  const [recordReturnInvestDetail, setRecordReturnInvestDetail] = useStateApp(null);
  const [listening, setListening] = useStateApp(false);
  const [voiceTurn, setVoiceTurn] = useStateApp(0);
  const [savedFlows, setSavedFlows] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_flows');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  const [savedTrades, setSavedTrades] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_trades');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_flows', JSON.stringify(savedFlows));} catch {}
  }, [savedFlows]);
  useEffectApp(() => {
    try {localStorage.setItem('ff_trades', JSON.stringify(savedTrades));} catch {}
  }, [savedTrades]);

  // 同步 ref 並在持倉有變化時拉最新報價
  useEffectApp(() => {
    savedTradesRef.current = savedTrades;
    if (savedTrades.some((t) => t.code)) fetchLivePrices();
  }, [savedTrades]);
  const [dashWidget, setDashWidget] = useStateApp(() => {
    try {return localStorage.getItem('ff_dash_widget') || 'accounts';} catch {return 'accounts';}
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_dash_widget', dashWidget);} catch {}
  }, [dashWidget]);
  const [masterData, setMasterDataRaw] = useStateApp(() => {
    try {
      const s = localStorage.getItem('ff_master_data');
      if (s) return JSON.parse(s);
    } catch {}
    return window.DEFAULT_MASTER_DATA || {};
  });
  const setMasterData = (v) => {
    setMasterDataRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {localStorage.setItem('ff_master_data', JSON.stringify(next));} catch {}
      return next;
    });
  };
  const [recordEdits, setRecordEdits] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_record_edits');if (s) return JSON.parse(s);} catch {}
    return {};
  });
  const [recordDeletes, setRecordDeletes] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_record_deletes');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_record_edits', JSON.stringify(recordEdits));} catch {}
  }, [recordEdits]);
  useEffectApp(() => {
    try {localStorage.setItem('ff_record_deletes', JSON.stringify(recordDeletes));} catch {}
  }, [recordDeletes]);
  const [initialBalances, setInitialBalancesRaw] = useStateApp(() => {
    try {return JSON.parse(localStorage.getItem('ff_init_bal') || '{}');} catch {return {};}
  });
  const setInitialBalances = (v) => {
    const next = typeof v === 'function' ? v(initialBalances) : v;
    setInitialBalancesRaw(next);
    try {localStorage.setItem('ff_init_bal', JSON.stringify(next));} catch {}
  };

  // 動態計算：帳戶餘額與投資持倉（必須在所有 state 宣告後）
  const computedAcctGroups = useMemoApp(() =>
  computeAccounts(masterData?.accounts || [], masterData?.settle || [], savedFlows, savedTrades, initialBalances),
  [masterData, savedFlows, savedTrades, initialBalances]
  );
  const computedHoldings = useMemoApp(() =>
  computeHoldings(savedTrades, masterData, livePrices),
  [savedTrades, masterData, livePrices]
  );
  // 帳戶詳情回復：等 computedAcctGroups 更新後取最新餘額
  useEffectApp(() => {
    if (!recordReturnAcctDetail) return;
    const { groupId, itemName } = recordReturnAcctDetail;
    const freshGroup = computedAcctGroups.find((g) => g.id === groupId);
    const freshItem = freshGroup?.items.find((it) => it.name === itemName);
    if (freshGroup && freshItem) {
      setAcctDetail({ group: freshGroup, item: freshItem });
      setRecordReturnAcctDetail(null);
    }
  }, [computedAcctGroups]); // 只依賴 computedAcctGroups，避免設定時立即觸發
  // 個股詳情回復：編輯/新增後回到該個股詳情頁（取最新持倉）
  useEffectApp(() => {
    if (!recordReturnInvestDetail) return;
    const code = recordReturnInvestDetail.code;
    const item = computedHoldings.flatMap((g) => g.items).find((it) => it.code === code);
    if (item) {
      setInvestDetail({ item, mask: appMask, savedTrades });
      setRecordReturnInvestDetail(null);
    }
  }, [computedHoldings]);

  const FLOW_ICONS = {
    餐飲: '🍔', 交通: '🚕', 生活雜貨: '🛒', 娛樂: '🎬', 醫療: '💊',
    住房: '🏠', 教育: '📚', 薪資: '💼', 獎金: '💰',
    股利: '📈', 股息: '📈', 紅利回饋: '🎁', 轉帳: '↔️', 其他: '📝'
  };

  const nowStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 加 n 個營業日（跳過六日）：台股 T+2 入帳規則用
  const addBizDays = (d, n) => {
    const x = new Date(d);
    let left = n;
    while (left > 0) {
      x.setDate(x.getDate() + 1);
      const w = x.getDay();
      if (w !== 0 && w !== 6) left--;
    }
    return x;
  };

  const handleSaved = (kind, data, keepOpen) => {
    try {
      if (kind === 'flow') {
        const isXfer = data.kind === 'xfer';
        const entry = {
          kind: data.kind,
          amount: parseFloat(data.amount) || 0,
          cat: isXfer ? data.category || '轉帳' : data.category,
          merchant: data.note || (isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.category),
          account: isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.account,
          fromAccount: isXfer ? data.fromAccount : undefined,
          toAccount: isXfer ? data.toAccount : undefined,
          xferFee: isXfer ? parseFloat(data.xferFee) || 0 : undefined,
          date: data.date,
          icon: isXfer ? '↔️' : FLOW_ICONS[data.category] || (data.kind === 'inc' ? '💰' : '📝')
        };
        if (data.recordId) {
          // edit in place
          if (String(data.recordId).startsWith('s-')) {
            setSavedFlows((s) => s.map((e) => 's-' + e._justAdded === data.recordId ? { ...e, ...entry } : e));
          } else {
            setRecordEdits((m) => ({ ...m, [data.recordId]: entry }));
          }
        } else {
          setSavedFlows((s) => [{ ...entry, time: nowStr(), _justAdded: Date.now() }, ...s]);
        }
      } else if (kind === 'stock') {
        const entry = {
          side: data.side, code: data.code, name: data.name,
          shares: parseFloat(data.shares) || 0,
          price: parseFloat(data.price) || 0,
          fee: parseFloat(data.fee) || 0,
          tax: parseFloat(data.tax) || 0,
          net: parseFloat(data.net) || 0,
          broker: data.broker,
          settleAccount: data.settleAccount,
          assetClass: data.assetClass || '股票',
          date: data.date
        };

        // Build auto-gen flows for a sell trade (xfer + pnl).
        // tradeJA = the trade's _justAdded stamp used to link flows.
        // excludeRecordId = 's-XXX' of the trade being edited (to remove it from FIFO history).
        const buildSellFlows = (tradeJA, excludeRecordId) => {
          if (data.side !== 'sell' || !data.settleAccount) return [];
          const sh = parseFloat(data.shares) || 0;
          const pr = parseFloat(data.price) || 0;
          const gross = Math.round(sh * pr);
          const sellFee = data.fee != null && data.fee > 0 ? data.fee : Math.max(1, Math.round(gross * 0.001425));
          const sellTax = data.tax != null && data.tax > 0 ? data.tax : Math.round(gross * 0.003);
          const proceeds = gross - sellFee - sellTax;

          // FIFO cost basis — exclude the trade being edited from history
          const hist = savedTrades
            .filter((t) => t.code === data.code && (excludeRecordId ? ('s-' + t._justAdded !== excludeRecordId) : true))
            .slice().sort(tradeChrono);
          const lots = [];
          hist.forEach((t) => {
            const hsh = parseFloat(t.shares) || 0, hpr = parseFloat(t.price) || 0;
            const hgross = hsh * hpr;
            const hfee = t.fee != null && t.fee > 0 ? t.fee : hsh > 0 && hpr > 0 ? Math.max(1, Math.round(hgross * 0.001425)) : 0;
            const costPerShare = hsh > 0 ? (hgross + hfee) / hsh : hpr;
            if (t.side === 'buy') { lots.push({ qty: hsh, price: costPerShare }); } else { fifoConsume(lots, hsh); }
          });
          const fifo = fifoConsume(lots, sh);
          const costBasis = Math.round(fifo.cost + fifo.uncovered * pr);
          const pnl = proceeds - costBasis;
          const isTW = /^\d/.test(String(data.code || ''));
          const settleDate = isTW ? addBizDays(data.date, 2) : data.date;

          const flows = [{
            kind: 'xfer', amount: costBasis,
            fromAccount: data.broker || '__stock_position__',
            toAccount: data.settleAccount,
            account: `${data.broker || ''} → ${data.settleAccount}`,
            cat: '投資轉帳',
            merchant: data.broker || data.name || '證券戶',
            note: data.name || '',
            date: settleDate || new Date(),
            time: nowStr(), _autoGen: true,
            _linkedTradeJA: tradeJA,
            _justAdded: tradeJA + 1
          }];
          if (Math.abs(pnl) > 0) {
            const pnlNote = `${data.name} 賣出 ${parseFloat(data.price).toLocaleString()} × ${sh.toLocaleString()}股`;
            flows.push({
              kind: pnl > 0 ? 'inc' : 'exp',
              amount: Math.abs(pnl),
              account: data.settleAccount,
              cat: pnl > 0 ? '投資收入' : isTW ? '台股' : '美股',
              merchant: pnl > 0 ? '投資獲利' : '投資損失',
              note: pnlNote,
              date: settleDate || new Date(),
              time: nowStr(), _autoGen: true,
              _linkedTradeJA: tradeJA,
              _justAdded: tradeJA + 2
            });
          }
          return flows;
        };

        if (data.recordId) {
          if (String(data.recordId).startsWith('s-')) {
            const tradeJA = parseInt(data.recordId.slice(2));
            // Update the trade record
            setSavedTrades((t) => t.map((e) => 's-' + e._justAdded === data.recordId ? { ...e, ...entry } : e));
            // Regenerate linked auto-gen flows (remove old, add new)
            const newFlows = buildSellFlows(tradeJA, data.recordId);
            setSavedFlows((s) => {
              const kept = s.filter((f) => f._linkedTradeJA !== tradeJA);
              return [...newFlows, ...kept];
            });
          } else {
            setRecordEdits((m) => ({ ...m, [data.recordId]: entry }));
          }
        } else {
          const tradeJA = Date.now();
          setSavedTrades((t) => [{ ...entry, time: nowStr(), _justAdded: tradeJA }, ...t]);
          const newFlows = buildSellFlows(tradeJA, null);
          if (newFlows.length) {
            setSavedFlows((s) => [...newFlows.slice().reverse(), ...s]);
          }
        }
      }
      if (!keepOpen) {
        setRecordOpen(false);
        setRecordDraft(null);
        setTab(recordReturnTab);
        setRecordReturnTab('dashboard');
      }
    } catch (e) {
      console.error('[handleSaved crash]', e);
      alert('\u5132\u5b58\u6642\u767c\u751f\u932f\u8aa4\uff1a' + e.message);
    }
  };

  const handleDelete = (recordId) => {
    if (!recordId) return;
    if (String(recordId).startsWith('s-')) {
      const tradeJA = parseInt(recordId.slice(2));
      // Remove the trade itself
      setSavedTrades((t) => t.filter((e) => 's-' + e._justAdded !== recordId));
      // Remove linked auto-gen flows (xfer + pnl) AND the flow record itself if it's a flow
      setSavedFlows((s) => s.filter((e) =>
        's-' + e._justAdded !== recordId &&
        e._linkedTradeJA !== tradeJA
      ));
    } else {
      setRecordDeletes((d) => d.includes(recordId) ? d : [...d, recordId]);
    }
    setRecordOpen(false);
    setRecordDraft(null);
    setTab(recordReturnTab);
    setRecordReturnTab('dashboard');
  };

  return (
    <div data-screen-label={`${tab}`} style={{ ...{
        width: 402, height: 874, borderRadius: RS(56), overflow: 'hidden',
        position: 'relative', background: TOKENS.bg,
        boxShadow: SH(`0 50px 100px rgba(0,0,0,0.12), 0 0 0 12px ${TOKENS.bezel}, 0 0 0 13px ${TOKENS.bezel2}`),
        fontFamily: TOKENS.fontSans,
        color: TOKENS.ink,
        WebkitFontSmoothing: 'antialiased'
      }, background: "rgb(240, 238, 231)" }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: RS(26), background: '#000', zIndex: 50
      }} />

      <StatusBar />
      <NavHeader tab={tab} onSettings={() => setSettingsOpen(true)} hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} />

      {/* Scrollable content */}
      {tab === 'advisor' ?
      <div style={{
        position: 'absolute', top: 122, bottom: 110, left: 0, right: 0,
        display: 'flex', flexDirection: 'column'
      }}>
          <AdvisorScreen
          computedAcctGroups={computedAcctGroups}
          computedHoldings={computedHoldings}
          masterData={masterData}
          savedFlows={savedFlows}
          hideAmounts={hideAmounts}
          onRecord={(draft) => { setRecordReturnTab('advisor'); setRecordDraft(draft); setRecordOpen(true); }} />
        </div> :

      <div style={{
        position: 'absolute', top: 122, bottom: 0, left: 0, right: 0,
        overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: SP(130)
      }}>
          {tab === 'dashboard' && <DashboardScreen hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} savedFlows={savedFlows} savedTrades={savedTrades} dashWidget={dashWidget} recordEdits={recordEdits} recordDeletes={recordDeletes} onEditRecord={(d) => {setRecordReturnTab('dashboard');setRecordDraft(d);setRecordOpen(true);}} computedAcctGroups={computedAcctGroups} computedHoldings={computedHoldings} masterData={masterData} onOpenStats={() => setStatsOpen(true)} />}
          {tab === 'accounts' && <AccountsScreen hideAmounts={hideAmounts}
        computedAcctGroups={computedAcctGroups}
        computedHoldings={computedHoldings}
        savedFlows={savedFlows}
        masterData={masterData}
        onOpenNetWorth={() => setNetWorthOpen(true)}
        onOpenDetail={setAcctDetail} />}
          {tab === 'invest' && <InvestScreen hideAmounts={hideAmounts}
        computedHoldings={computedHoldings}
        savedTrades={savedTrades}
        masterData={masterData}
        pricesFetchedAt={pricesFetchedAt}
        onRefreshPrices={fetchLivePrices}
        onOpenBreakdown={() => setInvestBreakdownOpen(true)}
        onOpenDetail={(d) => setInvestDetail({ ...d, mask: appMask, savedTrades })} />}
        </div>
      }

      <TabBar tab={tab} setTab={setTab}
      onVoice={() => setListening(true)}
      onManualRecord={() => {setRecordReturnTab('dashboard');setRecordDraft(null);setRecordOpen(true);}} />
      <VoiceListenOverlay open={listening} masterData={masterData}
      onCancel={() => setListening(false)}
      onDone={(draft) => {
        setListening(false);
        setRecordDraft(draft);
        setRecordReturnTab('dashboard');
        setRecordOpen(true);
      }} />
      <RecordSheet open={recordOpen} draft={recordDraft} masterData={masterData}
      computedHoldings={computedHoldings}
      onClose={() => {
        setRecordOpen(false);
        setRecordDraft(null);
        if (recordReturnAcctDetail) {
          setTab(recordReturnTab);
          // 回到帳戶詳情：直接用現有 computedAcctGroups（關閉時沒有資料變動，不需 useEffect）
          const { groupId, itemName } = recordReturnAcctDetail;
          const g = computedAcctGroups.find((x) => x.id === groupId);
          const it = g?.items.find((x) => x.name === itemName);
          if (g && it) setAcctDetail({ group: g, item: it });
          setRecordReturnAcctDetail(null);
          setRecordReturnTab('dashboard');
        }
        if (recordReturnInvestDetail) {
          setTab(recordReturnTab);
          const code = recordReturnInvestDetail.code;
          const item = computedHoldings.flatMap((g) => g.items).find((it) => it.code === code);
          if (item) setInvestDetail({ item, mask: appMask, savedTrades });
          setRecordReturnInvestDetail(null);
          setRecordReturnTab('dashboard');
        }
      }}
      onSaved={handleSaved} onDelete={handleDelete} />
      <SettingsOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)}
      masterData={masterData} setMasterData={setMasterData}
      dashWidget={dashWidget} setDashWidget={setDashWidget}
      savedFlows={savedFlows} savedTrades={savedTrades}
      setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances} />

      {(() => {
        const StatsSheet = window.MonthlyStatsSheet;
        return StatsSheet ? <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)}
        savedFlows={savedFlows} masterData={masterData} hideAmounts={hideAmounts}
        nowDate={window.TODAY_DATE || new Date()} mask={appMask} /> : null;
      })()}
      {(() => {
        const NWSheet = window.NetWorthSheet;
        if (!NWSheet) return null;
        const nwAcct = computedAcctGroups.reduce((a, g) => {
          const s = g.items.reduce((b, it) => b + (it.amountTWD != null ? it.amountTWD : it.amount), 0);
          return a + (g.sign < 0 ? -s : s);
        }, 0);
        const nwInvest = computedHoldings.flatMap((g) => g.items).reduce((a, it) => a + (it.mvTWD != null ? it.mvTWD : it.mv || 0), 0);
        return <NWSheet open={netWorthOpen} onClose={() => setNetWorthOpen(false)}
          total={nwAcct + nwInvest} computedAcctGroups={computedAcctGroups} computedHoldings={computedHoldings}
          mask={appMask} hideAmounts={hideAmounts} />;
      })()}
      {(() => {
        const IBSheet = window.InvestBreakdownSheet;
        return IBSheet ? <IBSheet open={investBreakdownOpen} onClose={() => setInvestBreakdownOpen(false)}
          computedHoldings={computedHoldings} masterData={masterData} mask={appMask}
          savedTrades={savedTrades} savedFlows={savedFlows} /> : null;
      })()}

      {/* ── Detail sheets at phone-frame root (避免被 overflow 容器截切) ── */}
      {(() => {
        const AcctSheet = window.AccountDetailSheet;
        const InvSheet = window.InvestDetailSheet;
        return (
          <>
            {AcctSheet && acctDetail &&
            <AcctSheet data={acctDetail} mask={appMask}
            savedFlows={savedFlows} savedTrades={savedTrades}
            computedHoldings={computedHoldings}
            onClose={() => setAcctDetail(null)}
            onSaveItem={handleSaveAcctItem}
            onEditRecord={(d) => {
              const snapshot = acctDetail;
              setAcctDetail(null);
              setRecordDraft(d);
              setRecordReturnTab('accounts');
              setRecordReturnAcctDetail({ groupId: snapshot.group.id, itemName: snapshot.item.name });
              setRecordOpen(true);
            }} />}
            {InvSheet && investDetail &&
            <InvSheet data={investDetail.item}
            mask={investDetail.mask || appMask}
            savedTrades={investDetail.savedTrades || []}
            onClose={() => setInvestDetail(null)}
            onEditRecord={(d) => {
              const code = investDetail.item.code;
              setInvestDetail(null);
              setRecordDraft(d);
              setRecordReturnTab('invest');
              setRecordReturnInvestDetail({ code });
              setRecordOpen(true);
            }} />}
          </>);

      })()}
    </div>);

}

class ErrorBoundary extends React.Component {
  constructor(p) {super(p);this.state = { err: null };}
  static getDerivedStateFromError(e) {return { err: e };}
  componentDidCatch(e, info) {
    const msg = e.message + '\n\n' + (info.componentStack || '');
    localStorage.setItem('ff_debug_crash', msg);
    console.error('[ErrorBoundary]', e, info);
  }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 20, color: 'red', background: '#fff', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
        <b>Render Error:</b>{'\n'}{this.state.err.message}{'\n\n'}
        <button onClick={() => this.setState({ err: null })}>重試</button>
      </div>);

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);