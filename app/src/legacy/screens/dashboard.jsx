// Dashboard / 資產整合看板
import { ffRecurringDay } from '../recurring.js';

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

// 自動轉帳/定期支出規則的扣款日（1–28）；夾限規則與規則儲存端共用同一份實作。
const recurringDayOf = ffRecurringDay;
// 只比較日期（忽略時分秒），用來判斷 selectedDate 是否為「今天以後」的未來日期
function dateOnly(d) {return new Date(d.getFullYear(), d.getMonth(), d.getDate());}

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

function CalendarSheet({ open, date, onPick, onClose, savedRecurring = [] }) {
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
  // 自動轉帳/定期支出每月重複，只要「幾號」符合扣款日，不論該月是過去或未來都標記小點。
  const hasRecurring = (d) => (savedRecurring || []).some((r) => r.enabled && recurringDayOf(r) === d);
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
              const rec = hasRecurring(d);
              const dow = i % 7;
              return (
                <button key={i} disabled={fut} onClick={() => onPick(new Date(year, month, d))}
                style={{
                  position: 'relative',
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
                }}>{d}
                  {rec &&
                  <span style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    background: sel ? TOKENS.surface : TOKENS.accent }} />
                  }
                </button>);

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

function DailyView({ date, hideAmounts, extraFlows = [], extraTrades = [], onEditRecord, recordEdits = {}, recordDeletes = [], curMap = {}, masterData = {}, savedRecurring = [] }) {
  const { Calendar, ArrowUpRight } = window.Icons;
  const mask = (v) => fmtMoney(Math.round(v)); // 一般數字不再受眼睛遮蔽；只遮最上層總額

  // 類別（群組）查詢：支出用 cat_exp，收入用 cat_inc
  const catGroupOf = (t) => {
    if (t.kind === 'exp') {
      const items = (masterData.cat_exp || []).map((c) => typeof c === 'string' ? { name: c, group: c } : c);
      const hit = items.find((c) => c.name === t.cat);
      if (hit) return hit.group;
      if ((masterData.exp_groups || []).some((g) => (typeof g === 'string' ? g : g.name) === t.cat)) return t.cat;
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

  // 分區塊顯示：收支（支出+收入）／轉帳／股票買賣 各自一塊，當日沒有該類紀錄就整塊隱藏
  const incExpFlows = flows.filter((t) => t.kind !== 'xfer');
  const xferFlows = flows.filter((t) => t.kind === 'xfer');
  const xferTotal = xferFlows.reduce((a, t) => a + flowTWD(t), 0);
  const XferIcon = window.Icons.RefreshCw || Calendar;
  const cardBox = { ...{ marginTop: SP(8), background: TOKENS.surface, borderRadius: RS(18),
      border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden', width: "382px" }, borderRadius: "11px", background: "rgb(248, 247, 243)" };
  const secHead = (Ico, label, right, rightColor, first) =>
  <div style={{ marginTop: first ? 0 : SP(16), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "0px 5px" }}>
    <div style={{ color: 'rgba(0,0,0,0.90)', fontSize: FS(18), letterSpacing: 1,
      textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: SP(8) }}>
      <Ico size={14} /> {label}
    </div>
    <span style={{ fontSize: FS(18), fontFamily: TOKENS.fontMono, fontWeight: 600,
      whiteSpace: 'nowrap', flexShrink: 0, color: rightColor }}>{right}</span>
  </div>;
  const renderFlow = (t, i, arr) => {
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
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(6), minWidth: 0 }}>
                    <span style={{ fontSize: FS(20), fontWeight: 500, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {t._autoGen && (t.merchant === '投資獲利' || t.merchant === '投資損失') ? t.merchant : t.cat}
                    </span>
                    {!t._autoGen && t.merchant && t.merchant !== t.cat && t.merchant !== t.account &&
                    <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.42)', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>}
                    {t._autoGen && <span style={{ fontSize: FS(13), fontWeight: 600, color: TOKENS.gray3, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: RS(6), whiteSpace: 'nowrap', flexShrink: 0 }}>系統自動</span>}
                  </div>
                  <div style={{ ...{ fontSize: FS(16), color: 'rgba(0,0,0,0.84)', marginTop: SP(2),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, fontSize: "14px" }}>
                    {(t.account || '').includes('__stock_position__') ? t.merchant : t.account}
                  </div>
                </> :
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(6), minWidth: 0 }}>
                    <span style={{ ...{ fontSize: FS(20), fontWeight: 500, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, fontSize: "18px", flexShrink: 0 }}>
                      {t._autoGen && (t.merchant === '投資獲利' || t.merchant === '投資損失') ? t.merchant : t.cat}
                    </span>
                    {!t._autoGen && t.merchant && t.merchant !== t.cat && t.merchant !== t.account &&
                    <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.42)', flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>}
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
                {(() => { const c = curMap[t.kind === 'xfer' ? t.fromAccount : t.account]; return c && c !== 'TWD' ?
                  <span style={{ fontSize: FS(12), fontWeight: 400, opacity: 0.72, marginRight: 2 }}>{c}</span> : null; })()}
                {sign}{mask(t.amount)}
              </div>
            </div>);

  };
  const renderTrade = (t, i, arr) => {
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
                // 帶入原本記錄的手續費/證交稅（匯入資料為 0，成本已內含），
                // 避免編輯時被重新自動試算而還原成非 0。
                feeOverride: t.fee != null ? String(t.fee) : null,
                taxOverride: t.tax != null ? String(t.tax) : null,
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

  };

  // 未來日期（今天以後）才顯示「預定」提示，且金額不算入當日收支——要等到當天真的執行才算數。
  const isFutureDay = dateOnly(date).getTime() > dateOnly(TODAY).getTime();
  const pendingRecurring = isFutureDay ?
  (savedRecurring || []).filter((r) => r.enabled && recurringDayOf(r) === date.getDate()) : [];

  const noAny = flows.length === 0 && trades.length === 0 && pendingRecurring.length === 0;
  let firstSec = true;
  const takeFirst = () => {const f = firstSec;firstSec = false;return f;};
  return (
    <div>
      {noAny &&
      <div style={cardBox}>
        <div style={{ padding: PAD('20px 16px'), textAlign: 'center', fontSize: FS(18),
          color: 'rgba(44,44,50,0.4)', width: "382px" }}>當日無紀錄</div>
      </div>
      }
      {incExpFlows.length > 0 && <React.Fragment>
        {secHead(Calendar, '當日收支', '餘額 ' + (incTotal - expTotal < 0 ? '-' : '') + mask(Math.abs(incTotal - expTotal)), incTotal - expTotal < 0 ? TOKENS.red : TOKENS.ink2, takeFirst())}
        <div style={cardBox}>{incExpFlows.map(renderFlow)}</div>
      </React.Fragment>}
      {xferFlows.length > 0 && <React.Fragment>
        {secHead(XferIcon, '當日轉帳', mask(xferTotal), TOKENS.ink2, takeFirst())}
        <div style={cardBox}>{xferFlows.map(renderFlow)}</div>
      </React.Fragment>}
      {trades.length > 0 && <React.Fragment>
        {secHead(ArrowUpRight, '當日股票買賣', (sellTotal - buyTotal < 0 ? '餘額 -' : '餘額 ') + mask(Math.abs(sellTotal - buyTotal)), sellTotal - buyTotal < 0 ? TOKENS.red : TOKENS.ink2, takeFirst())}
        <div style={cardBox}>{trades.map(renderTrade)}</div>
      </React.Fragment>}
      {pendingRecurring.length > 0 && <React.Fragment>
        {secHead(Calendar, '預定項目', '', TOKENS.ink2, takeFirst())}
        <div style={cardBox}>
          {pendingRecurring.map((r, i) =>
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: SP(14), padding: PAD('12px 14px'),
            borderBottom: i < pendingRecurring.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none', minHeight: 56 }}>
            <div style={{ width: 38, height: 44, borderRadius: RS(19), flexShrink: 0,
              background: 'rgba(0,0,0,0.05)', border: '1px dashed rgba(0,0,0,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} style={{ color: 'rgba(44,44,50,0.5)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(6), minWidth: 0 }}>
                <span style={{ fontSize: FS(20), fontWeight: 500, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name || (r.type === 'transfer' ? '自動轉帳' : '定期支出')}
                </span>
                <span style={{ fontSize: FS(13), fontWeight: 600, color: TOKENS.gray3,
                  background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: RS(6), whiteSpace: 'nowrap' }}>預定</span>
              </div>
              <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.5)', marginTop: SP(2),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.type === 'transfer' ? `${r.fromAccount} → ${r.toAccount}` : `${r.category} · ${r.account}`}
              </div>
            </div>
            <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 600,
              color: 'rgba(44,44,50,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{mask(r.amount)}</div>
          </div>
          )}
        </div>
      </React.Fragment>}
    </div>);

}

function DashWidget({ which, hideAmounts, accountsPie, stocks }) {
  const { ChartPie, Activity, ArrowUpRight } = window.Icons;
  const mask = (v) => fmtMoney(Math.round(v)); // 一般數字不遮；小工具中央總額另外處理
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
    centerValue = hideAmounts ? '••••••' : fmtMoney(Math.round(totalMv)); // 最上層總額 → 眼睛遮蔽
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

function DashboardScreen({ hideAmounts, setHideAmounts, savedFlows = [], savedTrades = [], dashWidget = 'accounts', onEditRecord, recordEdits = {}, recordDeletes = [], computedAcctGroups = [], computedHoldings = [], masterData = {}, onOpenStats, onDateChange }) {
  const { RefreshCw, Eye, EyeOff, TrendUp, TrendDown, ArrowUpRight, ChartPie } = window.Icons;
  const [refreshing, setRefreshing] = useStateDash(false);
  const [refreshedAt, setRefreshedAt] = useStateDash('剛剛');
  const [priceTick, setPriceTick] = useStateDash(0);
  const [selectedDate, setSelectedDate] = useStateDash(new Date(TODAY));
  // 回報目前檢視的日期給上層：從看板點「+記一筆」時，預設帶入切換後的日期
  useEffectDash(() => { if (onDateChange) onDateChange(selectedDate); }, [selectedDate]);
  const [calOpen, setCalOpen] = useStateDash(false);
  const [slideDir, setSlideDir] = useStateDash(0);
  // 自動轉帳/定期支出規則：只用來畫月曆小點與「預定」提示，不在這裡編輯。用一般變數（非
  // useState）每次 render 都重新讀 localStorage，避免因為在設定頁改了規則、切回看板時資料過期。
  let savedRecurring = [];
  try {savedRecurring = JSON.parse(localStorage.getItem('ff_recurring') || '[]') || [];} catch {}

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
  // 統計一律換算台幣：外幣帳戶的金額依 curMap[帳戶] 幣別換算，避免外幣以面額直接加總
  const flowTWD = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  const monthlyExp = curMonthFlows.filter((f) => f.kind === 'exp').reduce((a, f) => a + flowTWD(f), 0);
  const monthlyInc = curMonthFlows.filter((f) => f.kind === 'inc').reduce((a, f) => a + flowTWD(f), 0);

  const mask = (v) => fmtMoney(Math.round(v)); // 一般數字不再受眼睛遮蔽；只遮最上層總額

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
      if (dx > 0) stepDay(-1); // 右滑 → 前一天
      else stepDay(1); // 左滑 → 後一天
    }
  };

  return (
    <div style={{ ...{ padding: PAD('12px 14px 32px'), color: TOKENS.ink }, padding: "0px 10px 26px" }}>
      {/* Big total */}
      <div onClick={onOpenStats} style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        padding: PAD('14px 16px'), borderRadius: RS(22), border: 'none',
        background: TOKENS.gradDark,
        boxShadow: TOKENS.innerGlow + ', ' + SH('0 12px 28px rgba(0,0,0,0.25)')
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
          extraTrades={savedTrades.filter((t) => dayKey(t.date) === dayKey(selectedDate))}
          savedRecurring={savedRecurring} />
        </div>
      </div>

      <CalendarSheet open={calOpen}
      savedRecurring={savedRecurring}
      date={selectedDate}
      onPick={(d) => {setSelectedDate(d);setCalOpen(false);setSlideDir(0);}}
      onClose={() => setCalOpen(false)} />
    </div>);

}

/* ── 共用大型甜甜圈（環外標註名稱與 %，中央顯示總額）─────────────── */
// 遮罩 id 得全域唯一：消費分析／資產配置／投資市值三個圓餅圖可能同時掛在 DOM 上，撞號會互吃遮罩。
let donutSeq = 0;
function StatDonut({ data, total, label, color, mask }) {
  const DR = 92,DT = 24,GAP = 66,cx = DR + DT / 2 + GAP,LSIZE = cx * 2,DC = 2 * Math.PI * DR;
  const wipeRef = useRefDash(null);
  if (!wipeRef.current) wipeRef.current = 'ffDonutWipe' + ++donutSeq;
  // 選取狀態存「名稱」而非索引：持股依市值排序，背景報價刷新可能換順序，存索引會指到別人身上。
  const [activeName, setActiveName] = useStateDash(null);
  let acc = 0;
  const arcs = data.map((c) => { const len = c.pct / 100 * DC,off = acc / 100 * DC;acc += c.pct;return { ...c, len, off, mid: (off + len / 2) / DC }; });
  const active = activeName ? arcs.find((a) => a.name === activeName) : null;
  const isOn = (a) => !active || active.name === a.name;
  const labelR = DR + DT / 2 + 28;
  // 中央：沒選取顯示總額，選了某片就顯示該片。呼叫端沒帶 value 時用占比回推。
  const sliceValue = (a) => a.value == null ? total * a.pct / 100 : a.value;
  // 中央數字依字數縮放，避免長金額壓到圓環
  const amtStr = mask(Math.round(active ? sliceValue(active) : total));
  const aLen = String(amtStr).length;
  const amtFS = aLen <= 6 ? 28 : aLen <= 8 ? 24 : aLen <= 10 ? 20 : aLen <= 12 ? 17 : 15;
  // 資料驅動的視覺變化（選取加粗／其餘變淡）走 transition + inline style，不用 keyframe：
  // keyframe 的起訖值被 re-render 改寫會斷掉，transition 本來就是為了「值變了平滑過去」而生。
  const arcStyle = (a) => ({ strokeWidth: active && active.name === a.name ? DT + 7 : DT,
    opacity: isOn(a) ? 1 : 0.32, transition: 'stroke-width 180ms ease-out, opacity 180ms ease-out' });
  const toggle = (name) => setActiveName((prev) => prev === name ? null : name);
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: LSIZE, margin: '0 auto',
      opacity: 0, animation: 'fadeInStat 420ms ease-out both' }}>
      <svg width="100%" viewBox={`0 0 ${LSIZE} ${LSIZE}`} style={{ display: 'block' }}>
        <defs>
          {/* 進場動畫：用一個純幾何、不吃 data 的遮罩環把彩色扇區順時針揭開。遮罩的 dasharray／
              dashoffset 只跟半徑有關（DR 寫死），是常數，React 永遠不會改寫，動畫跑到一半也不會被
              背景報價刷新打斷——舊版 fillArc 正是把起訖值綁在資料上才會閃。
              周長 DC 透過 --donutC 帶給 donutWipe keyframe。 */}
          <mask id={wipeRef.current} maskUnits="userSpaceOnUse" x="0" y="0" width={LSIZE} height={LSIZE}>
            {/* 遮罩環刻意不加 transform——跟下面彩色扇區的 rotate(-90) 不同，別「順手」補上去。
                實測（把遮罩光柵化到 canvas、沿圓環每 5° 取樣）：dasharray = 周長、dashoffset 由
                +周長 降到 0 時，可見區間恰好是從 12 點鐘往順時針連續長出來（10%→0°~35°、
                25%→0°~90°、50%→0°~180°、75%→0°~270°）。補上 rotate(-90) 會變成從 12 點鐘
                往逆時針長，再加水平鏡射則整段會跑到 180°~270°。 */}
            {/* 用 linear 而非專案其他動畫那支 cubic-bezier(0.32,0.72,0.18,1)：那條曲線很前傾，
                套在掃描上會在一半時間內就揭露九成、尾段收得很急。掃描要的是等速掠過的手感。 */}
            <circle cx={cx} cy={cx} r={DR} fill="none" stroke="#fff" strokeWidth={DT}
            strokeDasharray={DC}
            style={{ '--donutC': DC, animation: 'donutWipe 760ms linear both' }} />
          </mask>
        </defs>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {/* 底層灰軌不進遮罩：一開始就在，掃描才像在填滿一個容器。點它可取消選取。 */}
          <circle cx={cx} cy={cx} r={DR} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={DT}
          onClick={() => setActiveName(null)} />
          <g mask={`url(#${wipeRef.current})`}>
            {arcs.map((a, i) =>
            <circle key={i} cx={cx} cy={cx} r={DR} fill="none"
            stroke={a.color}
            strokeDasharray={a.len + ' ' + DC} strokeDashoffset={-a.off}
            style={arcStyle(a)} />
            )}
          </g>
          {/* 看不見的加寬命中環疊在最上層，讓細小扇區也點得到；dash 區段角度互不重疊，不會搶點擊。 */}
          {arcs.map((a, i) =>
          <circle key={i} cx={cx} cy={cx} r={DR} fill="none"
          stroke="transparent" strokeWidth={DT + 16}
          strokeDasharray={a.len + ' ' + DC} strokeDashoffset={-a.off}
          onClick={() => toggle(a.name)}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
          )}
        </g>
        {arcs.filter((a) => a.pct >= 4).map((a, i) => {
          const ang = a.mid * 2 * Math.PI;
          const x = cx + labelR * Math.sin(ang),y = cx - labelR * Math.cos(ang);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(44,44,50,0.82)"
            onClick={() => toggle(a.name)}
            style={{ fontSize: '13px', cursor: 'pointer', opacity: isOn(a) ? 1 : 0.32, transition: 'opacity 180ms ease-out' }}>
              <tspan x={x} dy="-0.35em" style={{ fontWeight: 700, fontSize: '14px' }} fill={a.color}>{a.pct.toFixed(1)}%</tspan>
              <tspan x={x} dy="1.25em">{a.name}</tspan>
            </text>);
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: FS(15), color: active ? active.color : 'rgba(44,44,50,0.55)',
          fontWeight: active ? 600 : 400, maxWidth: '62%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active ? active.name : label}
        </div>
        <div style={{ fontSize: FS(amtFS), fontWeight: 700, color: active ? active.color : color, fontFamily: TOKENS.fontMono, marginTop: SP(2), letterSpacing: aLen > 8 ? -0.5 : 0, lineHeight: 1 }}>
          {amtStr}
        </div>
        {active &&
        <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', fontFamily: TOKENS.fontMono, marginTop: SP(3) }}>
          {active.pct.toFixed(1)}%
        </div>}
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
// 資產配置圓餅圖各類別的白話說明。現金/存款不再顯示提示小字（依需求移除）。
const ASSET_CAT_NOTE = {};

/* ── MonthlyStatsSheet ─────────────────────────────────────────────── */
function MonthlyStatsSheet({ open, onClose, savedFlows, masterData, hideAmounts, nowDate, mask }) {
  const { X, ChevronRight, ChevronDown, TrendUp, TrendDown } = window.Icons;
  const StatDonut = window.StatDonut;
  const [shown, setShown] = useStateDash(false);
  const [view, setView] = useStateDash('spend'); // spend | month | year
  const [monthOffset, setMonthOffset] = useStateDash(0);
  const [yearOffset, setYearOffset] = useStateDash(0);
  const [decadeOffset, setDecadeOffset] = useStateDash(0);
  const [expanded, setExpanded] = useStateDash(null);
  const [selIdx, setSelIdx] = useStateDash(null); // 圖表點選的月/年（顯示金額小視窗）
  const [hiddenSeries, setHiddenSeries] = useStateDash(() => new Set()); // 折線圖圖例點選隱藏的線
  const toggleSeries = (k) => setHiddenSeries((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);else next.add(k);
    return next;
  });
  const swipeRef = useRefDash({ x: 0, y: 0, active: false }); // 圖表左右滑動切換期間
  useEffectDash(() => {
    if (open) { setMonthOffset(0); setYearOffset(0); setDecadeOffset(0); setExpanded(null); setSelIdx(null); setView('spend'); setHiddenSeries(new Set()); const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); }
    setShown(false);
  }, [open]);
  if (!open) return null;

  const now = nowDate || new Date();
  // 收入大類：依 cat_inc 的 group 對應到顯示名，大類清單來自 masterData.inc_groups（使用者可自訂新增/刪除）
  const INC_LABEL = { '主動': '主動收入', '被動': '被動收入', '投資收入': '投資收入', '其他': '其他' };
  const incGroupDefs = masterData.inc_groups || [];
  const catIncGroup = {};
  (masterData.cat_inc || []).forEach((c) => { const o = typeof c === 'string' ? { name: c, group: '其他' } : c; catIncGroup[o.name] = o.group || '其他'; });
  const incGroupOf = (cat) => { const g = catIncGroup[cat] || '其他'; return INC_LABEL[g] || g; };
  const INC_GROUPS = incGroupDefs.map((g) => ({ k: INC_LABEL[g.name] || g.name, c: g.color || TOKENS.gray3 }));
  // 支出：投資損失（賣股虧損）不算「消費」，消費分析排除
  const catExpGroup = {};
  (masterData.cat_exp || []).forEach((c) => { const o = typeof c === 'string' ? { name: c, group: c } : c; catExpGroup[o.name] = o.group || ''; });
  const isInvestExp = (cat) => catExpGroup[cat] === '投資損失';

  const dOf = (f) => f.date instanceof Date ? f.date : new Date(f.date);
  // 統計一律換算台幣：外幣帳戶依 curMap[帳戶] 幣別換算，不以面額直接加總
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  // exp = 總支出（含投資損失）；investLoss = 其中的投資損失（賣股虧損），供彈窗拆成「消費支出／投資損失」
  const emptyAgg = () => ({ inc: 0, exp: 0, investLoss: 0, groups: Object.fromEntries(INC_GROUPS.map((g) => [g.k, 0])), incCats: {} });
  const addFlow = (a, f) => {
    const v = amtOf(f);
    if (f.kind === 'inc') { a.inc += v; const g = incGroupOf(f.cat); a.groups[g] = (a.groups[g] || 0) + v; a.incCats[f.cat] = (a.incCats[f.cat] || 0) + v; } else
    if (f.kind === 'exp') { a.exp += v; if (isInvestExp(f.cat)) a.investLoss += v; }
  };

  // ── 消費分析（月）──
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const spY = viewDate.getFullYear(), spM = viewDate.getMonth();
  const EXP_COLORS = [TOKENS.red, TOKENS.orange, TOKENS.gold, TOKENS.red2, TOKENS.gold2, '#A85638', '#D9A05B', TOKENS.indigo, TOKENS.teal, TOKENS.gray4];
  // 消費分析改以「大類」彙總（餐飲/交通/日常/娛樂/醫療/教育/金融保險/其他），排除投資損失。
  const aggSpend = (y, m) => {
    const map = {};
    savedFlows.forEach((f) => { if (f.kind !== 'exp') return; const d = dOf(f); if (d.getFullYear() !== y || d.getMonth() !== m) return; if (isInvestExp(f.cat)) return; const k = catExpGroup[f.cat] || '其他'; map[k] = (map[k] || 0) + amtOf(f); });
    return map;
  };
  // 子分類明細（下鑽用）：同一大類底下依實際 cat 名稱彙總
  const aggSubSpend = (y, m, group) => {
    const map = {};
    savedFlows.forEach((f) => { if (f.kind !== 'exp') return; const d = dOf(f); if (d.getFullYear() !== y || d.getMonth() !== m) return; if (isInvestExp(f.cat)) return; if ((catExpGroup[f.cat] || '其他') !== group) return; map[f.cat] = (map[f.cat] || 0) + amtOf(f); });
    return map;
  };
  const spendMap = aggSpend(spY, spM);
  const spendTotal = Object.values(spendMap).reduce((a, v) => a + v, 0);
  const spendCats = Object.entries(spendMap).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ name: k, value: v, color: EXP_COLORS[i % EXP_COLORS.length], pct: spendTotal > 0 ? v / spendTotal * 100 : 0 }));
  // 月對月比較：跟上個月同一份聚合邏輯比較
  const prevSpDate = new Date(spY, spM - 1, 1);
  const prevSpendMap = aggSpend(prevSpDate.getFullYear(), prevSpDate.getMonth());
  const prevSpendTotal = Object.values(prevSpendMap).reduce((a, v) => a + v, 0);
  // 子分類下鑽：expanded = 目前展開檢視的大類名稱（null = 未展開）
  const subMap = expanded ? aggSubSpend(spY, spM, expanded) : null;
  const subTotal = subMap ? Object.values(subMap).reduce((a, v) => a + v, 0) : 0;
  const subCats = subMap ? Object.entries(subMap).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ name: k, value: v, color: EXP_COLORS[i % EXP_COLORS.length], pct: subTotal > 0 ? v / subTotal * 100 : 0 })) : [];

  // ── 每月收支（年）──
  const viewYear = now.getFullYear() + yearOffset;
  const months = Array.from({ length: 12 }, emptyAgg);
  savedFlows.forEach((f) => { const d = dOf(f); if (d.getFullYear() !== viewYear) return; addFlow(months[d.getMonth()], f); });
  // 去年同期疊加（僅月檢視用）：同一份聚合邏輯，年份改成上一年
  const prevYearMonths = Array.from({ length: 12 }, emptyAgg);
  savedFlows.forEach((f) => { const d = dOf(f); if (d.getFullYear() !== viewYear - 1) return; addFlow(prevYearMonths[d.getMonth()], f); });

  // ── 年度收支（十年）──
  const decadeEnd = now.getFullYear() + decadeOffset * 10;
  const decadeYears = Array.from({ length: 10 }, (_, i) => decadeEnd - 9 + i);
  const yearAgg = {}; decadeYears.forEach((y) => { yearAgg[y] = emptyAgg(); });
  savedFlows.forEach((f) => { const y = dOf(f).getFullYear(); if (yearAgg[y]) addFlow(yearAgg[y], f); });

  const canNextMonth = monthOffset < 0, canNextYear = yearOffset < 0, canNextDecade = decadeOffset < 0;

  // 點選月/年 → 彈出視窗顯示該期間數字（圖表與表格共用同一個選取狀態）
  const toggleSel = (i) => setSelIdx(selIdx === i ? null : i);
  const NET_POS = TOKENS.ink2, NET_NEG = TOKENS.red;
  // 折線系列：依 inc_groups 動態產生每個大類一條線；「投資收入」大類特別淨額扣除投資損失，
  // 顯示為「投資損益」；最後固定加一條消費支出(總支出−投資損失)。
  const CHART_SERIES = [
  ...incGroupDefs.map((g) => {
    const aggKey = INC_LABEL[g.name] || g.name;
    if (g.name === '投資收入') {
      return { k: '投資損益', c: g.color || TOKENS.gold, val: (a) => (a.groups[aggKey] || 0) - (a.investLoss || 0) };
    }
    return { k: aggKey, c: g.color || TOKENS.gray3, val: (a) => a.groups[aggKey] || 0 };
  }),
  { k: '消費支出', c: TOKENS.red, dashed: true, val: (a) => (a.exp || 0) - (a.investLoss || 0) }];
  // 整合圖：收支餘額柱狀（背景）＋ 上述折線（前景），共用同一數值刻度。
  const spendSeries = CHART_SERIES.find((s) => s.k === '消費支出');
  const ComboChart = ({ data, labels, hiddenSeries, prevData }) => {
    const visibleSeries = CHART_SERIES.filter((s) => !hiddenSeries.has(s.k));
    const hideNet = hiddenSeries.has('餘額');
    const showYoY = !!prevData && !hiddenSeries.has('去年同期');
    const W = 340, H = 172, pL = 16, pR = 12, pT = 14, pB = 22, n = data.length;
    const chartH = H - pT - pB;
    const nets = data.map((a) => a.inc - a.exp);
    let maxPos = 0, maxNeg = 0;
    data.forEach((a, i) => {
      visibleSeries.forEach((s) => { const v = s.val(a); maxPos = Math.max(maxPos, v); maxNeg = Math.max(maxNeg, -v); });
      if (!hideNet) { maxPos = Math.max(maxPos, nets[i]); maxNeg = Math.max(maxNeg, -nets[i]); }
      if (showYoY) { const v = spendSeries.val(prevData[i]); maxPos = Math.max(maxPos, v); maxNeg = Math.max(maxNeg, -v); }
    });
    maxPos = maxPos || 1;
    const range = maxPos + maxNeg || 1;
    const zeroY = pT + chartH * (maxPos / range);
    const xAt = (i) => pL + (W - pL - pR) * (n === 1 ? 0.5 : i / (n - 1));
    const yAt = (v) => zeroY - v / range * chartH;
    const bw = Math.max(5, (W - pL - pR) / n * 0.44);
    const cw = (W - pL - pR) / Math.max(1, n - 1);
    const step = Math.ceil(n / (n > 12 ? 12 : 8));
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* 餘額柱（背景、半透明），折線在上方；長條圖進場時由 0 長高（growBar），以基準線為軸心。 */}
        {!hideNet && nets.map((v, i) => { const h = Math.abs(v) / range * chartH, pos = v >= 0; const on = selIdx == null || selIdx === i;
          return <rect key={'b' + i} x={xAt(i) - bw / 2} y={pos ? zeroY - h : zeroY} width={bw} height={h} rx="2"
            fill={pos ? NET_POS : NET_NEG} opacity={on ? 0.15 : 0.06}
            style={{ transformOrigin: `${xAt(i)}px ${zeroY}px`, animation: `growBar 520ms cubic-bezier(0.32,0.72,0.18,1) ${i * 18}ms both` }} />; })}
        {/* 零基準線 */}
        <line x1={pL} y1={zeroY} x2={W - pR} y2={zeroY} stroke="rgba(0,0,0,0.16)" />
        {/* 選取虛線 */}
        {selIdx != null && selIdx < n &&
        <line x1={xAt(selIdx)} y1={pT} x2={xAt(selIdx)} y2={H - pB} stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" strokeDasharray="3 3" />}
        {/* 去年同期參考線（僅月檢視）：淡灰色虛線，疊在消費支出線同一份數值，只做淡入不畫線，
            避免跟真正的消費支出線搶視覺。 */}
        {showYoY &&
        <polyline points={prevData.map((a, i) => `${xAt(i).toFixed(1)},${yAt(spendSeries.val(a)).toFixed(1)}`).join(' ')}
          fill="none" stroke={TOKENS.gray4} strokeWidth="1.5" strokeDasharray="2 3" strokeLinejoin="round" strokeLinecap="round"
          style={{ opacity: 0, animation: 'fadeInStat 400ms ease-out 120ms forwards' }} />}
        {/* 折線：依圖例勾選顯示，圖例切換顯示時（重新掛載）動畫都會重播一次。
            實線用 pathLength=1 + drawLine 做「畫出來」效果；虛線（消費支出）本身已有 dash 花紋，
            兩種 dasharray 疊在一起會互相干擾，改用單純淡入。 */}
        {visibleSeries.map((s, si) =>
        s.dashed ?
        <polyline key={s.k} points={data.map((a, i) => `${xAt(i).toFixed(1)},${yAt(s.val(a)).toFixed(1)}`).join(' ')}
          fill="none" stroke={s.c} strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round"
          style={{ opacity: 0, animation: `fadeInStat 400ms ease-out ${180 + si * 90}ms forwards` }} /> :
        <polyline key={s.k} pathLength="1" points={data.map((a, i) => `${xAt(i).toFixed(1)},${yAt(s.val(a)).toFixed(1)}`).join(' ')}
          fill="none" stroke={s.c} strokeWidth="2" strokeDasharray="1" strokeLinejoin="round" strokeLinecap="round"
          style={{ animation: `drawLine 650ms cubic-bezier(0.32,0.72,0.18,1) ${180 + si * 90}ms both` }} />
        )}
        {data.map((_, i) => i % step === 0 ? <text key={'t' + i} x={xAt(i)} y={H - 6} textAnchor="middle" fill="rgba(44,44,50,0.62)" style={{ fontSize: '14px' }}>{labels[i]}</text> : null)}
        {/* 點擊熱區：每欄一條 → 開啟彈出視窗 */}
        {data.map((_, i) => <rect key={'h' + i} x={xAt(i) - cw / 2} y={0} width={cw} height={H} fill="transparent" onClick={() => toggleSel(i)} style={{ cursor: 'pointer' }} />)}
      </svg>);
  };
  // 儲蓄率趨勢：獨立小型 sparkline，跟 ComboChart 分開座標——金額與百分比尺度差太多，不共用 Y 軸。
  const SavingsRateStrip = ({ data }) => {
    const rates = data.map((a) => a.inc > 0 ? (a.inc - a.exp) / a.inc * 100 : null);
    const valid = rates.filter((v) => v != null);
    if (!valid.length) return null;
    const W = 340, H = 56, pL = 16, pR = 12, pT = 10, pB = 10, n = rates.length;
    const chartH = H - pT - pB;
    const maxV = Math.max(0, ...valid), minV = Math.max(-100, Math.min(0, ...valid));
    const range = maxV - minV || 1;
    const xAt = (i) => pL + (W - pL - pR) * (n === 1 ? 0.5 : i / (n - 1));
    const yAt = (v) => pT + chartH * (1 - (v - minV) / range);
    const zeroY = yAt(0);
    const cw = (W - pL - pR) / Math.max(1, n - 1);
    // 沒有收入的期間（inc=0）讓線斷開，不能畫成假的 0%
    const segs = []; let cur = [];
    rates.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; return; } cur.push(i); });
    if (cur.length) segs.push(cur);
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <line x1={pL} y1={zeroY} x2={W - pR} y2={zeroY} stroke="rgba(0,0,0,0.14)" strokeDasharray="2 2" />
        {selIdx != null && selIdx < n &&
        <line x1={xAt(selIdx)} y1={0} x2={xAt(selIdx)} y2={H} stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" strokeDasharray="3 3" />}
        {segs.map((seg, si) =>
        <polyline key={si} pathLength="1" points={seg.map((i) => `${xAt(i).toFixed(1)},${yAt(rates[i]).toFixed(1)}`).join(' ')}
          fill="none" stroke={TOKENS.teal} strokeWidth="2" strokeDasharray="1" strokeLinejoin="round" strokeLinecap="round"
          style={{ animation: `drawLine 650ms cubic-bezier(0.32,0.72,0.18,1) ${300 + si * 60}ms both` }} />
        )}
        {/* 點擊熱區：跟 ComboChart 共用 selIdx/toggleSel，點哪裡都會開同一個 SelPopup */}
        {data.map((_, i) => <rect key={'h' + i} x={xAt(i) - cw / 2} y={0} width={cw} height={H} fill="transparent" onClick={() => toggleSel(i)} style={{ cursor: 'pointer' }} />)}
      </svg>);
  };
  // 點選後的彈出視窗（取代原本的列展開／圖下小視窗）
  const curData = view === 'month' ? months : decadeYears.map((y) => yearAgg[y]);
  const SelPopup = () => {
    if (selIdx == null || !curData[selIdx]) return null;
    const a = curData[selIdx];const net = a.inc - a.exp;
    const invLoss = a.investLoss || 0; const spend = a.exp - invLoss; // 消費支出 = 總支出 − 投資損失
    const label = view === 'month' ? `${viewYear} 年 ${selIdx + 1} 月` : `${decadeYears[selIdx]} 年`;
    const row = (lbl, v, color, sign, dot) =>
    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), padding: PAD('6px 0') }}>
      {dot ? <span style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: color }} /> : <span style={{ width: 8, flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: FS(17), color: 'rgba(44,44,50,0.82)' }}>{lbl}</span>
      <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(17), fontWeight: 600, color: v === 0 ? 'rgba(60,60,67,0.5)' : color }}>{v === 0 ? '—' : (sign || '') + mask(Math.abs(v))}</span>
    </div>;
    const hasInc = INC_GROUPS.some((g) => (a.groups[g.k] || 0) > 0);
    return (
      <div onClick={() => setSelIdx(null)} style={{ position: 'absolute', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: SP(24) }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: TOKENS.surface,
          borderRadius: RS(20), boxShadow: SH('0 16px 40px rgba(0,0,0,0.28)'), padding: PAD('16px 18px 18px') }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP(6) }}>
            <div style={{ fontSize: FS(21), fontWeight: 700, color: TOKENS.ink }}>{label}</div>
            <button onClick={() => setSelIdx(null)} style={{ width: 32, height: 32, borderRadius: RS(16), flexShrink: 0,
              background: 'rgba(0,0,0,0.07)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: SP(4) }}>
            {hasInc ? INC_GROUPS.map((g) => (a.groups[g.k] || 0) > 0 ?
            <React.Fragment key={g.k}>{row(g.k === '其他' ? '其他收入' : g.k, a.groups[g.k], g.c, '', true)}</React.Fragment> : null) :
            <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.55)', padding: PAD('6px 0') }}>此期間無收入</div>}
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', marginTop: SP(6), paddingTop: SP(4) }}>
            {row('總收入', a.inc, TOKENS.incBlue)}
            {row('消費支出', spend, TOKENS.red, spend > 0 ? '-' : '')}
            {row('投資損失', invLoss, TOKENS.ink2, invLoss > 0 ? '-' : '')}
            {row('餘額', net, net < 0 ? TOKENS.red : TOKENS.ink, net < 0 ? '-' : '')}
            {(() => {
              const rate = a.inc > 0 ? net / a.inc * 100 : null;
              const rateColor = rate == null ? 'rgba(60,60,67,0.5)' : rate >= 0 ? TOKENS.teal : TOKENS.red;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), padding: PAD('6px 0') }}>
                  <span style={{ width: 8, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: FS(17), color: 'rgba(44,44,50,0.82)' }}>儲蓄率</span>
                  <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(17), fontWeight: 600, color: rateColor }}>
                    {rate == null ? '—' : `${rate.toFixed(1)}%（${rate >= 0 ? '+' : '-'}${mask(Math.abs(Math.round(net)))}）`}
                  </span>
                </div>);
            })()}
          </div>
        </div>
      </div>);
  };
  // 可展開表格：每月/每年 總收入/總支出/餘額，點擊展開收入分類
  const StatTable = ({ rows, unitLabel, onRowTap }) => {
    const tot = rows.reduce((a, r) => ({ inc: a.inc + r.inc, exp: a.exp + r.exp }), { inc: 0, exp: 0 });
    const shown = rows.filter((r) => r.inc > 0 || r.exp > 0);
    if (!shown.length) return <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.55)', textAlign: 'center', padding: PAD('16px 0') }}>尚無紀錄</div>;
    const cell = (v, color, bold) => <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: bold ? 700 : 400, color: v > 0 ? color : 'rgba(44,44,50,0.5)' }}>{v > 0 ? mask(v) : '—'}</div>;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: SP(8), borderBottom: '1px solid rgba(0,0,0,0.10)' }}>
          <div style={{ width: 54, fontSize: FS(13), color: 'rgba(44,44,50,0.62)', fontWeight: 700 }}>{unitLabel}</div>
          <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.62)', fontWeight: 700 }}>總收入</div>
          <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.62)', fontWeight: 700 }}>總支出</div>
          <div style={{ flex: 1, textAlign: 'right', fontSize: FS(13), color: 'rgba(44,44,50,0.62)', fontWeight: 700 }}>餘額</div>
          <div style={{ width: 22 }} />
        </div>
        {shown.map((r) => {
          const net = r.inc - r.exp, on = selIdx === r.idx;
          // 點選 → 開啟彈出視窗（不再就地展開）
          return (
            <button key={r.key} onClick={() => onRowTap && onRowTap(r.idx)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: PAD('10px 0'), borderBottom: '1px solid rgba(0,0,0,0.06)', background: on ? 'rgba(0,0,0,0.03)' : 'transparent', border: 'none', borderRadius: RS(6), cursor: 'pointer' }}>
              <div style={{ width: 54, textAlign: 'left', fontSize: FS(16), color: TOKENS.ink, fontWeight: on ? 700 : 500 }}>{r.label}</div>
              {cell(r.inc, TOKENS.incBlue)}
              {cell(r.exp, TOKENS.red)}
              <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 600, color: net >= 0 ? TOKENS.ink : TOKENS.red }}>{net < 0 ? '-' : ''}{mask(Math.abs(net))}</div>
              <ChevronRight size={14} style={{ width: 22, color: 'rgba(44,44,50,0.35)', flexShrink: 0 }} />
            </button>);
        })}
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: SP(11), marginTop: SP(2), borderTop: '1px solid rgba(0,0,0,0.12)' }}>
          <div style={{ width: 54, fontSize: FS(16), fontWeight: 700, color: TOKENS.ink }}>合計</div>
          <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: TOKENS.incBlue }}>{mask(tot.inc)}</div>
          <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: TOKENS.red }}>{mask(tot.exp)}</div>
          <div style={{ flex: 1, textAlign: 'right', fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700, color: tot.inc - tot.exp >= 0 ? TOKENS.ink : TOKENS.red }}>{tot.inc - tot.exp < 0 ? '-' : ''}{mask(Math.abs(tot.inc - tot.exp))}</div>
          <div style={{ width: 22 }} />
        </div>
      </>);
  };

  const IncLegend = () =>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP(10), marginBottom: SP(8), paddingLeft: SP(2) }}>
    {CHART_SERIES.map((s) => <span key={s.k} style={{ display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13), color: 'rgba(44,44,50,0.6)' }}><span style={{ width: 12, height: 3, borderRadius: RS(2), background: s.c, opacity: s.dashed ? 0.85 : 1 }} />{s.k}</span>)}
  </div>;

  const cardStyle = { background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px 12px') };
  const secTitle = (t) => <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 700, letterSpacing: 1 }}>{t}</span>;
  const segBtn = (id, lbl) => { const on = view === id; return <button key={id} onClick={() => { setView(id); setExpanded(null); setSelIdx(null); }} style={{ flex: 1, height: 44, borderRadius: RS(14), border: 'none', background: on ? TOKENS.surface : 'transparent', boxShadow: on ? SH('0 2px 8px rgba(0,0,0,0.12)') : 'none', color: on ? TOKENS.ink : 'rgba(44,44,50,0.65)', fontSize: FS(16), fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{lbl}</button>; };
  const stepper = (onClick, enabled, flip) => <button onClick={onClick} disabled={!enabled} style={{ width: 38, height: 38, borderRadius: RS(12), flexShrink: 0, background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink, opacity: enabled ? 1 : 0.35, cursor: enabled ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} style={flip ? { transform: 'rotate(180deg)' } : undefined} /></button>;

  const periodLabel = view === 'spend' ? `${spY} 年 ${spM + 1} 月` : view === 'month' ? `${viewYear} 年` : `${decadeYears[0]}–${decadeYears[9]}`;
  const prevStep = () => { if (view === 'spend') setMonthOffset(monthOffset - 1);else if (view === 'month') setYearOffset(yearOffset - 1);else setDecadeOffset(decadeOffset - 1);setExpanded(null);setSelIdx(null); };
  const nextEnabled = view === 'spend' ? canNextMonth : view === 'month' ? canNextYear : canNextDecade;
  const nextStep = () => { if (!nextEnabled) return; if (view === 'spend') setMonthOffset(monthOffset + 1);else if (view === 'month') setYearOffset(yearOffset + 1);else setDecadeOffset(decadeOffset + 1);setExpanded(null);setSelIdx(null); };
  // 圖表左右滑動切換期間：右滑 → 上一期（較早）；左滑 → 下一期（較新）。
  const onSwipeStart = (e) => { const p = e.touches ? e.touches[0] : e; swipeRef.current = { x: p.clientX, y: p.clientY, active: true }; };
  const onSwipeEnd = (e) => {
    if (!swipeRef.current.active) return;
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const dx = p.clientX - swipeRef.current.x, dy = p.clientY - swipeRef.current.y;
    swipeRef.current.active = false;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) { if (dx < 0) nextStep(); else prevStep(); }
  };

  // idx = 對應圖表資料陣列（months / decadeYears）的索引，讓表格點選能連動圖表與彈出視窗。
  const monthRows = months.map((a, mo) => ({ key: 'm' + mo, idx: mo, label: mo + 1 + '月', inc: a.inc, exp: a.exp, groups: a.groups }));
  // 歷年表格由新到舊（近→遠，由上往下）；圖表仍維持左舊右新，故單獨反轉表格用的列。
  const yearRows = decadeYears.map((y, i) => ({ key: 'y' + y, idx: i, label: String(y), inc: yearAgg[y].inc, exp: yearAgg[y].exp, groups: yearAgg[y].groups })).reverse();
  const monthLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const yearLabels = decadeYears.map((y) => "'" + String(y).slice(2));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: "3px 10px 8px" }}>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0, background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: FS(28), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.3 }}>收支統計</div>
          </div>
        </div>

        <div style={{ padding: "0 10px 10px" }}>
          <div style={{ display: 'flex', gap: SP(4), padding: SP(4), borderRadius: RS(18), background: 'rgba(0,0,0,0.06)' }}>
            {segBtn('spend', '消費分析')}{segBtn('month', '每月收支')}{segBtn('year', '年度收支')}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: "0px 10px 32px", display: 'flex', flexDirection: 'column', gap: SP(16) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(16), paddingTop: SP(4) }}>
            {stepper(prevStep, true, true)}
            <div style={{ fontSize: FS(21), fontWeight: 700, color: TOKENS.ink, letterSpacing: 0.3, minWidth: 150, textAlign: 'center' }}>{periodLabel}</div>
            {stepper(nextStep, nextEnabled)}
          </div>

          {view === 'spend' &&
          <div style={{ ...cardStyle, padding: PAD('20px 16px') }}
            onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}
            onMouseDown={onSwipeStart} onMouseUp={onSwipeEnd}>
            {expanded ?
            <>
              <button onClick={() => setExpanded(null)} style={{ display: 'flex', alignItems: 'center', gap: SP(4), background: 'transparent', border: 'none', padding: 0, marginBottom: SP(12), cursor: 'pointer', color: 'rgba(44,44,50,0.7)', fontSize: FS(16), fontWeight: 600 }}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />{expanded}
              </button>
              {subCats.length === 0 ?
              <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.55)', textAlign: 'center', padding: PAD('24px 0') }}>本月此大類尚無消費紀錄</div> :
              <>
                {StatDonut && <StatDonut key={`${spY}-${spM}-${expanded}`} data={subCats} total={subTotal} label={expanded} color={TOKENS.red} mask={mask} />}
                <div style={{ marginTop: SP(18), display: 'flex', flexDirection: 'column' }}>
                  {subCats.map((c, i) =>
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 2px'), borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: RS(12), flexShrink: 0, background: `${c.color}22`, border: `1px solid ${c.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(() => {const Ico = window.Icons[flowIconName({ cat: c.name, kind: 'exp' })] || window.Icons.Receipt;return <Ico size={20} style={{ color: c.color }} />;})()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.62)', marginTop: SP(1) }}>{c.pct.toFixed(1)}%</div>
                    </div>
                    <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19), fontWeight: 600, flexShrink: 0, color: TOKENS.red }}>-{mask(c.value)}</div>
                  </div>
                  )}
                </div>
              </>
              }
            </> :
            spendCats.length === 0 ?
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.55)', textAlign: 'center', padding: PAD('24px 0') }}>本月尚無消費紀錄</div> :
            <>
              {StatDonut && <StatDonut key={`${spY}-${spM}`} data={spendCats} total={spendTotal} label="總支出" color={TOKENS.red} mask={mask} />}
              {prevSpendTotal > 0 && (() => {
                const delta = spendTotal - prevSpendTotal, pct = delta / prevSpendTotal * 100, up = delta > 0;
                const color = up ? TOKENS.red : TOKENS.green; // 消費增加=紅(壞)，減少=綠(好)——跟收入線紅綠語意相反
                const Ico = up ? TrendUp : TrendDown;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(4), marginTop: SP(10), fontSize: FS(14), color }}>
                    <Ico size={14} />較上月{up ? '+' : ''}{pct.toFixed(1)}%（{up ? '+' : '-'}{mask(Math.abs(delta))}）
                  </div>);
              })()}
              <div style={{ marginTop: SP(18), display: 'flex', flexDirection: 'column' }}>
                {spendCats.map((c, i) => {
                  const prevV = prevSpendMap[c.name] || 0;
                  const chg = prevV > 0 ? (c.value - prevV) / prevV * 100 : null;
                  return (
                  <button key={c.name} onClick={() => setExpanded(c.name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px 2px'), borderTop: i === 0 ? '1px solid rgba(0,0,0,0.07)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.07)', borderLeft: 'none', borderRight: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: RS(12), flexShrink: 0, background: `${c.color}22`, border: `1px solid ${c.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(() => {const Ico = window.Icons[flowIconName({ cat: c.name, kind: 'exp' })] || window.Icons.Receipt;return <Ico size={20} style={{ color: c.color }} />;})()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), marginTop: SP(1) }}>
                        <span style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.62)' }}>{c.pct.toFixed(1)}%</span>
                        {prevV === 0 ?
                        <span style={{ fontSize: FS(12), color: TOKENS.gold }}>新增</span> :
                        Math.abs(chg) >= 0.5 &&
                        <span style={{ fontSize: FS(12), color: chg > 0 ? TOKENS.red : TOKENS.green }}>{chg > 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19), fontWeight: 600, flexShrink: 0, color: TOKENS.red }}>-{mask(c.value)}</div>
                    <ChevronRight size={16} style={{ flexShrink: 0, color: 'rgba(44,44,50,0.3)' }} />
                  </button>);
                })}
              </div>
            </>
            }
          </div>
          }

          {(view === 'month' || view === 'year') &&
          <>
            <div style={cardStyle}
              onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}
              onMouseDown={onSwipeStart} onMouseUp={onSwipeEnd}>
              <div style={{ marginBottom: SP(6) }}>{secTitle(view === 'month' ? '每月收支' : '年度收支')}</div>
              {/* 整合圖：主動收入／被動收入／投資損益／其他／消費支出 折線＋收支餘額柱狀。
                  圖例可點擊：單獨隱藏/顯示某一條線，也可以連續點掉其他線只留一條看。 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP(10), marginBottom: SP(8), paddingLeft: SP(2) }}>
                {CHART_SERIES.map((s) => {
                  const off = hiddenSeries.has(s.k);
                  return (
                    <button key={s.k} onClick={() => toggleSeries(s.k)} style={{
                      display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13),
                      color: off ? 'rgba(44,44,50,0.32)' : 'rgba(44,44,50,0.68)',
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      textDecoration: off ? 'line-through' : 'none', transition: 'color 160ms' }}>
                      <span style={{ width: 12, height: 3, borderRadius: RS(2),
                        background: off ? 'rgba(0,0,0,0.18)' : s.c,
                        opacity: !off && s.dashed ? 0.85 : 1, transition: 'background 160ms' }} />
                      {s.k}
                    </button>);
                })}
                {(() => { const off = hiddenSeries.has('餘額'); return (
                  <button onClick={() => toggleSeries('餘額')} style={{
                    display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13),
                    color: off ? 'rgba(44,44,50,0.32)' : 'rgba(44,44,50,0.68)',
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    textDecoration: off ? 'line-through' : 'none', transition: 'color 160ms' }}>
                    <span style={{ width: 10, height: 10, borderRadius: RS(2), background: off ? 'rgba(0,0,0,0.18)' : NET_POS, opacity: off ? 1 : 0.45, transition: 'background 160ms' }} />餘額
                  </button>); })()}
                {view === 'month' && (() => { const off = hiddenSeries.has('去年同期'); return (
                  <button onClick={() => toggleSeries('去年同期')} style={{
                    display: 'flex', alignItems: 'center', gap: SP(4), fontSize: FS(13),
                    color: off ? 'rgba(44,44,50,0.32)' : 'rgba(44,44,50,0.68)',
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    textDecoration: off ? 'line-through' : 'none', transition: 'color 160ms' }}>
                    <span style={{ width: 12, height: 3, borderRadius: RS(2), background: off ? 'rgba(0,0,0,0.18)' : TOKENS.gray4, opacity: off ? 1 : 0.7, transition: 'background 160ms' }} />去年同期
                  </button>); })()}
              </div>
              <ComboChart key={view + '-' + (view === 'month' ? viewYear : decadeYears[0])}
              data={curData} labels={view === 'month' ? monthLabels : yearLabels} hiddenSeries={hiddenSeries}
              prevData={view === 'month' ? prevYearMonths : undefined} />
              <div style={{ marginTop: SP(10) }}>
                <div style={{ fontSize: FS(12), color: 'rgba(44,44,50,0.62)', marginBottom: SP(2), paddingLeft: SP(2) }}>儲蓄率</div>
                <SavingsRateStrip data={curData} />
              </div>
              <div style={{ fontSize: FS(12), color: 'rgba(44,44,50,0.55)', marginTop: SP(4), paddingLeft: SP(2) }}>點圖或下方列表可查看該{view === 'month' ? '月' : '年'}明細</div>
            </div>
            <div style={{ ...cardStyle, padding: PAD('14px') }}>
              <StatTable rows={view === 'month' ? monthRows : yearRows} unitLabel={view === 'month' ? '月' : '年'} onRowTap={(idx) => setSelIdx(idx)} />
            </div>
          </>
          }
        </div>
      </div>
      {(view === 'month' || view === 'year') && <SelPopup />}
    </div>);
}

/* ── 儲蓄目標：陣列，每筆依 type 而定有不同欄位，支援同時追蹤多種長期計劃。
   新增/刪除/清除/備份還原都靠掃描所有 ff_* key 自動處理，這裡不用額外接其他檔案。
   舊版只存單一目標於 ff_savings_goal，這裡讀取時一次性遷移成陣列並寫回新 key；
   更早版本沒有 type/celebrated 欄位，讀取時一律補上預設值，不影響既有資料/其他欄位。 */
function ffGetSavingsGoals() {
  const normalize = (g) => ({ type: 'networth', celebrated: false, ...g });
  try {
    const arr = JSON.parse(localStorage.getItem('ff_savings_goals') || 'null');
    if (Array.isArray(arr)) return arr.map(normalize);
    const legacy = JSON.parse(localStorage.getItem('ff_savings_goal') || 'null');
    if (legacy && legacy.targetYear) {
      const migrated = [normalize({ id: 'g' + Date.now(), name: '儲蓄目標', amount: legacy.amount, targetYear: legacy.targetYear, targetMonth: legacy.targetMonth })];
      ffSetSavingsGoals(migrated);
      return migrated;
    }
    return [];
  } catch { return []; }
}
function ffSetSavingsGoals(v) {
  try { localStorage.setItem('ff_savings_goals', JSON.stringify(v)); } catch {}
}

// 目標類型設定：新增目標的類型選單、表單欄位都從這份清單長出來，不用寫一大串 if/else。
// recurring=true 的三種是週期性目標（本期進度＋歷史達成率，沒有目標年月），且可選固定金額
// 或跟上一期比的%成長。
const GOAL_TYPES = [
  { key: 'networth', icon: 'PiggyBank', label: '淨資產目標', desc: '淨資產於指定年月達到目標金額', recurring: false },
  { key: 'account', icon: 'Wallet', label: '單一帳戶餘額', desc: '指定帳戶餘額達到目標金額（無期限）', recurring: false },
  { key: 'passive_income', icon: 'TrendUp', label: '被動收入', desc: '被動收入達到目標，可選以月或以年為單位', recurring: true },
  { key: 'balance', icon: 'Receipt', label: '收支結餘', desc: '收支結餘達到目標，可選以月或以年為單位', recurring: true },
  { key: 'stock_gain', icon: 'LineChart', label: '股票已實現損益', desc: '股票買賣已實現損益達標（不含股息債息），可選以月或以年為單位', recurring: true },
];
const GOAL_TYPE_MAP = Object.fromEntries(GOAL_TYPES.map((t) => [t.key, t]));

// 被動收入：複製 MonthlyStatsSheet 的 incGroupOf/amtOf 邏輯——那是該元件的私有 closure、
// 未對外匯出，這裡刻意重新實作一份小型獨立版本，避免跨元件耦合。年/月兩種版本共用同一套
// 分類判斷，只差在日期篩選的粒度。
function ffPassiveIncomeForYear(savedFlows, masterData, year) {
  const INC_LABEL = { '主動': '主動收入', '被動': '被動收入', '投資收入': '投資收入', '其他': '其他' };
  const catIncGroup = {};
  (masterData.cat_inc || []).forEach((c) => { const o = typeof c === 'string' ? { name: c, group: '其他' } : c; catIncGroup[o.name] = o.group || '其他'; });
  const incGroupOf = (cat) => INC_LABEL[catIncGroup[cat] || '其他'] || (catIncGroup[cat] || '其他');
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let total = 0;
  (savedFlows || []).forEach((f) => {
    if (f.kind !== 'inc' || !f.date) return;
    if (new Date(f.date).getFullYear() !== year) return;
    if (incGroupOf(f.cat) !== '被動收入') return;
    total += amtOf(f);
  });
  return total;
}
function ffPassiveIncomeForMonth(savedFlows, masterData, year, month /* 1-12 */) {
  const INC_LABEL = { '主動': '主動收入', '被動': '被動收入', '投資收入': '投資收入', '其他': '其他' };
  const catIncGroup = {};
  (masterData.cat_inc || []).forEach((c) => { const o = typeof c === 'string' ? { name: c, group: '其他' } : c; catIncGroup[o.name] = o.group || '其他'; });
  const incGroupOf = (cat) => INC_LABEL[catIncGroup[cat] || '其他'] || (catIncGroup[cat] || '其他');
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let total = 0;
  (savedFlows || []).forEach((f) => {
    if (f.kind !== 'inc' || !f.date) return;
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
    if (incGroupOf(f.cat) !== '被動收入') return;
    total += amtOf(f);
  });
  return total;
}

// 結餘：指定期間的 inc - exp，年/月兩種版本只差日期篩選粒度。
function ffMonthlyBalance(savedFlows, masterData, year, month /* 1-12 */) {
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let inc = 0, exp = 0;
  (savedFlows || []).forEach((f) => {
    if (!f.date) return;
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
    if (f.kind === 'inc') inc += amtOf(f);
    else if (f.kind === 'exp') exp += amtOf(f);
  });
  return inc - exp;
}
function ffYearlyBalance(savedFlows, masterData, year) {
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let inc = 0, exp = 0;
  (savedFlows || []).forEach((f) => {
    if (!f.date) return;
    if (new Date(f.date).getFullYear() !== year) return;
    if (f.kind === 'inc') inc += amtOf(f);
    else if (f.kind === 'exp') exp += amtOf(f);
  });
  return inc - exp;
}

// 已實現股票損益：只算買賣操作損益，複製 invest.jsx InvestBreakdownSheet 判斷式裡的 pnl
// 分支（merchant 精確比對 → 舊資料 regex fallback），故意跳過股息/債息分支——那兩者算被動
// 收入，不算「操作」。年/月兩種版本只差日期篩選粒度。
function ffRealizedPnlForYear(savedFlows, masterData, year) {
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let total = 0;
  (savedFlows || []).forEach((f) => {
    if (!f.date) return;
    if (new Date(f.date).getFullYear() !== year) return;
    const mer = f.merchant || '';
    const note = f.note || '';
    const sign = f.kind === 'inc' ? 1 : -1;
    const amt = amtOf(f);
    if (mer === '投資獲利') total += amt;
    else if (mer === '投資損失') total -= amt;
    else if (/已實現損益/.test(mer + note)) total += sign * amt;
  });
  return total;
}
function ffRealizedPnlForMonth(savedFlows, masterData, year, month /* 1-12 */) {
  const curMap = window.buildCurMap(masterData);
  const amtOf = (f) => window.fxToTWD(f.amount, curMap[f.account]);
  let total = 0;
  (savedFlows || []).forEach((f) => {
    if (!f.date) return;
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
    const mer = f.merchant || '';
    const note = f.note || '';
    const sign = f.kind === 'inc' ? 1 : -1;
    const amt = amtOf(f);
    if (mer === '投資獲利') total += amt;
    else if (mer === '投資損失') total -= amt;
    else if (/已實現損益/.test(mer + note)) total += sign * amt;
  });
  return total;
}

// 三種週期性目標的月/年聚合函式對照表，computeGoalProgress 依 goal.periodUnit 查表，
// 不用為月/年各寫一次六路判斷。
const PERIOD_METRIC_GETTERS = {
  passive_income: { year: ffPassiveIncomeForYear, month: ffPassiveIncomeForMonth },
  balance: { year: ffYearlyBalance, month: ffMonthlyBalance },
  stock_gain: { year: ffRealizedPnlForYear, month: ffRealizedPnlForMonth },
};

// 週期性目標的目標值：固定金額直接用 amount；%成長模式要跟「上一期實際值」比，上一期沒
// 資料（或非正值，無法算成長）就回傳 null——卡片顯示「尚無上一期資料可比較」，不算百分比。
function ffResolvePeriodTarget(goal, prevPeriodValue) {
  if (goal.targetMode === 'percent') {
    if (prevPeriodValue == null || prevPeriodValue <= 0) return null;
    return prevPeriodValue * (1 + (goal.percentValue || 0) / 100);
  }
  return goal.amount;
}

// 週期性目標的歷史達成率：對每個「有資料的過去期間」重新解析目標值（%模式一樣滾動跟該期
// 的上一期比），回傳每期達成與否＋達成次數，畫成小圓點列。periods 由呼叫端算好，newest-first
// （[上一期, 上上期, ...]），最後一筆只用來當倒數第二筆的「上一期」，不會自己變成一個圓點。
function ffAchievementHistory(goal, periods) {
  const dots = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const { label, value } = periods[i];
    const target = ffResolvePeriodTarget(goal, periods[i + 1].value);
    if (target == null) break; // 再往前也不會有基準，提前停止
    dots.push({ label, achieved: value >= target });
  }
  dots.reverse(); // 畫面上舊→新，由左到右
  return { dots, achievedCount: dots.filter((d) => d.achieved).length, total: dots.length };
}

