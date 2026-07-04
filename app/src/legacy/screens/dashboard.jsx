// Dashboard / 資產整合看板
const { useState: useStateDash, useEffect: useEffectDash, useRef: useRefDash, useMemo: useMemoDash } = React;

function PieDonut({ data, size = 168, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={thickness} />
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
  if (!d) return 'null';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return 'invalid';
  return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
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

const TODAY = new Date(); // 開啟 App 時的當前日期

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
{ icon: '📈', cat: '股息', merchant: '股息', account: '券商交割戶', range: [1800, 5200] }];

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

/* ── 全站共用日期列：左右箭頭 + 中間日期按鈕（高度 45）── */
function DateNavBar({ label, onPrev, onNext, onCenter, nextDisabled }) {
  const { ChevronRight, Calendar } = window.Icons;
  const side = (disabled) => ({
    width: 44, height: 45, borderRadius: RS(14), flexShrink: 0,
    background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)',
    color: disabled ? 'rgba(0,0,0,0.30)' : 'rgba(60,60,67,0.86)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
      <button onClick={onPrev} style={{ ...side(false), borderRadius: "15px", background: "rgb(248, 247, 243)" }}>
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button onClick={onCenter} style={{ ...{
          flex: 1, minWidth: 0, height: 45, padding: PAD('0 12px'), borderRadius: RS(14),
          background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)',
          color: TOKENS.gray2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
          fontSize: FS(19), fontWeight: 600, letterSpacing: 0.3
        }, borderRadius: "10px", background: "rgb(248, 247, 243)", lineHeight: "1.35" }}>
        <Calendar size={15} /> {label}
      </button>
      <button onClick={onNext} disabled={nextDisabled} style={side(nextDisabled)}>
        <ChevronRight size={18} />
      </button>
    </div>);

}

function DateStrip({ date, onPrev, onNext, onCal, isToday }) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = `${isToday ? '今日 · ' : ''}${date.getMonth() + 1}/${date.getDate()} 週${week[date.getDay()]}`;
  return (
    <div style={{ marginTop: SP(14), marginBottom: SP(8), padding: PAD('4px 6px') }}>
      <DateNavBar label={label} onPrev={onPrev} onNext={onNext} onCenter={onCal} nextDisabled={false} />
    </div>);

}

function CalendarSheet({ open, date, onPick, onClose }) {
  const { X, ChevronRight } = window.Icons;
  const [shown, setShown] = useStateDash(false);
  const [viewMonth, setViewMonth] = useStateDash(new Date(date.getFullYear(), date.getMonth(), 1));
  const [pickMode, setPickMode] = useStateDash(false);

  useEffectDash(() => {
    if (open) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [open]);
  useEffectDash(() => {
    if (open) {setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));setPickMode(false);}
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
  const isFuture = (d) => false;
  const week = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 65,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end', touchAction: 'none'
    }} onClick={onClose} onWheel={(e) => e.preventDefault()} onTouchMove={(e) => e.preventDefault()}>
      <div onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
        style={{
        width: '100%', background: TOKENS.bg, touchAction: 'auto',
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'),
        padding: PAD('12px 0 28px')
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: SP(6) }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: PAD('4px 18px 14px') }}>
          <button onClick={() => setPickMode((p) => !p)} style={{
            display: 'flex', alignItems: 'center', gap: SP(8), background: 'transparent',
            border: 'none', cursor: 'pointer', padding: PAD('6px 10px'), borderRadius: RS(10) }}>
            <span style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink }}>{year} 年 {month + 1} 月</span>
            <ChevronRight size={18} style={{ transform: pickMode ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 200ms', color: TOKENS.accent || 'rgba(216,135,112,0.95)' }} />
          </button>
        </div>
        {pickMode ?
        <div style={{ padding: PAD('0 18px') }}>
          <div style={{ fontSize: FS(15), fontWeight: 600, color: 'rgba(44,44,50,0.5)', letterSpacing: 1, margin: PAD('2px 2px 8px') }}>年份</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: SP(8),
            maxHeight: 156, overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: SP(4) }}>
            {Array.from({ length: 16 }, (_, i) => year - 10 + i).map((y) => {
              const ysel = y === year;
              return (
              <button key={y} onClick={() => setViewMonth(new Date(y, month, 1))} style={{
                height: 46, borderRadius: RS(12), fontFamily: TOKENS.fontMono,
                fontSize: FS(17), fontWeight: ysel ? 700 : 500,
                background: ysel ? TOKENS.gradDark : 'rgba(0,0,0,0.05)',
                color: ysel ? TOKENS.surface : TOKENS.ink,
                border: ysel ? 'none' : '1px solid rgba(0,0,0,0.08)', cursor: 'pointer'
              }}>{y}</button>);
            })}
          </div>
          <div style={{ fontSize: FS(15), fontWeight: 600, color: 'rgba(44,44,50,0.5)', letterSpacing: 1, margin: PAD('16px 2px 8px') }}>月份</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: SP(8) }}>
            {Array.from({ length: 12 }, (_, i) => i).map((m) => {
              const msel = m === month;
              return (
              <button key={m} onClick={() => {setViewMonth(new Date(year, m, 1));setPickMode(false);}} style={{
                height: 50, borderRadius: RS(12),
                fontSize: FS(18), fontWeight: msel ? 700 : 500,
                background: msel ? TOKENS.gradDark : 'rgba(0,0,0,0.05)',
                color: msel ? TOKENS.surface : TOKENS.ink,
                border: msel ? 'none' : '1px solid rgba(0,0,0,0.08)', cursor: 'pointer'
              }}>{m + 1} 月</button>);
            })}
          </div>
        </div> :
        <div style={{ padding: PAD('0 18px') }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: SP(4) }}>
            {week.map((w, i) =>
            <div key={w} style={{
              textAlign: 'center', fontSize: FS(18), padding: PAD('6px 0'),
              color: i === 0 || i === 6 ? 'rgba(216,135,112,0.7)' : 'rgba(60,60,67,0.5)'
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
                  aspectRatio: '1 / 1', borderRadius: RS(8),
                  background: sel ?
                  TOKENS.gradDark :
                  td ? 'rgba(217, 119, 87,0.12)' : 'transparent',
                  border: sel ? 'none' : td ? '1px solid rgba(217, 119, 87,0.3)' : '1px solid transparent',
                  color: sel ? TOKENS.surface :
                  fut ? 'rgba(60,60,67,0.2)' :
                  dow === 0 || dow === 6 ? 'rgba(216,135,112,0.85)' :
                  TOKENS.ink,
                  fontSize: FS(19), fontWeight: sel ? 700 : td ? 600 : 500,
                  fontFamily: TOKENS.fontMono,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: fut ? 'not-allowed' : 'pointer'
                }}>{d}</button>);

            })}
          </div>
        </div>
        }
        <div style={{ marginTop: SP(16), padding: PAD('0 18px'), display: 'flex', gap: SP(10) }}>
          <button onClick={() => onPick(new Date(TODAY))} style={{
            flex: 1, height: 56, borderRadius: RS(18),
            background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)',
            color: 'rgba(44,44,50,0.86)', fontSize: FS(19), fontWeight: 500
          }}>回到今日</button>
          <button onClick={onClose} style={{
            flex: 1, height: 56, borderRadius: RS(18),
            background: TOKENS.gradDark,
            border: 'none', color: TOKENS.surface, fontSize: FS(19), fontWeight: 600
          }}>關閉</button>
        </div>
      </div>
    </div>);

}

