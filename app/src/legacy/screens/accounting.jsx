// Accounting / 智慧記帳 (收支轉帳 + 股票買賣，共用語音 AI)
const { useState: useStateAcc, useEffect: useEffectAcc, useRef: useRefAcc } = React;

const TODAY_ACC = new Date();

/* ============= shared DatePicker — 使用全站共用 DateNavBar（高度 45） ============= */
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useStateAcc(false);
  const CalendarSheet = window.CalendarSheet;
  const DateNavBar = window.DateNavBar;
  const TODAY = window.TODAY_DATE || TODAY_ACC;

  const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
  const isToday = sameDay(value, TODAY);
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const label = `${isToday ? '今日 · ' : ''}${value.getMonth() + 1}/${value.getDate()} 週${week[value.getDay()]}`;
  const step = (delta) => {
    const n = new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta);
    onChange(n);
  };

  return (
    <>
      <DateNavBar label={label}
      onPrev={() => step(-1)} onNext={() => step(1)}
      onCenter={() => setOpen(true)} nextDisabled={false} />
      {CalendarSheet &&
      <CalendarSheet open={open} date={value}
      onPick={(d) => {onChange(d);setOpen(false);}}
      onClose={() => setOpen(false)} />
      }
    </>);

}

const FLOW_EXAMPLES = [
'中午吃麥當勞 150 元 用信用卡 A 刷的',
'昨天領薪水五萬兩千 進主要存款帳戶',
'從主要存款轉三萬塊到券商交割戶'];

const STOCK_EXAMPLES = [
'買進台積電 100 股 成交價 1045',
'賣出元大台灣 50 1000 股 195',
'買進美債 ETF 00679B 800 股 33'];


const VOICE_SCENARIOS = [
{
  intent: 'flow', text: '中午吃麥當勞 150 元 用信用卡 A 刷的',
  apply: { kind: 'exp', amount: '150', category: '餐飲', account: '信用卡 A', note: '麥當勞 · 午餐' },
  summary: [['類型', '支出'], ['金額', '150'], ['分類', '餐飲'], ['帳戶', '信用卡 A']]
},
{
  intent: 'stock', text: '買進台積電 100 股 成交價 1045',
  apply: { side: 'buy', code: '2330', name: '台積電', shares: '100', price: '1045', assetClass: '股票' },
  summary: [['方向', '買進'], ['股票', '2330 台積電'], ['股數', '100 股'], ['成交價', '1,045']]
},
{
  intent: 'flow', text: '從主要存款轉三萬塊到券商交割戶',
  apply: { kind: 'xfer', amount: '30000', category: '轉帳', fromAccount: '主要存款帳戶', toAccount: '券商交割戶', note: '加碼資金' },
  summary: [['類型', '轉帳'], ['金額', '30,000'], ['轉出', '主要存款帳戶'], ['轉入', '券商交割戶']]
},
{
  intent: 'stock', text: '買進美債 ETF 00679B 800 股 33',
  apply: { side: 'buy', code: '00679B', name: '元大美債20年', shares: '800', price: '33', assetClass: '債券' },
  summary: [['方向', '買進'], ['分類', '債券'], ['代號', '00679B'], ['股數', '800 股']]
}];


function AccountingScreen({ onSaved, onDelete, initialDraft, masterData, computedHoldings }) {
  const recordId = initialDraft && initialDraft.recordId;
  const draftFlow = initialDraft && initialDraft.intent === 'flow' ? initialDraft.apply : null;
  const draftStock = initialDraft && initialDraft.intent === 'stock' ? initialDraft.apply : null;
  const [mode, setMode] = useStateAcc(initialDraft && initialDraft.intent === 'stock' ? 'stock' : 'flow');

  // Flow form state (lifted) — seeded by voice draft when present
  const [flow, setFlow] = useStateAcc(() => {
    const md = masterData || {};
    const accts = (md.accounts || []).map((a) => a.name);
    const settles = (md.settle || []).map((s) => s.name);
    const allAccts = [...new Set([...accts, ...settles])];
    const catExp = md.cat_exp || [];
    const firstExpCat = catExp.length ? typeof catExp[0] === 'string' ? catExp[0] : catExp[0].name : '午餐';
    const firstAcct = accts[0] || allAccts[0] || '主要存款帳戶';
    const firstFrom = allAccts[0] || '主要存款帳戶';
    const firstTo = settles[0] || allAccts[1] || allAccts[0] || '券商交割戶';
    return {
      kind: 'exp', amount: '',
      category: firstExpCat,
      account: firstAcct,
      fromAccount: firstFrom,
      toAccount: firstTo,
      date: new Date(window.TODAY_DATE || TODAY_ACC), note: '',
      ...(draftFlow || {})
    };
  });
  const updateFlow = (patch) => setFlow((f) => ({ ...f, ...patch }));

  // Stock form state (lifted) — seeded by voice draft when present
  const [stock, setStock] = useStateAcc(() => {
    const md = masterData || {};
    const brokers = md.brokers || [];
    const firstBroker = brokers[0] ? brokers[0].name : '主要券商';
    const firstSettle = brokers[0] && brokers[0].settleAccount ?
    brokers[0].settleAccount :
    (md.settle || [])[0] ? md.settle[0].name : '券商交割戶';
    const firstClass = (md.asset_class || ['股票'])[0] || '股票';
    return {
      side: 'buy', code: '', name: '', shares: '', price: '',
      assetClass: firstClass,
      broker: firstBroker,
      settleAccount: firstSettle,
      date: new Date(window.TODAY_DATE || TODAY_ACC), note: '',
      ...(draftStock || {})
    };
  });
  const updateStock = (patch) => setStock((s) => ({ ...s, ...patch }));

  return (
    <div style={{ paddingTop: SP(4) }}>
      {/* AI prefill banner — shown only when data came from voice (not manual edit) */}
      {initialDraft && !initialDraft.edit && <VoicePrefillBanner draft={initialDraft} />}

      {/* Mode segmented */}
      <div style={{ padding: PAD('12px 14px 0') }}>
        <div style={{
          display: 'flex', gap: SP(6), padding: SP(4), borderRadius: RS(18),
          background: TOKENS.warmBorder, border: '1px solid rgba(0,0,0,0.20)'
        }}>
          {[
          { id: 'flow', label: '收支轉帳' },
          { id: 'stock', label: '股票買賣' }].
          map((t) =>
          <button key={t.id} onClick={() => setMode(t.id)} style={{ ...{
              flex: 1, height: 52, borderRadius: RS(8),
              background: mode === t.id ?
              TOKENS.ink2 :
              'transparent',
              border: mode === t.id ? `1px solid ${TOKENS.accent}` : '1px solid transparent',
              color: mode === t.id ? TOKENS.surface : 'rgba(60,60,67,0.6)',
              fontSize: FS(19), fontWeight: mode === t.id ? 600 : 500
            }, borderStyle: "solid", borderColor: "rgba(255, 255, 255, 0)", borderImage: "initial", borderWidth: "5px 5px 5px 6px", border: "10px solid rgba(255, 255, 255, 0)", borderRadius: "15px" }}>{t.label}</button>
          )}
        </div>
      </div>

      {mode === 'flow' ?
      <FlowForm state={flow} update={updateFlow} onSaved={onSaved} onDelete={onDelete} recordId={recordId} masterData={masterData} /> :
      <StockForm state={stock} update={updateStock} onSaved={onSaved} onDelete={onDelete} recordId={recordId} masterData={masterData} computedHoldings={computedHoldings} />}
    </div>);

}

