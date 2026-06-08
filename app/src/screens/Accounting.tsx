import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Calendar, Mic, Check, Sparkles, Volume, Plus, Tag, CreditCard, ArrowRight, Wallet, TrendUp, TrendDown, Search } from '../icons';
import CalendarSheet from '../components/CalendarSheet';
import DropField from '../components/DropField';
import { TODAY, type FlowState, type StockState, type FlowKind, type Side } from '../data/demo';

export type SavedKind = 'flow' | 'stock';
export type OnSaved = (kind: SavedKind, data: FlowState | StockState) => void;

/* ============= shared DatePicker (左右箭頭 + 中間點開日曆) ============= */
function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isToday = sameDay(value, TODAY);
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = isToday
    ? `今日 · ${value.getMonth() + 1}/${value.getDate()} 週${week[value.getDay()]}`
    : `${value.getMonth() + 1}/${value.getDate()} 週${week[value.getDay()]}`;
  const step = (delta: number) => {
    const n = new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta);
    if (n > TODAY) return;
    onChange(n);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => step(-1)}
        style={{
          width: 60,
          height: 60,
          borderRadius: 14,
          flexShrink: 0,
          background: '#FFFFFF',
          border: '1px solid rgba(28,26,24,0.12)',
          color: 'rgba(45,36,32,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button
        onClick={() => setOpen(true)}
        style={{
          flex: 1,
          minWidth: 0,
          height: 60,
          padding: '0 12px',
          borderRadius: 14,
          background: '#FFFFFF',
          border: '1px solid rgba(217,119,87,0.32)',
          color: '#F2B89C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        <Calendar size={16} />
        {label}
      </button>
      <button
        onClick={() => step(1)}
        disabled={isToday}
        style={{
          width: 60,
          height: 60,
          borderRadius: 14,
          flexShrink: 0,
          background: '#FFFFFF',
          border: '1px solid rgba(28,26,24,0.12)',
          color: isToday ? 'rgba(28,26,24,0.38)' : 'rgba(45,36,32,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronRight size={20} />
      </button>
      <CalendarSheet
        open={open}
        date={value}
        onPick={(d) => {
          onChange(d);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

interface VoiceScenario {
  intent: 'flow' | 'stock';
  text: string;
  apply: Partial<FlowState> & Partial<StockState>;
  summary: [string, string][];
}

const VOICE_SCENARIOS: VoiceScenario[] = [
  {
    intent: 'flow',
    text: '中午吃麥當勞 150 元 用信用卡 A 刷的',
    apply: { kind: 'exp', amount: '150', category: '餐飲', account: '信用卡 A', note: '麥當勞 · 午餐' },
    summary: [['類型', '支出'], ['金額', 'NT$ 150'], ['分類', '餐飲'], ['帳戶', '信用卡 A']],
  },
  {
    intent: 'stock',
    text: '買進台積電 100 股 成交價 1045',
    apply: { side: 'buy', code: '2330', name: '台積電', shares: '100', price: '1045', assetClass: '股票' },
    summary: [['方向', '買進'], ['股票', '2330 台積電'], ['股數', '100 股'], ['成交價', '1,045']],
  },
  {
    intent: 'flow',
    text: '從主要存款轉三萬塊到券商交割戶',
    apply: { kind: 'xfer', amount: '30000', category: '轉帳', fromAccount: '主要存款帳戶', toAccount: '券商交割戶', note: '加碼資金' },
    summary: [['類型', '轉帳'], ['金額', 'NT$ 30,000'], ['轉出', '主要存款帳戶'], ['轉入', '券商交割戶']],
  },
  {
    intent: 'stock',
    text: '買進美債 ETF 00679B 800 股 33',
    apply: { side: 'buy', code: '00679B', name: '元大美債20年', shares: '800', price: '33', assetClass: '債券' },
    summary: [['方向', '買進'], ['分類', '債券'], ['代號', '00679B'], ['股數', '800 股']],
  },
];

export default function AccountingScreen({ onSaved, autoVoice }: { onSaved?: OnSaved; autoVoice?: boolean }) {
  const [mode, setMode] = useState<'flow' | 'stock'>('flow');

  const [flow, setFlow] = useState<FlowState>({
    kind: 'exp',
    amount: '',
    category: '餐飲',
    account: '信用卡 A',
    fromAccount: '主要存款帳戶',
    toAccount: '券商交割戶',
    date: new Date(TODAY),
    note: '',
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
  });
  const updateStock = (patch: Partial<StockState>) => setStock((s) => ({ ...s, ...patch }));

  // Unified voice
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'done'>('idle');
  const [voiceText, setVoiceText] = useState('');
  const [voiceResult, setVoiceResult] = useState<VoiceScenario | null>(null);
  const voiceTurn = useRef(0);

  const startVoice = () => {
    const sc = VOICE_SCENARIOS[voiceTurn.current % VOICE_SCENARIOS.length];
    voiceTurn.current += 1;
    setVoiceState('listening');
    setVoiceText('');
    setVoiceResult(null);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVoiceText(sc.text.slice(0, i));
      if (i >= sc.text.length) {
        clearInterval(id);
        setTimeout(() => {
          if (sc.intent === 'flow') {
            setMode('flow');
            updateFlow(sc.apply);
          } else {
            setMode('stock');
            updateStock(sc.apply);
          }
          setVoiceResult(sc);
          setVoiceState('done');
        }, 500);
      }
    }, 55);
  };
  const resetVoice = () => {
    setVoiceState('idle');
    setVoiceText('');
    setVoiceResult(null);
  };

  // Long-press entry: auto-start voice when the sheet opens via long-press
  useEffect(() => {
    if (autoVoice) {
      const t = setTimeout(() => startVoice(), 360);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Unified voice button */}
      <div style={{ padding: '0 18px' }}>
        <UnifiedVoice state={voiceState} text={voiceText} result={voiceResult} onStart={startVoice} onReset={resetVoice} />
      </div>

      {/* Mode segmented */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: '#EDE8E3', border: '1px solid rgba(28,26,24,0.12)' }}>
          {[
            { id: 'flow', label: '收支轉帳' },
            { id: 'stock', label: '股票買賣' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id as 'flow' | 'stock')}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                background: mode === t.id ? '#D97757' : 'transparent',
                border: mode === t.id ? '1px solid #D97757' : '1px solid transparent',
                color: mode === t.id ? '#FFFFFF' : 'rgba(45,36,32,0.6)',
                fontSize: 15,
                fontWeight: mode === t.id ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'flow' ? (
        <FlowForm state={flow} update={updateFlow} onSaved={onSaved} />
      ) : (
        <StockForm state={stock} update={updateStock} onSaved={onSaved} />
      )}
    </div>
  );
}

/* ============= Unified voice card ============= */
function UnifiedVoice({
  state,
  text,
  result,
  onStart,
  onReset,
}: {
  state: 'idle' | 'listening' | 'done';
  text: string;
  result: VoiceScenario | null;
  onStart: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 20,
        background: state !== 'idle' ? 'linear-gradient(155deg, #F0E9E2 0%, #FFFFFF 100%)' : '#FFFFFF',
        border: '1px solid rgba(217,119,87,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={state === 'idle' ? onStart : onReset}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            flexShrink: 0,
            background:
              state === 'done' ? 'linear-gradient(135deg, #A8BD8C, #8FA86F)' : 'linear-gradient(135deg, #E89878, #D97757)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 22px rgba(217,119,87,0.45)',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          {state === 'listening' && (
            <>
              <span style={{ position: 'absolute', inset: -10, borderRadius: 46, border: '2px solid rgba(217,119,87,0.5)', animation: 'pulse 1.4s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: -4, borderRadius: 40, border: '2px solid rgba(217,119,87,0.7)', animation: 'pulse 1.4s ease-out infinite .35s' }} />
            </>
          )}
          {state === 'done' ? <Check size={30} strokeWidth={2.5} /> : <Mic size={30} strokeWidth={2.2} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#E89878', letterSpacing: 0.5 }}>
            <Sparkles size={14} /> AI 一鍵記帳
          </div>
          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600 }}>
            {state === 'idle' && '按下說話，AI 自動分類'}
            {state === 'listening' && '正在聆聽…'}
            {state === 'done' && '✓ 已自動填入'}
          </div>
          <div style={{ marginTop: 2, fontSize: 14, color: 'rgba(45,36,32,0.5)' }}>支援 收支 / 轉帳 / 股票買賣 / 債券</div>
        </div>
      </div>

      {text && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(45,36,32,0.05)',
            border: '1px solid rgba(28,26,24,0.12)',
            fontSize: 15,
            lineHeight: 1.5,
            color: '#18110C',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              color: 'rgba(28,26,24,0.60)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            <Volume size={12} /> 語音轉文字
          </div>
          {text}
          {state === 'listening' && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 15,
                background: '#E89878',
                marginLeft: 2,
                animation: 'blink 0.8s steps(2) infinite',
                verticalAlign: 'text-bottom',
              }}
            />
          )}
        </div>
      )}

      {result && state === 'done' && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(168,189,140,0.08)',
            border: '1px solid rgba(168,189,140,0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 14, color: '#A8BD8C', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} /> 解析
          </span>
          {result.summary.map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 14,
                padding: '3px 8px',
                borderRadius: 8,
                background: 'rgba(28,26,24,0.12)',
                color: '#18110C',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span style={{ color: 'rgba(45,36,32,0.5)' }}>{k}</span> {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 10, padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ fontSize: 14, color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase' }}>{children}</div>
      {action}
    </div>
  );
}

/* ============= 收支轉帳 form ============= */
function FlowForm({ state, update, onSaved }: { state: FlowState; update: (p: Partial<FlowState>) => void; onSaved?: OnSaved }) {
  const KINDS: { id: FlowKind; label: string; color: string }[] = [
    { id: 'exp', label: '支出', color: '#D88770' },
    { id: 'inc', label: '收入', color: '#A8BD8C' },
    { id: 'xfer', label: '轉帳', color: '#C5A07D' },
  ];
  const active = KINDS.find((k) => k.id === state.kind)!;

  const categoriesByKind: Record<FlowKind, string[]> = {
    exp: ['餐飲', '交通', '生活雜貨', '娛樂', '醫療', '住房', '其他'],
    inc: ['薪資', '獎金', '股利', '紅利回饋', '其他'],
    xfer: ['轉帳'],
  };
  const accountsByKind: Record<FlowKind, string[]> = {
    exp: ['信用卡 A', '信用卡 B', '主要存款帳戶', '現金', 'LINE Pay'],
    inc: ['主要存款帳戶', '郵局帳戶', '現金', '券商交割戶'],
    xfer: ['轉帳'],
  };
  const transferAccounts = ['主要存款帳戶', '郵局帳戶', '數位帳戶', '券商交割戶', '複委託交割戶', '信用卡 A', '信用卡 B', '現金'];
  const KIND_SIGN: Record<FlowKind, string> = { exp: '-', inc: '+', xfer: '↔' };

  return (
    <div style={{ padding: '8px 18px 28px', color: '#18110C' }}>
      {/* Big kind toggle */}
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
                update({
                  kind: k.id,
                  category: newCats.includes(state.category) ? state.category : newCats[0],
                  account: newAccts.includes(state.account) ? state.account : newAccts[0],
                });
              }}
              style={{
                flex: 1,
                height: 68,
                borderRadius: 14,
                background: on ? k.color : '#FFFFFF',
                border: on ? `1px solid ${k.color}` : '1px solid rgba(28,26,24,0.12)',
                color: on ? '#FFFFFF' : 'rgba(45,36,32,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: on ? 700 : 500,
                gap: 2,
                boxShadow: 'none',
              }}
            >
              <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, opacity: on ? 0.7 : 0.55 }}>{KIND_SIGN[k.id]}</span>
              {k.label}
            </button>
          );
        })}
      </div>

      {/* Amount big */}
      <SectionLabel>金額</SectionLabel>
      <div style={{ padding: '16px 20px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, color: 'rgba(18,17,12,0.72)', fontFamily: 'JetBrains Mono, monospace' }}>NT$</span>
          <input
            value={state.amount}
            onChange={(e) => update({ amount: e.target.value })}
            placeholder="0"
            inputMode="decimal"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 40,
              fontWeight: 600,
              color: active.color,
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: -1,
              minWidth: 0,
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Category + Account side by side (or From → To for transfer) */}
      {state.kind === 'xfer' ? (
        <>
          <SectionLabel>轉出 / 轉入帳戶</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField
                label="轉出帳戶"
                value={state.fromAccount}
                options={transferAccounts.filter((a) => a !== state.toAccount)}
                onChange={(v) => update({ fromAccount: v })}
                icon={<CreditCard size={16} />}
              />
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 14,
                flexShrink: 0,
                background: 'rgba(197,160,125,0.18)',
                border: '1px solid rgba(197,160,125,0.4)',
                color: '#C5A07D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-end',
                marginBottom: 14,
              }}
            >
              <ArrowRight size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField
                label="轉入帳戶"
                value={state.toAccount}
                options={transferAccounts.filter((a) => a !== state.fromAccount)}
                onChange={(v) => update({ toAccount: v })}
                icon={<Wallet size={16} />}
              />
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

      {/* Date */}
      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      {/* Note */}
      <SectionLabel>備註</SectionLabel>
      <div style={{ padding: '14px 18px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <input
          value={state.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="輸入備註…"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: '#18110C' }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={() => {
          if (!state.amount || parseFloat(state.amount) <= 0) return;
          onSaved && onSaved('flow', state);
        }}
        style={{
          marginTop: 18,
          width: '100%',
          height: 60,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`,
          border: 'none',
          color: '#1a1a1a',
          fontSize: 17,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: `0 6px 18px ${active.color}40`,
        }}
      >
        <Plus size={20} strokeWidth={2.5} /> 儲存{active.label}
      </button>
    </div>
  );
}

/* ============= 股票買賣 form ============= */
function StockForm({ state, update, onSaved }: { state: StockState; update: (p: Partial<StockState>) => void; onSaved?: OnSaved }) {
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
  const fee = sh > 0 && pr > 0 ? Math.max(20, Math.round(gross * 0.001425)) : 0;
  const tax = state.side === 'sell' ? Math.round(gross * 0.003) : 0;
  const net = state.side === 'buy' ? gross + fee : gross - fee - tax;

  const accent = state.side === 'buy' ? '#D88770' : '#A8BD8C';
  const SIDES: { id: Side; label: string; Icon: typeof TrendUp; color: string }[] = [
    { id: 'buy', label: '買進', Icon: TrendUp, color: '#D88770' },
    { id: 'sell', label: '賣出', Icon: TrendDown, color: '#A8BD8C' },
  ];

  const brokers = ['主要券商', '副券商', '複委託 (美股)'];
  const settleAccounts = ['券商交割戶', '複委託交割戶', '主要存款帳戶'];
  const classes = ['股票', 'ETF', '債券', '特別股'];

  return (
    <div style={{ padding: '8px 18px 28px', color: '#18110C' }}>
      {/* Buy / Sell big toggle */}
      <SectionLabel>交易方向</SectionLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        {SIDES.map((s) => {
          const on = s.id === state.side;
          return (
            <button
              key={s.id}
              onClick={() => update({ side: s.id })}
              style={{
                flex: 1,
                height: 68,
                borderRadius: 14,
                background: on ? s.color : '#FFFFFF',
                border: on ? `1px solid ${s.color}` : '1px solid rgba(28,26,24,0.12)',
                color: on ? '#FFFFFF' : 'rgba(45,36,32,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                fontWeight: on ? 700 : 500,
              }}
            >
              <s.Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Stock picker */}
      <SectionLabel>標的</SectionLabel>
      <div style={{ padding: '4px 14px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={18} style={{ color: 'rgba(45,36,32,0.5)', flexShrink: 0 }} />
        <input
          value={state.code}
          onChange={(e) => update({ code: e.target.value.toUpperCase(), name: '' })}
          placeholder="代號"
          style={{ width: 110, background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 600, color: '#18110C', fontFamily: 'JetBrains Mono, monospace' }}
        />
        <input
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="或股票名稱"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: 'rgba(45,36,32,0.85)', paddingTop: 4, paddingBottom: 4 }}
        />
      </div>
      {matches.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matches.slice(0, 4).map((s) => (
            <button
              key={s.code}
              onClick={() => pick(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid rgba(28,26,24,0.12)',
                color: '#18110C',
                textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, width: 64 }}>{s.code}</span>
              <span style={{ flex: 1, fontSize: 15 }}>{s.name}</span>
              <span style={{ fontSize: 14, padding: '2px 8px', borderRadius: 5, background: 'rgba(28,26,24,0.12)', color: 'rgba(45,36,32,0.6)' }}>{s.class}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'rgba(18,17,12,0.72)' }}>{s.last}</span>
            </button>
          ))}
        </div>
      )}

      {/* Shares + Price */}
      <SectionLabel>股數 / 成交價</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(
          [
            { k: 'shares', label: '股數', placeholder: '0', inputMode: 'numeric' },
            { k: 'price', label: '成交價', placeholder: '0', inputMode: 'decimal' },
          ] as const
        ).map((f) => (
          <div key={f.k} style={{ padding: '12px 14px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
            <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</div>
            <input
              value={state[f.k]}
              onChange={(e) => update({ [f.k]: e.target.value })}
              placeholder={f.placeholder}
              inputMode={f.inputMode}
              style={{ marginTop: 4, width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 24, fontWeight: 600, color: '#18110C', fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        {[100, 500, 1000].map((n) => (
          <button
            key={n}
            onClick={() => update({ shares: String(n) })}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              background: 'rgba(28,26,24,0.12)',
              border: '1px solid rgba(28,26,24,0.14)',
              color: 'rgba(45,36,32,0.7)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {n.toLocaleString()} 股
          </button>
        ))}
      </div>

      {/* Calc */}
      <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: `${accent}10`, border: `1px solid ${accent}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(45,36,32,0.6)' }}>
          <span>成交金額</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(45,36,32,0.6)' }}>
          <span>手續費 0.1425%</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {fee.toLocaleString()}</span>
        </div>
        {state.side === 'sell' && (
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(45,36,32,0.6)' }}>
            <span>證交稅 0.3%</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#18110C' }}>NT$ {tax.toLocaleString()}</span>
          </div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(28,26,24,0.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{state.side === 'buy' ? '應付' : '應收'}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: accent }}>NT$ {net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* 交割資訊: 分類 | 券商 | 交割戶  ← horizontal 3 columns */}
      <SectionLabel>交割資訊</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <DropField label="分類" value={state.assetClass} options={classes} onChange={(v) => update({ assetClass: v })} />
        <DropField label="券商" value={state.broker} options={brokers} onChange={(v) => update({ broker: v })} />
        <DropField label="交割戶" value={state.settleAccount} options={settleAccounts} onChange={(v) => update({ settleAccount: v })} />
      </div>

      {/* Date */}
      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      {/* Note */}
      <SectionLabel>備註</SectionLabel>
      <div style={{ padding: '14px 18px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
        <input
          value={state.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="例：除權息前布局"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: '#18110C' }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={() => {
          if (!state.code || !state.shares || !state.price) return;
          onSaved && onSaved('stock', state);
        }}
        style={{
          marginTop: 18,
          width: '100%',
          height: 60,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          border: 'none',
          color: '#1a1a1a',
          fontSize: 17,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: `0 6px 18px ${accent}40`,
        }}
      >
        <Plus size={20} strokeWidth={2.5} /> 儲存{state.side === 'buy' ? '買進' : '賣出'}紀錄
      </button>
    </div>
  );
}