/* 當日收支列的線條圖示對應（依分類，與全站 icon 一致） */
const FLOW_CAT_ICON = {
  '餐飲': 'Utensils', '早餐': 'Utensils', '午餐': 'Utensils', '晚餐': 'Utensils', '飲料': 'Coffee',
  '交通': 'Car', '生活雜貨': 'ShoppingBag', '購物': 'ShoppingBag', '娛樂': 'Film', '醫療': 'Pill',
  '住房': 'Home', '教育': 'BookOpen', '投資損失': 'TrendDown',
  '薪資': 'Briefcase', '加班費': 'Briefcase', '獎金': 'Gift', '紅利': 'Gift', '紅利回饋': 'Gift',
  '發票中獎': 'Gift', '退稅': 'Gift', '股利': 'TrendUp', '股息': 'TrendUp', '投資收入': 'TrendUp',
  '利息': 'Banknote', '租金': 'Home', '轉帳': 'ArrowRight'
};
function flowIconName(t) {
  if (t.kind === 'xfer') return 'ArrowRight';
  if (FLOW_CAT_ICON[t.cat]) return FLOW_CAT_ICON[t.cat];
  return t.kind === 'inc' ? 'Banknote' : 'Receipt';
}

function DailyView({ date, hideAmounts, extraFlows = [], extraTrades = [], onEditRecord, recordEdits = {}, recordDeletes = [], curMap = {}, masterData = {} }) {
  const { Calendar, ArrowUpRight } = window.Icons;
  const mask = (v) => hideAmounts ? '••••••' : fmtMoney(Math.round(v));

  // 類別（群組）查詢：支出用 cat_exp，收入用 cat_inc
  const catGroupOf = (t) => {
    if (t.kind === 'exp') {
      const items = (masterData.cat_exp || []).map((c) => typeof c === 'string' ? { name: c, group: c } : c);
      const hit = items.find((c) => c.name === t.cat);
      if (hit) return hit.group;
      if ((window.EXP_GROUPS || []).includes(t.cat)) return t.cat;
      return '其他';
    }
    if (t.kind === 'inc') {
      const items = (masterData.cat_inc || []).map((c) => typeof c === 'string' ? { name: c, group: '主動' } : c);
      const hit = items.find((c) => c.name === t.cat);
      const g = hit ? hit.group : '其他';
      return { '主動': '主動收入', '被動': '被動收入' }[g] || g;
    }
    return '';
  };

  const generated = useMemoDash(() => generateDayData(date), [dayKey(date)]);
  const dk = dayKey(date);
  function mergeList(saved, gen, prefix) {
    const all = [];
    saved.forEach(function (r) {all.push(Object.assign({}, r, { _id: 's-' + r._justAdded }));});
    gen.forEach(function (r, i) {all.push(Object.assign({}, r, { _id: prefix + dk + '-' + i }));});
    return all.
    filter(function (r) {return recordDeletes.indexOf(r._id) === -1;}).
    map(function (r) {return recordEdits[r._id] ? Object.assign({}, r, recordEdits[r._id]) : r;});
  }
  const flows = mergeList(extraFlows, generated.flows, 'g-f-');
  const trades = mergeList(extraTrades, generated.trades, 'g-t-');

  // 統計加總一律換算台幣
  const flowTWD = (t) => window.fxToTWD(t.amount, curMap[t.account]);
  const tradeTWD = (t) => {
    const amt = t.net != null && t.net > 0 ? t.net : t.shares * t.price;
    return window.fxToTWD(amt, curMap[t.broker] || curMap[t.settleAccount]);
  };
  const incTotal = flows.filter((t) => t.kind === 'inc').reduce((a, t) => a + flowTWD(t), 0);
  const expTotal = flows.filter((t) => t.kind === 'exp').reduce((a, t) => a + flowTWD(t), 0);
  const buyTotal = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + tradeTWD(t), 0);
  const sellTotal = trades.filter((t) => t.side === 'sell').reduce((a, t) => a + tradeTWD(t), 0);

  return (
    <div>
      {/* 收支 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "0px 5px" }}>
        <div style={{ color: 'rgba(0,0,0,0.90)', fontSize: FS(18), letterSpacing: 1,
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <Calendar size={14} /> 當日收支
        </div>
        <span style={{ fontSize: FS(18), fontFamily: TOKENS.fontMono, fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
          color: incTotal - expTotal < 0 ? TOKENS.red : TOKENS.ink2 }}>
          餘額 {incTotal - expTotal < 0 ? '-' : ''}{mask(Math.abs(incTotal - expTotal))}
        </span>
      </div>
      <div style={{ ...{ marginTop: SP(8), background: TOKENS.surface, borderRadius: RS(18),
          border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden', width: "382px" }, borderRadius: "11px", background: "rgb(248, 247, 243)" }}>
        {flows.length === 0 &&
        <div style={{ padding: PAD('20px 16px'), textAlign: 'center', fontSize: FS(18),
          color: 'rgba(44,44,50,0.4)', width: "382px" }}>當日無紀錄</div>
        }
        {flows.map((t, i, arr) => {
          const color = t.kind === 'inc' ? TOKENS.typeInc : t.kind === 'xfer' ? TOKENS.typeXfer : TOKENS.typeExp;
          const amtColor = t.kind === 'exp' ? TOKENS.red : t.kind === 'inc' ? TOKENS.incBlue : TOKENS.ink2;
          const sign = t.kind === 'exp' ? '-' : '';
          const fresh = !!t._justAdded;
          return (
            <div key={i} onClick={() => { if (t._autoGen) return; onEditRecord && onEditRecord({
              intent: 'flow', edit: true, recordId: t._id,
              apply: t.kind === 'xfer' ?
              { kind: 'xfer', amount: String(t.amount), category: t.cat || '轉帳',
                fromAccount: t.fromAccount, toAccount: t.toAccount,
                xferFee: t.xferFee != null ? String(t.xferFee) : '',
                note: t.note || t.merchant || '', date: t.date ? new Date(t.date) : new Date() } :
              { kind: t.kind, amount: String(t.amount), category: t.cat, account: t.account, note: t.note || t.merchant || '', date: t.date ? new Date(t.date) : new Date() }
            }); }} style={{ ...{
                cursor: t._autoGen ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: SP(14), padding: PAD('12px 14px'),
                borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                minHeight: 56,
                background: 'transparent',
                animation: 'none', width: "382px"
              }, padding: "12px 15px 12px 11px" }}>
              <div style={{ ...{
                  width: 38, height: 44, borderRadius: RS(8), flexShrink: 0,
                  background: `${color}1f`, border: `1px solid ${color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }, borderRadius: "19px" }}>{(() => {const FlowIco = window.Icons[flowIconName(t)] || window.Icons.Receipt;return <FlowIco size={18} style={{ color }} />;})()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.kind === 'xfer' ?
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), minWidth: 0 }}>
                    <span style={{ fontSize: FS(20), fontWeight: 500, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t._autoGen && (t.merchant === '投資獲利' || t.merchant === '投資損失') ? t.merchant : t.cat}
                    </span>
                    {t._autoGen && <span style={{ fontSize: FS(13), fontWeight: 600, color: TOKENS.gray3, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: RS(6), whiteSpace: 'nowrap', flexShrink: 0 }}>系統自動</span>}
                  </div>
                  <div style={{ ...{ fontSize: FS(16), color: 'rgba(0,0,0,0.84)', marginTop: SP(2),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, fontSize: "14px" }}>
                    {(t.account || '').includes('__stock_position__') ? t.merchant : t.account}
                  </div>
                </> :
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), minWidth: 0 }}>
                    <span style={{ ...{ fontSize: FS(20), fontWeight: 500, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, fontSize: "18px" }}>
                      {t._autoGen && (t.merchant === '投資獲利' || t.merchant === '投資損失') ? t.merchant : t.cat}
                    </span>
                    {t._autoGen && <span style={{ fontSize: FS(13), fontWeight: 600, color: TOKENS.gray3, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: RS(6), whiteSpace: 'nowrap', flexShrink: 0 }}>系統自動</span>}
                  </div>
                  <div style={{ ...{ fontSize: FS(16), color: 'rgba(0,0,0,0.84)', marginTop: SP(2),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, fontSize: "14px" }}>
                    {t.account}
                  </div>
                </>
                }
              </div>
              <div style={{ ...{ fontFamily: TOKENS.fontMono, fontSize: FS(20),
                  fontWeight: 600, color: amtColor, whiteSpace: 'nowrap', flexShrink: 0 }, fontSize: "17px" }}>
                {sign}{mask(t.amount)}
              </div>
            </div>);

        })}
      </div>

      {/* 股票買賣 */}
      <div style={{ marginTop: SP(16), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "0px 5px" }}>
        <div style={{ color: 'rgba(0,0,0,0.90)', fontSize: FS(18), letterSpacing: 1,
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <ArrowUpRight size={14} /> 當日股票買賣
        </div>
        <span style={{ fontSize: FS(18), fontFamily: TOKENS.fontMono, fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
          color: sellTotal - buyTotal < 0 ? TOKENS.red : TOKENS.ink2 }}>
          餘額 {sellTotal - buyTotal < 0 ? '-' : ''}{mask(Math.abs(sellTotal - buyTotal))}
        </span>
      </div>
      <div style={{ ...{ marginTop: SP(8), background: TOKENS.surface, borderRadius: RS(18),
          border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden' }, borderRadius: "11px", background: "rgb(248, 247, 243)" }}>
        {trades.length === 0 &&
        <div style={{ padding: PAD('20px 16px'), textAlign: 'center', fontSize: FS(18),
          color: 'rgba(44,44,50,0.4)', width: "382px" }}>當日無交易</div>
        }
        {trades.map((t, i, arr) => {
          const color = t.side === 'buy' ? TOKENS.typeBuy : TOKENS.typeSell;
          const amtColor = t.side === 'buy' ? TOKENS.red : TOKENS.ink2;
          const total = t.net != null && t.net > 0 ? Math.round(t.net) : Math.round(t.shares * t.price);
          const fresh = !!t._justAdded;
          return (
            <div key={i} onClick={() => onEditRecord && onEditRecord({
              intent: 'stock', edit: true, recordId: t._id,
              apply: {
                side: t.side, code: t.code, name: t.name,
                shares: String(t.shares), price: String(t.price),
                broker: t.broker, settleAccount: t.settleAccount,
                assetClass: t.assetClass || '股票',
                date: t.date ? new Date(t.date) : new Date(),
                note: t.note || ''
              }
            })} style={{ ...{
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 14px'),
                borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                minHeight: 56,
                background: 'transparent',
                animation: 'none', width: "382px"
              }, padding: "12px 16px 12px 10px" }}>
              <div style={{ ...{
                  width: 38, height: 44, borderRadius: RS(8), flexShrink: 0,
                  background: `${color}1f`, border: `1px solid ${color}33`, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: FS(18), fontWeight: 700
                }, borderRadius: "19px" }}>{t.side === 'buy' ? '買' : '賣'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ ...{ fontSize: FS(20), fontWeight: 600, color: TOKENS.ink }, fontSize: "18px" }}>{t.name}</span>
                </div>
                <div style={{ ...{ fontSize: FS(18), color: 'rgba(0,0,0,0.86)', marginTop: SP(2),
                    fontFamily: TOKENS.fontMono }, fontSize: "14px" }}>
                  {t.shares.toLocaleString()} 股 × {t.price.toFixed(1)}
                </div>

              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ ...{ fontFamily: TOKENS.fontMono,
                    fontSize: total >= 1000000 ? FS(16) : FS(20),
                    fontWeight: 600, color: amtColor, whiteSpace: 'nowrap' }, fontSize: "17px" }}>
                  {t.side === 'buy' ? '-' : ''}{mask(total)}
                </div>
                {t.pnl !== undefined &&
                <div style={{ marginTop: SP(2), fontSize: FS(18), color: t.pnl < 0 ? TOKENS.red : TOKENS.ink2,
                  fontFamily: TOKENS.fontMono }}>
                    已實現 {t.pnl < 0 ? '-' : ''}{mask(Math.abs(t.pnl))}
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
  const STOCK_COLORS = [TOKENS.ink2, TOKENS.green, TOKENS.gray3, TOKENS.gray3, TOKENS.gray2, TOKENS.gray4];

  let title, Icon, pie, centerLabel, centerValue, centerSub;
  if (which === 'spending') {
    title = '本月消費統計';
    Icon = Activity;
    const expCats = [];
    const total = 0;
    pie = [];
    centerLabel = '本月支出';
    centerValue = hideAmounts ? '••••••' : '0';
    centerSub = '';
  } else if (which === 'stocks') {
    title = '股票配置';
    Icon = ArrowUpRight;
    const totalMv = stocks.reduce((a, s) => a + s.qty * s.price, 0);
    pie = totalMv > 0 ? stocks.map((s, i) => {
      const mv = s.qty * s.price;
      return { label: s.code, color: STOCK_COLORS[i % STOCK_COLORS.length], pct: mv / totalMv * 100, value: mv };
    }) : [{ label: '尚無持倉', color: TOKENS.warmBorder2, pct: 100, value: 0 }];
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
      <div style={{ marginTop: SP(16), display: 'flex', alignItems: 'center', gap: SP(8),
        color: 'rgba(0,0,0,0.90)', letterSpacing: 1, textTransform: 'uppercase', fontSize: FS(18) }}>
        <Icon size={14} /> {title}
      </div>
      <div style={{
        marginTop: SP(10), padding: PAD('16px'),
        background: TOKENS.surface, borderRadius: RS(26), border: '1px solid rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: SP(18)
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieDonut data={pie} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: FS(18), color: 'rgba(0,0,0,0.86)' }}>{centerLabel}</div>
            <div style={{ fontSize: FS(22), fontWeight: 600, marginTop: SP(2),
              color: which === 'accounts' ? TOKENS.green : TOKENS.ink,
              fontFamily: TOKENS.fontMono }}>{centerValue}</div>
            <div style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.4)' }}>{centerSub}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: SP(10) }}>
          {pie.slice(0, 5).map((p, i) =>
          <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: SP(6) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), fontSize: FS(18), minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: RS(5), background: p.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: which === 'stocks' ? TOKENS.fontMono : 'inherit' }}>
                    {p.label}
                  </span>
                </div>
                <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19),
                fontWeight: 600, color: p.color, flexShrink: 0 }}>
                  {p.pct.toFixed(0)}%
                </div>
              </div>
              <div style={{ marginTop: SP(5), height: 5, borderRadius: RS(18),
              background: 'rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: p.color,
                opacity: 0.85, borderRadius: RS(18) }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>);

}

function DashboardScreen({ hideAmounts, setHideAmounts, savedFlows = [], savedTrades = [], dashWidget = 'accounts', onEditRecord, recordEdits = {}, recordDeletes = [], computedAcctGroups = [], computedHoldings = [], masterData = {}, onOpenStats }) {
  const { RefreshCw, Eye, EyeOff, TrendUp, TrendDown, ArrowUpRight, ChartPie } = window.Icons;
  const [refreshing, setRefreshing] = useStateDash(false);
  const [refreshedAt, setRefreshedAt] = useStateDash('剛剛');
  const [priceTick, setPriceTick] = useStateDash(0);
  const [selectedDate, setSelectedDate] = useStateDash(new Date(TODAY));
  const [calOpen, setCalOpen] = useStateDash(false);
  const [slideDir, setSlideDir] = useStateDash(0);

  // Net worth from live computed data (accounts + investments - liabilities) — 統一換算台幣
  const curMap = useMemoDash(() => window.buildCurMap(masterData), [masterData]);
  const acctNet = computedAcctGroups.reduce((a, g) => {
    const sum = g.items.reduce((b, it) => b + (it.amountTWD != null ? it.amountTWD : it.amount), 0);
    return a + (g.sign < 0 ? -sum : sum);
  }, 0);
  const investMv = computedHoldings.flatMap((g) => g.items).reduce((a, it) => a + (it.mvTWD != null ? it.mvTWD : it.mv || 0), 0);
  const total = acctNet + investMv;

  // 當月收支統計
  const nowDate = window.TODAY_DATE || TODAY;
  const thisY = nowDate.getFullYear(),thisM = nowDate.getMonth();
  const curMonthFlows = savedFlows.filter((f) => {
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    return d.getFullYear() === thisY && d.getMonth() === thisM;
  });
  const monthlyExp = curMonthFlows.filter((f) => f.kind === 'exp').reduce((a, f) => a + f.amount, 0);
  const monthlyInc = curMonthFlows.filter((f) => f.kind === 'inc').reduce((a, f) => a + f.amount, 0);

  const mask = (v) => hideAmounts ? '••••••' : fmtMoney(Math.round(v));

  const doRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {setPriceTick((t) => t + 1);setRefreshedAt('剛剛');setRefreshing(false);}, 1200);
  };

  const stepDay = (delta) => {
    setSelectedDate((d) => {
      const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
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
    <div style={{ ...{ padding: PAD('12px 14px 32px'), color: TOKENS.ink }, padding: "0px 10px 26px" }}>
      {/* Big total */}
      <div onClick={onOpenStats} style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        padding: PAD('14px 16px'), borderRadius: RS(22), border: 'none',
        background: TOKENS.gradDark,
        boxShadow: SH('0 12px 28px rgba(0,0,0,0.25)')
      }}>
        <div style={{ position: 'absolute', top: -30, left: -20, width: 110, height: 110,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: FS(16), color: 'rgba(255,255,255,0.78)', letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: SP(10) }}>
              {nowDate.getMonth() + 1} 月收支統計
            </div>
            <div style={{ display: 'flex', gap: SP(24) }}>
              <div>
                <div style={{ fontSize: FS(13), color: 'rgba(255,255,255,0.60)', marginBottom: SP(2) }}>本月支出</div>
                <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(22), fontWeight: 700, color: TOKENS.chart1 }}>
                  {hideAmounts ? '••••••' : '-' + fmtMoney(Math.round(monthlyExp))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: FS(13), color: 'rgba(255,255,255,0.60)', marginBottom: SP(2) }}>本月收入</div>
                <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(22), fontWeight: 700, color: TOKENS.chart2 }}>
                  {hideAmounts ? '••••••' : fmtMoney(Math.round(monthlyInc))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: SP(4) }}>
            <div style={{ fontSize: FS(13), color: 'rgba(255,255,255,0.55)' }}>查看明細 ›</div>
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
          recordEdits={recordEdits} recordDeletes={recordDeletes} curMap={curMap} masterData={masterData}
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