/* ============= AI prefill banner (shown after voice parse) ============= */
function VoicePrefillBanner({ draft }) {
  const { Sparkles, Volume } = window.Icons;
  return (
    <div style={{ padding: PAD('8px 14px 0') }}>
      <div style={{
        padding: PAD('12px 14px'), borderRadius: RS(20),
        background: TOKENS.gradWarm,
        border: '1px solid rgba(168,189,140,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <div style={{
            width: 28, height: 28, borderRadius: RS(10), flexShrink: 0,
            background: 'rgba(168,189,140,0.22)', border: '1px solid rgba(168,189,140,0.45)',
            color: TOKENS.sageDarker, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><Sparkles size={15} /></div>
          <div style={{ fontSize: FS(18), fontWeight: 600, color: TOKENS.ink }}>AI 已帶入，請確認或補充</div>
        </div>
        <div style={{
          marginTop: SP(10), padding: PAD('8px 12px'), borderRadius: RS(10),
          background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: SP(6),
          fontSize: FS(18), color: 'rgba(44,44,50,0.7)', lineHeight: 1.4
        }}>
          <Volume size={13} style={{ color: TOKENS.green, flexShrink: 0, marginTop: SP(2) }} />
          <span>「{draft.text}」</span>
        </div>
        <div style={{ marginTop: SP(8), display: 'flex', flexWrap: 'wrap', gap: SP(6) }}>
          {draft.summary.map(([k, v]) =>
          <span key={k} style={{
            fontSize: FS(18), padding: PAD('3px 8px'), borderRadius: RS(6),
            background: 'rgba(168,189,140,0.16)', color: TOKENS.sageText,
            fontFamily: TOKENS.fontMono
          }}>
              <span style={{ opacity: 0.65 }}>{k}</span> {v}
            </span>
          )}
        </div>
      </div>
    </div>);

}

/* ============= Unified voice card ============= */
function UnifiedVoice({ state, text, result, onStart, onReset }) {
  const { Mic, Check, Sparkles, Volume } = window.Icons;
  return (
    <div style={{
      padding: PAD('18px 20px'), borderRadius: RS(26),
      background: state !== 'idle' ?
      TOKENS.gradWarm :
      TOKENS.surface,
      border: '1px solid rgba(217, 119, 87,0.22)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(16) }}>
        <button onClick={state === 'idle' ? onStart : onReset} style={{
          width: 72, height: 72, borderRadius: RS(36), flexShrink: 0,
          background: state === 'listening' ?
          TOKENS.gradDark :
          state === 'done' ?
          TOKENS.gradSage :
          TOKENS.gradDark,
          border: 'none', color: TOKENS.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: SH('0 10px 22px rgba(0,0,0,0.30)'), position: 'relative',
          cursor: 'pointer'
        }}>
          {state === 'listening' &&
          <>
              <span style={{ position: 'absolute', inset: -10, borderRadius: RS(46),
              border: '2px solid rgba(217, 119, 87,0.5)',
              animation: 'pulse 1.4s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: -4, borderRadius: RS(40),
              border: '2px solid rgba(217, 119, 87,0.7)',
              animation: 'pulse 1.4s ease-out infinite .35s' }} />
            </>
          }
          {state === 'done' ? <Check size={30} strokeWidth={2.5} /> : <Mic size={30} strokeWidth={2.2} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), fontSize: FS(18),
            color: TOKENS.gray2, letterSpacing: 0.5 }}>
            <Sparkles size={14} /> AI 一鍵記帳
          </div>
          <div style={{ marginTop: SP(4), fontSize: FS(20), fontWeight: 600 }}>
            {state === 'idle' && '按下說話，AI 自動分類'}
            {state === 'listening' && '正在聆聽…'}
            {state === 'done' && '✓ 已自動填入'}
          </div>
          <div style={{ marginTop: SP(2), fontSize: FS(18), color: 'rgba(44,44,50,0.5)' }}>
            支援 收支 / 轉帳 / 股票買賣 / 債券
          </div>
        </div>
      </div>

      {text &&
      <div style={{
        marginTop: SP(14), padding: PAD('12px 14px'), borderRadius: RS(18),
        background: 'rgba(60,60,67,0.05)', border: '1px solid rgba(0,0,0,0.20)',
        fontSize: FS(19), lineHeight: 1.5, color: TOKENS.ink
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), fontSize: FS(18),
          color: 'rgba(0,0,0,0.86)', letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: SP(6) }}>
            <Volume size={12} /> 語音轉文字
          </div>
          {text}
          {state === 'listening' &&
        <span style={{ display: 'inline-block', width: 2, height: 15, background: TOKENS.gray2,
          marginLeft: SP(2), animation: 'blink 0.8s steps(2) infinite', verticalAlign: 'text-bottom' }} />
        }
        </div>
      }

      {result && state === 'done' &&
      <div style={{
        marginTop: SP(10), padding: PAD('12px 14px'), borderRadius: RS(8),
        background: 'rgba(168,189,140,0.08)', border: '1px solid rgba(168,189,140,0.25)',
        display: 'flex', flexWrap: 'wrap', gap: SP(6), alignItems: 'center'
      }}>
          <span style={{ fontSize: FS(18), color: TOKENS.green, display: 'inline-flex',
          alignItems: 'center', gap: SP(4) }}>
            <Sparkles size={12} /> 解析
          </span>
          {result.summary.map(([k, v]) =>
        <span key={k} style={{
          fontSize: FS(18), padding: PAD('3px 8px'), borderRadius: RS(8),
          background: 'rgba(0,0,0,0.12)', color: TOKENS.ink,
          fontFamily: TOKENS.fontMono
        }}>
              <span style={{ color: 'rgba(44,44,50,0.5)' }}>{k}</span> {v}
            </span>
        )}
        </div>
      }
    </div>);

}

/* ============= shared dropdown field ============= */
// Global singleton: only one dropdown open at a time
if (!window.__ddId) window.__ddId = 0;

function DropField({ label, value, options, onChange, icon }) {
  const { ChevronDown } = window.Icons;
  const myId = React.useRef(++window.__ddId).current;
  const ref = React.useRef(null);
  const [open, setOpen] = useStateAcc(false);
  const [drop, setDrop] = useStateAcc({ up: false, maxH: 280 });

  // Close when another dropdown opens
  React.useEffect(() => {
    const handler = (e) => {if (e.detail !== myId) setOpen(false);};
    window.addEventListener('dd:open', handler);
    return () => window.removeEventListener('dd:open', handler);
  }, [myId]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    if (next && ref.current) {
      const r = ref.current.getBoundingClientRect();
      // Prefer the side with more room; clip the panel to fit that gap.
      const below = window.innerHeight - r.bottom - 16;
      const above = r.top - 16;
      const up = below < 220 && above > below;
      setDrop({ up, maxH: Math.max(160, Math.min(340, up ? above : below)) });
    }
    setOpen(next);
    if (next) window.dispatchEvent(new CustomEvent('dd:open', { detail: myId }));
  };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} style={{
        width: '100%', minHeight: 56, padding: PAD('8px 14px'), borderRadius: RS(18),
        background: TOKENS.surface, border: open ? '1px solid rgba(0,0,0,0.30)' : '1px solid rgba(0,0,0,0.12)',
        color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: SP(10), textAlign: 'left', height: "60px"
      }}>
        {icon && <span style={{ color: 'rgba(44,44,50,0.5)', flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...{ fontSize: FS(18), color: 'rgba(44,44,50,0.5)', letterSpacing: 0.5,
              textTransform: 'uppercase' }, fontSize: "15px" }}>{label}</div>
          <div style={{ marginTop: SP(1), fontSize: FS(20), fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        </div>
        <ChevronDown size={16} style={{ color: 'rgba(44,44,50,0.5)', flexShrink: 0,
          transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open &&
      <div style={{
        position: 'absolute',
        top: drop.up ? 'auto' : 'calc(100% + 6px)',
        bottom: drop.up ? 'calc(100% + 6px)' : 'auto',
        left: 0, right: 0, zIndex: 30,
        background: TOKENS.surface2, borderRadius: RS(18), padding: SP(6),
        border: '1px solid rgba(0,0,0,0.16)',
        boxShadow: SH('0 18px 36px rgba(0,0,0,0.12)'),
        maxHeight: drop.maxH, overflowY: 'auto'
      }}>
          {options.map((o) =>
        <button key={o} onClick={() => {onChange(o);setOpen(false);}}
        style={{
          width: '100%', minHeight: 54, padding: PAD('8px 12px'), borderRadius: RS(8),
          background: o === value ? TOKENS.ink2 : 'transparent',
          border: 'none', textAlign: 'left',
          color: o === value ? TOKENS.surface : TOKENS.ink, fontSize: FS(19),
          fontWeight: o === value ? 600 : 400
        }}>{o}</button>
        )}
        </div>
      }
    </div>);

}

function SectionLabel({ children, action }) {
  return (
    <div style={{ marginTop: SP(16), marginBottom: SP(8), padding: PAD('0 4px'),
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ ...{ fontSize: FS(14), color: 'rgba(0,0,0,0.62)', fontWeight: 600, letterSpacing: 1.2,
          textTransform: 'uppercase', borderLeft: `3px solid ${TOKENS.accent}`,
          paddingLeft: SP(6), lineHeight: 1 }, fontSize: "14px" }}>{children}</div>
      {action}
    </div>);

}

/* ============= 收支轉帳 form ============= */
function FlowForm({ state, update, onSaved, onDelete, recordId, masterData }) {
  const { Plus, Tag, CreditCard, Calendar, ArrowRight, Wallet, X, Trash } = window.Icons;
  const md = masterData || {};
  const allAccts = (md.accounts || []).map((a) => a.name);
  const allSettle = (md.settle || []).map((s) => s.name);
  const allNames = [...new Set([...allAccts, ...allSettle])];

  const KINDS = [
  { id: 'exp', label: '支出', color: TOKENS.typeExp },
  { id: 'inc', label: '收入', color: TOKENS.typeInc },
  { id: 'xfer', label: '轉帳', color: TOKENS.typeXfer }];

  const active = KINDS.find((k) => k.id === state.kind);

  const categoriesByKind = {
    exp: window.flattenExpCats ? window.flattenExpCats(md.cat_exp) : ['餐飲', '交通', '娛樂', '醫療', '其他'],
    inc: (md.cat_inc || []).map((c) => typeof c === 'string' ? c : c.name),
    xfer: md.cat_xfer || ['轉帳']
  };
  const accountsByKind = {
    exp: allNames.length ? allNames : ['信用卡 A', '信用卡 B', '主要存款帳戶', '現金', 'LINE Pay'],
    inc: allNames.length ? allNames : ['主要存款帳戶', '郵局帳戶', '現金', '券商交割戶'],
    xfer: ['轉帳']
  };
  const transferAccounts = allNames.length ? allNames : ['主要存款帳戶', '郵局帳戶', '數位帳戶', '券商交割戶', '複委託交割戶', '信用卡 A', '信用卡 B', '現金'];

  // 支出分類兩層結構：類別（群組）→ 項目（子分類）
  const expCatStruct = (() => {
    const items = (md.cat_exp || []).map((c) => typeof c === 'string' ? { name: c, group: c } : c);
    const groups = (window.EXP_GROUPS || []).slice();
    items.forEach((c) => {if (c.group && !groups.includes(c.group)) groups.push(c.group);});
    return groups.map((g) => {
      const sub = items.filter((c) => c.group === g && c.name !== g).map((c) => c.name);
      return { group: g, items: sub.length ? sub : [g] };
    });
  })();
  const expGroupOf = (name) => {
    const hit = expCatStruct.find((s) => s.items.includes(name) || s.group === name);
    return hit ? hit.group : expCatStruct.length ? expCatStruct[0].group : '';
  };
  const curExpGroup = expGroupOf(state.category);
  const curExpItems = (expCatStruct.find((s) => s.group === curExpGroup) || { items: [] }).items;

  return (
    <div style={{ padding: PAD('8px 14px 28px'), color: TOKENS.ink }}>
      {/* Big kind toggle */}
      <SectionLabel>記帳類型</SectionLabel>
      <div style={{ display: 'flex', gap: SP(8) }}>
        {KINDS.map((k) => {
          const on = k.id === state.kind;
          return (
            <button key={k.id} onClick={() => {
              const newCats = categoriesByKind[k.id];
              const newAccts = accountsByKind[k.id];
              update({
                kind: k.id,
                category: newCats.includes(state.category) ? state.category : newCats[0],
                account: newAccts.includes(state.account) ? state.account : newAccts[0]
              });
            }} style={{
              flex: 1, borderRadius: RS(18),
              background: on ?
              k.color :
              TOKENS.surface,
              border: on ? `1px solid ${k.color}` : '1px solid rgba(0,0,0,0.12)',
              color: on ? TOKENS.surface : 'rgba(60,60,67,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: FS(20), fontWeight: on ? 700 : 500, gap: SP(2),
              boxShadow: SH('none'), height: "55px", lineHeight: "1"
            }}>
              <span style={{
                fontSize: FS(18), fontFamily: TOKENS.fontMono,
                letterSpacing: 1, opacity: on ? 0.7 : 0.55, width: "15px", height: "15px"
              }}>{{ exp: '-', inc: '+', xfer: '↔' }[k.id]}</span>
              {k.label}
            </button>);

        })}
      </div>

      {/* Amount big */}
      <SectionLabel>金額</SectionLabel>
      <div style={{ ...{
          padding: PAD('16px 20px'), borderRadius: RS(18), background: TOKENS.surface,
          border: '1px solid rgba(0,0,0,0.20)', height: "60px", lineHeight: "1.6"
        }, padding: "13px 20px 16px" }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(8), lineHeight: "1.8" }}>
          
          <input value={state.amount} onChange={(e) => update({ amount: e.target.value })}
          placeholder="0" inputMode="decimal"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: FS(46), fontWeight: 700, color: active.color,
            fontFamily: TOKENS.fontMono, letterSpacing: -1,
            minWidth: 0, padding: SP(0), width: "307px", height: "35px"
          }} />
        </div>
      </div>

      {/* Category + Account side by side (or From → To for transfer) */}
      {state.kind === 'xfer' ?
      <>
          <SectionLabel>轉出 / 轉入帳戶</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField label="轉出帳戶" value={state.fromAccount}
            options={transferAccounts.filter((a) => a !== state.toAccount)}
            onChange={(v) => update({ fromAccount: v })}
            icon={<CreditCard size={16} />} />
            </div>
            <div style={{
            width: 32, height: 32, borderRadius: RS(18), flexShrink: 0,
            background: 'rgba(197,160,125,0.18)', border: '1px solid rgba(197,160,125,0.4)',
            color: TOKENS.gray3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            alignSelf: 'flex-end', marginBottom: SP(14)
          }}>
              <ArrowRight size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DropField label="轉入帳戶" value={state.toAccount}
            options={transferAccounts.filter((a) => a !== state.fromAccount)}
            onChange={(v) => update({ toAccount: v })}
            icon={<Wallet size={16} />} />
            </div>
          </div>
          <SectionLabel>轉帳分類</SectionLabel>
          <DropField label="分類" value={state.category}
        options={categoriesByKind.xfer.length ? categoriesByKind.xfer : ['日常轉帳', '投資轉入', '繳卡費']}
        onChange={(v) => update({ category: v })}
        icon={<Tag size={16} />} />
        </> :

      state.kind === 'exp' ?
      <>
          <SectionLabel>分類</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP(10) }}>
            <DropField label="類別" value={curExpGroup}
          options={expCatStruct.map((s) => s.group)}
          onChange={(g) => {
            const s = expCatStruct.find((x) => x.group === g);
            update({ category: s && s.items.length ? s.items[0] : g });
          }}
          icon={<Tag size={16} />} />
            <DropField label="項目" value={state.category}
          options={curExpItems}
          onChange={(v) => update({ category: v })}
          icon={<Tag size={16} />} />
          </div>
          <SectionLabel>帳戶</SectionLabel>
          <DropField label="帳戶" value={state.account}
        options={accountsByKind.exp}
        onChange={(v) => update({ account: v })}
        icon={<CreditCard size={16} />} />
        </> :

      <>
          <SectionLabel>分類 / 帳戶</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP(10) }}>
            <DropField label="分類" value={state.category}
          options={categoriesByKind[state.kind]}
          onChange={(v) => update({ category: v })}
          icon={<Tag size={16} />} />
            <DropField label="帳戶" value={state.account}
          options={accountsByKind[state.kind]}
          onChange={(v) => update({ account: v })}
          icon={<CreditCard size={16} />} />
          </div>
        </>
      }

      {/* Date */}
      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      {/* Note */}
      <SectionLabel>備註</SectionLabel>
      <div style={{ padding: PAD('10px 16px'), borderRadius: RS(18), background: TOKENS.surface,
        border: '1px solid rgba(0,0,0,0.20)' }}>
        <input value={state.note} onChange={(e) => update({ note: e.target.value })}
        placeholder="輸入備註…"
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          fontSize: FS(20), color: TOKENS.ink
        }} />
      </div>

      {/* Submit */}
      <div style={{ marginTop: SP(18), display: 'flex', gap: SP(10) }}>
        {recordId &&
        <button onClick={() => onDelete && onDelete(recordId)} style={{
          flex: '0 0 auto', padding: PAD('0 22px'), height: 60, borderRadius: RS(18),
          background: 'transparent', border: '1px solid rgba(216,135,112,0.4)',
          color: TOKENS.red, fontSize: FS(20), fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8)
        }}>
            <Trash size={20} strokeWidth={2.2} /> 刪除
          </button>
        }
        <button onClick={() => {
          if (!state.amount || parseFloat(state.amount) <= 0) return;
          onSaved && onSaved('flow', { ...state, recordId });
        }} style={{ ...{
            flex: 1, height: 60, borderRadius: RS(18),
            background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`,
            border: 'none', color: TOKENS.inkDeep, fontSize: FS(20), fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
            boxShadow: SH(`0 6px 18px ${active.color}40`)
          }, color: "rgb(255, 255, 255)" }}>
          <Plus size={20} strokeWidth={2.5} /> {recordId ? '更新' : '儲存'}{active.label}
        </button>
        {!recordId &&
        <button onClick={() => {
          if (!state.amount || parseFloat(state.amount) <= 0) return;
          onSaved && onSaved('flow', { ...state }, true);
          update({ amount: '', note: '' });
        }} style={{
          flex: '0 0 auto', padding: PAD('0 16px'), height: 60, borderRadius: RS(18),
          background: 'transparent', border: `1px solid ${active.color}`,
          color: active.color, fontSize: FS(17), fontWeight: 600, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>再記一筆</button>
        }
      </div>
    </div>);

}

/* ============= 股票買賣 form ============= */
function StockForm({ state, update, onSaved, onDelete, recordId, masterData, computedHoldings = [] }) {
  const { Plus, TrendUp, TrendDown, Search, Calendar, X, Trash } = window.Icons;
  const md = masterData || {};

  // Flatten all holdings for sell picker (guard against undefined)
  const allHoldings = (computedHoldings || []).flatMap((g) => g && g.items ? g.items.filter(Boolean) : []);
  const [showHoldings, setShowHoldings] = useStateAcc(false);

  // When switching to sell, show holdings picker if available
  const pickHolding = (h) => {
    update({
      code: h.code, name: h.name,
      shares: String(h.qty),
      price: String(h.price),
      assetClass: h.assetClass || '股票'
    });
  };

  // 股票搜尋資料庫：US 清單 + 台股即時（TWSE/TPEX）
  const [stockUniverse, setStockUniverse] = useStateAcc(() => window.US_STOCK_LIST || []);
  useEffectAcc(() => {
    const p = window._twStockPromise || (window.loadTWStocks ? window.loadTWStocks() : Promise.resolve([]));
    p.then((twStocks) => {
      if (twStocks.length > 0) setStockUniverse([...twStocks, ...(window.US_STOCK_LIST || [])]);
    });
  }, []);

  const showMatches = state.code.length >= 1 && !stockUniverse.find(
    (u) => u.code === state.code && u.name === state.name);
  const matches = showMatches ?
  stockUniverse.filter((u) =>
  u.code.toLowerCase().startsWith(state.code.toLowerCase()) ||
  u.name.includes(state.code)
  ).slice(0, 8) : [];

  const pick = (s) => {
    const classMap = {
      '台股ETF': '市值 ETF', '美股ETF': '市值 ETF',
      '台股': '股票', '美股': '股票',
      '債券': '債券', 'ETF': '市值 ETF'
    };
    update({ code: s.code, name: s.name,
      price: s.last ? String(s.last) : '',
      assetClass: classMap[s.class] || s.class || '股票' });
  };

  const sh = parseFloat(state.shares) || 0;
  const pr = parseFloat(state.price) || 0;
  const gross = sh * pr;
  // 手續費折扣：依所選券商設定（折，如 6 = 六折）；空白或 10 = 無折扣
  const _brokerObj = (md.brokers || []).find((b) => b.name === state.broker);
  const _feeDisc = _brokerObj && _brokerObj.discount != null && String(_brokerObj.discount).trim() !== '' ? parseFloat(_brokerObj.discount) : 10;
  const feeMult = _feeDisc > 0 && _feeDisc <= 10 ? _feeDisc / 10 : 1;
  const fee = sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425 * feeMult)) : 0;
  const tax = state.side === 'sell' ? Math.round(gross * 0.003) : 0;
  const net = state.side === 'buy' ? gross + fee : gross - fee - tax;

  const accent = state.side === 'buy' ? TOKENS.typeBuy : TOKENS.typeSell;
  const SIDES = [
  { id: 'buy', label: '買進', Icon: TrendUp, color: TOKENS.typeBuy },
  { id: 'sell', label: '賣出', Icon: TrendDown, color: TOKENS.typeSell }];


  // Brokers / settle accounts / asset classes pulled from Settings master data
  const brokerObjs = (md.brokers || []).length ? md.brokers : [{ name: '主要券商' }, { name: '副券商' }, { name: '複委託 (美股)' }];
  const brokers = brokerObjs.map((b) => b.name);
  const brokerSettleMap = Object.fromEntries(brokerObjs.filter((b) => b.settleAccount).map((b) => [b.name, b.settleAccount]));
  const settleAccounts = (md.settle || []).map((s) => s.name).length ? md.settle.map((s) => s.name) : ['券商交割戶', '複委託交割戶', '主要存款帳戶'];
  const classes = md.asset_class || ['股票', '債券', '市值 ETF', '主動 ETF', '特別股'];

  // 主檔若已刪除目前選取的項目，自動改回第一個有效選項（避免顯示已不存在的分類）
  useEffectAcc(() => {
    if (classes.length && state.assetClass && !classes.includes(state.assetClass)) update({ assetClass: classes[0] });
  }, [classes.join('|'), state.assetClass]);
  useEffectAcc(() => {
    if (brokers.length && state.broker && !brokers.includes(state.broker)) update({ broker: brokers[0] });
  }, [brokers.join('|'), state.broker]);
  useEffectAcc(() => {
    if (settleAccounts.length && state.settleAccount && !settleAccounts.includes(state.settleAccount)) update({ settleAccount: settleAccounts[0] });
  }, [settleAccounts.join('|'), state.settleAccount]);

  return (
    <div style={{ padding: PAD('8px 14px 28px'), color: TOKENS.ink }}>
      {/* Buy / Sell big toggle */}
      <SectionLabel>交易方向</SectionLabel>
      <div style={{ display: 'flex', gap: SP(10) }}>
        {SIDES.map((s) => {
          const on = s.id === state.side;
          return (
            <button key={s.id} onClick={() => update({ side: s.id })} style={{
              flex: 1, borderRadius: RS(18),
              background: on ?
              s.color :
              TOKENS.surface,
              border: on ? `1px solid ${s.color}` : '1px solid rgba(0,0,0,0.12)',
              color: on ? TOKENS.surface : 'rgba(60,60,67,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
              fontSize: FS(20), fontWeight: on ? 700 : 500, height: "55px", lineHeight: "1.25"
            }}>
              <s.Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
              {s.label}
            </button>);

        })}
      </div>


      {/* Stock picker */}
      <SectionLabel>標的</SectionLabel>
      <div style={{ display: 'flex', gap: SP(8) }}>
        <div style={{ flex: '0 0 128px', minWidth: 0, overflow: 'hidden', padding: PAD('7px 12px'), borderRadius: RS(18),
          background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.20)' }}>
          <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', letterSpacing: 0.5 }}>代號</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), marginTop: SP(2), minWidth: 0 }}>
            <Search size={15} style={{ color: 'rgba(44,44,50,0.5)', flexShrink: 0 }} />
            <input value={state.code} onChange={(e) => update({ code: e.target.value.toUpperCase(), name: '' })}
            onFocus={() => state.side === 'sell' && allHoldings.length > 0 && setShowHoldings(true)}
            onBlur={() => setTimeout(() => setShowHoldings(false), 200)}
            placeholder="2330" style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              fontSize: FS(20), fontWeight: 600, color: TOKENS.ink, fontFamily: TOKENS.fontMono
            }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: PAD('7px 12px'), borderRadius: RS(18),
          background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.20)' }}>
          <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', letterSpacing: 0.5 }}>名稱</div>
          <input value={state.name} onChange={(e) => update({ name: e.target.value })}
          placeholder="台積電"
          style={{
            marginTop: SP(2), width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontSize: FS(20), color: TOKENS.ink, minWidth: 0
          }} />
        </div>
      </div>
      {/* Holdings dropdown (sell mode, focus) */}
      {state.side === 'sell' && showHoldings && allHoldings.length > 0 && !state.code &&
      <div style={{ marginTop: SP(8), display: 'flex', flexDirection: 'column', gap: SP(6) }}>
          {allHoldings.map((h) =>
        <button key={h.code} onMouseDown={() => {pickHolding(h);setShowHoldings(false);}} style={{
          display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('10px 14px'),
          borderRadius: RS(14), textAlign: 'left',
          background: TOKENS.surface, border: '1px solid rgba(168,189,140,0.45)', cursor: 'pointer'
        }}>
              <div style={{ width: 36, height: 46, borderRadius: RS(10), flexShrink: 0,
            background: `${TOKENS.typeSell}1f`, color: TOKENS.typeSell,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700 }}>
                {h.code.slice(0, 4)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: FS(18), fontWeight: 500, color: TOKENS.ink,
              display: 'flex', alignItems: 'baseline', gap: SP(6) }}>
                  <span style={{ fontFamily: TOKENS.fontMono }}>{h.code}</span>
                  <span style={{ color: 'rgba(44,44,50,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                </div>
                <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.88)', marginTop: SP(1), fontFamily: TOKENS.fontMono }}>
                  {h.qty.toLocaleString()} 股 · 均價 {h.avg.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: FS(17), fontWeight: 600, fontFamily: TOKENS.fontMono,
            color: h.pnl < 0 ? TOKENS.red : TOKENS.ink2, flexShrink: 0 }}>
                {h.pnl < 0 ? '-' : ''}{h.pnl ? Math.abs(Math.round(h.pnl)).toLocaleString() : '0'}
              </div>
            </button>
        )}
        </div>
      }

            {matches.length > 0 &&
      <div style={{ marginTop: SP(8), display: 'flex', flexDirection: 'column', gap: SP(6) }}>
          {matches.slice(0, 4).map((s) =>
        <button key={s.code} onClick={() => pick(s)} style={{
          display: 'flex', alignItems: 'center', gap: SP(10), padding: PAD('10px 14px'),
          borderRadius: RS(8), background: TOKENS.surface,
          border: '1px solid rgba(0,0,0,0.20)', color: TOKENS.ink,
          textAlign: 'left'
        }}>
              <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(19),
            fontWeight: 600, width: 64 }}>{s.code}</span>
              <span style={{ flex: 1, fontSize: FS(19) }}>{s.name}</span>
              <span style={{ fontSize: FS(18), padding: PAD('2px 8px'), borderRadius: RS(5),
            background: 'rgba(0,0,0,0.12)', color: 'rgba(44,44,50,0.6)' }}>
                {s.class}
              </span>
              <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18),
            color: 'rgba(0,0,0,0.90)' }}>{s.last}</span>
            </button>
        )}
        </div>
      }

      {/* Shares + Price */}
      <SectionLabel>股數 / 成交價</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP(10) }}>
        {[
        { k: 'shares', label: '股數', placeholder: '0', inputMode: 'numeric' },
        { k: 'price', label: '成交價', placeholder: '0', inputMode: 'decimal' }].
        map((f) =>
        <div key={f.k} style={{ ...{
            padding: PAD('12px 14px'), borderRadius: RS(18),
            background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.20)'
          }, padding: "6px 14px 10px", height: "70px" }}>
            <div style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.5)', letterSpacing: 0.5,
            textTransform: 'uppercase' }}>{f.label}</div>
            <input value={state[f.k]} onChange={(e) => update({ [f.k]: e.target.value })}
          placeholder={f.placeholder} inputMode={f.inputMode}
          style={{
            marginTop: SP(4), width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontSize: FS(24), fontWeight: 600, color: TOKENS.ink,
            fontFamily: TOKENS.fontMono, margin: "0px"
          }} />
          </div>
        )}
      </div>
      <div style={{ marginTop: SP(10), display: 'flex', gap: SP(6), alignItems: 'center' }}>
        {[10, 100, 1000].map((n) =>
        <button key={n} onClick={() => update({ shares: String((parseFloat(state.shares) || 0) + n) })} style={{ ...{
            flex: 1, height: 40, borderRadius: RS(8),
            background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)',
            color: 'rgba(44,44,50,0.7)', fontFamily: TOKENS.fontMono,
            fontSize: FS(18), fontWeight: 500
          }, fontSize: "17px" }}>+{n.toLocaleString()}</button>
        )}
        <button onClick={() => update({ shares: '' })} style={{
          flex: '0 0 auto', padding: PAD('0 12px'), height: 40, borderRadius: RS(8),
          background: 'transparent', border: '1px solid rgba(0,0,0,0.14)',
          color: 'rgba(44,44,50,0.6)', fontSize: FS(16) }}>清除</button>
      </div>

      {/* Calc */}
      <div style={{
        marginTop: SP(16), padding: PAD('10px 16px'), borderRadius: RS(18),
        background: `${accent}10`, border: `1px solid ${accent}30`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FS(18),
          color: 'rgba(44,44,50,0.6)' }}>
          <span>成交金額</span>
          <span style={{ fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>
            {gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div style={{ marginTop: SP(4), display: 'flex', justifyContent: 'space-between', fontSize: FS(18),
          color: 'rgba(44,44,50,0.6)' }}>
          <span>手續費 0.1425%{feeMult < 1 ? ` · ${_feeDisc} 折` : ''}</span>
          <span style={{ fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>
            {fee.toLocaleString()}
          </span>
        </div>
        {state.side === 'sell' &&
        <div style={{ marginTop: SP(4), display: 'flex', justifyContent: 'space-between', fontSize: FS(18),
          color: 'rgba(44,44,50,0.6)' }}>
            <span>證交稅 0.3%</span>
            <span style={{ fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>
              {tax.toLocaleString()}
            </span>
          </div>
        }
        <div style={{ marginTop: SP(10), paddingTop: SP(10),
          borderTop: '1px solid rgba(0,0,0,0.14)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: FS(19), fontWeight: 500 }}>
            {state.side === 'buy' ? '應付' : '應收'}
          </span>
          <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(22), fontWeight: 700,
            color: accent }}>
            {net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* 交割資訊 */}
      <SectionLabel>交割資訊</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP(10) }}>
        <DropField label="分類" value={state.assetClass}
        options={classes} onChange={(v) => update({ assetClass: v })} />
        <DropField label="證券戶" value={state.broker}
        options={brokers} onChange={(v) => {
          const autoSettle = brokerSettleMap[v];
          update({ broker: v, ...(autoSettle ? { settleAccount: autoSettle } : {}) });
        }} />
      </div>
      <div style={{ marginTop: SP(10) }}>
        <DropField label="交割戶" value={state.settleAccount}
        options={settleAccounts} onChange={(v) => update({ settleAccount: v })} />
      </div>

      {/* Date */}
      <SectionLabel>日期</SectionLabel>
      <DatePicker value={state.date} onChange={(v) => update({ date: v })} />

      {/* Note */}
      <SectionLabel>備註</SectionLabel>
      <div style={{ ...{ padding: PAD('10px 16px'), borderRadius: RS(18), background: TOKENS.surface,
          border: '1px solid rgba(0,0,0,0.20)', height: "45px" }, padding: "6px 16px 10px" }}>
        <input value={state.note} onChange={(e) => update({ note: e.target.value })}
        placeholder="例：除權息前布局"
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          fontSize: FS(20), color: TOKENS.ink
        }} />
      </div>

      {/* Submit */}
      <div style={{ marginTop: SP(18), display: 'flex', gap: SP(10) }}>
        {recordId &&
        <button onClick={() => onDelete && onDelete(recordId)} style={{
          flex: '0 0 auto', padding: PAD('0 22px'), height: 60, borderRadius: RS(18),
          background: 'transparent', border: '1px solid rgba(216,135,112,0.4)',
          color: TOKENS.red, fontSize: FS(20), fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8)
        }}>
            <Trash size={20} strokeWidth={2.2} /> 刪除
          </button>
        }
        <button onClick={() => {
          if (!state.code || !state.shares || !state.price) return;
          onSaved && onSaved('stock', { ...state, fee, tax, net, recordId });
        }} style={{ ...{
            flex: 1, height: 60, borderRadius: RS(18),
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            border: 'none', color: TOKENS.inkDeep, fontSize: FS(20), fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
            boxShadow: SH(`0 6px 18px ${accent}40`)
          }, color: "rgb(255, 255, 255)" }}>
          <Plus size={20} strokeWidth={2.5} /> {recordId ? '更新' : '儲存'}{state.side === 'buy' ? '買進' : '賣出'}紀錄
        </button>
        {!recordId &&
        <button onClick={() => {
          if (!state.code || !state.shares || !state.price) return;
          onSaved && onSaved('stock', { ...state, fee, tax, net }, true);
          update({ code: '', name: '', shares: '', price: '', note: '' });
        }} style={{
          flex: '0 0 auto', padding: PAD('0 16px'), height: 60, borderRadius: RS(18),
          background: 'transparent', border: `1px solid ${accent}`,
          color: accent, fontSize: FS(17), fontWeight: 600, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>再記一筆</button>
        }
      </div>
    </div>);

}

window.AccountingScreen = AccountingScreen;
window.VOICE_SCENARIOS = VOICE_SCENARIOS;