// savedFlows 裡最早一筆的日期（沒有資料回傳 null）——用來裁剪歷史圓點，避免對還沒有任何
// 記帳資料的期間生出假的「未達成」圓點。
function ffEarliestFlowPeriod(savedFlows) {
  let min = null;
  (savedFlows || []).forEach((f) => {
    if (!f.date) return;
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    if (!min || d < min) min = d;
  });
  return min;
}
function ffYearSeries(getter, startYear, maxCount, earliestYear) {
  const out = [];
  for (let i = 0; i < maxCount; i++) {
    const y = startYear - i;
    if (earliestYear != null && y < earliestYear) break;
    out.push({ label: String(y), value: getter(y) });
  }
  return out;
}
function ffMonthSeries(getter, startYear, startMonth, maxCount, earliest) {
  const out = []; let y = startYear, m = startMonth;
  for (let i = 0; i < maxCount; i++) {
    if (earliest && (y < earliest.getFullYear() || (y === earliest.getFullYear() && m < earliest.getMonth() + 1))) break;
    out.push({ label: `${y}/${m}`, value: getter(y, m) });
    m--; if (m < 1) { m = 12; y--; }
  }
  return out;
}

// 統一算出目標卡片要顯示的所有資訊，六種類型的分支都在這裡，卡片 JSX 只有一份、吃這個
// 回傳值渲染；也是達成動畫判斷（見 NetWorthSheet）跟卡片渲染共用的計算，避免六路分支寫兩次。
function computeGoalProgress(goal, ctx) {
  const { totalAssets, computedAcctGroups, computedHoldings, savedFlows, masterData } = ctx;
  const nowD = new Date();
  const thisYear = nowD.getFullYear(), thisMonth = nowD.getMonth() + 1;
  let current = 0, target = goal.amount, subtitle = '', remainingText = null, historyDots = null, noBaseline = false;

  if (goal.type === 'account') {
    const items = computedAcctGroups.flatMap((g) => g.items);
    const acctItem = items.find((it) => it.name === goal.accountName);
    if (!acctItem) {
      current = 0; subtitle = '帳戶找不到';
    } else {
      let val = acctItem.amountTWD != null ? acctItem.amountTWD : acctItem.amount;
      if ((masterData.brokers || []).some((b) => b.name === goal.accountName)) {
        val += computedHoldings.flatMap((g) => g.items)
          .filter((it) => it.broker === goal.accountName)
          .reduce((a, it) => a + (it.mvTWD != null ? it.mvTWD : it.mv || 0), 0);
      }
      current = val;
      subtitle = goal.accountName;
    }
  } else if (PERIOD_METRIC_GETTERS[goal.type]) {
    // 被動收入／結餘／股票已實現損益：三種都可選以月或以年為單位，共用同一套「本期 vs
    // 上一期」與歷史圓點邏輯，只是查表換算法函式跟窗口大小不同。
    const unit = goal.periodUnit === 'month' ? 'month' : 'year';
    const getters = PERIOD_METRIC_GETTERS[goal.type];
    const earliest = ffEarliestFlowPeriod(savedFlows);
    let series;
    if (unit === 'month') {
      const getterM = (y, m) => getters.month(savedFlows, masterData, y, m);
      current = getterM(thisYear, thisMonth);
      subtitle = '本月進度';
      const [py, pm] = thisMonth === 1 ? [thisYear - 1, 12] : [thisYear, thisMonth - 1];
      series = ffMonthSeries(getterM, py, pm, 13, earliest);
    } else {
      const getterY = (y) => getters.year(savedFlows, masterData, y);
      current = getterY(thisYear);
      subtitle = `${thisYear} 年度進度`;
      series = ffYearSeries(getterY, thisYear - 1, 6, earliest ? earliest.getFullYear() : null);
    }
    target = ffResolvePeriodTarget(goal, series[0] ? series[0].value : null);
    if (target == null) noBaseline = true;
    historyDots = ffAchievementHistory(goal, series);
  } else {
    // networth（預設/回退——包含所有沒有 type 欄位、或 type 未知的舊資料）
    current = totalAssets;
    subtitle = `${goal.targetYear} 年 ${goal.targetMonth} 月`;
    const monthsLeft = (goal.targetYear - nowD.getFullYear()) * 12 + (goal.targetMonth - (nowD.getMonth() + 1));
    remainingText = monthsLeft > 0 ? `剩 ${monthsLeft} 個月` : null;
  }

  const pct = (!noBaseline && target > 0) ? Math.min(100, Math.max(0, current / target * 100)) : 0;
  const done = !noBaseline && target > 0 && current >= target;
  return { current, target, pct, done, subtitle, remainingText, historyDots, noBaseline };
}

