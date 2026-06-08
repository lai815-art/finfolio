import { useMemo, useRef, useState } from 'react';
import { Calendar, ArrowUpRight, ChevronRight, RefreshCw, Eye, EyeOff, TrendUp, TrendDown } from '../icons';
import CalendarSheet from '../components/CalendarSheet';
import { TODAY, dayKey, fmtMoney, generateDayData } from '../data/demo';
import { computePortfolio } from '../data/portfolio';
import type { SavedFlow, SavedTrade, Draft } from '../data/types';

type FlowEdits = Record<string, Partial<SavedFlow>>;
type TradeEdits = Record<string, Partial<SavedTrade>>;

function DateStrip({ date, onPrev, onNext, onCal, isToday }: { date: Date; onPrev: () => void; onNext: () => void; onCal: () => void; isToday: boolean }) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = `${date.getMonth() + 1}/${date.getDate()} 週${week[date.getDay()]}`;
  return (
    <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
      <button onClick={onPrev} style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)', color: 'rgba(45,36,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button onClick={onCal} style={{ flex: 1, height: 36, padding: '0 14px', borderRadius: 8, background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.25)', color: '#E89878', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16, fontWeight: 600, letterSpacing: 0.3 }}>
        <Calendar size={14} /> {isToday ? '今日 · ' : ''}
        {label}
      </button>
      <button onClick={onNext} disabled={isToday} style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)', color: isToday ? 'rgba(28,26,24,0.38)' : 'rgba(45,36,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function DailyView({
  date,
  hideAmounts,
  extraFlows = [],
  extraTrades = [],
  onEditRecord,
  recordEdits = {},
  recordDeletes = [],
}: {
  date: Date;
  hideAmounts: boolean;
  extraFlows?: SavedFlow[];
  extraTrades?: SavedTrade[];
  onEditRecord?: (d: Draft) => void;
  recordEdits?: FlowEdits & TradeEdits;
  recordDeletes?: string[];
}) {
  const mask = (v: number) => (hideAmounts ? '••••••' : fmtMoney(Math.round(v)));

  const generated = useMemo(() => generateDayData(date), [dayKey(date)]); // eslint-disable-line react-hooks/exhaustive-deps
  const dk = dayKey(date);

  const flows: SavedFlow[] = [
    ...extraFlows.map((r) => ({ ...r, _id: 's-' + r._justAdded })),
    ...generated.flows.map((r, i) => ({ ...r, _id: 'g-f-' + dk + '-' + i })),
  ]
    .filter((r) => recordDeletes.indexOf(r._id!) === -1)
    .map((r) => (recordEdits[r._id!] ? { ...r, ...(recordEdits[r._id!] as Partial<SavedFlow>) } : r));

  const trades: SavedTrade[] = [
    ...extraTrades.map((r) => ({ ...r, _id: 's-' + r._justAdded })),
    ...generated.trades.map((r, i) => ({ ...r, _id: 'g-t-' + dk + '-' + i })),
  ]
    .filter((r) => recordDeletes.indexOf(r._id!) === -1)
    .map((r) => (recordEdits[r._id!] ? { ...r, ...(recordEdits[r._id!] as Partial<SavedTrade>) } : r));

  const incTotal = flows.filter((t) => t.kind === 'inc').reduce((a, t) => a + t.amount, 0);
  const expTotal = flows.filter((t) => t.kind === 'exp').reduce((a, t) => a + t.amount, 0);
  const buyTotal = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + t.shares * t.price, 0);
  const sellTotal = trades.filter((t) => t.side === 'sell').reduce((a, t) => a + t.shares * t.price, 0);

  return (
    <div>
      {/* 收支 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(18,17,12,0.72)', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} /> 當日收支
        </div>
        <span style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: incTotal - expTotal >= 0 ? '#A8BD8C' : '#D88770' }}>
          餘額 {incTotal - expTotal >= 0 ? '+' : '-'}
          {mask(Math.abs(incTotal - expTotal))}
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { l: '收入', v: incTotal, c: '#A8BD8C', s: '+' },
          { l: '支出', v: expTotal, c: '#D88770', s: '-' },
        ].map((x) => (
          <div key={x.l} style={{ padding: '10px 12px', borderRadius: 18, background: `${x.c}14`, border: `1px solid ${x.c}33` }}>
            <div style={{ fontSize: 15, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: x.c }}>
              {x.s}
              {mask(x.v)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {flows.length === 0 && <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(45,36,32,0.4)' }}>當日無紀錄</div>}
        {flows.map((t, i, arr) => {
          const color = t.kind === 'inc' ? '#A8BD8C' : t.kind === 'xfer' ? '#C5A07D' : '#D88770';
          const sign = t.kind === 'inc' ? '+' : t.kind === 'xfer' ? '' : '-';
          const fresh = !!t._justAdded;
          return (
            <div
              key={i}
              onClick={() =>
                onEditRecord?.({
                  intent: 'flow',
                  edit: true,
                  recordId: t._id,
                  apply:
                    t.kind === 'xfer'
                      ? { kind: 'xfer', amount: String(t.amount), category: '轉帳', note: t.merchant }
                      : { kind: t.kind, amount: String(t.amount), category: t.cat, account: t.account, note: t.merchant },
                })
              }
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(28,26,24,0.12)' : 'none',
                minHeight: 64,
                background: fresh ? 'rgba(217,119,87,0.10)' : 'transparent',
                animation: fresh ? 'freshPulse 1.6s ease-out' : 'none',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: `${color}1f`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 500 }}>{t.merchant}</span>
                  {fresh && <span style={{ fontSize: 15, padding: '1px 6px', borderRadius: 26, background: 'rgba(217,119,87,0.18)', color: '#E89878', fontWeight: 600 }}>新</span>}
                  <span style={{ fontSize: 15, padding: '1px 6px', borderRadius: 26, background: 'rgba(28,26,24,0.12)', color: 'rgba(28,26,24,0.60)' }}>{t.cat}</span>
                </div>
                <div style={{ fontSize: 15, color: 'rgba(28,26,24,0.60)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.account}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                {sign}
                {mask(t.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 股票買賣 */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(18,17,12,0.72)', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpRight size={14} /> 當日股票買賣
        </div>
        <span style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: sellTotal - buyTotal >= 0 ? '#A8BD8C' : '#D88770' }}>
          餘額 {sellTotal - buyTotal >= 0 ? '+' : '-'}
          {mask(Math.abs(sellTotal - buyTotal))}
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { l: '買進金額', v: buyTotal, c: '#D88770' },
          { l: '賣出金額', v: sellTotal, c: '#A8BD8C' },
        ].map((x) => (
          <div key={x.l} style={{ padding: '10px 12px', borderRadius: 18, background: `${x.c}14`, border: `1px solid ${x.c}33` }}>
            <div style={{ fontSize: 15, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color: x.c }}>NT$ {mask(x.v)}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {trades.length === 0 && <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(45,36,32,0.4)' }}>當日無交易</div>}
        {trades.map((t, i, arr) => {
          const color = t.side === 'buy' ? '#D88770' : '#A8BD8C';
          const total = Math.round(t.shares * t.price);
          const fresh = !!t._justAdded;
          return (
            <div
              key={i}
              onClick={() => onEditRecord?.({ intent: 'stock', edit: true, recordId: t._id, apply: { side: t.side, code: t.code, name: t.name, shares: String(t.shares), price: String(t.price) } })}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(28,26,24,0.12)' : 'none',
                minHeight: 64,
                background: fresh ? 'rgba(217,119,87,0.10)' : 'transparent',
                animation: fresh ? 'freshPulse 1.6s ease-out' : 'none',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: `${color}1f`, border: `1px solid ${color}33`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>{t.side === 'buy' ? '買' : '賣'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600 }}>{t.code}</span>
                  <span style={{ fontSize: 16, color: 'rgba(45,36,32,0.7)' }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 15, color: 'rgba(28,26,24,0.60)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.shares.toLocaleString()} 股 × {t.price.toFixed(1)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                  {t.side === 'buy' ? '-' : '+'}
                  {mask(total)}
                </div>
                {t.pnl !== undefined && <div style={{ marginTop: 2, fontSize: 15, color: '#A8BD8C', fontFamily: 'JetBrains Mono, monospace' }}>已實現 +{mask(t.pnl)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardScreen({
  hideAmounts,
  setHideAmounts,
  savedFlows = [],
  savedTrades = [],
  onEditRecord,
  recordEdits = {},
  recordDeletes = [],
}: {
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
  savedFlows?: SavedFlow[];
  savedTrades?: SavedTrade[];
  onEditRecord?: (d: Draft) => void;
  recordEdits?: FlowEdits & TradeEdits;
  recordDeletes?: string[];
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState('剛剛');
  const [priceTick, setPriceTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date(TODAY));
  const [calOpen, setCalOpen] = useState(false);
  const [slideDir, setSlideDir] = useState(0);

  // Net worth comes from the shared single source of truth (matches 資產 page).
  const { totals } = computePortfolio();
  const invest0 = totals.stock + totals.bond + totals.other;
  const wob = priceTick ? Math.sin(priceTick * 1.4) * 0.006 : 0;
  const investMv = invest0 * (1 + wob);
  const cashTotal = totals.cash;
  const total = cashTotal + investMv - totals.debt;
  const unrealised = invest0 * wob;
  const mask = (v: number) => (hideAmounts ? '••••••' : fmtMoney(Math.round(v)));

  const doRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      setPriceTick((t) => t + 1);
      setRefreshedAt('剛剛');
      setRefreshing(false);
    }, 1200);
  };

  const stepDay = (delta: number) => {
    setSelectedDate((d) => {
      const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
      if (n > TODAY) return d;
      return n;
    });
    setSlideDir(delta);
  };

  const isToday = dayKey(selectedDate) === dayKey(TODAY);

  const touchRef = useRef({ x: 0, y: 0, active: false });
  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const p = 'touches' in e ? e.touches[0] : e;
    touchRef.current = { x: p.clientX, y: p.clientY, active: true };
  };
  const onTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchRef.current.active) return;
    const p = 'changedTouches' in e ? e.changedTouches[0] : e;
    const dx = p.clientX - touchRef.current.x;
    const dy = p.clientY - touchRef.current.y;
    touchRef.current.active = false;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx > 0) stepDay(-1);
      else setCalOpen(true);
    }
  };

  return (
    <div style={{ padding: '12px 18px 32px', color: '#18110C' }}>
      {/* Big total — orange hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '16px 20px 16px', background: 'linear-gradient(145deg, #E8916B 0%, #C2562F 100%)', borderRadius: 28, border: 'none', boxShadow: '0 12px 28px rgba(194, 90, 51,0.35)' }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>總資產淨值</div>
            <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700, color: '#FFFFFF', letterSpacing: -1, lineHeight: 1.05 }}>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.82)', marginRight: 4 }}>NT$</span>
              {mask(total)}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: unrealised >= 0 ? '#C2562F' : '#C25A3E', fontSize: 15, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                {unrealised >= 0 ? <TrendUp size={12} strokeWidth={2.4} /> : <TrendDown size={12} strokeWidth={2.4} />}
                {unrealised >= 0 ? '+' : '-'}NT$ {mask(Math.abs(unrealised))}
              </div>
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)' }}>未實現損益</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: -4 }}>
            <button onClick={() => setHideAmounts(!hideAmounts)} style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button onClick={doRefresh} disabled={refreshing} title={`更新 · ${refreshedAt}`} style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.92)', border: 'none', color: '#C2562F', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      <DateStrip date={selectedDate} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)} onCal={() => setCalOpen(true)} isToday={isToday} />

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onMouseDown={onTouchStart} onMouseUp={onTouchEnd} style={{ touchAction: 'pan-y', userSelect: 'none' }}>
        <div key={dayKey(selectedDate)} style={{ animation: slideDir === 0 ? 'none' : `slideIn-${slideDir > 0 ? 'right' : 'left'} 320ms cubic-bezier(0.32, 0.72, 0.18, 1)` }}>
          <DailyView
            date={selectedDate}
            hideAmounts={hideAmounts}
            onEditRecord={onEditRecord}
            recordEdits={recordEdits}
            recordDeletes={recordDeletes}
            extraFlows={savedFlows.filter((f) => dayKey(f.date) === dayKey(selectedDate))}
            extraTrades={savedTrades.filter((t) => dayKey(t.date) === dayKey(selectedDate))}
          />
        </div>
      </div>

      <CalendarSheet
        open={calOpen}
        date={selectedDate}
        onPick={(d) => {
          setSelectedDate(d);
          setCalOpen(false);
          setSlideDir(0);
        }}
        onClose={() => setCalOpen(false)}
      />
    </div>
  );
}