/* ── 共用大型甜甜圈（環外標註名稱與 %，中央顯示總額）─────────────── */
function StatDonut({ data, total, label, color, mask }) {
  const DR = 92,DT = 24,GAP = 66,cx = DR + DT / 2 + GAP,LSIZE = cx * 2,DC = 2 * Math.PI * DR;
  let acc = 0;
  const arcs = data.map((c) => { const len = c.pct / 100 * DC,off = acc / 100 * DC;acc += c.pct;return { ...c, len, off, mid: (off + len / 2) / DC }; });
  const labelR = DR + DT / 2 + 28;
  // 中央數字依字數縮放，避免長金額壓到圓環
  const amtStr = mask(Math.round(total));
  const aLen = String(amtStr).length;
  const amtFS = aLen <= 6 ? 28 : aLen <= 8 ? 24 : aLen <= 10 ? 20 : aLen <= 12 ? 17 : 15;
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: LSIZE, margin: '0 auto' }}>
      <svg width="100%" viewBox={`0 0 ${LSIZE} ${LSIZE}`} style={{ display: 'block' }}>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={DR} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={DT} />
          {arcs.map((a, i) =>
          <circle key={i} cx={cx} cy={cx} r={DR} fill="none"
          stroke={a.color} strokeWidth={DT}
          strokeDasharray={a.len + ' ' + DC} strokeDashoffset={-a.off} />
          )}
        </g>
        {arcs.filter((a) => a.pct >= 4).map((a, i) => {
          const ang = a.mid * 2 * Math.PI;
          const x = cx + labelR * Math.sin(ang),y = cx - labelR * Math.cos(ang);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(44,44,50,0.82)" style={{ fontSize: '13px' }}>
              <tspan x={x} dy="-0.35em" style={{ fontWeight: 700, fontSize: '14px' }} fill={a.color}>{a.pct.toFixed(1)}%</tspan>
              <tspan x={x} dy="1.25em">{a.name}</tspan>
            </text>);
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.55)' }}>{label}</div>
        <div style={{ fontSize: FS(amtFS), fontWeight: 700, color, fontFamily: TOKENS.fontMono, marginTop: SP(2), letterSpacing: aLen > 8 ? -0.5 : 0, lineHeight: 1 }}>
          {amtStr}
        </div>
      </div>
    </div>);
}
window.StatDonut = StatDonut;

