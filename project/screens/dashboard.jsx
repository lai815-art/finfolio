// Dashboard / 資產整合看板
const { useState: useStateDash, useEffect: useEffectDash, useRef: useRefDash, useMemo: useMemoDash } = React;

function PieDonut({ data, size = 168, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(28,26,24,0.12)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = d.pct / 100 * C;
        const off = acc / 100 * C;
        acc += d.pct;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={d.color} strokeWidth={thickness}
          strokeDasharray={`${len} ${C}`}
          strokeDashoffset={-off}
          strokeLinecap="butt" />);
      })}
    </svg>);
}

function fmtMoney(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Deterministic per-date data generation
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function seedFor(d) {
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}
function mulberry(seed) {
  return function () {
    seed |= 0;seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TODAY = new Date(2026, 4, 27); // May 27, 2026 (anchor)

const EXP_TEMPLATES = [
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
{ icon: '⛽', cat: '交通', merchant: '加油站', account: '信用卡 A', range: [800, 1800] }];

const INC_TEMPLATES = [
{ icon: '💼', cat: '薪資', merchant: '公司轉帳', account: '主要存款帳戶', range: [52000, 52000] },
{ icon: '💰', cat: '獎金', merchant: '績效獎金', account: '主要存款帳戶', range: [8000, 18000] },
{ icon: '🎁', cat: '紅利', merchant: '信用卡回饋', account: '信用卡 A', range: [240, 580] },
{ icon: '📈', cat: '股利', merchant: '股票股利', account: '券商交割戶', range: [1800, 5200] }];

const XFER_TEMPLATES = [
{ icon: '↔', cat: '轉帳', merchant: '至證券交割戶', account: '主要 → 證券', range: [20000, 80000] },
{ icon: '↔', cat: '轉帳', merchant: '繳信用卡', account: '主要 → 信用卡 A', range: [15000, 35000] },
{ icon: '↔', cat: '轉帳', merchant: '至數位帳戶', account: '主要 → 數位', range: [10000, 60000] }];

const STOCKS = [
{ code: '2330', name: '台積電', range: [1015, 1075], cost: 580 },
{ code: '2454', name: '聯發科', range: [1340, 1410], cost: 850 },
{ code: '0050', name: '元大台灣50', range: [188, 200], cost: 142 },
{ code: '2412', name: '中華電', range: [124, 128], cost: 118 },
{ code: '2317', name: '鴻海', range: [205, 220], cost: 165 }];


function generateDayData(date) {
  // 假資料已清空 — 日記帳只顯示使用者透過「記帳」功能記錄的真實資料
  return { flows: [], trades: [] };
}

function DateStrip({ date, onPrev, onNext, onCal, isToday }) {
  const { ChevronRight, Calendar } = window.Icons;
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = `${date.getMonth() + 1}/${date.getDate()} 週${week[date.getDay()]}`;
  return (
    <div style={{
      marginTop: 24, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 6px'
    }}>
      <button onClick={onPrev} style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)',
        color: 'rgba(45,36,32,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button onClick={onCal} style={{
        flex: 1, height: 36, padding: '0 14px', borderRadius: 8,
        background: 'rgba(217, 119, 87,0.12)', border: '1px solid rgba(217, 119, 87,0.25)',
        color: '#E89878',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 16, fontWeight: 600, letterSpacing: 0.3
      }}>
        <Calendar size={14} /> {isToday ? '今日 · ' : ''}{label}
      </button>
      <button onClick={onNext} disabled={isToday} style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)',
        color: isToday ? 'rgba(28,26,24,0.38)' : 'rgba(45,36,32,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <ChevronRight size={18} />
      </button>
    </div>);

}

