import { useState, type ReactNode } from 'react';
import { ChevronRight, Calendar, Sparkles, Volume, Plus, Tag, CreditCard, ArrowRight, Wallet, TrendUp, TrendDown, Search, Trash } from '../icons';
import CalendarSheet from '../components/CalendarSheet';
import DropField from '../components/DropField';
import { TODAY } from '../data/demo';
import type { FlowState, StockState, FlowKind, Side, Draft, MasterData } from '../data/types';

export type SavedKind = 'flow' | 'stock';
export type OnSaved = (kind: SavedKind, data: (FlowState | StockState) & { recordId?: string }) => void;
export type OnDelete = (recordId?: string) => void;

/* ============= shared DatePicker ============= */
function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isToday = sameDay(value, TODAY);
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = isToday ? `今日 · ${value.getMonth() + 1}/${value.getDate()} 週${week[value.getDay()]}` : `${value.getMonth() + 1}/${value.getDate()} 週${week[value.getDay()]}`;
  const step = (delta: number) => {
    const n = new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta);
    if (n > TODAY) return;
    onChange(n);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => step(-1)} style={{ width: 60, height: 60, borderRadius: 18, flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', color: 'rgba(45,36,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button onClick={() => setOpen(true)} style={{ flex: 1, minWidth: 0, height: 60, padding: '0 12px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(217,119,87,0.32)', color: '#F2B89C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 17, fontWeight: 600 }}>
        <Calendar size={16} />
        {label}
      </button>
      <button onClick={() => step(1)} disabled={isToday} style={{ width: 60, height: 60, borderRadius: 18, flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', color: isToday ? 'rgba(28,26,24,0.38)' : 'rgba(45,36,32,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={20} />
      </button>
      <CalendarSheet open={open} date={value} onPick={(d) => { onChange(d); setOpen(false); }} onClose={() => setOpen(false)} />
    </div>
  );
}

export default function AccountingScreen({ onSaved, onDelete, initialDraft, masterData }: { onSaved?: OnSaved; onDelete?: OnDelete; initialDraft?: Draft | null; masterData?: MasterData }) {
  const recordId = initialDraft?.recordId;
  const draftFlow = initialDraft && initialDraft.intent === 'flow' ? initialDraft.apply : null;
  const draftStock = initialDraft && initialDraft.intent === 'stock' ? initialDraft.apply : null;
  const [mode, setMode] = useState<'flow' | 'stock'>(initialDraft && initialDraft.intent === 'stock' ? 'stock' : 'flow');

  const [flow, setFlow] = useState<FlowState>({
    kind: 'exp',
    amount: '',
    category: '餐飲',
    account: '信用卡 A',
    fromAccount: '主要存款帳戶',
    toAccount: '券商交割戶',
    date: new Date(TODAY),
    note: '',
    ...(draftFlow || {}),
  });
  const updateFlow = (patch: Partial<FlowState>) => setFlow((f) => ({ ...f, ...patch }));

  const [stock, setStock] = useState<StockState>({
    side: 'buy',
    code: '',
    name: '',
    shares: '',
    price: '',
    assetClass: '股票',
    broker: '主要券商',
    settleAccount: '券商交割戶',
    date: new Date(TODAY),
    note: '',
    ...(draftStock || {}),
  });
  const updateStock = (patch: Partial<StockState>) => setStock((s) => ({ ...s, ...patch }));

  return (
    <div style={{ paddingTop: 4 }}>
      {initialDraft && !initialDraft.edit && <VoicePrefillBanner draft={initialDraft} />}

      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 18, background: '#EDE8E3', border: '1px solid rgba(28,26,24,0.12)' }}>
          {[
            { id: 'flow', label: '收支轉帳' },
            { id: 'stock', label: '股票買賣' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id as 'flow' | 'stock')}
              style={{ flex: 1, height: 44, borderRadius: 8, background: mode === t.id ? '#D97757' : 'transparent', border: mode === t.id ? '1px solid #D97757' : '1px solid transparent', color: mode === t.id ? '#FFFFFF' : 'rgba(45,36,32,0.6)', fontSize: 16, fontWeight: mode === t.id ? 600 : 500 }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'flow' ? (
        <FlowForm state={flow} update={updateFlow} onSaved={onSaved} onDelete={onDelete} recordId={recordId} masterData={masterData} />
      ) : (
        <StockForm state={stock} update={updateStock} onSaved={onSaved} onDelete={onDelete} recordId={recordId} masterData={masterData} />
      )}
    </div>
  );
}

function VoicePrefillBanner({ draft }: { draft: Draft }) {
  return (
    <div style={{ padding: '8px 18px 0' }}>
      <div style={{ padding: '14px 16px', borderRadius: 20, background: 'linear-gradient(155deg, #F0E9E2 0%, #FFFFFF 100%)', border: '1px solid rgba(168,189,140,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, flexShrink: 0, background: 'rgba(168,189,140,0.22)', border: '1px solid rgba(168,189,140,0.45)', color: '#7C9A5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#18110C' }}>AI 已帶入，請確認或補充</div>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(28,26,24,0.05)', display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 15, color: 'rgba(45,36,32,0.7)', lineHeight: 1.4 }}>
          <Volume size={13} style={{ color: '#A8BD8C', flexShrink: 0, marginTop: 2 }} />
          <span>「{draft.text}」</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(draft.summary || []).map(([k, v]) => (
            <span key={k} style={{ fontSize: 15, padding: '3px 8px', borderRadius: 6, background: 'rgba(168,189,140,0.16)', color: '#5F7A44', fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ opacity: 0.65 }}>{k}</span> {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 10, padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 15, color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase' }}>{children}</div>
      {action}
    </div>
  );
}

/* ============= 收支轉帳 form ============= */
function FlowForm({ state, update, onSaved, onDelete, recordId, masterData }: { state: FlowState; update: (p: Partial<FlowState>) => void; onSaved?: OnSaved; onDelete?: OnDelete; recordId?: string; masterData?: MasterData }) {
  const md = masterData;
  const allAccts = (md?.accounts || []).map((a) => a.name);

  const KINDS: { id: FlowKind; label: string; color: string }[] = [
    { id: 'exp', label: '支出', color: '#D88770' },
    { id: 'inc', label: '收入', color: '#A8BD8C' },
    { id: 'xfer', label: '轉帳', color: '#C5A07D' },
  ];
  const active = KINDS.find((k) => k.id === state.kind)!;
  const KIND_SIGN: Record<FlowKind, string> = { exp: '-', inc: '+', xfer: '↔' };

  const categoriesByKind: Record<FlowKind, string[]> = {
    exp: md?.cat_exp || ['餐飲', '交通', '生活雜貨', '娛樂', '醫療', '住房', '其他'],
    inc: md?.cat_inc || ['薪資', '獎金', '股利', '紅利回饋', '其他'],
    xfer: md?.cat_xfer || ['轉帳'],
  };
  const accountsByKind: Record<FlowKind, string[]> = {
    exp: allAccts.length ? allAccts : ['信用卡 A', '信用卡 B', '主要存款帳戶', '現金', 'LINE Pay'],
    inc: allAccts.length ? allAccts : ['主要存款帳戶', '郵局帳戶', '現金', '券商交割戶'],
    xfer: ['轉帳'],
  };
  const transferAccounts = allAccts.length ? allAccts : ['主要存款帳戶', '郵局帳戶', '數位帳戶', '券商交割戶', '複委託交割戶', '信用卡 A', '信用卡 B', '現金'];

  return (
    <div style={{ padding: '8px 18px 28px', color: '#18110C' }}>
      <SectionLabel>記帳類型</SectionLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        {KINDS.map((k) => {
          const on = k.id === state.kind;
          return (
            <button
              key={k.id}
              onClick={() => {
                const newCats = categoriesByKind[k.id];
                const newAccts = accountsByKind[k.id];
                update({ kind: k.id, category: newCats.includes(state.category) ? state.category : newCats[0], account: newAccts.includes(state.account) ? state.account : newAccts[0] });
              }}
              style={{ flex: 1, height: 68, borderRadius: 18, background: on ? k.color : '#FFFFFF', border: on ? `1px solid ${k.color}` : '1px solid rgba(28,26,24,0.12)', color: on ? '#FFFFFF' : 'rgba(45,36,32,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: on ? 700 : 500, gap: 2, boxShadow: 'none' }}
            >
              <span style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, opacity: on ? 0.7 : 0.55 }}>{KIND_SIGN[k.id]}</span>
              {k.label}
            </button>
          );
        })}
      </div>

      <SectionLabel>金額</SectionLabel>
      <div style={{ padding: '16px 20px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, color: 'rgba(18,17,12,0.72)', fontFamily: 'JetBrains Mono, monospace' }}>NT$</span>
          <input value={state.amount} onChange={(e) => update({ amount: e.target.value })} placeholder="0" inputMode="decimal" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 40, fontWeight: 600, color: active.color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: -1, minWidth: 0, padding: 0 }} />
        </div>
      </div>

      {state.kind === 'xfer' ? (
        <>
          <SectionLabel>轉出 / 轉入帳戶</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField label="轉出帳戶" value={state.fromAccount} options={transferAccounts.filter((a) => a !== state.toAccount)} onChange={(v) => update({ fromAccount: v })} icon={<CreditCard size={16} />} />
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 18, flexShrink: 0, background: 'rgba(197,160,125,0.18)', border: '1px solid rgba(197,160,125,0.4)', color: '#C5A07D', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 14 }}>
              <ArrowRight size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField label="轉入帳戶" value={state.toAccount} options={transferAccounts.filter((a) => a !== state.fromAccount)} onChange={(v) => update({ toAccount: v })} icon={<Wallet size={16} />} />
            </div>
          </div>
        </>
      ) : (
        <>
          <SectionLabel>分類 / 帳戶</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DropField label="分類" value={state.category} options={categoriesByKind[state.kind]} onChange={(v) => update({ category: v })} icon={<Tag size={16} />} />
            <DropField label="帳戶" value={state.account} options={accountsByKind[state.kind]} onChange={(v) => update({ account: v })} icon={<CreditCard size={16} />} />
          </div>
        </>
      )}

      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      <SectionLabel>備註</SectionLabel>
      <div style={{ padding: '14px 18px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <input value={state.note} onChange={(e) => update({ note: e.target.value })} placeholder="輸入備註…" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 17, color: '#18110C' }} />
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        {recordId && (
          <button onClick={() => onDelete?.(recordId)} style={{ flex: '0 0 auto', padding: '0 22px', height: 60, borderRadius: 18, background: 'transparent', border: '1px solid rgba(216,135,112,0.4)', color: '#D88770', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Trash size={20} strokeWidth={2.2} /> 刪除
          </button>
        )}
        <button
          onClick={() => {
            if (!state.amount || parseFloat(state.amount) <= 0) return;
            onSaved?.('flow', { ...state, recordId });
          }}
          style={{ flex: 1, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`, border: 'none', color: '#1a1a1a', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 18px ${active.color}40` }}
        >
          <Plus size={20} strokeWidth={2.5} /> {recordId ? '更新' : '儲存'}
          {active.label}
        </button>
      </div>
    </div>
  );
}

/* ============= 股票買賣 form ============= */
function StockForm({ state, update, onSaved, onDelete, recordId, masterData }: { state: StockState; update: (p: Partial<StockState>) => void; onSaved?: OnSaved; onDelete?: OnDelete; recordId?: string; masterData?: MasterData }) {
  const md = masterData;
  const universe = [
    { code: '2330', name: '台積電', last: 1045, class: '股票' },
    { code: '2454', name: '聯發科', last: 1380, class: '股票' },
    { code: '0050', name: '元大台灣50', last: 195, class: 'ETF' },
    { code: '2412', name: '中華電', last: 126, class: '股票' },
    { code: '00679B', name: '元大美債20年', last: 33, class: '債券' },
    { code: '00772B', name: '中信高評公司債', last: 41, class: '債券' },
  ];
  const showMatches = state.code.length >= 1 && !universe.find((u) => u.code === state.code && u.name === state.name);
  const matches = showMatches ? universe.filter((u) => u.code.startsWith(state.code) || u.name.includes(state.code)) : [];
  const pick = (s: (typeof universe)[number]) => update({ code: s.code, name: s.name, price: String(s.last), assetClass: s.class });

  const sh = parseFloat(state.shares) || 0;
  const pr = parseFloat(state.price) || 0;
  const gross = sh * pr;
  const fee = sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
  const tax = state.side === 'sell' ? Math.round(gross * 0.003) : 0;
  const net = state.side === 'buy' ? gross + fee : gross - fee - tax;
  const accent = state.side === 'buy' ? '#D88770' : '#A8BD8C';
  const SIDES: { id: Side; label: string; Icon: typeof TrendUp; color: string }[] = [
    { id: 'buy', label: '買進', Icon: TrendUp, color: '#D88770' },
    { id: 'sell', label: '賣出', Icon: TrendDown, color: '#A8BD8C' },
  ];

  const brokers = (md?.brokers || []).map((b) => b.name).length ? md!.brokers.map((b) => b.name) : ['主要券商', '副券商', '複委託 (美股)'];
  const settleAccounts = (md?.settle || []).map((s) => s.name).length ? md!.settle.map((s) => s.name) : ['券商交割戶', '複委託交割戶', '主要存款帳戶'];
  const classes = md?.asset_class || ['股票', '債券', '市值 ETF', '主動 ETF', '特別股'];

  return (
    <div style={{ padding: '8px 18px 28px', color: '#18110C' }}>
      <SectionLabel>交易方向</SectionLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        {SIDES.map((s) => {
          const on = s.id === state.side;
          return (
            <button key={s.id} onClick={() => update({ side: s.id })} style={{ flex: 1, height: 68, borderRadius: 18, background: on ? s.color : '#FFFFFF', border: on ? `1px solid ${s.color}` : '1px solid rgba(28,26,24,0.12)', color: on ? '#FFFFFF' : 'rgba(45,36,32,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 18, fontWeight: on ? 700 : 500 }}>
              <s.Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
              {s.label}
            </button>
          );
        })}
      </div>

      <SectionLabel>標的</SectionLabel>
      <div style={{ padding: '4px 14px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={18} style={{ color: 'rgba(45,36,32,0.5)', flexShrink: 0 }} />
        <input value={state.code} onChange={(e) => update({ code: e.target.value.toUpperCase(), name: '' })} placeholder="代號" style={{ width: 110, background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 600, color: '#18110C', fontFamily: 'JetBrains Mono, monospace' }} />
        <input value={state.name} onChange={(e) => update({ name: e.target.value })} placeholder="或股票名稱" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 17, color: 'rgba(45,36,32,0.85)', paddingTop: 4, paddingBottom: 4 }} />
      </div>
      {matches.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matches.slice(0, 4).map((s) => (
            <button key={s.code} onClick={() => pick(s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', color: '#18110C', textAlign: 'left' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, width: 64 }}>{s.code}</span>
              <span style={{ flex: 1, fontSize: 16 }}>{s.name}</span>
              <span style={{ fontSize: 15, padding: '2px 8px', borderRadius: 5, background: 'rgba(28,26,24,0.12)', color: 'rgba(45,36,32,0.6)' }}>{s.class}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, color: 'rgba(18,17,12,0.72)' }}>{s.last}</span>
            </button>
          ))}
        </div>
      )}

      <SectionLabel>股數 / 成交價</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(
          [
            { k: 'shares', label: '股數', placeholder: '0', inputMode: 'numeric' },
            { k: 'price', label: '成交價', placeholder: '0', inputMode: 'decimal' },
          ] as const
        ).map((f) => (
          <div key={f.k} style={{ padding: '12px 14px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
            <div style={{ fontSize: 15, color: 'rgba(45,36,32,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</div>
            <input value={state[f.k]} onChange={(e) => update({ [f.k]: e.target.value })} placeholder={f.placeholder} inputMode={f.inputMode} style={{ marginTop: 4, width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 24, fontWeight: 600, color: '#18110C', fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        {[100, 500, 1000].map((n) => (
          <button key={n} onClick={() => update({ shares: String(n) })} style={{ flex: 1, height: 36, borderRadius: 8, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)', color: 'rgba(45,36,32,0.7)', fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 500 }}>
            {n.toLocaleString()} 股
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 18, background: `${accent}10`, border: `1px solid ${accent}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'rgba(45,36,32,0.6)' }}>
          <span>成交金額</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'rgba(45,36,32,0.6)' }}>
          <span>手續費 0.1425%</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {fee.toLocaleString()}</span>
        </div>
        {state.side === 'sell' && (
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'rgba(45,36,32,0.6)' }}>
            <span>證交稅 0.3%</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {tax.toLocaleString()}</span>
          </div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(28,26,24,0.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{state.side === 'buy' ? '應付' : '應收'}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: accent }}>NT$ {net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <SectionLabel>交割資訊</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <DropField label="分類" value={state.assetClass} options={classes} onChange={(v) => update({ assetClass: v })} />
        <DropField label="券商" value={state.broker} options={brokers} onChange={(v) => update({ broker: v })} />
        <DropField label="交割戶" value={state.settleAccount} options={settleAccounts} onChange={(v) => update({ settleAccount: v })} />
      </div>

      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      <SectionLabel>備註</SectionLabel>
      <div style={{ padding: '14px 18px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <input value={state.note} onChange={(e) => update({ note: e.target.value })} placeholder="例：除權息前布局" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 17, color: '#18110C' }} />
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        {recordId && (
          <button onClick={() => onDelete?.(recordId)} style={{ flex: '0 0 auto', padding: '0 22px', height: 60, borderRadius: 18, background: 'transparent', border: '1px solid rgba(216,135,112,0.4)', color: '#D88770', fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Trash size={20} strokeWidth={2.2} /> 刪除
          </button>
        )}
        <button
          onClick={() => {
            if (!state.code || !state.shares || !state.price) return;
            onSaved?.('stock', { ...state, recordId });
          }}
          style={{ flex: 1, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: 'none', color: '#1a1a1a', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 18px ${accent}40` }}
        >
          <Plus size={20} strokeWidth={2.5} /> {recordId ? '更新' : '儲存'}
          {state.side === 'buy' ? '買進' : '賣出'}紀錄
        </button>
      </div>
    </div>
  );
}
