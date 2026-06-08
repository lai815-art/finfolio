import { useMemo, useRef, useState } from 'react';
import { Calendar, ArrowUpRight, ChevronRight, RefreshCw, Eye, EyeOff, TrendUp, TrendDown } from '../icons';
import CalendarSheet from '../components/CalendarSheet';
import {
  TODAY,
  dayKey,
  fmtMoney,
  generateDayData,
  type DayFlow,
  type DayTrade,
} from '../data/demo';

function DateStrip({
  date,
  onPrev,
  onNext,
  onCal,
  isToday,
}: {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onCal: () => void;
  isToday: boolean;
}) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = `${date.getMonth() + 1}/${date.getDate()} 週${week[date.getDay()]}`;
  return (
    <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
      <button
        onClick={onPrev}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: 'rgba(28,26,24,0.12)',
          border: '1px solid rgba(28,26,24,0.14)',
          color: 'rgba(45,36,32,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button
        onClick={onCal}
        style={{
          flex: 1,
          height: 36,
          padding: '0 14px',
          borderRadius: 8,
          background: 'rgba(217,119,87,0.12)',
          border: '1px solid rgba(217,119,87,0.25)',
          color: '#E89878',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        <Calendar size={14} /> {isToday ? '今日 · ' : ''}
        {label}
      </button>
      <button
        onClick={onNext}
        disabled={isToday}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: 'rgba(28,26,24,0.12)',
          border: '1px solid rgba(28,26,24,0.14)',
          color: isToday ? 'rgba(28,26,24,0.38)' : 'rgba(45,36,32,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
}: {
  date: Date;
  hideAmounts: boolean;
  extraFlows?: DayFlow[];
  extraTrades?: DayTrade[];
}) {
  const mask = (v: number) => (hideAmounts ? '••••••' : fmtMoney(Math.round(v)));

  const generated = useMemo(() => generateDayData(date), [dayKey(date)]); // eslint-disable-line react-hooks/exhaustive-deps
  const flows = [...extraFlows, ...generated.flows];
  const trades = [...extraTrades, ...generated.trades];

  const incTotal = flows.filter((t) => t.kind === 'inc').reduce((a, t) => a + t.amount, 0);
  const expTotal = flows.filter((t) => t.kind === 'exp').reduce((a, t) => a + t.amount, 0);
  const buyTotal = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + t.shares * t.price, 0);
  const sellTotal = trades.filter((t) => t.side === 'sell').reduce((a, t) => a + t.shares * t.price, 0);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <div>
      {/* 收支 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            color: 'rgba(18,17,12,0.72)',
            fontSize: 14,
            letterSpacing: 1,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Calendar size={14} /> 當日收支
        </div>
        <span style={{ fontSize: 14, color: 'rgba(45,36,32,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
          {dateStr} · {flows.length} 筆
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { l: '收入', v: incTotal, c: '#A8BD8C', s: '+' },
          { l: '支出', v: expTotal, c: '#D88770', s: '-' },
        ].map((x) => (
          <div key={x.l} style={{ padding: '10px 12px', borderRadius: 14, background: `${x.c}14`, border: `1px solid ${x.c}33` }}>
            <div style={{ fontSize: 14, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, color: x.c }}>
              {x.s}
              {mask(x.v)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 14, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {flows.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(45,36,32,0.4)' }}>當日無紀錄</div>
        )}
        {flows.map((t, i, arr) => {
          const color = t.kind === 'inc' ? '#A8BD8C' : t.kind === 'xfer' ? '#C5A07D' : '#D88770';
          const sign = t.kind === 'inc' ? '+' : t.kind === 'xfer' ? '' : '-';
          const fresh = !!t._justAdded;
          return (
            <div
              key={i}
              style={{
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
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: `${color}1f`,
                  border: `1px solid ${color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {t.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{t.merchant}</span>
                  {fresh && (
                    <span style={{ fontSize: 14, padding: '1px 6px', borderRadius: 20, background: 'rgba(217,119,87,0.18)', color: '#E89878', fontWeight: 600 }}>
                      新
                    </span>
                  )}
                  <span style={{ fontSize: 14, padding: '1px 6px', borderRadius: 20, background: 'rgba(28,26,24,0.12)', color: 'rgba(28,26,24,0.60)' }}>{t.cat}</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.account}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                {sign}
                {mask(t.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 股票買賣 */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            color: 'rgba(18,17,12,0.72)',
            fontSize: 14,
            letterSpacing: 1,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ArrowUpRight size={14} /> 當日股票買賣
        </div>
        <span style={{ fontSize: 14, color: 'rgba(45,36,32,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
          {dateStr} · {trades.length} 筆
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { l: '買進金額', v: buyTotal, c: '#D88770' },
          { l: '賣出金額', v: sellTotal, c: '#A8BD8C' },
        ].map((x) => (
          <div key={x.l} style={{ padding: '10px 12px', borderRadius: 14, background: `${x.c}14`, border: `1px solid ${x.c}33` }}>
            <div style={{ fontSize: 14, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, color: x.c }}>NT$ {mask(x.v)}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 14, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {trades.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 14, color: 'rgba(45,36,32,0.4)' }}>當日無交易</div>
        )}
        {trades.map((t, i, arr) => {
          const color = t.side === 'buy' ? '#D88770' : '#A8BD8C';
          const total = Math.round(t.shares * t.price);
          const fresh = !!t._justAdded;
          return (
            <div
              key={i}
              style={{
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
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: `${color}1f`,
                  border: `1px solid ${color}33`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {t.side === 'buy' ? '買' : '賣'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600 }}>{t.code}</span>
                  <span style={{ fontSize: 15, color: 'rgba(45,36,32,0.7)' }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.shares.toLocaleString()} 股 × {t.price.toFixed(1)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                  {t.side === 'buy' ? '-' : '+'}
                  {mask(total)}
                </div>
                {t.pnl !== undefined && (
                  <div style={{ marginTop: 2, fontSize: 14, color: '#A8BD8C', fontFamily: 'JetBrains Mono, monospace' }}>已實現 +{mask(t.pnl)}</div>
                )}
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
}: {
  hideAmounts: boolean;
  setHideAmounts: (v: boolean) => void;
  savedFlows?: DayFlow[];
  savedTrades?: DayTrade[];
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState('剛剛');
  const [priceTick, setPriceTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date(TODAY));
  const [calOpen, setCalOpen] = useState(false);
  const [slideDir, setSlideDir] = useState(0);

  const accounts = [
    { id: 'cash', balance: 18500 },
    { id: 'ctbc', balance: -23450 },
    { id: 'cathay', balance: 1842300 },
    { id: 'post', balance: 320000 },
  ];
  const baseStocks = [
    { code: '2330', qty: 200, avg: 580, price: 1045 },
    { code: '2454', qty: 50, avg: 850, price: 1380 },
    { code: '0050', qty: 1200, avg: 142, price: 195 },
    { code: '2412', qty: 800, avg: 118, price: 126 },
  ];
  const stocks = baseStocks.map((s) => ({
    ...s,
    price: s.price + (priceTick ? Math.sin((s.code.charCodeAt(0) + priceTick) * 1.7) * (s.price * 0.008) : 0),
  }));
  const cashTotal = accounts.reduce((a, b) => a + b.balance, 0);
  const stockTotal = stocks.reduce((a, s) => a + s.qty * s.price, 0);
  const stockCost = stocks.reduce((a, s) => a + s.qty * s.avg, 0);
  const total = cashTotal + stockTotal;
  const unrealised = stockTotal - stockCost;
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

  // Swipe gestures
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
      if (dx > 0) stepDay(-1); // swipe right → previous day
      else setCalOpen(true); // swipe left → calendar
    }
  };

  return (
    <div style={{ padding: '12px 18px 32px', color: '#18110C' }}>
      {/* Big total */}
      <div
        style={{
          padding: '14px 20px 14px',
          background: '#18110C',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>總資產淨值</div>
            <div
              style={{
                marginTop: 4,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 32,
                fontWeight: 600,
                color: '#FFFFFF',
                letterSpacing: -1,
                lineHeight: 1.05,
              }}
            >
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginRight: 4 }}>NT$</span>
              {mask(total)}
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: unrealised >= 0 ? 'rgba(168,189,140,0.20)' : 'rgba(216,135,112,0.20)',
                  color: unrealised >= 0 ? '#A8BD8C' : '#D88770',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {unrealised >= 0 ? <TrendUp size={12} strokeWidth={2} /> : <TrendDown size={12} strokeWidth={2} />}
                {unrealised >= 0 ? '+' : '-'}NT$ {mask(Math.abs(unrealised))}
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>未實現損益</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: -4 }}>
            <button
              onClick={() => setHideAmounts(!hideAmounts)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {hideAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={doRefresh}
              disabled={refreshing}
              title={`更新 · ${refreshedAt}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: refreshing ? 'rgba(217,119,87,0.35)' : 'rgba(217,119,87,0.25)',
                border: '1px solid rgba(217,119,87,0.55)',
                color: '#E89878',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms',
              }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Date strip */}
      <DateStrip date={selectedDate} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)} onCal={() => setCalOpen(true)} isToday={isToday} />

      {/* Swipeable daily area */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
      >
        <div
          key={dayKey(selectedDate)}
          style={{
            animation: slideDir === 0 ? 'none' : `slideIn-${slideDir > 0 ? 'right' : 'left'} 320ms cubic-bezier(0.32, 0.72, 0.18, 1)`,
          }}
        >
          <DailyView
            date={selectedDate}
            hideAmounts={hideAmounts}
            extraFlows={savedFlows.filter((f) => f.date && dayKey(f.date) === dayKey(selectedDate))}
            extraTrades={savedTrades.filter((t) => t.date && dayKey(t.date) === dayKey(selectedDate))}
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