function CalendarSheet({ open, date, onPick, onClose }) {
  const { X, ChevronRight } = window.Icons;
  const [shown, setShown] = useStateDash(false);
  const [viewMonth, setViewMonth] = useStateDash(new Date(date.getFullYear(), date.getMonth(), 1));

  useEffectDash(() => {
    if (open) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [open]);
  useEffectDash(() => {
    if (open) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [open]);

  if (!open) return null;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const isSel = (d) => d === date.getDate() && month === date.getMonth() && year === date.getFullYear();
  const isToday = (d) => d === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
  const isFuture = (d) => new Date(year, month, d) > TODAY;
  const week = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: '#F7F2EC',
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
        padding: '12px 0 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
          <div style={{ width: 40, height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 18px 14px' }}>
          <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={{
            width: 36, height: 36, borderRadius: 8, background: 'rgba(28,26,24,0.12)',
            border: '1px solid rgba(28,26,24,0.14)', color: '#18110C',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /></button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{year} 年 {month + 1} 月</div>
          <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={{
            width: 36, height: 36, borderRadius: 8, background: 'rgba(28,26,24,0.12)',
            border: '1px solid rgba(28,26,24,0.14)', color: '#18110C',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ChevronRight size={18} /></button>
        </div>
        <div style={{ padding: '0 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {week.map((w, i) =>
            <div key={w} style={{
              textAlign: 'center', fontSize: 15, padding: '6px 0',
              color: i === 0 || i === 6 ? 'rgba(216,135,112,0.7)' : 'rgba(45,36,32,0.5)'
            }}>{w}</div>
            )}
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const sel = isSel(d);
              const td = isToday(d);
              const fut = isFuture(d);
              const dow = i % 7;
              return (
                <button key={i} disabled={fut} onClick={() => onPick(new Date(year, month, d))}
                style={{
                  aspectRatio: '1 / 1', borderRadius: 8,
                  background: sel ?
                  'linear-gradient(135deg, #E89878, #D97757)' :
                  td ? 'rgba(217, 119, 87,0.12)' : 'transparent',
                  border: sel ? 'none' : td ? '1px solid rgba(217, 119, 87,0.3)' : '1px solid transparent',
                  color: sel ? '#fff' :
                  fut ? 'rgba(45,36,32,0.2)' :
                  dow === 0 || dow === 6 ? 'rgba(216,135,112,0.85)' :
                  '#18110C',
                  fontSize: 16, fontWeight: sel ? 700 : td ? 600 : 500,
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: fut ? 'not-allowed' : 'pointer'
                }}>{d}</button>);

            })}
          </div>
        </div>
        <div style={{ marginTop: 16, padding: '0 18px', display: 'flex', gap: 10 }}>
          <button onClick={() => onPick(new Date(TODAY))} style={{
            flex: 1, height: 48, borderRadius: 18,
            background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)',
            color: 'rgba(45,36,32,0.75)', fontSize: 16, fontWeight: 500
          }}>回到今日</button>
          <button onClick={onClose} style={{
            flex: 1, height: 48, borderRadius: 18,
            background: 'linear-gradient(135deg, #E89878, #D97757)',
            border: 'none', color: '#fff', fontSize: 16, fontWeight: 600
          }}>關閉</button>
        </div>
      </div>
    </div>);

}

function DailyView({ date, hideAmounts, extraFlows = [], extraTrades = [], onEditRecord, recordEdits = {}, recordDeletes = [] }) {
  const { Calendar, ArrowUpRight } = window.Icons;
  const mask = (v) => hideAmounts ? '••••••' : fmtMoney(Math.round(v));

  const generated = useMemoDash(() => generateDayData(date), [dayKey(date)]);
  const dk = dayKey(date);
  function mergeList(saved, gen, prefix) {
    const all = [];
    saved.forEach(function (r) { all.push(Object.assign({}, r, { _id: 's-' + r._justAdded })); });
    gen.forEach(function (r, i) { all.push(Object.assign({}, r, { _id: prefix + dk + '-' + i })); });
    return all
      .filter(function (r) { return recordDeletes.indexOf(r._id) === -1; })
      .map(function (r) { return recordEdits[r._id] ? Object.assign({}, r, recordEdits[r._id]) : r; });
  }
  const flows = mergeList(extraFlows, generated.flows, 'g-f-');
  const trades = mergeList(extraTrades, generated.trades, 'g-t-');

  const incTotal = flows.filter((t) => t.kind === 'inc').reduce((a, t) => a + t.amount, 0);
  const expTotal = flows.filter((t) => t.kind === 'exp').reduce((a, t) => a + t.amount, 0);
  const buyTotal = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + t.shares * t.price, 0);
  const sellTotal = trades.filter((t) => t.side === 'sell').reduce((a, t) => a + t.shares * t.price, 0);

  return (
    <div>
      {/* 收支 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(18,17,12,0.72)', fontSize: 15, letterSpacing: 1,
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} /> 當日收支
        </div>
        <span style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          color: incTotal - expTotal >= 0 ? '#A8BD8C' : '#D88770' }}>
          餘額 {incTotal - expTotal >= 0 ? '+' : '-'}{mask(Math.abs(incTotal - expTotal))}
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
        { l: '收入', v: incTotal, c: '#A8BD8C', s: '+' },
        { l: '支出', v: expTotal, c: '#D88770', s: '-' }].
        map((x) =>
        <div key={x.l} style={{
          padding: '10px 12px', borderRadius: 18,
          background: `${x.c}14`, border: `1px solid ${x.c}33`
        }}>
            <div style={{ fontSize: 15, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16, fontWeight: 600, color: x.c }}>
              {x.s}{mask(x.v)}
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 18,
        border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {flows.length === 0 &&
        <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15,
          color: 'rgba(45,36,32,0.4)' }}>當日無紀錄</div>
        }
        {flows.map((t, i, arr) => {
          const color = t.kind === 'inc' ? '#A8BD8C' : t.kind === 'xfer' ? '#C5A07D' : '#D88770';
          const sign = t.kind === 'inc' ? '+' : t.kind === 'xfer' ? '' : '-';
          const fresh = !!t._justAdded;
          return (
            <div key={i} onClick={() => onEditRecord && onEditRecord({
              intent: 'flow', edit: true, recordId: t._id,
              apply: t.kind === 'xfer'
                ? { kind: 'xfer', amount: String(t.amount), category: '轉帳', note: t.merchant }
                : { kind: t.kind, amount: String(t.amount), category: t.cat, account: t.account, note: t.merchant },
            })} style={{
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(28,26,24,0.12)' : 'none',
              minHeight: 64,
              background: fresh ? 'rgba(217, 119, 87,0.10)' : 'transparent',
              animation: fresh ? 'freshPulse 1.6s ease-out' : 'none'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                background: `${color}1f`, border: `1px solid ${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
              }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 500 }}>{t.merchant}</span>
                  {fresh &&
                  <span style={{ fontSize: 15, padding: '1px 6px', borderRadius: 26,
                    background: 'rgba(217, 119, 87,0.18)', color: '#E89878', fontWeight: 600 }}>新</span>
                  }
                  <span style={{ fontSize: 15, padding: '1px 6px', borderRadius: 26,
                    background: 'rgba(28,26,24,0.12)', color: 'rgba(28,26,24,0.60)' }}>{t.cat}</span>
                </div>
                <div style={{ fontSize: 15, color: 'rgba(28,26,24,0.60)', marginTop: 2,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.account}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17,
                fontWeight: 600, color: color, whiteSpace: 'nowrap' }}>
                {sign}{mask(t.amount)}
              </div>
            </div>);

        })}
      </div>

      {/* 股票買賣 */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'rgba(18,17,12,0.72)', fontSize: 15, letterSpacing: 1,
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpRight size={14} /> 當日股票買賣
        </div>
        <span style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          color: sellTotal - buyTotal >= 0 ? '#A8BD8C' : '#D88770' }}>
          餘額 {sellTotal - buyTotal >= 0 ? '+' : '-'}{mask(Math.abs(sellTotal - buyTotal))}
        </span>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
        { l: '買進金額', v: buyTotal, c: '#D88770' },
        { l: '賣出金額', v: sellTotal, c: '#A8BD8C' }].
        map((x) =>
        <div key={x.l} style={{
          padding: '10px 12px', borderRadius: 18,
          background: `${x.c}14`, border: `1px solid ${x.c}33`
        }}>
            <div style={{ fontSize: 15, color: 'rgba(18,17,12,0.72)' }}>{x.l}</div>
            <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16, fontWeight: 600, color: x.c }}>
              NT$ {mask(x.v)}
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 18,
        border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
        {trades.length === 0 &&
        <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15,
          color: 'rgba(45,36,32,0.4)' }}>當日無交易</div>
        }
        {trades.map((t, i, arr) => {
          const color = t.side === 'buy' ? '#D88770' : '#A8BD8C';
          const total = Math.round(t.shares * t.price);
          const fresh = !!t._justAdded;
          return (
            <div key={i} onClick={() => onEditRecord && onEditRecord({
              intent: 'stock', edit: true, recordId: t._id,
              apply: { side: t.side, code: t.code, name: t.name, shares: String(t.shares), price: String(t.price) },
            })} style={{
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(28,26,24,0.12)' : 'none',
              minHeight: 64,
              background: fresh ? 'rgba(217, 119, 87,0.10)' : 'transparent',
              animation: fresh ? 'freshPulse 1.6s ease-out' : 'none'
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                background: `${color}1f`, border: `1px solid ${color}33`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700
              }}>{t.side === 'buy' ? '買' : '賣'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600 }}>
                    {t.code}
                  </span>
                  <span style={{ fontSize: 16, color: 'rgba(45,36,32,0.7)' }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 15, color: 'rgba(28,26,24,0.60)', marginTop: 2,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.time} · {t.shares.toLocaleString()} 股 × {t.price.toFixed(1)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17,
                  fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                  {t.side === 'buy' ? '-' : '+'}{mask(total)}
                </div>
                {t.pnl !== undefined &&
                <div style={{ marginTop: 2, fontSize: 15, color: '#A8BD8C',
                  fontFamily: 'JetBrains Mono, monospace' }}>
                    已實現 +{mask(t.pnl)}
                  </div>
                }
              </div>
            </div>);

        })}
      </div>
    </div>);

}