// 週期性目標的歷史達成率小圓點列（見 computeGoalProgress 回傳的 historyDots）。
function GoalHistoryDots({ dots, achievedCount, total, periodLabel }) {
  if (!total) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginTop: SP(8) }}>
      <div style={{ display: 'flex', gap: SP(4) }}>
        {dots.map((d, i) =>
        <div key={i} title={d.label} style={{ width: 8, height: 8, borderRadius: RS(4),
          background: d.achieved ? TOKENS.green : 'rgba(0,0,0,0.15)' }} />
        )}
      </div>
      <div style={{ fontSize: FS(12), color: 'rgba(44,44,50,0.62)' }}>近{total}{periodLabel}達成 {achievedCount} 次</div>
    </div>);
}

// 達成目標時的一次性彩紙噴發，配合 index.html 的 confettiBurst keyframe；純 CSS，
// 每個粒子往外飛散淡出，播完後就是空的透明層，不需要額外卸載邏輯。
function ConfettiBurst() {
  const colors = [TOKENS.gold, TOKENS.red, TOKENS.teal, TOKENS.indigo, TOKENS.orange, TOKENS.green];
  const n = 12;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 360 + (i % 2 ? 15 : -15);
        const dist = 70 + (i % 3) * 20;
        const rad = angle * Math.PI / 180;
        const cx = Math.cos(rad) * dist, cy = Math.sin(rad) * dist;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, borderRadius: RS(2),
            background: colors[i % colors.length],
            '--cx': `${cx}px`, '--cy': `${cy}px`, '--cr': `${i * 47 % 360}deg`,
            animation: `confettiBurst 700ms ease-out forwards ${i % 4 * 40}ms`,
          }} />);
      })}
    </div>);
}

