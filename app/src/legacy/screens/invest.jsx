// Investment Portfolio / 投資組合（依投資類型分頁）
const { useState: useStateInv, useMemo: useMemoInv } = React;

function fmtInv(n) {return Math.round(n).toLocaleString();}

const INV_TABS = [
{ id: 'stock', label: '股票', color: TOKENS.ink2 },
{ id: 'bond-etf', label: '債券ETF', color: TOKENS.gray4 },
{ id: 'market-etf', label: '大盤ETF', color: TOKENS.green },
{ id: 'active-etf', label: '主動ETF', color: TOKENS.gray3 },
{ id: 'theme-etf', label: '主題ETF', color: TOKENS.gray3 }];


/* ─── Holding row card ───────────────────────────────────────────────── */
function HoldingCard({ item, color, mask, onOpen }) {
  const up = item.pnl >= 0;
  return (
    <div onClick={onOpen} style={{
      cursor: 'pointer',
      padding: PAD('11px 14px'), borderRadius: RS(20),
      background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', gap: SP(14)
    }}>
      <div style={{ ...{
          width: 46, height: 46, borderRadius: RS(14), flexShrink: 0,
          background: `${color}1a`, border: `1px solid ${color}33`,
          color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: FS(13), fontWeight: 700,
          textAlign: 'center', lineHeight: 1.2, padding: SP(4)
        }, borderRadius: "25px" }}>
        {(item.assetClass || item.broker || '—').slice(0, 2)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(6) }}>
          <span style={{ fontSize: FS(19), color: TOKENS.ink, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
            {item.name}
          </span>
        </div>
        <div style={{ marginTop: SP(4), display: 'flex', alignItems: 'center', gap: SP(7) }}>
          <span style={{ ...{ fontFamily: TOKENS.fontMono, fontSize: FS(16), color: 'rgba(44,44,50,0.88)', whiteSpace: 'nowrap', flexShrink: 0 }, fontSize: "15px" }}>
            {item.qty.toLocaleString()} 股
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...{ fontFamily: TOKENS.fontMono, fontSize: FS(20), fontWeight: 600, color: TOKENS.ink, height: "24px", whiteSpace: 'nowrap' }, fontSize: "16px" }}>
          {mask(item.mv)}
        </div>
        <div style={{ ...{ marginTop: SP(3), fontFamily: TOKENS.fontMono, fontSize: FS(16), fontWeight: 600,
            color: item.pnl < 0 ? TOKENS.red : TOKENS.incBlue, height: "20px", whiteSpace: 'nowrap' }, fontSize: "15px", height: "22px" }}>
          {up ? '' : '-'}{mask(Math.abs(item.pnl))}
          <span style={{ fontSize: FS(14), fontWeight: 400, opacity: 0.8, marginLeft: SP(2) }}>
            ({up ? '+' : ''}{item.pct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>);

}

/* ─── Detail sheet ───────────────────────────────────────────────────── */
function buildTrades(item) {
  const dates = ['2025/03/15 09:48', '2025/08/20 11:22', '2026/01/10 10:05'];
  const n = item.qty >= 500 ? 3 : 2;
  const base = Math.floor(item.qty / n);
  const factors = [0.88, 0.98, 1.06];
  const trades = [];
  let rem = item.qty;
  for (let i = 0; i < n; i++) {
    const shares = i === n - 1 ? rem : base;
    rem -= shares;
    const price = Math.round(item.avg * factors[i] * 10) / 10;
    const gross = shares * price;
    const fee = Math.max(1, Math.round(gross * 0.001425));
    trades.push({ date: dates[i] || dates[0], shares, price, fee });
  }
  return trades;
}

function InvestDetailSheet({ data, mask, onClose, savedTrades = [], onEditRecord, hideAmounts, revealHidden, isHidden, onToggleHidden }) {
  const { ChevronRight, TrendUp, TrendDown } = window.Icons;
  const [shown, setShown] = useStateInv(false);


  React.useEffect(() => {
    if (data) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [data]);

  if (!data) return null;

  const fmtDate = (d) => {const dt = d instanceof Date ? d : new Date(d);return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;};

  // Filter savedTrades for this stock
  const stockTrades = savedTrades.filter((t) => t.code === data.code)
    .slice().sort((a, b) => { const d = new Date(b.date) - new Date(a.date); return d !== 0 ? d : (b._justAdded || 0) - (a._justAdded || 0); });

  // Compute position purely from recorded trades (FIFO)——data.qty 已含這些交易，不可重複疊加
  let adjQty, adjCost;
  if (stockTrades.length > 0) {
    const applied = stockTrades.map((t) => {
      const shares = parseFloat(t.shares) || 0;
      const price = parseFloat(t.price) || 0;
      const gross = shares * price;
      const fee = t.fee != null ? t.fee : shares > 0 && price > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
      return { side: t.side, date: t.date, _justAdded: t._justAdded, shares, price, fee };
    }).sort((a, b) => {
      const d = new Date(a.date) - new Date(b.date);
      return d !== 0 ? d : (a._justAdded || 0) - (b._justAdded || 0);
    });
    const lots = [];
    applied.forEach((t) => {
      if (t.side === 'buy') {
        const gross = t.shares * t.price;
        const costPerShare = t.shares > 0 ? (gross + t.fee) / t.shares : t.price;
        lots.push({ qty: t.shares, price: costPerShare });
      } else {
        let left = t.shares;
        while (left > 0 && lots.length) {
          const lot = lots[0];
          const take = Math.min(lot.qty, left);
          lot.qty -= take;left -= take;
          if (lot.qty <= 0) lots.shift();
        }
      }
    });
    adjQty = applied.reduce((a, t) => a + (t.side === 'buy' ? t.shares : -t.shares), 0);
    adjCost = lots.reduce((a, l) => a + l.qty * l.price, 0);
  } else {
    adjQty = data.qty;
    adjCost = data.qty * data.avg;
  }
  const adjAvg = adjQty > 0 ? adjCost / adjQty : data.avg;
  const adjMv = Math.max(adjQty, 0) * data.price;
  const adjPnl = adjMv - adjCost;
  const adjPct = adjCost > 0 ? adjPnl / adjCost * 100 : 0;
  const up = adjPnl >= 0;
  // 非台幣個股（如美股）金額前面加上幣別代號；台幣不加。
  const cur = data.currency && data.currency !== 'TWD' ? data.currency : '';
  // 幣別代號放金額前面，但字級不超過 12（比數字小）。
  const cp = (s) => cur ? <><span style={{ fontSize: FS(12), fontWeight: 400, opacity: 0.72, marginRight: 2 }}>{cur}</span>{s}</> : s;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65, background: TOKENS.bg,
      transform: shown ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
      {/* 開發者隱藏手勢：只有「眼睛關閉」時，點右上角空白處才切換隱藏此個股（眼睛張開時不觸發） */}
      {hideAmounts &&
      <button aria-hidden onClick={() => onToggleHidden && onToggleHidden()}
      style={{ position: 'absolute', top: 'var(--ff-detail-top, 62px)', right: 0, width: 66, height: 58,
        background: 'transparent', border: 'none', padding: 0, zIndex: 6 }} />
      }
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('4px 10px 12px') }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
          background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
          color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: FS(21), fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: SP(8) }}>
            <span style={{ fontFamily: TOKENS.fontMono }}>{data.code}</span>
            <span style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.88)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</span>
            {isHidden &&
            <span style={{ flexShrink: 0, fontSize: FS(12), fontWeight: 700, color: TOKENS.red,
              background: 'rgba(184,92,74,0.14)', border: '1px solid rgba(184,92,74,0.35)',
              borderRadius: RS(8), padding: PAD('2px 7px') }}>已隱藏</span>}
          </div>
          <div style={{ fontSize: FS(16), color: 'rgba(0,0,0,0.82)', marginTop: SP(2),
            fontFamily: TOKENS.fontMono }}>
            {adjQty.toLocaleString()} 股 · {data.broker}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 10px 28px') }}>

        {/* 部位摘要 */}
        <div style={{
          padding: PAD('14px 18px'), borderRadius: RS(22), marginBottom: SP(14),
          background: TOKENS.gradDark,
          boxShadow: SH('0 8px 20px rgba(0,0,0,0.18)'),
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -35, left: -25, width: 110, height: 110,
            borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', fontSize: FS(16), color: 'rgba(255,255,255,0.78)',
            letterSpacing: 1, textTransform: 'uppercase', marginBottom: SP(10) }}>部位摘要</div>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP(8) }}>
            {[
            ['現價', '即時報價', cp(`${data.price.toLocaleString()}`)],
            ['市值', '', cp(`${mask(adjMv)}`)],
            ['均價', '', cp(`${Math.round(adjAvg).toLocaleString()}`)],
            ['成本', '含手續費', cp(`${mask(adjCost)}`)]].
            map(([label, sub, value]) =>
            <div key={label} style={{ padding: PAD('9px 12px'), borderRadius: RS(12),
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(4) }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)' }}>{label}</span>
                  {sub && <span style={{ fontSize: FS(12), color: 'rgba(255,255,255,0.42)' }}>{sub}</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TOKENS.surface, marginTop: SP(3),
                fontFamily: TOKENS.fontMono, letterSpacing: -0.2 }}>{value}</div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative', marginTop: SP(10), padding: PAD('9px 14px'), borderRadius: RS(12),
            background: 'rgba(255,255,255,0.92)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.86)' }}>
              未實現損益
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP(6),
              fontFamily: TOKENS.fontMono, fontWeight: 700,
              color: adjPnl < 0 ? TOKENS.red : TOKENS.incBlue }}>
              {up ? <TrendUp size={14} strokeWidth={2.4} /> : <TrendDown size={14} strokeWidth={2.4} />}
              <span style={{ fontSize: FS(21) }}>{cp((up ? '' : '-') + mask(Math.abs(adjPnl)))}</span>
              <span style={{ fontSize: FS(16), fontWeight: 600, opacity: 0.78 }}>({up ? '+' : ''}{adjPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* 買賣明細（來自記帳） */}
        <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.80)', letterSpacing: 1,
          textTransform: 'uppercase', margin: PAD('0 4px 8px'), display: 'flex', alignItems: 'center', gap: SP(8) }}>
          買賣明細
          {stockTrades.length > 0 &&
          <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {stockTrades.length} 筆</span>
          }

        </div>

        {stockTrades.length === 0 ?
        <div style={{ padding: PAD('20px 14px'), borderRadius: RS(18), background: TOKENS.surface,
          border: '1px solid rgba(0,0,0,0.12)', textAlign: 'center',
          fontSize: FS(17), color: 'rgba(44,44,50,0.42)', lineHeight: 1.6 }}>
            尚無記帳交易紀錄<br />
            <span style={{ fontSize: FS(16) }}>請使用底部「記帳」按鈕新增</span>
          </div> :

        <div style={{ background: TOKENS.surface, borderRadius: RS(18),
          border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            {stockTrades.map((t, i) => {
            const shares = t.shares;
            const price = t.price;
            const gross = (parseFloat(shares) || 0) * (parseFloat(price) || 0);
            const isBuy = t.side === 'buy';
            const fee = t.fee != null ? t.fee : Math.max(1, Math.round(gross * 0.001425));
            const tax = !isBuy ? t.tax != null ? t.tax : Math.round(gross * 0.003) : 0;
            const netAmt = isBuy ? gross + fee : gross - fee - tax;
            const editable = !!t._justAdded && onEditRecord;
            const openEdit = () => {
              if (!editable) return;
              onEditRecord({ intent: 'stock', edit: true,
                recordId: 's-' + t._justAdded,
                apply: { side: t.side, code: t.code, name: t.name,
                  shares: String(t.shares), price: String(t.price),
                  assetClass: t.assetClass || '股票',
                  broker: t.broker || '', settleAccount: t.settleAccount || '',
                  feeOverride: t.fee != null ? String(t.fee) : '',
                  taxOverride: t.tax != null ? String(t.tax) : '',
                  date: t.date instanceof Date ? t.date : new Date(t.date),
                  note: t.note || '' },
                text: '', summary: [] });
            };
            return (
              <div key={i} onClick={openEdit} style={{
                borderBottom: i < stockTrades.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('14px 14px'),
                cursor: editable ? 'pointer' : 'default'
              }}>
                <div style={{ ...{ width: 32, height: 32, borderRadius: RS(9), flexShrink: 0,
                    background: isBuy ? `${TOKENS.typeBuy}22` : `${TOKENS.typeSell}22`,
                    color: isBuy ? TOKENS.typeBuy : TOKENS.typeSell,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: TOKENS.fontMono, fontSize: FS(16), fontWeight: 700 }, borderRadius: "20px" }}>
                  {isBuy ? '買' : '賣'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FS(18), color: TOKENS.ink, fontFamily: TOKENS.fontMono, fontWeight: 500 }}>
                    {parseFloat(shares).toLocaleString()} 股 × {parseFloat(price).toLocaleString()}
                  </div>
                  <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.88)', marginTop: SP(1) }}>
                    {fmtDate(t.date)}
                  </div>
                </div>
                <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 600,
                  color: isBuy ? TOKENS.red : TOKENS.ink2, flexShrink: 0 }}>
                  {cp((isBuy ? '-' : '') + mask(netAmt))}
                </div>
                {editable &&
                <ChevronRight size={16} style={{ color: 'rgba(44,44,50,0.3)', flexShrink: 0, marginLeft: SP(-4) }} />
                }
              </div>);
          })}
          </div>
        }
      </div>
    </div>);

}