function DashWidget({ which, hideAmounts, accountsPie, stocks }) {
  const { ChartPie, Activity, ArrowUpRight } = window.Icons;
  const mask = (v) => hideAmounts ? '••••' : fmtMoney(Math.round(v));
  const STOCK_COLORS = ['#D97757', '#A8BD8C', '#D4B87A', '#C5A07D', '#8FA86F', '#BFA176'];

  let title, Icon, pie, centerLabel, centerValue, centerSub;
  if (which === 'spending') {
    title = '本月消費統計';
    Icon = Activity;
    const expCats = [];
    const total = 0;
    pie = [];
    centerLabel = '本月支出';
    centerValue = hideAmounts ? '••••••' : '0';
    centerSub = 'NT$';
  } else if (which === 'stocks') {
    title = '股票配置';
    Icon = ArrowUpRight;
    const totalMv = stocks.reduce((a, s) => a + s.qty * s.price, 0);
    pie = stocks.map((s, i) => {
      const mv = s.qty * s.price;
      return { label: s.code, color: STOCK_COLORS[i % STOCK_COLORS.length], pct: mv / totalMv * 100, value: mv };
    });
    centerLabel = '台股市值';
    centerValue = mask(totalMv);
    centerSub = `${stocks.length} 檔`;
  } else {
    title = '資產配置';
    Icon = ChartPie;
    pie = accountsPie;
    centerLabel = '配置健康度';
    centerValue = '72';
    centerSub = '良好';
  }

  return (
    <>
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 8,
        color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 15 }}>
        <Icon size={14} /> {title}
      </div>
      <div style={{
        marginTop: 12, padding: '20px',
        background: '#FFFFFF', borderRadius: 26, border: '1px solid rgba(28,26,24,0.12)',
        display: 'flex', alignItems: 'center', gap: 18
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieDonut data={pie} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 15, color: 'rgba(28,26,24,0.60)' }}>{centerLabel}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2,
              color: which === 'accounts' ? '#A8BD8C' : '#18110C',
              fontFamily: 'JetBrains Mono, monospace' }}>{centerValue}</div>
            <div style={{ fontSize: 15, color: 'rgba(45,36,32,0.4)' }}>{centerSub}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pie.slice(0, 5).map((p, i) =>
          <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: p.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: which === 'stocks' ? 'JetBrains Mono, monospace' : 'inherit' }}>
                    {p.label}
                  </span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16,
                fontWeight: 600, color: p.color, flexShrink: 0 }}>
                  {p.pct.toFixed(0)}%
                </div>
              </div>
              <div style={{ marginTop: 5, height: 5, borderRadius: 18,
              background: 'rgba(28,26,24,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: p.color,
                opacity: 0.85, borderRadius: 18 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>);

}