/* ── NetWorthSheet: 資產淨額明細 bottom sheet ─────────────────────── */
function NetWorthSheet({ open, onClose, total, computedAcctGroups, computedHoldings, mask, hideAmounts, savedFlows, masterData }) {
  const { ChevronRight, Pencil, Check, X, Plus, Trash } = window.Icons;
  // NetWorthSheet 是永遠掛載、只靠 open prop 顯示/隱藏（app.jsx），hook 必須在下面的
  // early return 之前呼叫，順序才不會亂掉；連帶把 totalAssets 等純計算也搬到 early return
  // 之前，這樣達成動畫判斷的 useEffectDash 才拿得到算好的進度。
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
  // 冷暖交錯的序列，且不與 現金(綠)/存款(深藍) 重複——舊序列第一個 inv1 就是存款的深藍，
  // 相鄰兩塊在圓餅上幾乎分不出來。
  const INV_COLORS = [TOKENS.orange, TOKENS.indigo, TOKENS.red, TOKENS.teal, TOKENS.gold2, TOKENS.blue, TOKENS.inv5, TOKENS.green2];
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

  // 帶上 value：圓餅圖點選某片時中央要顯示該類別的金額。
  const assetData = assets.map((c) => ({ name: c.name, value: c.value, color: c.color, pct: totalAssets > 0 ? c.value / totalAssets * 100 : 0 }));

  const [view, setView] = useStateDash('alloc'); // alloc=資產配置 | goals=財務目標
  const [goals, setGoalsRaw] = useStateDash(ffGetSavingsGoals);
  // editingId：null=沒在編輯、'picking'=選類型中、'new'=新增表單中、其他=正在編輯該筆目標的 id
  const [editingId, setEditingId] = useStateDash(null);
  const [draftType, setDraftType] = useStateDash('networth');
  const [draftName, setDraftName] = useStateDash('');
  const [draftAmount, setDraftAmount] = useStateDash('');
  const [draftYear, setDraftYear] = useStateDash('');
  const [draftMonth, setDraftMonth] = useStateDash('');
  const [draftAccountName, setDraftAccountName] = useStateDash('');
  const [draftTargetMode, setDraftTargetMode] = useStateDash('amount');
  const [draftPercentValue, setDraftPercentValue] = useStateDash('');
  const [draftPeriodUnit, setDraftPeriodUnit] = useStateDash('year');
  const setGoals = (next) => { setGoalsRaw(next); ffSetSavingsGoals(next); };
  useEffectDash(() => { if (open) setEditingId(null); }, [open]);

  // 達成動畫：偵測「這次 render 才剛變成 done」的目標，把 celebrated 寫回去持久化，
  // 確保下次重開 App/這個 sheet 時金色邊框還在，但彩紙不會再放第二次；animatedRef 記錄「這次
  // 開啟 sheet 期間已經放過彩紙的目標 id」，讓彩紙在偵測到的那個 render 準時播放一次。
  const animatedRef = useRefDash(new Set());
  const goalCtx = { totalAssets, computedAcctGroups, computedHoldings, savedFlows, masterData: masterData || {} };
  useEffectDash(() => {
    const newlyDone = goals.filter((g) => !g.celebrated && computeGoalProgress(g, goalCtx).done);
    if (newlyDone.length) {
      setGoals(goals.map((g) => newlyDone.some((n) => n.id === g.id) ? { ...g, celebrated: true } : g));
    }
    // eslint-disable-next-line
  }, [goals, totalAssets, savedFlows, computedAcctGroups, computedHoldings]);

  const startPicker = () => setEditingId('picking');
  const startEditWithType = (type) => {
    setDraftType(type);
    setDraftName(''); setDraftAmount(''); setDraftYear(''); setDraftMonth('');
    setDraftAccountName(''); setDraftTargetMode('amount'); setDraftPercentValue(''); setDraftPeriodUnit('year');
    setEditingId('new');
  };
  const startEdit = (g) => {
    setEditingId(g.id);
    setDraftType(g.type || 'networth');
    setDraftName(g.name || '');
    setDraftAmount(g.amount ? String(g.amount) : '');
    setDraftYear(g.targetYear ? String(g.targetYear) : '');
    setDraftMonth(g.targetMonth ? String(g.targetMonth) : '');
    setDraftAccountName(g.accountName || '');
    setDraftTargetMode(g.targetMode || 'amount');
    setDraftPercentValue(g.percentValue ? String(g.percentValue) : '');
    setDraftPeriodUnit(g.periodUnit || 'year');
  };
  const saveGoal = () => {
    const name = draftName.trim() || '儲蓄目標';
    const amount = parseFloat(draftAmount) || 0;
    const type = editingId === 'new' ? draftType : (goals.find((g) => g.id === editingId) || {}).type || 'networth';
    let extra = {};
    if (type === 'networth') {
      const targetYear = parseInt(draftYear, 10) || null;
      let targetMonth = parseInt(draftMonth, 10) || null;
      if (targetMonth != null) targetMonth = Math.min(12, Math.max(1, targetMonth));
      extra = { targetYear, targetMonth };
    } else if (type === 'account') {
      extra = { accountName: draftAccountName };
    } else if (GOAL_TYPE_MAP[type] && GOAL_TYPE_MAP[type].recurring) {
      extra = { targetMode: draftTargetMode, percentValue: parseFloat(draftPercentValue) || 0, periodUnit: draftPeriodUnit };
    }
    if (editingId === 'new') {
      setGoals([...goals, { id: 'g' + Date.now(), type, name, amount, celebrated: false, ...extra }]);
    } else {
      setGoals(goals.map((g) => g.id === editingId ? { ...g, name, amount, ...extra } : g));
    }
    setEditingId(null);
  };
  const deleteGoal = (id) => setGoals(goals.filter((g) => g.id !== id));

  if (!open) return null;

  const cardStyle = { background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.07)', padding: PAD('16px') };
  const segBtn = (id, lbl) => { const on = view === id; return <button key={id} onClick={() => { setView(id); setEditingId(null); }} style={{ flex: 1, height: 44, borderRadius: RS(14), border: 'none', background: on ? TOKENS.surface : 'transparent', boxShadow: on ? SH('0 2px 8px rgba(0,0,0,0.12)') : 'none', color: on ? TOKENS.ink : 'rgba(44,44,50,0.65)', fontSize: FS(16), fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{lbl}</button>; };
  // 新增/編輯儲蓄目標共用的表單（editingId 決定是新增還是編輯哪一筆）
  const fieldLabelStyle = { fontSize: FS(15), color: 'rgba(44,44,50,0.7)', width: 64, flexShrink: 0 };
  const inputStyle = { flex: 1, height: 36, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.12)', fontSize: FS(16), color: TOKENS.ink, outline: 'none' };
  const numInputStyle = { ...inputStyle, fontFamily: TOKENS.fontMono, fontSize: FS(17) };
  // 信用卡是負債，拿來當「餘額目標」語意怪，選單裡不提供。
  const accountList = computedAcctGroups.filter((g) => g.id !== 'credit').flatMap((g) => g.items.map((it) => ({ name: it.name, groupName: g.name })));

  // 選類型（新增流程第一步）
  const GoalTypePicker = () =>
  <div style={{ display: 'flex', flexDirection: 'column', gap: SP(8) }}>
    <div style={{ fontSize: FS(17), fontWeight: 600, color: TOKENS.ink, marginBottom: SP(2) }}>選擇目標類型</div>
    {GOAL_TYPES.map((t) => {
      const Ico = window.Icons[t.icon] || window.Icons.Wallet;
      return (
        <button key={t.key} onClick={() => startEditWithType(t.key)} style={{
          display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('12px'), borderRadius: RS(12),
          background: 'rgba(0,0,0,0.03)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: RS(10), flexShrink: 0, background: 'rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico size={18} style={{ color: TOKENS.ink }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: FS(15), fontWeight: 600, color: TOKENS.ink }}>{t.label}</div>
            <div style={{ fontSize: FS(12), color: 'rgba(44,44,50,0.55)', marginTop: SP(1) }}>{t.desc}</div>
          </div>
        </button>);
    })}
    <button onClick={() => setEditingId(null)} style={{ width: '100%', height: 40, borderRadius: RS(12), background: 'transparent',
      border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(44,44,50,0.7)', fontSize: FS(15), cursor: 'pointer', marginTop: SP(4) }}>取消</button>
  </div>;

  // 新增/編輯儲蓄目標共用的表單（editingId 決定是新增還是編輯哪一筆，draftType 決定欄位組合）
  const GoalEditForm = () => {
    const cfg = GOAL_TYPE_MAP[draftType] || GOAL_TYPE_MAP.networth;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(10) }}>
        <div style={{ fontSize: FS(17), fontWeight: 600, color: TOKENS.ink }}>{editingId === 'new' ? '新增' : '編輯'}{cfg.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <span style={fieldLabelStyle}>目標名稱</span>
          <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="例如：緊急預備金" style={inputStyle} />
        </div>

        {cfg.key === 'networth' && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={fieldLabelStyle}>目標金額</span>
            <input value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} inputMode="decimal" placeholder="0" style={numInputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={fieldLabelStyle}>目標年月</span>
            <input value={draftYear} onChange={(e) => setDraftYear(e.target.value)} inputMode="numeric" placeholder="年" maxLength={4} style={{ ...numInputStyle, flex: 'none', width: 72 }} />
            <span style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.68)' }}>年</span>
            <input value={draftMonth} onChange={(e) => setDraftMonth(e.target.value)} inputMode="numeric" placeholder="月" maxLength={2} style={{ ...numInputStyle, flex: 'none', width: 56 }} />
            <span style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.68)' }}>月</span>
          </div>
        </>}

        {cfg.key === 'account' && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={fieldLabelStyle}>目標金額</span>
            <input value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} inputMode="decimal" placeholder="0" style={numInputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP(6) }}>
            <span style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.7)' }}>選擇帳戶</span>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 160, overflowY: 'auto', borderRadius: RS(10), border: '1px solid rgba(0,0,0,0.1)' }}>
              {accountList.map((a) =>
              <button key={a.name} onClick={() => setDraftAccountName(a.name)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('10px 12px'),
                background: draftAccountName === a.name ? 'rgba(0,0,0,0.06)' : 'transparent', border: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: FS(15), color: TOKENS.ink }}>{a.name}<span style={{ color: 'rgba(44,44,50,0.5)', marginLeft: SP(6) }}>{a.groupName}</span></span>
                {draftAccountName === a.name && <Check size={14} style={{ color: TOKENS.ink }} />}
              </button>
              )}
            </div>
          </div>
        </>}

        {cfg.recurring && <>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setDraftPeriodUnit('month')} style={{ flex: 1, height: 36, borderRadius: RS(8), border: 'none',
              background: draftPeriodUnit === 'month' ? TOKENS.ink : 'rgba(0,0,0,0.06)', color: draftPeriodUnit === 'month' ? '#fff' : 'rgba(44,44,50,0.7)',
              fontSize: FS(14), fontWeight: 600, cursor: 'pointer' }}>以月為單位</button>
            <button onClick={() => setDraftPeriodUnit('year')} style={{ flex: 1, height: 36, borderRadius: RS(8), border: 'none',
              background: draftPeriodUnit === 'year' ? TOKENS.ink : 'rgba(0,0,0,0.06)', color: draftPeriodUnit === 'year' ? '#fff' : 'rgba(44,44,50,0.7)',
              fontSize: FS(14), fontWeight: 600, cursor: 'pointer' }}>以年為單位</button>
          </div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setDraftTargetMode('amount')} style={{ flex: 1, height: 36, borderRadius: RS(8), border: 'none',
              background: draftTargetMode === 'amount' ? TOKENS.ink : 'rgba(0,0,0,0.06)', color: draftTargetMode === 'amount' ? '#fff' : 'rgba(44,44,50,0.7)',
              fontSize: FS(14), fontWeight: 600, cursor: 'pointer' }}>固定金額</button>
            <button onClick={() => setDraftTargetMode('percent')} style={{ flex: 1, height: 36, borderRadius: RS(8), border: 'none',
              background: draftTargetMode === 'percent' ? TOKENS.ink : 'rgba(0,0,0,0.06)', color: draftTargetMode === 'percent' ? '#fff' : 'rgba(44,44,50,0.7)',
              fontSize: FS(14), fontWeight: 600, cursor: 'pointer' }}>{draftPeriodUnit === 'month' ? '跟上個月比成長%' : '跟去年比成長%'}</button>
          </div>
          {draftTargetMode === 'amount' ?
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={fieldLabelStyle}>目標金額</span>
            <input value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} inputMode="decimal" placeholder="0" style={numInputStyle} />
          </div> :
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={fieldLabelStyle}>成長幅度</span>
            <input value={draftPercentValue} onChange={(e) => setDraftPercentValue(e.target.value)} inputMode="decimal" placeholder="例如 4" style={numInputStyle} />
            <span style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.68)' }}>%</span>
          </div>}
        </>}

        <div style={{ display: 'flex', gap: SP(8), justifyContent: 'flex-end', marginTop: SP(4) }}>
          <button onClick={() => setEditingId(null)} style={{ width: 36, height: 36, borderRadius: RS(18), background: 'rgba(0,0,0,0.07)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
          <button onClick={saveGoal} style={{ width: 36, height: 36, borderRadius: RS(18), background: TOKENS.ink, border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Check size={16} /></button>
        </div>
      </div>);
  };

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
            <div style={{ fontSize: FS(28), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.3 }}>資產配置與目標</div>
          </div>
        </div>

        <div style={{ padding: "0 10px 10px" }}>
          <div style={{ display: 'flex', gap: SP(4), padding: SP(4), borderRadius: RS(18), background: 'rgba(0,0,0,0.06)' }}>
            {segBtn('alloc', '資產配置')}{segBtn('goals', '財務目標')}
          </div>
        </div>

        <div style={{ ...{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 32px'),
            display: 'flex', flexDirection: 'column', gap: SP(20) }, padding: "0px 10px 32px" }}>
          {/* 儲蓄目標追蹤：多個長期計劃各自一張卡片，直向排列同時攤開就是達成率比較。
              目標金額+年月 vs 目前淨資產（totalAssets，下面算出）。 */}
          {view === 'goals' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP(12) }}>
            {goals.map((g) => {
              const p = computeGoalProgress(g, goalCtx);
              // showBurst 只在「這次 render 才第一次偵測到達成」時為真，animatedRef 保證同一個
              // sheet-open session內不會因為 useEffectDash 寫回 celebrated 而重播第二次。
              const showBurst = p.done && !g.celebrated && !animatedRef.current.has(g.id);
              if (showBurst) animatedRef.current.add(g.id);
              return (
                <div key={g.id} style={{ ...cardStyle, padding: PAD('18px 16px'), position: 'relative', overflow: 'visible',
                  border: p.done ? `1px solid ${TOKENS.gold}` : '1px solid rgba(0,0,0,0.07)',
                  animation: showBurst ? 'goalGoldGlow 900ms ease-out both' : 'none' }}>
                  {showBurst && <ConfettiBurst />}
                  {editingId === g.id ?
                  <GoalEditForm /> :
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), minWidth: 0 }}>
                        <div style={{ fontSize: FS(16), fontWeight: 600, color: TOKENS.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                        {p.done &&
                        <span style={{ fontSize: FS(11), fontWeight: 700, color: '#fff', background: TOKENS.gold, borderRadius: RS(8), padding: PAD('2px 8px'), flexShrink: 0 }}>已達成</span>}
                      </div>
                      <div style={{ display: 'flex', gap: SP(6), flexShrink: 0 }}>
                        <button onClick={() => startEdit(g)} style={{ width: 30, height: 30, borderRadius: RS(15), background: 'rgba(0,0,0,0.06)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={14} /></button>
                        <button onClick={() => deleteGoal(g.id)} style={{ width: 30, height: 30, borderRadius: RS(15), background: 'rgba(184,92,74,0.10)', border: 'none', color: TOKENS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash size={14} /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.68)', marginTop: SP(2) }}>{p.subtitle}</div>
                    {p.noBaseline ?
                    <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.55)', marginTop: SP(8) }}>尚無上一期資料可比較</div> :
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(6), marginTop: SP(6) }}>
                        <div style={{ fontSize: FS(24), fontWeight: 700, fontFamily: TOKENS.fontMono, color: p.done ? TOKENS.green : TOKENS.ink }}>{p.pct.toFixed(0)}%</div>
                        <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.68)' }}>{mask(Math.round(p.current))} / {mask(Math.round(p.target))}</div>
                      </div>
                      <div style={{ height: 8, borderRadius: RS(4), background: 'rgba(0,0,0,0.08)', marginTop: SP(8), overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.pct}%`, borderRadius: RS(4), background: p.done ? TOKENS.green : TOKENS.ink, transition: 'width 420ms ease-out' }} />
                      </div>
                      <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.68)', marginTop: SP(6) }}>
                        {p.done ? '🎉 已達成目標' : `還差 ${mask(Math.round(p.target - p.current))}${p.remainingText ? ` · ${p.remainingText}` : ''}`}
                      </div>
                    </>}
                    {p.historyDots && <GoalHistoryDots {...p.historyDots} periodLabel={g.periodUnit === 'month' ? '月' : '年'} />}
                  </div>}
                </div>);
            })}
            <div style={{ ...cardStyle, padding: PAD('18px 16px') }}>
              {editingId === 'new' ?
              <GoalEditForm /> :
              editingId === 'picking' ?
              <GoalTypePicker /> :
              <button onClick={startPicker} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6), height: 44, background: 'transparent', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: RS(12), color: 'rgba(44,44,50,0.7)', fontSize: FS(16), cursor: 'pointer' }}>
                <Plus size={16} />{goals.length === 0 ? '設定目標' : '新增目標'}
              </button>}
            </div>
          </div>
          }
          {view === 'alloc' && <>
          {/* 資產配置 圓餅（標題已在頁首，這裡不重複） */}
          <div style={{ ...cardStyle, padding: PAD('20px 16px') }}>
            {assets.length === 0 ?
            <div style={{ fontSize: FS(17), color: 'rgba(44,44,50,0.55)', textAlign: 'center', padding: PAD('12px 0') }}>尚無資產</div> :
            <>
              <StatDonut data={assetData} total={totalAssets} label="總資產" color={TOKENS.ink} mask={mask} />
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
                    <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.62)', marginTop: SP(1) }}>
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
          </>}
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