/* ─── Main InvestScreen ──────────────────────────────────────────────── */

function InvestScreen({ hideAmounts, onOpenDetail, savedTrades = [], computedHoldings = [], masterData = {}, pricesFetchedAt, onRefreshPrices, onOpenBreakdown }) {
  const [activeTab, setActiveTab] = useStateInv('stock');
  const [refreshing, setRefreshing] = useStateInv(false);
  const { RefreshCw } = window.Icons;

  // Drag-to-scroll for broker tab bar
  const tabBarRef = React.useRef(null);
  const dragState = React.useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const onTabBarMouseDown = (e) => {
    const el = tabBarRef.current;if (!el) return;
    dragState.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
    el.style.cursor = 'grabbing';el.style.userSelect = 'none';
  };
  const onTabBarMouseMove = (e) => {
    const ds = dragState.current;if (!ds.active) return;
    const el = tabBarRef.current;if (!el) return;
    const dx = e.pageX - ds.startX;
    if (Math.abs(dx) > 3) ds.moved = true;
    el.scrollLeft = ds.scrollLeft - dx;
  };
  const onTabBarMouseUp = () => {
    const el = tabBarRef.current;
    dragState.current.active = false;
    if (el) {el.style.cursor = 'grab';el.style.userSelect = '';}
  };

  const doRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    if (onRefreshPrices) onRefreshPrices();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const mask = (v) => hideAmounts ? '••••••' : fmtInv(v);

  const md = masterData || {};
  const TAB_COLORS_INV = [TOKENS.incBlue, TOKENS.orange, TOKENS.green, TOKENS.indigo, TOKENS.red, TOKENS.teal, TOKENS.gold2, TOKENS.gray3];

  // Flatten every holding (carry its assetClass + broker), normalising mv/cost/pnl/pct
  const allItems = computedHoldings.flatMap((g) =>
  (g.items || []).map((it) => {
    const mv = it.mv !== undefined ? it.mv : (it.qty || 0) * (it.price || 0);
    const cost = it.cost !== undefined ? it.cost : mv - (it.pnl || 0);
    const pnl = it.pnl !== undefined ? it.pnl : mv - cost;
    const pct = it.pct !== undefined ? it.pct : cost > 0 ? pnl / cost * 100 : 0;
    // 統計加總用台幣值
    const mvT = it.mvTWD !== undefined ? it.mvTWD : mv;
    const costT = it.costTWD !== undefined ? it.costTWD : cost;
    const pnlT = it.pnlTWD !== undefined ? it.pnlTWD : pnl;
    return { ...it, assetClass: g.id, mv, cost, pnl, pct, mvT, costT, pnlT };
  })
  );

  // ── Category colour map (for the overview donut: 股票/債券/… 主題) ──
  const catClasses = [...new Set([...(md.asset_class || []), ...computedHoldings.map((g) => g.id)])];
  const catColorMap = {};
  catClasses.forEach((c, i) => {catColorMap[c] = TAB_COLORS_INV[i % TAB_COLORS_INV.length];});

  // ── Tabs: 依券商分類 ──
  const settingsBrokers = (md.brokers || []).map((b) => b.name);
  const holdingBrokers = [...new Set(allItems.map((it) => it.broker).filter(Boolean))];
  const allBrokers = [...new Set([...settingsBrokers, ...holdingBrokers])];
  const dynTabs = allBrokers.length > 0 ?
  allBrokers.map((b, i) => ({ id: b, label: b, color: TAB_COLORS_INV[i % TAB_COLORS_INV.length] })) :
  [{ id: '未分類', label: '未分類', color: TOKENS.ink2 }];

  const validTab = dynTabs.find((t) => t.id === activeTab) ? activeTab : dynTabs[0]?.id || '未分類';
  const tabColor = (dynTabs.find((t) => t.id === validTab) || {}).color || TOKENS.ink2;

  // 排序：台股（代號開頭為數字）由 0→9 在前，接著美股由 A→Z。
  // 用「逐字元字串比較」而非數值比較——否則像 006208 會被當成 6208 而排到 2330 之後。
  const isTWCode = (c) => /^\d/.test(String(c || ''));
  const byCode = (a, b) => {
    const at = isTWCode(a.code), bt = isTWCode(b.code);
    if (at !== bt) return at ? -1 : 1; // 台股排在美股前面
    const ca = String(a.code || '').toUpperCase(), cb = String(b.code || '').toUpperCase();
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  };
  const items = useMemoInv(() =>
  allItems.filter((it) => (it.broker || '未分類') === validTab).slice().sort(byCode),
  [computedHoldings, validTab]
  );

  const { TrendUp, TrendDown } = window.Icons;

  // ── Whole-portfolio breakdown by category (donut overview) ──
  const catMap = {};
  allItems.forEach((it) => {
    const k = it.assetClass || '其他';
    if (!catMap[k]) catMap[k] = { id: k, name: k, mv: 0, pnl: 0, cost: 0, color: catColorMap[k] || TOKENS.gray4 };
    catMap[k].mv += it.mvT;catMap[k].pnl += it.pnlT;catMap[k].cost += it.costT;
  });
  const catTotals = Object.values(catMap).filter((c) => c.mv > 0).sort((a, b) => b.mv - a.mv);
  const portfolioMv = catTotals.reduce((a, c) => a + c.mv, 0);
  const portPnl = catTotals.reduce((a, c) => a + c.pnl, 0);
  const portCost = catTotals.reduce((a, c) => a + c.cost, 0);
  const portPct = portCost > 0 ? portPnl / portCost * 100 : 0;
  const DR = 52,DT = 14,DSIZE = (DR + DT) * 2 + 4,DC = 2 * Math.PI * DR,dcx = DSIZE / 2,dcy = DSIZE / 2;
  let _accPct = 0;
  const donutArcs = catTotals.map((c) => {
    const pct = portfolioMv > 0 ? c.mv / portfolioMv * 100 : 0;
    const len = pct / 100 * DC,off = _accPct / 100 * DC;_accPct += pct;
    return { ...c, pct, len, off };
  });

  return (
    <div style={{ color: TOKENS.ink, padding: "0px 10px 32px" }}>
      {/* ── Portfolio donut by category ── */}
      <div onClick={onOpenBreakdown} style={{ ...{
          padding: PAD('16px 18px'), borderRadius: RS(28),
          background: TOKENS.gradDark, cursor: 'pointer',
          boxShadow: SH('0 12px 28px rgba(0,0,0,0.20)'),
          position: 'relative', overflow: 'hidden'
        }, borderRadius: "14px", padding: "15px" }}>
        <div style={{ position: 'absolute', top: -40, left: -30, width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', lineHeight: "1.4" }}>
            <div style={{ fontSize: FS(17), color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase', padding: "0px 0px 0px 1px", margin: "0px" }}>
              目前市值
            </div>
            <button onClick={(e) => {e.stopPropagation();doRefresh();}} disabled={refreshing} title={pricesFetchedAt ? `${pricesFetchedAt.getHours().toString().padStart(2, '0')}:${pricesFetchedAt.getMinutes().toString().padStart(2, '0')} 更新` : '更新報價'} style={{ ...{
                width: 34, height: 34, borderRadius: RS(12), flexShrink: 0,
                background: 'rgba(255,255,255,0.92)',
                border: 'none', cursor: refreshing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms'
              }, borderRadius: "20px" }}>
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
            </button>
          </div>
          {portfolioMv === 0 ?
          <div style={{ marginTop: SP(8), fontSize: FS(18), color: 'rgba(255,255,255,0.6)' }}>
              尚無持倉，透過「記帳」→「股票買賣」新增
            </div> :

          <>
          <div style={{ marginTop: SP(4), display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(34), fontWeight: 700,
                color: TOKENS.surface, letterSpacing: -0.5 }}>
              {mask(portfolioMv)}
            </div>
            <div style={{ fontSize: FS(14), color: 'rgba(255,255,255,0.60)', flexShrink: 0, paddingBottom: SP(4) }}>查看明細 ›</div>
          </div>
          </>
          }
          {portfolioMv > 0 &&
          <div style={{ marginTop: SP(12), paddingTop: SP(10), borderTop: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: "40px", margin: "-1px 0px 0px", borderTopStyle: "solid", borderTopColor: "rgba(255, 255, 255, 0.15)", borderWidth: "0px", padding: "15px 0px 5px" }}>
              <span style={{ fontSize: FS(16), color: 'rgba(255,255,255,0.75)' }}>未實現損益</span>
              <span style={{ ...{ display: 'inline-flex', alignItems: 'center', gap: SP(5),
                padding: PAD('4px 12px'), borderRadius: RS(999), background: 'rgba(255,255,255,0.92)',
                color: portPnl < 0 ? TOKENS.red : TOKENS.incBlue, fontSize: FS(17), fontWeight: 600, fontFamily: TOKENS.fontMono, whiteSpace: 'nowrap', height: "32px" }, padding: "4px 12px" }}>
                {portPnl < 0 ? '-' : ''}{mask(Math.abs(portPnl))}
                <span style={{ opacity: 0.7, fontWeight: 400 }}>({portPnl < 0 ? '' : '+'}{portPct.toFixed(1)}%)</span>
              </span>
            </div>
          }
        </div>
      </div>

      {/* ── Tab bar (horizontal scroll + drag) ── */}
      <div
        ref={tabBarRef}
        onMouseDown={onTabBarMouseDown}
        onMouseMove={onTabBarMouseMove}
        onMouseUp={onTabBarMouseUp}
        onMouseLeave={onTabBarMouseUp}
        style={{
          marginTop: SP(12), display: 'flex', gap: SP(7), overflowX: 'auto', paddingBottom: SP(2),
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: "20px 0px 0px",
          cursor: 'grab'
        }}>
        {dynTabs.map((t) => {
          const active = t.id === validTab;
          return (
            <button key={t.id}
            onClick={(e) => {if (dragState.current.moved) {e.preventDefault();return;}setActiveTab(t.id);}}
            style={{ ...{
                flexShrink: 0, height: 38, padding: PAD('0 18px'), borderRadius: RS(20),
                background: active ? TOKENS.ink : 'rgba(0,0,0,0.08)',
                border: active ? `1px solid ${TOKENS.ink}` : '1px solid transparent',
                color: active ? TOKENS.surface : 'rgba(0,0,0,0.65)',
                fontSize: FS(17), fontWeight: active ? 600 : 500,
                whiteSpace: 'nowrap', transition: 'all 180ms'
              }, borderRadius: "11px", lineHeight: "1.35" }}>{t.label}</button>);

        })}
      </div>

      {/* ── Holdings list ── */}
      <div style={{ marginTop: SP(10), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        {items.length === 0 ?
        <div style={{ ...{ padding: PAD('28px 14px'), borderRadius: RS(20), background: TOKENS.surface,
            border: '1px solid rgba(0,0,0,0.12)', textAlign: 'center',
            fontSize: FS(17), color: 'rgba(44,44,50,0.86)', lineHeight: 1.7 }, borderRadius: "10px", background: "rgb(248, 247, 243)" }}>
            尚無 {validTab} 持倉<br />
            <span style={{ fontSize: FS(16) }}>透過底部「記帳」→「股票買賣」新增</span>
          </div> :
        items.map((item) =>
        <HoldingCard key={item.code} item={item}
        color={catColorMap[item.assetClass] || TOKENS.gray4}
        mask={mask}
        onOpen={() => onOpenDetail && onOpenDetail({ item, mask })} />
        )}
      </div>
    </div>);

}

/* ─── 投資組合明細（整頁，點上方圓餅開啟）──────────────────────── */
function InvestBreakdownSheet({ open, onClose, computedHoldings = [], masterData = {}, mask, savedTrades = [], savedFlows = [] }) {
  const { ChevronRight } = window.Icons;
  const [yearPage, setYearPage] = useStateInv(null);
  const [invTab, setInvTab] = useStateInv('alloc'); // alloc | pnl
  const [pnlExpand, setPnlExpand] = useStateInv(null); // 投資收益表展開的年份
  if (!open) return null;

  const TAB_COLORS_INV = [TOKENS.incBlue, TOKENS.orange, TOKENS.green, TOKENS.indigo, TOKENS.red, TOKENS.teal, TOKENS.gold2, TOKENS.gray3];
  const allItems = computedHoldings.flatMap((g) =>
  (g.items || []).map((it) => {
    const mvT = it.mvTWD !== undefined ? it.mvTWD : it.mv !== undefined ? it.mv : (it.qty || 0) * (it.price || 0);
    const costT = it.costTWD !== undefined ? it.costTWD : it.cost !== undefined ? it.cost : mvT - (it.pnl || 0);
    const pnlT = it.pnlTWD !== undefined ? it.pnlTWD : it.pnl !== undefined ? it.pnl : mvT - costT;
    return { ...it, assetClass: g.id, mvT, costT, pnlT };
  }));
  const catClasses = [...new Set([...(masterData.asset_class || []), ...computedHoldings.map((g) => g.id)])];
  const catColorMap = {};
  catClasses.forEach((c, i) => {catColorMap[c] = TAB_COLORS_INV[i % TAB_COLORS_INV.length];});
  const catMap = {};
  allItems.forEach((it) => {
    const k = it.assetClass || '其他';
    if (!catMap[k]) catMap[k] = { id: k, name: k, mv: 0, pnl: 0, cost: 0, color: catColorMap[k] || TOKENS.gray4 };
    catMap[k].mv += it.mvT;catMap[k].pnl += it.pnlT;catMap[k].cost += it.costT;
  });
  const catTotals = Object.values(catMap).filter((c) => c.mv > 0).sort((a, b) => b.mv - a.mv);
  const portfolioMv = catTotals.reduce((a, c) => a + c.mv, 0);
  const portPnl = catTotals.reduce((a, c) => a + c.pnl, 0);
  const portCost = catTotals.reduce((a, c) => a + c.cost, 0);
  const portPct = portCost > 0 ? portPnl / portCost * 100 : 0;

  const catData = catTotals.map((c) => ({ name: c.name, color: c.color, pct: portfolioMv > 0 ? c.mv / portfolioMv * 100 : 0 }));
  // 所有個股持倉（依市值排序）+ 每檔配色
  const holdings = allItems.filter((it) => it.mvT > 0).sort((a, b) => b.mvT - a.mvT)
  .map((h, i) => ({ ...h, color: TAB_COLORS_INV[i % TAB_COLORS_INV.length], pct: portfolioMv > 0 ? h.mvT / portfolioMv * 100 : 0 }));
  const holdingData = holdings.map((h) => ({ name: h.name || h.code, color: h.color, pct: h.pct }));
  const StatDonut = window.StatDonut;
  const assetIconName = window.assetIconName || (() => 'TrendUp');

  const cardStyle = { background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px') };
  const upColor = (v) => v < 0 ? TOKENS.red : TOKENS.incBlue;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
        <div style={{ ...{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('3px 13px 8px') }, padding: "3px 10px 8px" }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <div style={{ fontSize: FS(28), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.3 }}>投資組合明細</div>
          </div>
        </div>

        <div style={{ ...{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 32px'),
            display: 'flex', flexDirection: 'column', gap: SP(20) }, padding: "0px 10px 32px" }}>
          {/* 分頁：投資配置 / 歷年投資損益 */}
          <div style={{ display: 'flex', gap: SP(4), padding: SP(4), borderRadius: RS(18), background: 'rgba(0,0,0,0.06)' }}>
            {[['alloc', '投資配置'], ['pnl', '投資收益']].map(([id, lbl]) => {
              const on = invTab === id;
              return <button key={id} onClick={() => setInvTab(id)} style={{ flex: 1, height: 44, borderRadius: RS(14), border: 'none',
                background: on ? TOKENS.surface : 'transparent', boxShadow: on ? SH('0 2px 8px rgba(0,0,0,0.12)') : 'none',
                color: on ? TOKENS.ink : 'rgba(44,44,50,0.55)', fontSize: FS(17), fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{lbl}</button>;
            })}
          </div>

          {/* 投資配置：所有個股持倉 + 圓餅圖 */}
          {invTab === 'alloc' &&
          <div style={{ ...cardStyle, padding: PAD('20px 16px') }}>
            {holdings.length === 0 ?
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.4)', textAlign: 'center', padding: PAD('12px 0') }}>尚無持倉</div> :
            <>
              {/* 未實現損益總計：放在圓餅圖上面，一進來先看到 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('0 2px 14px') }}>
                <div style={{ flex: 1, fontSize: FS(18), fontWeight: 600, color: TOKENS.ink }}>未實現損益</div>
                <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 700, color: upColor(portPnl) }}>
                  {portPnl < 0 ? '-' : '+'}{mask(Math.abs(portPnl))} ({portPnl < 0 ? '' : '+'}{portPct.toFixed(1)}%)
                </div>
              </div>
              {StatDonut && <StatDonut data={holdingData} total={portfolioMv} label="市值" color={TOKENS.ink} mask={mask} />}
              <div style={{ marginTop: SP(14), display: 'flex', flexDirection: 'column' }}>
                {holdings.map((h, i) => {
                  return (
                  <div key={h.code + i} style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 2px'),
                    borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    {/* icon 改成顯示個股類別（如 股票 / 市值 / 債券） */}
                    <div style={{ width: 40, height: 40, borderRadius: RS(12), flexShrink: 0,
                      background: `${h.color}22`, border: `1px solid ${h.color}55`, color: h.color,
                      fontSize: FS(13), fontWeight: 700, lineHeight: 1.15, textAlign: 'center', padding: SP(2),
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(h.assetClass || '—').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name || h.code}</div>
                      <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.5)', marginTop: SP(1), fontFamily: TOKENS.fontMono }}>{h.code} · {h.pct.toFixed(1)}%</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19), fontWeight: 600, color: TOKENS.ink }}>{mask(h.mvT)}</div>
                      <div style={{ fontSize: FS(14), marginTop: SP(1), fontFamily: TOKENS.fontMono, color: upColor(h.pnlT) }}>
                        {h.pnlT < 0 ? '-' : '+'}{mask(Math.abs(h.pnlT))}
                      </div>
                    </div>
                  </div>);
                })}
              </div>
            </>
            }
          </div>
          }

          {/* 每年投資損益 / 股息 / 債息 疊加柱狀圖 */}
          {invTab === 'pnl' && (() => {
            // ── collect years ──
            const ySet = new Set();
            savedTrades.forEach((t) => {if (t.date) ySet.add(new Date(t.date).getFullYear());});
            savedFlows.forEach((f) => {if (f.date) ySet.add(new Date(f.date).getFullYear());});
            const allYears = [...ySet].sort();
            if (allYears.length === 0) return null;

            // ── 顯示最近十年，可往回看更早的（資料超過十年時）──
            const PAGE = 10;
            const needsPaging = allYears.length > PAGE;
            const totalPages = Math.ceil(allYears.length / PAGE);
            // effPage 0 = 最近五年；數字越大越往回（越早）
            const effPage = yearPage == null ? 0 : Math.min(Math.max(0, yearPage), totalPages - 1);
            const end = allYears.length - effPage * PAGE;
            const start = Math.max(0, end - PAGE);
            const years = needsPaging ? allYears.slice(start, end) : allYears;

            // ── aggregate per year ──
            // 圖表只畫視窗內的十年（years），但下方表格要能看到「所有」年份的歷史，
            // 所以彙總鍵用 allYears；圖表照樣讀 byYear[y] 即可。
            const byYear = {};
            allYears.forEach((y) => {byYear[y] = { pnl: 0, div: 0, bond: 0 };});
            savedFlows.forEach((f) => {
              if (!f.date) return;
              const y = new Date(f.date).getFullYear();
              if (!byYear[y]) return;
              const mer = f.merchant || '';
              const cat = (f.cat || '').toLowerCase();
              const note = (f.note || '').toLowerCase();
              const sign = f.kind === 'inc' ? 1 : -1;
              const rawCat = f.cat || '';
              if (mer === '投資獲利') byYear[y].pnl += f.amount;else
              if (mer === '投資損失') byYear[y].pnl -= f.amount;else
              // 相容早期匯入格式：merchant/備註標「已實現損益」的紀錄也算買賣損益（收入為正、支出為負），
              // 且要排在股息判斷之前，避免正的已實現被誤當股息灌進股息欄。
              if (/已實現損益/.test(mer + note)) byYear[y].pnl += sign * f.amount;else
              // 利息/基金/借券是一般被動收入，不屬投資收益——不能用模糊比對把「利息」吞進債息
              if (rawCat === '利息' || rawCat === '基金' || rawCat === '借券') {} else
              if (rawCat === '股息' || rawCat === '股利' || /股息|股利|配息/.test(mer + note)) byYear[y].div += sign * f.amount;else
              if (rawCat === '債息' || /債息|coupon/.test(cat + mer + note)) byYear[y].bond += sign * f.amount;
            });

            // ── chart geometry ──
            const W = 344,padL = 36,padR = 14,padT = 16,padB = 30;
            const chartW = W - padL - padR;
            const H = 210,chartH = H - padT - padB;
            const barW = Math.max(18, Math.min(36, chartW / years.length * 0.55));
            const gap = chartW / years.length;

            const maxPos = Math.max(1, ...years.map((y) => {
              const d = byYear[y];
              return Math.max(0, d.pnl) + Math.max(0, d.div) + Math.max(0, d.bond);
            }));
            const maxNeg = Math.max(1, ...years.map((y) => Math.max(0, -byYear[y].pnl)));
            const totalRange = maxPos + maxNeg;
            const zeroY = padT + chartH * (maxPos / totalRange);

            const toY = (v) => zeroY - v / totalRange * chartH;
            const fmtK = (v) => {
              const a = Math.abs(v);
              if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
              if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K';
              return String(Math.round(v));
            };

            const C_PNL_POS = TOKENS.incBlue;
            const C_PNL_NEG = TOKENS.red;
            const C_DIV = TOKENS.sageDarker;
            const C_BOND = TOKENS.gold;

            return (
              <div style={cardStyle}>
              {/* 年份切換 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingBottom: SP(12), marginBottom: SP(4), borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), minWidth: 0 }}>
                  {needsPaging &&
                  <button onClick={() => setYearPage(effPage + 1)} disabled={effPage === totalPages - 1} style={{
                    width: 26, height: 26, borderRadius: RS(8), flexShrink: 0,
                    background: TOKENS.bg, border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink,
                    opacity: effPage === totalPages - 1 ? 0.3 : 1, cursor: effPage === totalPages - 1 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="往回看更早">
                    <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  }
                  <div style={{ fontSize: FS(14), fontWeight: 700, color: 'rgba(0,0,0,0.62)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                    {needsPaging ? `${years[0]}–${years[years.length - 1]}` : '投資收益'}
                  </div>
                  {needsPaging &&
                  <button onClick={() => setYearPage(effPage - 1)} disabled={effPage === 0} style={{
                    width: 26, height: 26, borderRadius: RS(8), flexShrink: 0,
                    background: TOKENS.bg, border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink,
                    opacity: effPage === 0 ? 0.3 : 1, cursor: effPage === 0 ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="較近年份">
                    <ChevronRight size={14} />
                  </button>
                  }
                </div>
                {/* legend */}
                <div style={{ display: 'flex', gap: SP(10), alignItems: 'center', flexShrink: 0 }}>
                  {[[C_DIV, '股息'], [C_BOND, '債息'], [C_PNL_POS, '損益']].map(([c, l]) =>
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: SP(4) }}>
                    <span style={{ width: 8, height: 8, borderRadius: RS(2), background: c, flexShrink: 0 }} />
                    <span style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.7)' }}>{l}</span>
                  </div>
                    )}
                </div>
              </div>

              {/* SVG chart */}
              <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block', height: 'auto', overflow: 'visible' }}>
                {/* zero line */}
                <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
                {/* y-axis grid & labels */}
                {[maxPos, maxPos / 2, 0, -maxNeg / 2, -maxNeg].filter((v, i) => maxNeg > 0 || v >= 0).map((v, i) =>
                  <g key={i}>
                  <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
                    stroke="rgba(0,0,0,0.05)" strokeWidth={1} strokeDasharray="3 3" />
                  <text x={padL - 4} y={toY(v) + 4} textAnchor="end" fill="rgba(60,60,67,0.45)" fontSize={14}>
                    {fmtK(v)}
                  </text>
                </g>
                  )}
                {/* bars */}
                {years.map((y, i) => {
                    const d = byYear[y];
                    const cx = padL + gap * i + gap / 2;
                    const x = cx - barW / 2;
                    const bars = [];
                    // negative pnl (below zero)
                    if (d.pnl < 0) {
                      const h = Math.abs(d.pnl) / totalRange * chartH;
                      bars.push(<rect key="pnl-neg" x={x} y={zeroY} width={barW} height={h}
                      fill={C_PNL_NEG} rx={3} />);
                    }
                    // positive stacked: bond (bottom), div (mid), pnl (top)
                    let stackY = zeroY;
                    [[Math.max(0, d.bond), C_BOND], [Math.max(0, d.div), C_DIV], [Math.max(0, d.pnl), C_PNL_POS]].forEach(([v, c], si) => {
                      if (v <= 0) return;
                      const h = v / totalRange * chartH;
                      stackY -= h;
                      bars.push(<rect key={'pos-' + si} x={x} y={stackY} width={barW} height={h} fill={c} rx={si === 2 ? 3 : 0} />);
                    });
                    // year label
                    const labelY = H - padB + 14;
                    return (
                      <g key={y}>
                    {bars}
                    <text x={cx} y={labelY} textAnchor="middle" fill="rgba(60,60,67,0.6)" fontSize={14}>{years.length > 6 ? "'" + String(y).slice(2) : y}</text>
                  </g>);
                  })}
              </svg>

              {/* per-year 表：一開始只顯示 年份 + 合計，點擊展開才顯示 股息 / 債息 / 操作 */}
              {(() => {
                const { ChevronDown } = window.Icons;
                // 表格顯示「所有」年份（不受圖表十年視窗限制），由新到舊、隱藏全為 0 的年份。
                const yrsRev = allYears.slice().reverse().filter((y) => { const d = byYear[y]; return !(d.pnl === 0 && d.div === 0 && d.bond === 0); });
                const sum = { div: 0, bond: 0, pnl: 0 };
                allYears.forEach((y) => { sum.div += byYear[y].div; sum.bond += byYear[y].bond; sum.pnl += byYear[y].pnl; });
                const sumTot = sum.div + sum.bond + sum.pnl;
                const detail = (label, v, color) =>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), padding: PAD('5px 0') }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, background: color }} />
                  <span style={{ flex: 1, fontSize: FS(15), color: 'rgba(44,44,50,0.82)' }}>{label}</span>
                  <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(14), color: v < 0 ? C_PNL_NEG : v === 0 ? 'rgba(60,60,67,0.35)' : color }}>{v === 0 ? '—' : (v < 0 ? '-' : '') + mask(Math.abs(v))}</span>
                </div>;
                return (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.10)', marginTop: SP(10), paddingTop: SP(8) }}>
                  <div style={{ display: 'flex', alignItems: 'center', paddingBottom: SP(8), borderBottom: '1px solid rgba(0,0,0,0.10)' }}>
                    <div style={{ flex: 1, fontSize: FS(12), fontWeight: 700, color: 'rgba(44,44,50,0.5)' }}>年</div>
                    <div style={{ flex: 1, textAlign: 'right', fontSize: FS(12), fontWeight: 700, color: 'rgba(44,44,50,0.5)' }}>合計</div>
                    <div style={{ width: 22 }} />
                  </div>
                  {yrsRev.map((y) => {
                    const d = byYear[y];const tot = d.pnl + d.div + d.bond;const isOpen = pnlExpand === y;
                    return (
                    <div key={y}>
                      <button onClick={() => setPnlExpand(isOpen ? null : y)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: PAD('11px 0'), borderBottom: '1px solid rgba(0,0,0,0.06)', background: isOpen ? 'rgba(0,0,0,0.03)' : 'transparent', border: 'none', borderRadius: RS(6), cursor: 'pointer' }}>
                        <div style={{ flex: 1, textAlign: 'left', fontSize: FS(17), fontWeight: isOpen ? 700 : 600, color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{y}</div>
                        <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(17), fontWeight: 700, color: tot < 0 ? C_PNL_NEG : TOKENS.ink }}>{tot < 0 ? '-' : ''}{mask(Math.abs(tot))}</div>
                        <ChevronDown size={15} style={{ width: 22, flexShrink: 0, color: 'rgba(44,44,50,0.35)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                      </button>
                      {isOpen &&
                      <div style={{ padding: PAD('4px 22px 12px 6px') }}>
                        {detail('股息', d.div, C_DIV)}
                        {detail('債息', d.bond, C_BOND)}
                        {detail('操作（股票買賣損益）', d.pnl, d.pnl < 0 ? C_PNL_NEG : C_PNL_POS)}
                      </div>
                      }
                    </div>);
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: SP(11), marginTop: SP(2), borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                    <div style={{ flex: 1, fontSize: FS(16), fontWeight: 700, color: TOKENS.ink }}>總計</div>
                    <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(16), fontWeight: 700, color: sumTot < 0 ? C_PNL_NEG : TOKENS.ink }}>{sumTot < 0 ? '-' : ''}{mask(Math.abs(sumTot))}</div>
                    <div style={{ width: 22 }} />
                  </div>
                </div>);
              })()}
            </div>);
          })()}
        </div>
      </div>
    </div>);
}

window.InvestScreen = InvestScreen;
window.InvestDetailSheet = InvestDetailSheet;
window.InvestBreakdownSheet = InvestBreakdownSheet;