function DashboardScreen({ hideAmounts, setHideAmounts, savedFlows = [], savedTrades = [], dashWidget = 'accounts', onEditRecord, recordEdits = {}, recordDeletes = [] }) {
  const { RefreshCw, Eye, EyeOff, TrendUp, TrendDown, ArrowUpRight, ChartPie } = window.Icons;
  const [refreshing, setRefreshing] = useStateDash(false);
  const [refreshedAt, setRefreshedAt] = useStateDash('剛剛');
  const [priceTick, setPriceTick] = useStateDash(0);
  const [selectedDate, setSelectedDate] = useStateDash(new Date(TODAY));
  const [calOpen, setCalOpen] = useStateDash(false);
  const [slideDir, setSlideDir] = useStateDash(0);

  // Net worth + investment value come from the shared single source of truth,
  // so the dashboard hero matches the 配置 page exactly. priceTick adds a small
  // live wobble on refresh.
  const port = window.computePortfolio();
  const { totals } = port;
  const invest0 = totals.stock + totals.bond + totals.other;
  const basePnl = port.groups
    .filter((g) => g.id === 'stocks' || g.id === 'bonds')
    .reduce((a, g) => a + g.items.reduce((b, it) => b + (it.extra?.pnl || 0), 0), 0);
  const wob = priceTick ? Math.sin(priceTick * 1.4) * 0.006 : 0; // ±0.6%
  const investMv = invest0 * (1 + wob);
  const cashTotal = totals.cash;
  const total = cashTotal + investMv - totals.debt; // 淨資產
  const unrealised = basePnl + invest0 * wob;
  const pieTotal = cashTotal + investMv;
  const pie = [
  { label: '現金 / 存款', pct: pieTotal > 0 ? Math.max(0, cashTotal) / pieTotal * 100 : 50, color: '#D97757' },
  { label: '投資部位',   pct: pieTotal > 0 ? investMv / pieTotal * 100 : 50, color: '#A8BD8C' }];

  const mask = (v) => hideAmounts ? '••••••' : fmtMoney(Math.round(v));

  const doRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {setPriceTick((t) => t + 1);setRefreshedAt('剛剛');setRefreshing(false);}, 1200);
  };

  const stepDay = (delta) => {
    setSelectedDate((d) => {
      const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
      if (n > TODAY) return d;
      return n;
    });
    setSlideDir(delta);
  };

  const isToday = dayKey(selectedDate) === dayKey(TODAY);

  // Swipe gestures on daily container
  const touchRef = useRefDash({ x: 0, y: 0, active: false });
  const onTouchStart = (e) => {
    const p = e.touches ? e.touches[0] : e;
    touchRef.current = { x: p.clientX, y: p.clientY, active: true };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    const p = e.changedTouches ? e.changedTouches[0] : e;
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
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '16px 20px 16px',
        background: 'linear-gradient(145deg, #E8916B 0%, #C2562F 100%)',
        borderRadius: 28, border: 'none',
        boxShadow: '0 12px 28px rgba(194, 90, 51,0.35)'
      }}>
        {/* decorative organic blobs */}
        <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>
              總資產淨值
            </div>
            <div style={{
              marginTop: 4, fontFamily: 'JetBrains Mono, monospace',
              fontSize: 32, fontWeight: 700, color: '#FFFFFF',
              letterSpacing: -1, lineHeight: 1.05
            }}>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.82)', marginRight: 4 }}>NT$</span>
              {mask(total)}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                color: unrealised >= 0 ? '#C2562F' : '#C25A3E',
                fontSize: 15, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace'
              }}>
                {unrealised >= 0 ? <TrendUp size={12} strokeWidth={2.4} /> : <TrendDown size={12} strokeWidth={2.4} />}
                {unrealised >= 0 ? '+' : '-'}NT$ {mask(Math.abs(unrealised))}
              </div>
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)' }}>未實現損益</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: -4 }}>
            <button onClick={() => setHideAmounts(!hideAmounts)} style={{
              width: 34, height: 34, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            <button onClick={doRefresh} disabled={refreshing} title={`更新 · ${refreshedAt}`} style={{
              width: 34, height: 34, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              color: '#C2562F', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms'
            }}>
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Date strip */}
      <DateStrip date={selectedDate}
      onPrev={() => stepDay(-1)}
      onNext={() => stepDay(1)}
      onCal={() => setCalOpen(true)}
      isToday={isToday} />

      {/* Swipeable daily area */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart} onMouseUp={onTouchEnd}
        style={{ touchAction: 'pan-y', userSelect: 'none' }}>
        <div key={dayKey(selectedDate)} style={{
          animation: slideDir === 0 ? 'none' :
          `slideIn-${slideDir > 0 ? 'right' : 'left'} 320ms cubic-bezier(0.32, 0.72, 0.18, 1)`
        }}>
          <DailyView date={selectedDate} hideAmounts={hideAmounts} onEditRecord={onEditRecord}
          recordEdits={recordEdits} recordDeletes={recordDeletes}
          extraFlows={savedFlows.filter((f) => dayKey(f.date) === dayKey(selectedDate))}
          extraTrades={savedTrades.filter((t) => dayKey(t.date) === dayKey(selectedDate))} />
        </div>
      </div>

      <CalendarSheet open={calOpen}
      date={selectedDate}
      onPick={(d) => {setSelectedDate(d);setCalOpen(false);setSlideDir(0);}}
      onClose={() => setCalOpen(false)} />
    </div>);

}

window.DashboardScreen = DashboardScreen;
window.CalendarSheet = CalendarSheet;
window.TODAY_DATE = TODAY;