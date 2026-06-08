// Investment Portfolio / 投資組合（依投資類型分頁）
const { useState: useStateInv, useMemo: useMemoInv } = React;

function fmtInv(n) { return Math.round(n).toLocaleString(); }

const INV_TABS = [
  { id: 'stock',      label: '股票',    color: '#D97757' },
  { id: 'bond-etf',   label: '債券ETF', color: '#BFA176' },
  { id: 'market-etf', label: '大盤ETF', color: '#A8BD8C' },
  { id: 'active-etf', label: '主動ETF', color: '#D4B87A' },
  { id: 'theme-etf',  label: '主題ETF', color: '#C5A07D' },
];

/* ─── Holding row card ───────────────────────────────────────────────── */
function HoldingCard({ item, color, mask, onOpen }) {
  const up = item.pnl >= 0;
  return (
    <div onClick={onOpen} style={{
      cursor: 'pointer',
      padding: '15px 16px', borderRadius: 20,
      background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: `${color}1a`, border: `1px solid ${color}33`,
        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        textAlign: 'center', letterSpacing: -0.3, lineHeight: 1.25, padding: 2,
      }}>
        {item.code.length > 5 ? item.code.slice(0, 5) : item.code}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#18110C' }}>
            {item.code}
          </span>
          <span style={{ fontSize: 15, color: 'rgba(45,36,32,0.65)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
            {item.name}
          </span>
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(45,36,32,0.50)' }}>
            {item.qty.toLocaleString()} 股
          </span>
          <span style={{ fontSize: 13, padding: '1px 6px', borderRadius: 5,
            background: 'rgba(28,26,24,0.08)', color: 'rgba(45,36,32,0.55)' }}>
            {item.broker}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600, color: '#18110C' }}>
          {mask(item.mv)}
        </div>
        <div style={{ marginTop: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
          color: up ? '#3E8E5A' : '#D88770' }}>
          {up ? '+' : '-'}{mask(Math.abs(item.pnl))}
          <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginLeft: 2 }}>
            ({up ? '+' : ''}{item.pct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
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

function InvestDetailSheet({ data, mask, onClose, savedTrades = [] }) {
  const { ChevronRight, Check, Pencil, TrendUp, TrendDown } = window.Icons;
  const [shown, setShown]           = useStateInv(false);
  const [tradeEdits, setTradeEdits] = useStateInv({});
  const [activeTrade, setActiveTrade] = useStateInv(null);
  const [editShares, setEditShares] = useStateInv('');
  const [editPrice, setEditPrice]   = useStateInv('');

  React.useEffect(() => {
    if (data) { const t = setTimeout(() => setShown(true), 20); setTradeEdits({}); setActiveTrade(null); return () => clearTimeout(t); }
    setShown(false);
  }, [data]);

  if (!data) return null;

  const fmtDate = d => { const dt = d instanceof Date ? d : new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; };

  // Filter savedTrades for this stock
  const stockTrades = savedTrades.filter(t => t.code === data.code);

  // Compute adjusted position: static holding + recorded trades
  let adjQty = data.qty;
  let adjCost = data.qty * data.avg;
  stockTrades.forEach((t, i) => {
    const ov  = tradeEdits[i] || {};
    const sh  = parseFloat(ov.shares !== undefined ? ov.shares : t.shares)  || 0;
    const pr  = parseFloat(ov.price  !== undefined ? ov.price  : t.price)   || 0;
    if (t.side === 'buy') {
      adjCost += sh * pr;
      adjQty  += sh;
    } else {
      const avgNow = adjQty > 0 ? adjCost / adjQty : 0;
      adjCost -= avgNow * sh;
      adjQty  -= sh;
    }
  });
  const adjAvg = adjQty > 0 ? adjCost / adjQty : data.avg;
  const adjMv  = Math.max(adjQty, 0) * data.price;
  const adjPnl = adjMv - adjCost;
  const adjPct = adjCost > 0 ? adjPnl / adjCost * 100 : 0;
  const up = adjPnl >= 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65, background: '#F7F2EC',
      transform: shown ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 54, flexShrink: 0 }}/>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px' }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: 14, flexShrink: 0,
          background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)',
          color: '#18110C', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }}/></button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{data.code}</span>
            <span style={{ fontSize: 15, color: 'rgba(45,36,32,0.70)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(28,26,24,0.50)', marginTop: 2,
            fontFamily: 'JetBrains Mono, monospace' }}>
            {adjQty.toLocaleString()} 股 · {data.broker}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 18px 28px' }}>

        {/* 部位摘要 */}
        <div style={{
          padding: '14px 18px', borderRadius: 22, marginBottom: 14,
          background: 'linear-gradient(145deg, #E8916B 0%, #C2562F 100%)',
          boxShadow: '0 8px 20px rgba(194,90,51,0.25)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -35, right: -25, width: 110, height: 110,
            borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }}/>
          <div style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.78)',
            letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>部位摘要</div>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['持有股數', `${adjQty.toLocaleString()} 股`],
              ['現價',     `NT$ ${data.price.toLocaleString()}`],
              ['市值',     `NT$ ${mask(adjMv)}`],
              ['均攤成本', `NT$ ${Math.round(adjAvg).toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '9px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', marginTop: 3,
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: -0.2 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', marginTop: 10, padding: '9px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.92)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.60)' }}>
              未實現損益
              {stockTrades.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, color: '#D97757',
                  background: 'rgba(217,119,87,0.12)', padding: '1px 5px', borderRadius: 4 }}>
                  含已記帳
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700,
              color: up ? '#C2562F' : '#D88770' }}>
              {up ? <TrendUp size={14} strokeWidth={2.4}/> : <TrendDown size={14} strokeWidth={2.4}/>}
              {up ? '+' : ''}{adjPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 買賣明細（來自記帳） */}
        <div style={{ fontSize: 12, color: 'rgba(28,26,24,0.48)', letterSpacing: 1,
          textTransform: 'uppercase', margin: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          買賣明細
          {stockTrades.length > 0 && (
            <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {stockTrades.length} 筆</span>
          )}
          {stockTrades.length > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(28,26,24,0.32)', textTransform: 'none', letterSpacing: 0 }}>
              點選可編輯
            </span>
          )}
        </div>

        {stockTrades.length === 0 ? (
          <div style={{ padding: '20px 18px', borderRadius: 18, background: '#FFFFFF',
            border: '1px solid rgba(28,26,24,0.12)', textAlign: 'center',
            fontSize: 14, color: 'rgba(45,36,32,0.42)', lineHeight: 1.6 }}>
            尚無記帳交易紀錄<br/>
            <span style={{ fontSize: 13 }}>請使用底部「記帳」按鈕新增</span>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 18,
            border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
            {stockTrades.map((t, i) => {
              const ov      = tradeEdits[i] || {};
              const shares  = ov.shares !== undefined ? ov.shares : t.shares;
              const price   = ov.price  !== undefined ? ov.price  : t.price;
              const gross   = (parseFloat(shares)||0) * (parseFloat(price)||0);
              const isBuy   = t.side === 'buy';
              const isActive = activeTrade === i;
              return (
                <div key={i} style={{ borderBottom: i < stockTrades.length-1 ? '1px solid rgba(28,26,24,0.09)' : 'none' }}>
                  <div onClick={() => !isActive && (setActiveTrade(i), setEditShares(String(shares)), setEditPrice(String(price)))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                      cursor: 'pointer', background: isActive ? 'rgba(217,119,87,0.06)' : 'transparent' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: isBuy ? 'rgba(216,135,112,0.15)' : 'rgba(168,189,140,0.15)',
                      color: isBuy ? '#D88770' : '#3E8E5A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>
                      {isBuy ? '買' : '賣'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: '#18110C', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
                        {parseFloat(shares).toLocaleString()} 股 × {parseFloat(price).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(45,36,32,0.45)', marginTop: 1 }}>{fmtDate(t.date)}</div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600,
                      color: isBuy ? '#D88770' : '#3E8E5A', flexShrink: 0 }}>
                      {isBuy ? '-' : '+'}{mask(gross)}
                    </div>
                    <Pencil size={12} style={{ color: 'rgba(45,36,32,0.22)', flexShrink: 0 }}/>
                  </div>
                  {isActive && (
                    <div style={{ padding: '10px 16px 14px', background: 'rgba(217,119,87,0.05)',
                      borderTop: '1px solid rgba(217,119,87,0.15)' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {[['股數', editShares, setEditShares], ['成交價', editPrice, setEditPrice]].map(([label, val, setter]) => (
                          <div key={label} style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'rgba(45,36,32,0.50)', marginBottom: 4 }}>{label}</div>
                            <input value={val} onChange={e => setter(e.target.value)} inputMode="decimal"
                              style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 10,
                                background: '#FFFFFF', border: '1px solid rgba(217,119,87,0.35)',
                                fontSize: 15, fontFamily: 'JetBrains Mono, monospace',
                                color: '#18110C', outline: 'none' }}/>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setActiveTrade(null)} style={{
                          flex: 1, height: 36, borderRadius: 10,
                          background: 'rgba(28,26,24,0.10)', border: '1px solid rgba(28,26,24,0.12)',
                          color: 'rgba(45,36,32,0.65)', fontSize: 14 }}>取消</button>
                        <button onClick={() => {
                          setTradeEdits(prev => ({ ...prev, [i]: {
                            shares: parseFloat(editShares) || parseFloat(t.shares),
                            price:  parseFloat(editPrice)  || parseFloat(t.price),
                          }}));
                          setActiveTrade(null);
                        }} style={{
                          flex: 2, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, #E89878, #D97757)',
                          border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}><Check size={14} strokeWidth={2.5}/> 儲存</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main InvestScreen ──────────────────────────────────────────────── */

function InvestScreen({ hideAmounts, onOpenDetail, savedTrades = [] }) {
  const [activeTab, setActiveTab] = useStateInv('stock');

  const mask = v => hideAmounts ? '••••••' : fmtInv(v);
  const allGroups = window.INVEST_HOLDINGS || [];
  const group = allGroups.find(g => g.id === activeTab) || { items: [], color: '#D97757', name: '' };
  const tabColor = group.color;

  const items = useMemoInv(() => {
    return group.items.map(item => {
      const mv   = item.qty * item.price;
      const cost = item.qty * item.avg;
      const pnl  = mv - cost;
      const pct  = cost > 0 ? pnl / cost * 100 : 0;
      return { ...item, mv, cost, pnl, pct };
    });
  }, [activeTab]);

  const totalMv   = items.reduce((a, x) => a + x.mv, 0);
  const totalPnl  = items.reduce((a, x) => a + x.pnl, 0);
  const totalCost = items.reduce((a, x) => a + x.cost, 0);
  const totalPct  = totalCost > 0 ? totalPnl / totalCost * 100 : 0;
  const up = totalPnl >= 0;
  const { TrendUp, TrendDown } = window.Icons;

  return (
    <div style={{ padding: '4px 18px 32px', color: '#18110C' }}>
      {/* ── Tab bar (horizontal scroll) ── */}
      <div style={{
        display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {INV_TABS.map(t => {
          const active = t.id === activeTab;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setDetail(null); }} style={{
              flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 20,
              background: active ? t.color : 'rgba(28,26,24,0.08)',
              border: active ? `1px solid ${t.color}` : '1px solid transparent',
              color: active ? '#FFFFFF' : 'rgba(45,36,32,0.65)',
              fontSize: 15, fontWeight: active ? 600 : 500,
              whiteSpace: 'nowrap', transition: 'all 180ms',
            }}>{t.label}</button>
          );
        })}
      </div>

      {/* ── Summary card ── */}
      <div style={{
        marginTop: 14, padding: '18px 20px', borderRadius: 28,
        background: 'linear-gradient(145deg, #E8916B 0%, #C2562F 100%)',
        boxShadow: '0 12px 28px rgba(194,90,51,0.30)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {group.name} · 總市值
          </div>
          <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 30, fontWeight: 700,
            color: '#FFFFFF', letterSpacing: -0.5 }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', marginRight: 4 }}>NT$</span>
            {mask(totalMv)}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              color: up ? '#C2562F' : '#D88770',
              fontSize: 15, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
            }}>
              {up ? <TrendUp size={13} strokeWidth={2.4}/> : <TrendDown size={13} strokeWidth={2.4}/>}
              {up ? '+' : '-'}NT$ {mask(Math.abs(totalPnl))}
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
              {up ? '+' : ''}{totalPct.toFixed(1)}% 未實現
            </span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            {[
              { label: '持倉數', value: `${items.length} 檔` },
              { label: '成本',   value: `NT$ ${mask(totalCost)}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, padding: '8px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginTop: 2,
                  fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Holdings list ── */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: '28px 18px', borderRadius: 20, background: '#FFFFFF',
            border: '1px solid rgba(28,26,24,0.12)', textAlign: 'center',
            fontSize: 14, color: 'rgba(45,36,32,0.40)', lineHeight: 1.7 }}>
            尚無 {group.name} 持倉<br/>
            <span style={{ fontSize: 13 }}>透過底部「記帳」→「股票買賣」新增</span>
          </div>
        ) : items.map(item => (
          <HoldingCard key={item.code} item={item} color={tabColor} mask={mask}
            onOpen={() => onOpenDetail && onOpenDetail({ item, mask })}/>
        ))}
      </div>
    </div>
  );
}

window.InvestScreen = InvestScreen;
window.InvestDetailSheet = InvestDetailSheet;