// 資產 / 投資類別 → 看板風格的 Lucide 圖示名稱
const ASSET_ICON = { '現金': 'Banknote', '存款': 'Wallet', '股票': 'TrendUp', '美股': 'Banknote', '債券': 'Receipt',
  '市值 ETF': 'ChartPie', '主動 ETF': 'ChartPie', 'ETF': 'ChartPie', '特別股': 'PiggyBank' };
function assetIconName(n) {
  if (ASSET_ICON[n]) return ASSET_ICON[n];
  if (/ETF/.test(n)) return 'ChartPie';
  if (/債/.test(n)) return 'Receipt';
  if (/美|US/i.test(n)) return 'Banknote';
  if (/存款|銀行/.test(n)) return 'Wallet';
  if (/現金|錢/.test(n)) return 'Banknote';
  return 'TrendUp';
}
window.assetIconName = assetIconName;
// 資產配置圓餅圖裡較難理解的類別，給一句白話說明。
const ASSET_CAT_NOTE = { '現金': '錢包 + 儲值卡 + 電子支付 + 其他', '存款': '銀行帳戶（含交割戶）' };

/* ── MonthlyStatsSheet ─────────────────────────────────────────────── */
function MonthlyStatsSheet({ open, onClose, savedFlows, masterData, hideAmounts, nowDate, mask }) {
  const { X, ChevronRight } = window.Icons;
  const [shown, setShown] = useStateDash(false);
  const [view, setView] = useStateDash('exp'); // exp | inc | year
  const [monthOffset, setMonthOffset] = useStateDash(0);
  const [yearOffset, setYearOffset] = useStateDash(0);
  const [pickOpen, setPickOpen] = useStateDash(false);
  const [pickYear, setPickYear] = useStateDash((nowDate || new Date()).getFullYear());
  useEffectDash(() => {
    if (open) {setMonthOffset(0);setYearOffset(0);setPickOpen(false);setView('exp');const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [open]);

  if (!open) return null;

  const isYear = view === 'year';
  const viewDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + monthOffset, 1);
  const thisY = viewDate.getFullYear(),thisM = viewDate.getMonth();
  const viewYear = nowDate.getFullYear() + yearOffset;
  const canNext = monthOffset < 0;
  const canNextYear = yearOffset < 0;

  const curFlows = savedFlows.filter((f) => {
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    return d.getFullYear() === thisY && d.getMonth() === thisM;
  });
  const yearFlows = savedFlows.filter((f) => {
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    return d.getFullYear() === viewYear;
  });

  // 暖色調（支出）/ 冷色調（收入）
  const EXP_COLORS = [TOKENS.red, TOKENS.orange, TOKENS.gold, TOKENS.red2, TOKENS.gold2, '#A85638', '#D9A05B', TOKENS.gray4];
  const INC_COLORS = [TOKENS.blue2, TOKENS.teal, TOKENS.green, TOKENS.indigo, TOKENS.blue, TOKENS.green2, '#3E6E8C', TOKENS.gray4];
  const buildCats = (flows, kind, palette) => {
    const m = {};
    flows.filter((f) => f.kind === kind).forEach((f) => { const k = f.cat || '其他'; m[k] = (m[k] || 0) + f.amount; });
    const total = Object.values(m).reduce((a, v) => a + v, 0);
    const cats = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
      name: k, value: v, color: palette[i % palette.length], pct: total > 0 ? v / total * 100 : 0
    }));
    return { cats, total };
  };
  const { cats: expCats, total: expTotal } = buildCats(curFlows, 'exp', EXP_COLORS);
  const { cats: incCats, total: incTotal } = buildCats(curFlows, 'inc', INC_COLORS);

  // 年收支：12 個月的收入 / 支出
  const yMonths = Array.from({ length: 12 }, (_, mo) => ({ inc: 0, exp: 0 }));
  yearFlows.forEach((f) => {
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    const mo = d.getMonth();
    if (f.kind === 'inc') yMonths[mo].inc += f.amount;
    else if (f.kind === 'exp') yMonths[mo].exp += f.amount;
  });
  const yearInc = yMonths.reduce((a, m) => a + m.inc, 0);
  const yearExp = yMonths.reduce((a, m) => a + m.exp, 0);
  const yearNet = yearInc - yearExp;
  const yMax = Math.max(1, ...yMonths.map((m) => Math.max(m.inc, m.exp)));

  const accent = view === 'inc' ? TOKENS.incBlue : TOKENS.red;
  const cats = view === 'inc' ? incCats : expCats;
  const total = view === 'inc' ? incTotal : expTotal;
  const centerLabel = view === 'inc' ? '總收入' : '總支出';

  // 年收支折線圖（收入 / 支出）
  const LineChart = () => {
    const W = 340,H = 150,pL = 6,pR = 6,pT = 12,pB = 22,n = 12;
    const maxV = Math.max(1, ...yMonths.map((m) => Math.max(m.inc, m.exp)));
    const xAt = (i) => pL + (W - pL - pR) * (i / (n - 1));
    const yAt = (v) => pT + (H - pT - pB) * (1 - v / maxV);
    const mk = (key) => yMonths.map((m, i) => `${xAt(i).toFixed(1)},${yAt(m[key]).toFixed(1)}`).join(' ');
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <line x1={pL} y1={H - pB} x2={W - pR} y2={H - pB} stroke="rgba(0,0,0,0.10)" />
        <polyline points={mk('inc')} fill="none" stroke={TOKENS.incBlue} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={mk('exp')} fill="none" stroke={TOKENS.red} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {yMonths.map((m, i) => [
        <circle key={'i' + i} cx={xAt(i)} cy={yAt(m.inc)} r="2.6" fill={TOKENS.incBlue} />,
        <circle key={'e' + i} cx={xAt(i)} cy={yAt(m.exp)} r="2.6" fill={TOKENS.red} />]
        )}
        {yMonths.map((_, i) => <text key={'t' + i} x={xAt(i)} y={H - 6} textAnchor="middle" fill="rgba(44,44,50,0.5)" style={{ fontSize: '10px' }}>{i + 1}</text>)}
      </svg>);
  };

  // 年收支：每月結餘柱狀圖（正藍 / 負紅，零基準線置中）
  const NetBars = () => {
    const nets = yMonths.map((m) => m.inc - m.exp);
    const maxAbs = Math.max(1, ...nets.map((v) => Math.abs(v)));
    const W = 340,H = 150,pT = 10,pB = 22,n = 12;
    const zeroY = pT + (H - pT - pB) / 2;
    const bw = W / n * 0.5;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(0,0,0,0.14)" />
        {nets.map((v, i) => {
          const c = W / n * (i + 0.5),h = Math.abs(v) / maxAbs * ((H - pT - pB) / 2),pos = v >= 0;
          return <rect key={i} x={c - bw / 2} y={pos ? zeroY - h : zeroY} width={bw} height={h} rx="2" fill={pos ? TOKENS.incBlue : TOKENS.red} />;
        })}
        {nets.map((_, i) => <text key={'t' + i} x={W / n * (i + 0.5)} y={H - 6} textAnchor="middle" fill="rgba(44,44,50,0.5)" style={{ fontSize: '10px' }}>{i + 1}</text>)}
      </svg>);
  };

  const segBtn = (id, lbl) => {
    const on = view === id;
    return (
      <button key={id} onClick={() => { setView(id); setPickOpen(false); }} style={{
        flex: 1, height: 44, borderRadius: RS(14), border: 'none',
        background: on ? TOKENS.surface : 'transparent',
        boxShadow: on ? SH('0 2px 8px rgba(0,0,0,0.12)') : 'none',
        color: on ? TOKENS.ink : 'rgba(44,44,50,0.55)', fontSize: FS(17), fontWeight: on ? 700 : 500,
        cursor: 'pointer' }}>{lbl}</button>);
  };

  const stepperBtn = (onClick, enabled, flip) =>
  <button onClick={onClick} disabled={!enabled} style={{
    width: 38, height: 38, borderRadius: RS(12), flexShrink: 0,
    background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink,
    opacity: enabled ? 1 : 0.35, cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <ChevronRight size={18} style={flip ? { transform: 'rotate(180deg)' } : undefined} />
  </button>;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: "3px 10px 8px" }}>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: FS(28), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.3 }}>
              收支統計
            </div>
          </div>
        </div>

        {/* 月支出 / 月收入 / 年收支 切換 */}
        <div style={{ padding: "0 10px 10px" }}>
          <div style={{ display: 'flex', gap: SP(4), padding: SP(4), borderRadius: RS(18),
            background: 'rgba(0,0,0,0.06)' }}>
            {segBtn('exp', '月支出')}{segBtn('inc', '月收入')}{segBtn('year', '年收支')}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: "0px 10px 32px", display: 'flex', flexDirection: 'column', gap: SP(16) }}>

          {/* 期間切換（只切換上 / 下一個月或年） */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(16), paddingTop: SP(4) }}>
            {isYear ? stepperBtn(() => setYearOffset(yearOffset - 1), true, true) : stepperBtn(() => setMonthOffset(monthOffset - 1), true, true)}
            <div style={{ fontSize: FS(21), fontWeight: 700, color: TOKENS.ink, letterSpacing: 0.3, minWidth: 132, textAlign: 'center' }}>
              {isYear ? `${viewYear} 年` : `${thisY} 年 ${thisM + 1} 月`}
            </div>
            {isYear ? stepperBtn(() => canNextYear && setYearOffset(yearOffset + 1), canNextYear) : stepperBtn(() => canNext && setMonthOffset(monthOffset + 1), canNext)}
          </div>

          {/* 月支出 / 月收入：甜甜圈 + 類別清單 */}
          {!isYear &&
          <div style={{ background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('20px 16px') }}>
            {cats.length === 0 ?
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.4)', textAlign: 'center', padding: PAD('24px 0') }}>
              {view === 'inc' ? '本月尚無收入紀錄' : '本月尚無支出紀錄'}
            </div> :
            <>
              <StatDonut data={cats} total={total} label={centerLabel} color={accent} mask={mask} />
              <div style={{ marginTop: SP(18), display: 'flex', flexDirection: 'column' }}>
                {cats.map((c, i) =>
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 2px'),
                  borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: RS(12), flexShrink: 0,
                    background: `${c.color}22`, border: `1px solid ${c.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => { const Ico = window.Icons[flowIconName({ cat: c.name, kind: view === 'inc' ? 'inc' : 'exp' })] || window.Icons.Receipt; return <Ico size={20} style={{ color: c.color }} />; })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.5)', marginTop: SP(1) }}>{c.pct.toFixed(1)}%</div>
                  </div>
                  <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19), fontWeight: 600, flexShrink: 0,
                    color: accent }}>{view === 'inc' ? '+' : '-'}{mask(c.value)}</div>
                </div>
                )}
              </div>
            </>
            }
          </div>
          }

          {/* 年收支：折線圖 + 結餘柱狀圖（置頂）+ 年收入 / 年支出 / 結餘 */}
          {isYear &&
          <>
            <div style={{ background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px 12px') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SP(14), marginBottom: SP(8), paddingLeft: SP(2) }}>
                <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 700, letterSpacing: 1 }}>收入支出</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13), color: 'rgba(44,44,50,0.6)' }}>
                  <span style={{ width: 12, height: 3, borderRadius: RS(2), background: TOKENS.incBlue }} />收入</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13), color: 'rgba(44,44,50,0.6)' }}>
                  <span style={{ width: 12, height: 3, borderRadius: RS(2), background: TOKENS.red }} />支出</span>
              </div>
              <LineChart />
            </div>

            <div style={{ background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px 12px') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SP(14), marginBottom: SP(8), paddingLeft: SP(2) }}>
                <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 700, letterSpacing: 1 }}>收支餘額</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13), color: 'rgba(44,44,50,0.6)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: RS(2), background: TOKENS.incBlue }} />結餘</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13), color: 'rgba(44,44,50,0.6)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: RS(2), background: TOKENS.red }} />透支</span>
              </div>
              <NetBars />
            </div>

            {/* 每月 收入 / 支出 / 餘額 表單 */}
            <div style={{ background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('14px') }}>
              {!yMonths.some((m) => m.inc > 0 || m.exp > 0) ?
              <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.4)', textAlign: 'center', padding: PAD('16px 0') }}>本年度尚無紀錄</div> :
              <>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: SP(8), borderBottom: '1px solid rgba(0,0,0,0.10)' }}>
                  <div style={{ width: 42, fontSize: FS(13), color: 'rgba(44,44,50,0.5)', fontWeight: 700 }}>月</div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.5)', fontWeight: 700 }}>收入</div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.5)', fontWeight: 700 }}>支出</div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.5)', fontWeight: 700 }}>餘額</div>
                </div>
                {yMonths.map((m, mo) => {
                  if (m.inc <= 0 && m.exp <= 0) return null;
                  const net = m.inc - m.exp;
                  return (
                  <div key={mo} style={{ display: 'flex', alignItems: 'center', padding: PAD('9px 0'), borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 42, fontSize: FS(16), color: TOKENS.ink }}>{mo + 1}月</div>
                    <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), color: m.inc > 0 ? TOKENS.incBlue : 'rgba(44,44,50,0.3)' }}>{m.inc > 0 ? mask(m.inc) : '—'}</div>
                    <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), color: m.exp > 0 ? TOKENS.red : 'rgba(44,44,50,0.3)' }}>{m.exp > 0 ? mask(m.exp) : '—'}</div>
                    <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 600, color: net >= 0 ? TOKENS.incBlue : TOKENS.red }}>{net >= 0 ? '+' : '-'}{mask(Math.abs(net))}</div>
                  </div>);
                })}
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: SP(11), marginTop: SP(2), borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                  <div style={{ width: 42, fontSize: FS(16), fontWeight: 700, color: TOKENS.ink }}>合計</div>
                  <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: TOKENS.incBlue }}>{mask(yearInc)}</div>
                  <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: TOKENS.red }}>{mask(yearExp)}</div>
                  <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: yearNet >= 0 ? TOKENS.incBlue : TOKENS.red }}>{yearNet >= 0 ? '+' : '-'}{mask(Math.abs(yearNet))}</div>
                </div>
              </>
              }
            </div>
          </>
          }
        </div>
      </div>
    </div>);
}

/* ── NetWorthSheet: 資產淨額明細 bottom sheet ─────────────────────── */
function NetWorthSheet({ open, onClose, total, computedAcctGroups, computedHoldings, mask, hideAmounts }) {
  const { ChevronRight } = window.Icons;

  if (!open) return null;

  const amtTWD = (x) => x.amountTWD != null ? x.amountTWD : x.amount;
  const mvTWD = (x) => x.mvTWD != null ? x.mvTWD : x.mv || 0;

  // 現金側拆成兩類：
  //   存款 = 銀行(含交割戶) 所有存款
  //   現金 = 台幣錢包 + 儲值卡 + 電子支付 + 其他（+ 證券戶餘額，避免遺漏）
  // 信用卡等負債先從存款扣、不足再扣現金，讓圓餅總和 = 資產淨額。
  let bankSum = 0, walletSum = 0;
  const liabRows = [];
  computedAcctGroups.forEach((g) => {
    const sum = g.items.reduce((a, it) => a + amtTWD(it), 0);
    if (g.sign < 0) {
      // sum > 0 = 欠款(負債)；sum < 0 = 溢繳/預付卡片餘額 → 是資產不是負債。
      // 不能用 Math.abs 把溢繳硬轉成負債，否則繳完卡費（餘額轉正）後負債反而變大。
      if (sum >= 1) liabRows.push({ name: g.name, value: sum, color: g.color });
      else if (sum <= -1) walletSum += -sum; // 併入現金
      return;
    }
    if (g.id === 'bank') bankSum += sum;else walletSum += sum;
  });
  const totalLiab = liabRows.reduce((a, c) => a + c.value, 0);
  let deposit = bankSum, cash = walletSum, liabLeft = totalLiab;
  const dCut = Math.min(Math.max(deposit, 0), liabLeft);deposit -= dCut;liabLeft -= dCut;
  cash -= liabLeft;

  // 投資持倉：直接依使用者設定的股票類別（市值型 / 高息型 / 科技型 / 主動型 / 個股 / 債券 …）分組市值，
  // 不再用名稱關鍵字硬猜成「股票/債券/美股」三桶。
  const INV_COLORS = [TOKENS.inv1, TOKENS.inv2, TOKENS.inv3, TOKENS.inv4, TOKENS.inv5, TOKENS.inv6, TOKENS.gold, TOKENS.indigo];
  const cats = [];
  if (Math.abs(cash) >= 1) cats.push({ name: '現金', value: cash, color: TOKENS.green });
  if (Math.abs(deposit) >= 1) cats.push({ name: '存款', value: deposit, color: TOKENS.blue2 });
  const buckets = {};
  computedHoldings.forEach((g) => {
    const mv = g.items.reduce((a, it) => a + mvTWD(it), 0);
    if (mv < 1) return;
    const b = g.name || g.id || '股票';
    buckets[b] = (buckets[b] || 0) + mv;
  });
  Object.keys(buckets).sort((a, b) => buckets[b] - buckets[a]).forEach((b, i) => {
    cats.push({ name: b, value: buckets[b], color: INV_COLORS[i % INV_COLORS.length] });
  });

  const assets = cats.filter((c) => c.value > 0);
  const totalAssets = assets.reduce((a, c) => a + c.value, 0);

  const assetData = assets.map((c) => ({ name: c.name, color: c.color, pct: totalAssets > 0 ? c.value / totalAssets * 100 : 0 }));
  const cardStyle = { background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px') };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
        <div style={{ ...{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('3px 13px 8px') }, padding: "3px 10px 8px" }}>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          <div>
            <div style={{ fontSize: FS(28), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.3 }}>資產淨額明細</div>
          </div>
        </div>

        <div style={{ ...{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 32px'),
            display: 'flex', flexDirection: 'column', gap: SP(20) }, padding: "0px 10px 32px" }}>
          {/* 資產配置 圓餅 */}
          <div style={{ ...cardStyle, padding: PAD('20px 16px') }}>
            <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: SP(6), paddingLeft: SP(2) }}>資產配置</div>
            {assets.length === 0 ?
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.4)', textAlign: 'center', padding: PAD('12px 0') }}>尚無資產</div> :
            <>
              <StatDonut data={assetData} total={totalAssets} label="資產" color={TOKENS.ink} mask={mask} />
              <div style={{ marginTop: SP(14), display: 'flex', flexDirection: 'column' }}>
                {assets.map((c, i) =>
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 2px'),
                  borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: RS(12), flexShrink: 0,
                    background: `${c.color}22`, border: `1px solid ${c.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => { const Ico = window.Icons[assetIconName(c.name)] || window.Icons.Wallet; return <Ico size={20} style={{ color: c.color }} />; })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink }}>{c.name}</div>
                    <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.5)', marginTop: SP(1) }}>
                      {totalAssets > 0 ? (c.value / totalAssets * 100).toFixed(1) : '0.0'}%
                      {ASSET_CAT_NOTE[c.name] ? ' · ' + ASSET_CAT_NOTE[c.name] : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19), fontWeight: 600, flexShrink: 0, color: TOKENS.ink }}>
                    {mask(c.value)}
                  </div>
                </div>
                )}
              </div>
            </>
            }
          </div>

          {/* 負債明細 */}
          {liabRows.length > 0 &&
          <div style={cardStyle}>
            <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: SP(8), paddingLeft: SP(2) }}>負債明細（已自資產扣除）</div>
            {liabRows.map((c, i) =>
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: SP(12),
              padding: PAD('11px 2px'),
              borderBottom: i < liabRows.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: RS(3), background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: FS(18), fontWeight: 500, color: TOKENS.ink }}>{c.name}</div>
              <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 600, color: TOKENS.red }}>
                -{mask(c.value)}
              </div>
            </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('11px 2px'),
              borderTop: '1px solid rgba(0,0,0,0.10)', marginTop: SP(2) }}>
              <div style={{ flex: 1, fontSize: FS(18), fontWeight: 600, color: TOKENS.ink }}>負債合計</div>
              <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 700, color: TOKENS.red }}>
                -{mask(totalLiab)}
              </div>
            </div>
          </div>
          }
        </div>
      </div>
    </div>);
}

window.DashboardScreen = DashboardScreen;
window.MonthlyStatsSheet = MonthlyStatsSheet;
window.CalendarSheet = CalendarSheet;
window.DateNavBar = DateNavBar;
window.TODAY_DATE = TODAY;
window.NetWorthSheet = NetWorthSheet;