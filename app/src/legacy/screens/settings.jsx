// Settings / 系統設定（含 AI 金鑰、主檔管理：記帳分類 / 記帳帳戶（一般帳戶、證券戶、交割戶））
const { useState: useStateSet } = React;

// Shared drag-to-reorder hook (mouse / touch via HTML5 DnD).
// Returns getRowProps(i) to spread on each draggable row, plus dragIdx/overIdx for styling.
function useDragReorder(items, onChange) {
  const [dragIdx, setDragIdx] = useStateSet(null);
  const [overIdx, setOverIdx] = useStateSet(null);
  const reorder = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };
  const getRowProps = (i, enabled = true) => enabled ? {
    draggable: true,
    onDragStart: (e) => {setDragIdx(i);e.dataTransfer.effectAllowed = 'move';try {e.dataTransfer.setData('text/plain', String(i));} catch (_) {}},
    onDragOver: (e) => {e.preventDefault();e.dataTransfer.dropEffect = 'move';if (overIdx !== i) setOverIdx(i);},
    onDrop: (e) => {e.preventDefault();reorder(dragIdx, i);setDragIdx(null);setOverIdx(null);},
    onDragEnd: () => {setDragIdx(null);setOverIdx(null);}
  } : {};
  return { dragIdx, overIdx, getRowProps };
}

/* ── 幣別 ── */
const CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'CNY', 'HKD'];
function CurrencySelect({ value, onChange, color, style }) {
  return (
    <select value={value || 'TWD'} onChange={(e) => onChange(e.target.value)}
    style={{ ...{ height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
        background: 'rgba(0,0,0,0.06)', border: `1px solid ${color}40`,
        fontSize: FS(17), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none', ...style }, padding: "0px 6px", margin: "0px" }}>
      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>);

}
function CurrencyChip({ code }) {
  return (
    <span style={{ fontSize: FS(13), padding: PAD('1px 6px'), borderRadius: RS(5), flexShrink: 0,
      background: 'rgba(46,114,216,0.10)', color: TOKENS.blue2,
      fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>{code || 'TWD'}</span>);

}

const DEFAULT_DATA = {
  cat_exp: [
  { name: '早餐', group: '餐飲' },
  { name: '午餐', group: '餐飲' },
  { name: '晚餐', group: '餐飲' },
  { name: '點心', group: '餐飲' },
  { name: '飲料', group: '餐飲' },
  { name: '加油', group: '交通' },
  { name: '捷運', group: '交通' },
  { name: '火車', group: '交通' },
  { name: '高鐵', group: '交通' },
  { name: '停車費', group: '交通' },
  { name: '修車保養', group: '交通' },
  { name: '水費', group: '日常' },
  { name: '電費', group: '日常' },
  { name: '瓦斯費', group: '日常' },
  { name: '網路費', group: '日常' },
  { name: '數位平台', group: '日常' },
  { name: '購物', group: '娛樂' },
  { name: '掛號費', group: '醫療' },
  { name: '保健食品', group: '醫療' },
  { name: '台股', group: '投資損失' },
  { name: '美股', group: '投資損失' }],

  cat_inc: [
  { name: '薪資', group: '主動' },
  { name: '獎金', group: '主動' },
  { name: '加班費', group: '主動' },
  { name: '股利', group: '被動' },
  { name: '利息', group: '被動' },
  { name: '租金', group: '被動' },
  { name: '紅利回饋', group: '被動' },
  { name: '投資收入', group: '被動' },
  { name: '發票中獎', group: '其他' },
  { name: '退稅', group: '其他' },
  { name: '其他', group: '其他' }],

  cat_xfer: ['日常轉帳', '投資轉入', '投資轉帳', '繳卡費'],
  asset_class: ['股票', '債券', '市值 ETF', '主動 ETF', '特別股'],
  accounts: [
  { name: '主要存款帳戶', kind: '銀行', currency: 'TWD' },
  { name: '郵局帳戶', kind: '銀行', currency: 'TWD' },
  { name: '數位帳戶', kind: '銀行', currency: 'TWD' },
  { name: '信用卡 A', kind: '信用卡', currency: 'TWD' },
  { name: '信用卡 B', kind: '信用卡', currency: 'TWD' },
  { name: '現金 (錢包)', kind: '現金', currency: 'TWD' },
  { name: 'LINE Pay', kind: '電子支付', currency: 'TWD' },
  { name: '街口支付', kind: '電子支付', currency: 'TWD' },
  { name: '悠遊卡', kind: '儲值卡', currency: 'TWD' },
  { name: '共同帳戶', kind: '其他', currency: 'TWD' }],

  brokers: [
  { name: '主要券商', sub: '富邦證券 · ••• 8832', settleAccount: '券商交割戶', currency: 'TWD' },
  { name: '副券商', sub: '元大證券 · ••• 1024', settleAccount: '', currency: 'TWD' },
  { name: '複委託', sub: '國泰證券 · ••• 2207', settleAccount: '複委託交割戶', currency: 'USD' }],

  settle: [
  { name: '券商交割戶', sub: '對應主要券商', currency: 'TWD' },
  { name: '複委託交割戶', sub: '對應複委託 · 美股', currency: 'USD' },
  { name: '主要存款帳戶', sub: '部分證券戶可直接交割', currency: 'TWD' }]

};

function SettingsScreen({ masterData, setMasterData, dashWidget, setDashWidget, initialBalances = {}, setInitialBalances, savedFlows = [], savedTrades = [], setSavedFlows, setSavedTrades }) {
  const { Shield, Lock, Key, Bell, MessageCircle, Smartphone, Eye, EyeOff,
    ChevronRight, Sparkles, Check, Info, Mail, Tag, CreditCard, ArrowUpRight,
    Wallet, ChevronDown, Pencil, X } = window.Icons;

  // BYOK — dynamic key list
  const DEFAULT_AI_KEYS = [
  { id: 'gemini', name: 'Google Gemini', sub: '長上下文 · 中文佳', color: TOKENS.ink2, key: '' },
  { id: 'openai', name: 'OpenAI GPT-4o', sub: '通用最強 · 速度快', color: TOKENS.green, key: '' },
  { id: 'claude', name: 'Anthropic Claude', sub: '分析嚴謹 · 推理強', color: TOKENS.gray3, key: '' }];

  const [aiKeys, setAiKeysRaw] = useStateSet(() => {
    try {const s = JSON.parse(localStorage.getItem('ff_ai_keys') || 'null');return s || DEFAULT_AI_KEYS;} catch {return DEFAULT_AI_KEYS;}
  });;
  const setAiKeys = (v) => {const next = typeof v === 'function' ? v(aiKeys) : v;setAiKeysRaw(next);try {localStorage.setItem('ff_ai_keys', JSON.stringify(next));} catch {}};

  const MODELS = [
  ...(aiKeys || []).map((k) => ({ id: k.id, name: k.name, color: k.color, has: !!k.key })),
  { id: 'local', name: 'Ollama 本機', color: TOKENS.gray4, has: true }];

  const [defaultModel, setDefaultModel] = useStateSet('local');
  const [modelOpen, setModelOpen] = useStateSet(false);
  const activeModel = MODELS.find((m) => m.id === defaultModel) || MODELS[MODELS.length - 1];

  // External integrations
  const [smsListen, setSmsListen] = useStateSet(true);
  const [linePush, setLinePush] = useStateSet(false);
  const [biometric, setBiometric] = useStateSet(true);
  const [autoBackup, setAutoBackup] = useStateSet(false);

  // Master data (lifted to App so 記帳 forms share the same lists)
  const data = masterData;
  const setData = setMasterData;
  const [sheet, setSheet] = useStateSet(null);
  const [notice, setNotice] = useStateSet(null);
  React.useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const openSheet = (cfg) => setSheet(cfg);
  const closeSheet = () => setSheet(null);

  /* ── InitBalRow — inline-editable balance per account ── */
  function InitBalRow({ acct, value, last, onChange }) {
    const [editing, setEditing] = useStateSet(false);
    const [draft, setDraft] = useStateSet(String(value !== undefined ? value : ''));
    const save = () => {
      const n = parseFloat(draft.replace(/,/g, ''));
      onChange(isNaN(n) ? 0 : n);
      setEditing(false);
    };
    const kindColors = { '銀行': TOKENS.blue2, '信用卡': TOKENS.red, '現金': TOKENS.green,
      '電子支付': TOKENS.teal, '儲值卡': TOKENS.gold, '證券戶': TOKENS.indigo, '其他': TOKENS.gray4 };
    const cc = kindColors[acct.kind] || TOKENS.gray4;
    return (
      <div style={{ padding: PAD('12px 16px'), borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.09)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(12) }}>
          <div style={{ width: 32, height: 32, borderRadius: RS(9), flexShrink: 0,
            background: `${cc}18`, border: `1px solid ${cc}30`,
            color: cc, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TOKENS.fontMono, fontSize: FS(16), fontWeight: 700 }}>
            {acct.name.slice(0, 1)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: FS(18), fontWeight: 500, color: TOKENS.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acct.name}</div>
            <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.78)', marginTop: SP(1) }}>{acct.kind}</div>
          </div>
          {editing ?
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), flexShrink: 0 }}>
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            inputMode="decimal" style={{
              width: 110, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
              background: TOKENS.bg, border: '1px solid rgba(0,0,0,0.30)',
              fontSize: FS(18), fontFamily: TOKENS.fontMono,
              color: TOKENS.ink, outline: 'none', textAlign: 'right'
            }} />
              <button onClick={save} style={{
              width: 32, height: 32, borderRadius: RS(8), flexShrink: 0,
              background: TOKENS.green, border: 'none', color: TOKENS.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Check size={14} strokeWidth={2.5} /></button>
              <button onClick={() => setEditing(false)} style={{
              width: 32, height: 32, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.12)',
              color: 'rgba(60,60,67,0.88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><X size={14} /></button>
            </div> :

          <button onClick={() => {setDraft(String(value !== undefined ? value : ''));setEditing(true);}} style={{
            display: 'flex', alignItems: 'center', gap: SP(6), flexShrink: 0,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: SP(0)
          }}>
              <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 600,
              color: value > 0 ? TOKENS.ink : 'rgba(60,60,67,0.35)' }}>
                {value !== undefined && value !== 0 ? `${Math.round(value).toLocaleString()}` : '未設定'}
              </span>
              <Pencil size={13} style={{ color: 'rgba(60,60,67,0.30)' }} />
            </button>
          }
        </div>
      </div>);

  }

  const Section = ({ label, children }) =>
  <div style={{ marginTop: SP(22) }}>
      <div style={{
      fontSize: FS(14), color: '#d97757', letterSpacing: 1.5, fontWeight: 700,
      textTransform: 'uppercase', marginBottom: SP(10), padding: PAD('0 4px'),
      display: 'flex', alignItems: 'center', gap: SP(6)
    }}>
        <span style={{ display: 'inline-block', width: 4, height: 14, borderRadius: 2,
        background: '#d97757', flexShrink: 0 }} />
        {label}
      </div>
      <div style={{
      background: TOKENS.surface, borderRadius: RS(26), overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.12)'
    }}>{children}</div>
    </div>;


  return (
    <div style={{ ...{ padding: PAD('8px 18px 32px'), color: TOKENS.ink }, padding: "6px 10px 26px" }}>
      {/* Privacy hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        marginTop: SP(4), padding: PAD('18px 20px'), borderRadius: RS(28),
        background: TOKENS.gradDark,
        border: 'none',
        boxShadow: SH('0 12px 28px rgba(0,0,0,0.25)')
      }}>
        <div style={{ position: 'absolute', top: -45, right: -30, width: 150, height: 150,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: SP(14) }}>
          <div style={{
            width: 44, height: 44, borderRadius: RS(18), flexShrink: 0,
            background: 'rgba(255,255,255,0.92)',
            color: TOKENS.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><Lock size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.surface }}>🔒 本機加密盾</div>
            <div style={{ marginTop: SP(4), fontSize: FS(18), color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
              資產與記帳資料 <b style={{ color: TOKENS.surface }}>100% 儲存於此裝置</b>，絕不上雲。
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', marginTop: SP(12), display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP(8) }}>
          {[
          ['加密', 'AES-256'], ['雲端同步', '關閉'], ['遙測', '無']].
          map(([k, v]) =>
          <div key={k} style={{
            padding: PAD('8px 12px'), borderRadius: RS(12),
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)'
          }}>
              <div style={{ fontSize: FS(17), color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</div>
              <div style={{ fontSize: FS(18), fontWeight: 700, color: TOKENS.surface, marginTop: SP(1),
              fontFamily: TOKENS.fontMono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            </div>
          )}
        </div>
      </div>

      {/* Master data management */}
      <Section label="主檔管理">
        <ManageRow icon={<Tag size={18} />} color={TOKENS.ink2}
        label="記帳分類" count={data.cat_exp.length + (data.cat_inc || []).length + data.cat_xfer.length + data.asset_class.length}
        sub="支出 / 收入 / 轉帳 / 股票類別"
        onClick={() => openSheet({ type: 'categories', title: '記帳分類', color: TOKENS.ink2 })} />
        <Divider />
        <ManageRow icon={<Wallet size={18} />} color={TOKENS.green}
        label="記帳帳戶" count={data.accounts.length + (data.brokers || []).length + (data.settle || []).length}
        sub="一般帳戶 / 證券戶 / 交割戶"
        onClick={() => openSheet({ type: 'accounts', title: '記帳帳戶', color: TOKENS.green })} />
      </Section>

      {/* AI default model */}
      <Section label="AI 預設模型">
        <div style={{ position: 'relative' }}>
          <button onClick={() => setModelOpen(!modelOpen)} style={{
            width: '100%', minHeight: 64, padding: PAD('12px 16px'),
            background: 'transparent', border: 'none', color: TOKENS.ink,
            display: 'flex', alignItems: 'center', gap: SP(14), textAlign: 'left'
          }}>
            <div style={{ ...{
                width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
                color: TOKENS.gray2,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }, borderRadius: "20px" }}><Sparkles size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: FS(18), color: 'rgba(60,60,67,0.5)' }}>對話與分析使用</div>
              <div style={{ marginTop: SP(1), fontSize: FS(20), fontWeight: 600 }}>{activeModel.name}</div>
            </div>
            <ChevronDown size={18} style={{ color: 'rgba(60,60,67,0.4)',
              transition: 'transform 200ms', transform: modelOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {modelOpen &&
          <div style={{ padding: PAD('0 8px 8px'), display: 'flex', flexDirection: 'column', gap: SP(4) }}>
              {MODELS.map((m) =>
            <button key={m.id} onClick={() => {setDefaultModel(m.id);setModelOpen(false);}}
            disabled={!m.has}
            style={{
              minHeight: 48, padding: PAD('8px 12px'), borderRadius: RS(8),
              background: m.id === defaultModel ? TOKENS.ink2 : 'transparent',
              border: m.id === defaultModel ? `1px solid ${TOKENS.accent}` : '1px solid transparent',
              color: m.id === defaultModel ? TOKENS.surface : m.has ? TOKENS.ink : 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', gap: SP(10), textAlign: 'left',
              fontSize: FS(19), fontWeight: m.id === defaultModel ? 600 : 500
            }}>
                  <Sparkles size={14} />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  {m.has ? <Check size={14} strokeWidth={2.5} /> : <span style={{ fontSize: FS(18), color: TOKENS.red }}>未設定 Key</span>}
                </button>
            )}
            </div>
          }
        </div>
      </Section>

      {/* AI Keys — dynamic CRUD */}
      <Section label="AI 金鑰設定 (BYOK)">
        <AIKeyManager keys={aiKeys} onChange={setAiKeys} />
      </Section>

      {/* External integrations */}
      {/* External integrations — 暫時先不做
                                                                 <Section label="外部連動">
                                                                  <ToggleRow icon={<Smartphone size={18}/>} iconColor={TOKENS.gray3}
                                                                    label="Android 簡訊監聽" sub="自動讀取信用卡消費通知"
                                                                    value={smsListen} onChange={setSmsListen}/>
                                                                  <Divider/>
                                                                  <ToggleRow icon={<MessageCircle size={18}/>} iconColor={TOKENS.green}
                                                                    label="LINE 記帳小幫手" sub={linePush ? 'Webhook 已綁定' : '點擊查看綁定教學'}
                                                                    value={linePush} onChange={setLinePush}/>
                                                                  <Divider/>
                                                                  <Row icon={<Bell size={18}/>} iconColor={TOKENS.gray3}
                                                                    label="股價提醒" sub="價格觸發通知" chevron detail="3 條"/>
                                                                 </Section>
                                                                 */}

      {/* Security */}
      <Section label="安全與備份">
        <ToggleRow icon={<Lock size={18} />} iconColor={TOKENS.green}
        label="生物辨識解鎖" sub="Face ID / 指紋開啟 App"
        value={biometric} onChange={setBiometric} />
        <Divider />
        <ToggleRow icon={<Shield size={18} />} iconColor={TOKENS.gray3}
        label="本機自動備份" sub="每日凌晨 3:00 加密快照"
        value={autoBackup} onChange={setAutoBackup} />
        <Divider />
        <Row icon={<Key size={18} />} iconColor={TOKENS.red}
        label="匯出加密備份檔" sub="可存至 iCloud / Google Drive" chevron />
      </Section>

      {/* About */}
      <Section label="關於">
        <Row icon={<Info size={18} />} iconColor={TOKENS.gray2} label="版本" detail="0.9.2 · Beta" />
      </Section>

      <div style={{ textAlign: 'center', marginTop: SP(28), fontSize: FS(18),
        color: 'rgba(60,60,67,0.3)', letterSpacing: 1, fontFamily: TOKENS.fontMono }}>
        FINFOLIO · LOCAL-FIRST · 2026
      </div>

      {/* Manage sheet */}
      <ManageSheet cfg={sheet} data={data} setData={setData} onClose={closeSheet}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances}
      savedFlows={savedFlows} savedTrades={savedTrades}
      setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
      onBlocked={setNotice} />

      {/* 主檔刪除阻擋提示 */}
      {notice &&
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 28, zIndex: 90,
        display: 'flex', justifyContent: 'center', padding: PAD('0 24px'), pointerEvents: 'none' }}>
        <div style={{ maxWidth: 360, background: TOKENS.ink, color: TOKENS.surface,
          padding: PAD('14px 18px'), borderRadius: RS(16), fontSize: FS(15), lineHeight: 1.5,
          boxShadow: SH('0 12px 30px rgba(0,0,0,0.4)'), textAlign: 'center' }}>
          {notice}
        </div>
      </div>
      }
    </div>);

}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', marginLeft: SP(64) }} />;
}

function Row({ icon, iconColor, label, sub, detail, chevron }) {
  const { ChevronRight } = window.Icons;
  const ic = iconColor || TOKENS.gray3;
  return (
    <button style={{
      width: '100%', minHeight: 64, padding: PAD('14px 16px'),
      background: 'transparent', border: 'none', color: TOKENS.ink,
      display: 'flex', alignItems: 'center', gap: SP(14), textAlign: 'left'
    }}>
      <div style={{ ...{
          width: 36, height: 36, borderRadius: RS(10), flexShrink: 0,
          background: `${ic}18`, border: `1px solid ${ic}30`,
          color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }, borderRadius: "20px" }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FS(20), fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.55)', marginTop: SP(2) }}>{sub}</div>}
      </div>
      {detail && <span style={{ fontSize: FS(18), color: 'rgba(0,0,0,0.90)', marginRight: SP(4),
        fontFamily: TOKENS.fontMono, flexShrink: 0, whiteSpace: 'nowrap' }}>{detail}</span>}
      {chevron && <ChevronRight size={18} style={{ color: 'rgba(60,60,67,0.4)', flexShrink: 0 }} />}
    </button>);
}

function ManageRow({ icon, color, label, sub, count, onClick }) {
  const { ChevronRight } = window.Icons;
  const ic = color || TOKENS.ink2;
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: 68, padding: PAD('14px 16px'),
      background: 'transparent', border: 'none', color: TOKENS.ink,
      display: 'flex', alignItems: 'center', gap: SP(14), textAlign: 'left'
    }}>
      <div style={{ ...{
          width: 38, height: 38, borderRadius: RS(10), flexShrink: 0,
          background: `${ic}18`, border: `1px solid ${ic}30`,
          color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }, borderRadius: "20px" }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FS(20), fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.55)', marginTop: SP(2) }}>{sub}</div>
      </div>
      <span style={{
        padding: PAD('3px 10px'), borderRadius: RS(8), fontSize: FS(18), fontWeight: 600,
        background: `${ic}14`, color: ic, fontFamily: TOKENS.fontMono
      }}>{count}</span>
      <ChevronRight size={18} style={{ color: 'rgba(60,60,67,0.4)', flexShrink: 0 }} />
    </button>);
}

function ToggleRow({ icon, iconColor, label, sub, value, onChange }) {
  const ic = iconColor || TOKENS.gray3;
  return (
    <div style={{
      width: '100%', minHeight: 64, padding: PAD('14px 16px'),
      display: 'flex', alignItems: 'center', gap: SP(14), color: TOKENS.ink
    }}>
      <div style={{ ...{
          width: 36, height: 36, borderRadius: RS(10), flexShrink: 0,
          background: `${ic}18`, border: `1px solid ${ic}30`,
          color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }, borderRadius: "20px" }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FS(20), fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.55)', marginTop: SP(2) }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 52, height: 32, borderRadius: RS(18), flexShrink: 0,
        background: value ? '#d97757' : 'rgba(60,60,67,0.12)',
        border: 'none', position: 'relative', transition: 'all 200ms',
        padding: SP(0)
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 22 : 2, width: 28, height: 28,
          borderRadius: RS(18), background: TOKENS.surface, transition: 'left 200ms',
          boxShadow: SH('0 2px 6px rgba(0,0,0,0.07)')
        }} />
      </button>
    </div>);

}

/* ── AIKeyManager: full CRUD for API keys ─────────────────────────── */
function AIKeyManager({ keys = [], onChange }) {
  const { Plus, X, Check, Trash, Sparkles } = window.Icons;
  const [editIdx, setEditIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({});
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '', key: '', color: TOKENS.ink2 });

  const COLORS = [TOKENS.ink2, TOKENS.green, TOKENS.gray4, TOKENS.gray3, TOKENS.gray3, TOKENS.gray2];
  const genId = () => 'key_' + Date.now();
  const masked = (k) => k ? k.length > 8 ? k.slice(0, 4) + '••••' + k.slice(-4) : '••••••••' : '';

  const startEdit = (i) => {setEditIdx(i);setEdit({ ...keys[i] });};
  const saveEdit = () => {
    if (!edit.name?.trim()) return;
    const next = keys.slice();next[editIdx] = { ...edit, name: edit.name.trim() };
    onChange(next);setEditIdx(null);
  };
  const remove = (i) => onChange(keys.filter((_, j) => j !== i));
  const addNew = () => {
    if (!addV.name.trim()) return;
    onChange([...keys, { ...addV, id: genId(), name: addV.name.trim() }]);
    setAddV({ name: '', sub: '', key: '', color: TOKENS.ink2 });setAdding(false);
  };

  const EditForm = ({ v, setV, onSave, onCancel }) =>
  <div style={{ padding: PAD('12px 16px'), display: 'flex', flexDirection: 'column', gap: SP(10) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        <input autoFocus value={v.name || ''} onChange={(e) => setV({ ...v, name: e.target.value })}
      placeholder="服務名稱 (e.g. Google Gemini)"
      style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: 'rgba(0,0,0,0.06)',
        border: '1px solid ' + (v.color || TOKENS.ink2) + '55', fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
        <input value={v.sub || ''} onChange={(e) => setV({ ...v, sub: e.target.value })}
      placeholder="備註 (e.g. 長上下文 · 中文佳)"
      style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: 'rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.18)', fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
        <input value={v.key || ''} onChange={(e) => setV({ ...v, key: e.target.value })}
      type="text" placeholder="貼上 API Key…"
      style={{ width: '100%', height: 40, padding: PAD('0 12px'), borderRadius: RS(10),
        background: 'rgba(0,0,0,0.04)', border: '1px solid ' + (v.color || TOKENS.ink2) + '40',
        fontSize: FS(17), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: SP(6) }}>
        {COLORS.map((c) =>
      <button key={c} onClick={() => setV({ ...v, color: c })} style={{
        width: 24, height: 24, borderRadius: RS(12), background: c, border: 'none',
        outline: v.color === c ? '2px solid ' + c : 'none', outlineOffset: 2, cursor: 'pointer' }} />
      )}
      </div>
      <div style={{ display: 'flex', gap: SP(8) }}>
        <button onClick={onCancel} style={{ flex: 1, height: 36, borderRadius: RS(10),
        background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)',
        color: 'rgba(60,60,67,0.88)', fontSize: FS(17) }}>取消</button>
        <button onClick={onSave} style={{ flex: 2, height: 36, borderRadius: RS(10),
        background: 'linear-gradient(135deg,' + (v.color || TOKENS.ink2) + 'dd,' + (v.color || TOKENS.ink2) + ')',
        border: 'none', color: TOKENS.surface, fontSize: FS(17), fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(5) }}>
          <Check size={14} strokeWidth={2.5} /> 儲存</button>
      </div>
    </div>;


  return (
    <div>
      {keys.map((k, i) =>
      <div key={k.id || i} style={{ borderBottom: i < keys.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none' }}>
          {editIdx === i ?
        <EditForm v={edit} setV={setEdit} onSave={saveEdit} onCancel={() => setEditIdx(null)} /> :

        <div onClick={() => startEdit(i)} style={{ padding: PAD('13px 16px'), display: 'flex',
          alignItems: 'center', gap: SP(12), cursor: 'pointer' }}>
                <div style={{ ...{ width: 36, height: 36, borderRadius: RS(10), flexShrink: 0,
              background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
              color: TOKENS.gray2, display: 'flex', alignItems: 'center', justifyContent: 'center' }, borderRadius: "20px" }}>
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink }}>{k.name}</div>
                  <div style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.88)', marginTop: SP(1),
              display: 'flex', alignItems: 'center', gap: SP(8), flexWrap: 'wrap' }}>
                    {k.sub && <span>{k.sub}</span>}
                    {k.key ?
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: FS(14) }}>{masked(k.key)}</span> :
              <span style={{ color: TOKENS.red, fontWeight: 500 }}>未設定</span>
              }
                  </div>
                </div>
                {k.key && <span style={{ fontSize: FS(14), padding: PAD('2px 8px'), borderRadius: RS(6),
            background: 'rgba(168,189,140,0.15)', color: TOKENS.green, fontWeight: 600, flexShrink: 0 }}>已設定</span>}
                <button onClick={(e) => {e.stopPropagation();remove(i);}} style={{ width: 30, height: 30, borderRadius: RS(8),
            background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.22)',
            color: TOKENS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash size={13} />
                </button>
              </div>

        }
        </div>
      )}
      {adding ?
      <div style={{ borderTop: keys.length ? '1px solid rgba(0,0,0,0.09)' : 'none' }}>
            <EditForm v={addV} setV={setAddV} onSave={addNew} onCancel={() => setAdding(false)} />
          </div> :
      <button onClick={() => setAdding(true)} style={{
        width: '100%', height: 44, borderRadius: '0 0 26px 26px',
        background: 'rgba(0,0,0,0.04)', border: 'none', borderTop: keys.length ? '1px solid rgba(0,0,0,0.09)' : 'none',
        color: TOKENS.ink2, fontSize: FS(18), fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6) }}>
            <Plus size={15} /> 新增 AI 服務
          </button>
      }
    </div>);

}

function KeyRow({ icon, iconColor, label, sub, value, onChange, show, onToggle, status }) {
  const { Eye, EyeOff, Check } = window.Icons;
  return (
    <div style={{ padding: PAD('14px 16px') }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(14) }}>
        <div style={{
          width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          color: TOKENS.gray2, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FS(20), fontWeight: 500, color: TOKENS.ink }}>{label}</div>
          <div style={{ fontSize: FS(18), color: 'rgba(0,0,0,0.86)', marginTop: SP(2) }}>{sub}</div>
        </div>
        {status === 'connected' &&
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: SP(3),
          padding: PAD('3px 8px'), borderRadius: RS(8), fontSize: FS(18),
          background: 'rgba(168,189,140,0.15)', color: TOKENS.green, fontWeight: 600
        }}><Check size={11} strokeWidth={2.5} /> 已啟用</span>
        }
        {status === 'empty' &&
        <span style={{
          padding: PAD('3px 8px'), borderRadius: RS(8), fontSize: FS(18),
          background: 'rgba(216,135,112,0.12)', color: TOKENS.red, fontWeight: 600
        }}>未設定</span>
        }
      </div>
      <div style={{ marginTop: SP(10), display: 'flex', gap: SP(8), paddingLeft: SP(50) }}>
        <input
          type={show ? 'text' : 'password'}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="貼上 API Key…"
          style={{
            flex: 1, minWidth: 0, height: 44, padding: PAD('0 12px'), borderRadius: RS(8),
            background: 'rgba(60,60,67,0.05)', border: '1px solid rgba(0,0,0,0.14)',
            color: TOKENS.ink, fontSize: FS(18), outline: 'none',
            fontFamily: TOKENS.fontMono, letterSpacing: 0.5
          }} />
        <button onClick={onToggle} style={{
          width: 44, height: 44, borderRadius: RS(8), flexShrink: 0,
          background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)',
          color: 'rgba(60,60,67,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
    </div>);

}

/* ===================== Manage Sheet (bottom sheet) ===================== */
function ManageSheet({ cfg, data, setData, onClose, initialBalances, setInitialBalances, savedFlows = [], savedTrades = [], setSavedFlows, setSavedTrades, onBlocked }) {
  const { X, Plus, Check } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  React.useEffect(() => {
    if (cfg) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [cfg]);

  if (!cfg) return null;

  const onItemsChange = (newItems, sub) => {
    const key = cfg.type === 'accounts' ? sub || 'accounts' : sub;
    const oldItems = data[key] || [];
    const nameOf = (it) => typeof it === 'string' ? it : it && it.name || '';
    const oldNames = oldItems.map(nameOf);
    const newNames = newItems.map(nameOf);
    const removed = oldNames.filter((n) => n && !newNames.includes(n));
    const added = newNames.filter((n) => n && !oldNames.includes(n));

    const f = savedFlows || [],t = savedTrades || [];
    const usage = (name) => {
      if (key === 'asset_class') return t.filter((x) => x.assetClass === name).length;
      if (key === 'brokers') return t.filter((x) => x.broker === name).length;
      if (key === 'settle') return t.filter((x) => x.settleAccount === name).length + f.filter((x) => x.fromAccount === name || x.toAccount === name).length;
      if (key === 'accounts') return f.filter((x) => x.account === name || x.fromAccount === name || x.toAccount === name).length;
      return f.filter((x) => x.cat === name).length; // categories
    };

    const renameRecords = (oldN, newN) => {
      if (key === 'asset_class') {
        setSavedTrades && setSavedTrades((arr) => arr.map((x) => x.assetClass === oldN ? { ...x, assetClass: newN } : x));
      } else if (key === 'brokers') {
        setSavedTrades && setSavedTrades((arr) => arr.map((x) => x.broker === oldN ? { ...x, broker: newN } : x));
      } else if (key === 'settle') {
        setSavedTrades && setSavedTrades((arr) => arr.map((x) => x.settleAccount === oldN ? { ...x, settleAccount: newN } : x));
        setSavedFlows && setSavedFlows((arr) => arr.map((x) => ({ ...x,
          fromAccount: x.fromAccount === oldN ? newN : x.fromAccount,
          toAccount: x.toAccount === oldN ? newN : x.toAccount })));
      } else if (key === 'accounts') {
        setSavedFlows && setSavedFlows((arr) => arr.map((x) => ({ ...x,
          account: x.account === oldN ? newN : x.account,
          fromAccount: x.fromAccount === oldN ? newN : x.fromAccount,
          toAccount: x.toAccount === oldN ? newN : x.toAccount })));
      } else {
        // categories
        setSavedFlows && setSavedFlows((arr) => arr.map((x) => x.cat === oldN ? { ...x, cat: newN } : x));
      }
      // migrate initial-balance key when renaming an account / settle account
      if ((key === 'accounts' || key === 'settle') && setInitialBalances) {
        setInitialBalances((prev) => {
          if (!prev || !(oldN in prev)) return prev;
          const n = { ...prev };n[newN] = n[oldN];delete n[oldN];return n;
        });
      }
    };

    // ── 刪除前確認：原本紀錄都已清空 ──
    if (removed.length >= 1 && added.length === 0) {
      const blocked = removed.filter((n) => usage(n) > 0);
      if (blocked.length > 0) {
        const cnt = blocked.reduce((a, n) => a + usage(n), 0);
        onBlocked && onBlocked(`「${blocked.join('、')}」仍有 ${cnt} 筆紀錄使用中，請先刪除或改用其他項目，才能刪除。`);
        return; // 拒絕刪除
      }
    }

    // ── 修改名稱：連動更新所有紀錄 ──
    if (removed.length === 1 && added.length === 1) {
      renameRecords(removed[0], added[0]);
    }

    // 套用主檔變更
    if (cfg.type === 'categories') {
      setData((d) => ({ ...d, [sub]: newItems }));
    } else if (cfg.type === 'accounts') {
      setData((d) => ({ ...d, [key]: newItems }));
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: '90%', background: TOKENS.bg,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'),
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: PAD('8px 18px 14px')
        }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink }}>管理 · {cfg.title}</div>
            <div style={{ fontSize: FS(18), color: 'rgba(60,60,67,0.5)', marginTop: SP(2) }}>新增、編輯或刪除項目</div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: RS(18),
            background: 'rgba(0,0,0,0.14)', border: 'none',
            color: 'rgba(60,60,67,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: PAD('0 18px 28px') }}>
          {cfg.type === 'categories' &&
          <CategoriesManager data={data} onChange={onItemsChange} color={cfg.color} />
          }
          {cfg.type === 'accounts' &&
          <AccountsTabsManager data={data} onChange={onItemsChange}
          initialBalances={initialBalances} setInitialBalances={setInitialBalances} />
          }
        </div>
      </div>
    </div>);

}

/* ── IncomeGroupManager: 主動 / 被動 / 其他 ──────────────────────────── */
function IncomeGroupManager({ items, onChange, color, groups, groupColors, groupLabels, defaultGroup }) {
  const { Plus, X, Check, Trash } = window.Icons;
  const GROUPS = groups || ['\u4e3b\u52d5', '\u88ab\u52d5', '\u5176\u4ed6'];
  const GROUP_COLORS = groupColors || { '\u4e3b\u52d5': '#1D4F9E', '\u88ab\u52d5': TOKENS.blue2, '\u5176\u4ed6': '#4E86C4' };
  const GROUP_LABELS = groupLabels || { '\u4e3b\u52d5': '\u4e3b\u52d5\u6536\u5165', '\u88ab\u52d5': '\u88ab\u52d5\u6536\u5165', '\u5176\u4ed6': '\u5176\u4ed6' };
  const [editing, setEditing] = useStateSet(null); // { group, idx }
  const [editVal, setEditVal] = useStateSet('');
  const [adding, setAdding] = useStateSet(null); // group string
  const [addVal, setAddVal] = useStateSet('');

  const normalised = (items || []).map((c) => typeof c === 'string' ? { name: c, group: defaultGroup || GROUPS[0] } : c);

  const startEdit = (group, idx) => {
    setEditing({ group, idx });
    setEditVal(normalised.filter((c) => c.group === group)[idx].name);
  };
  const saveEdit = () => {
    if (!editVal.trim() || !editing) return;
    const groupItems = normalised.filter((c) => c.group === editing.group);
    const target = groupItems[editing.idx];
    const next = normalised.map((c) => c === target ? { ...c, name: editVal.trim() } : c);
    onChange(next);setEditing(null);
  };
  const remove = (group, idx) => {
    const groupItems = normalised.filter((c) => c.group === group);
    const target = groupItems[idx];
    onChange(normalised.filter((c) => c !== target));
  };
  const addItem = (group) => {
    if (!addVal.trim()) return;
    onChange([...normalised, { name: addVal.trim(), group }]);
    setAddVal('');setAdding(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP(16) }}>
      {GROUPS.map((g) => {
        const gc = GROUP_COLORS[g] || TOKENS.gray3;
        const gl = GROUP_LABELS[g] || g;
        const gItems = normalised.filter((c) => c.group === g);
        return (
          <div key={g}>
            <div style={{ fontSize: FS(16), fontWeight: 600, color: gc, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: SP(8), paddingLeft: SP(4) }}>
              {gl}
            </div>
            <div style={{ background: TOKENS.surface, borderRadius: RS(18), overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.12)', marginBottom: SP(6) }}>
              {gItems.map((item, i) =>
              <div key={i} style={{ padding: PAD('11px 14px'),
                borderBottom: i < gItems.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
                  {editing && editing.group === g && editing.idx === i ?
                <div style={{ display: 'flex', gap: SP(8) }}>
                      <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ flex: 1, height: 34, padding: PAD('0 10px'), borderRadius: RS(8),
                    background: 'rgba(0,0,0,0.06)', border: `1px solid ${gc}55`,
                    fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
                      <button onClick={saveEdit} style={{ width: 34, height: 34, borderRadius: RS(8),
                    background: `${gc}22`, border: `1px solid ${gc}55`, color: gc,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setEditing(null)} style={{ width: 34, height: 34, borderRadius: RS(8),
                    background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)',
                    color: 'rgba(60,60,67,0.84)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} />
                      </button>
                    </div> :

                <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
                      <div style={{ width: 8, height: 8, borderRadius: RS(4), background: gc, flexShrink: 0 }} />
                      <button onClick={() => startEdit(g, i)} style={{ ...{ flex: 1, background: 'transparent',
                      border: 'none', color: TOKENS.ink, fontSize: FS(18), textAlign: 'left', padding: SP(0) }, fontSize: "18px" }}>
                        {item.name}
                      </button>
                      <button onClick={() => remove(g, i)} style={{ width: 28, height: 28, borderRadius: RS(7),
                    background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.22)',
                    color: TOKENS.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash size={13} />
                      </button>
                    </div>
                }
                </div>
              )}
              {gItems.length === 0 &&
              <div style={{ padding: PAD('12px 14px'), fontSize: FS(17), color: 'rgba(60,60,67,0.35)' }}>尚無項目</div>
              }
            </div>
            {adding === g ?
            <div style={{ display: 'flex', gap: SP(8) }}>
                <input autoFocus value={addVal} onChange={(e) => setAddVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(g)}
              placeholder={`新增${gl}…`}
              style={{ flex: 1, height: 36, padding: PAD('0 12px'), borderRadius: RS(10),
                background: TOKENS.surface, border: `1px solid ${gc}55`,
                fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
                <button onClick={() => addItem(g)} style={{ height: 36, padding: PAD('0 14px'), borderRadius: RS(10),
                background: `${gc}22`, border: `1px solid ${gc}55`, color: gc,
                fontSize: FS(17), fontWeight: 600 }}>新增</button>
                <button onClick={() => {setAdding(null);setAddVal('');}} style={{ height: 36, padding: PAD('0 14px'),
                borderRadius: RS(10), background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)',
                color: 'rgba(60,60,67,0.84)', fontSize: FS(17) }}>取消</button>
              </div> :

            <button onClick={() => {setAdding(g);setAddVal('');}} style={{
              height: 34, padding: PAD('0 14px'), borderRadius: RS(10),
              background: `${gc}10`, border: `1px dashed ${gc}55`, color: gc,
              fontSize: FS(17), fontWeight: 500, display: 'flex', alignItems: 'center', gap: SP(5) }}>
                <Plus size={13} /> 新增{gl}項目
              </button>
            }
          </div>);

      })}
    </div>);

}

/* ── AccountsTabsManager: 一般帳戶 / 證券戶 / 交割戶 ─────────────────── */
function AccountsTabsManager({ data, onChange, initialBalances, setInitialBalances }) {
  const [tab, setTab] = useStateSet('accounts');
  const tabs = [
  { id: 'accounts', label: '一般帳戶', c: TOKENS.green },
  { id: 'brokers', label: '證券戶', c: TOKENS.indigo },
  { id: 'settle', label: '交割戶', c: TOKENS.gray3 }];

  const active = tabs.find((t) => t.id === tab);
  const hints = {
    accounts: '銀行、信用卡、現金、電子支付等日常記帳帳戶',
    brokers: '股票買賣使用的證券帳戶，可對應交割戶',
    settle: '股票買賣交割使用的銀行帳戶'
  };
  return (
    <>
      <div style={{
        display: 'flex', gap: SP(6), padding: SP(4), borderRadius: RS(18),
        background: TOKENS.warmBorder, border: '1px solid rgba(0,0,0,0.12)',
        marginBottom: SP(10)
      }}>
        {tabs.map((t) =>
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, height: 40, padding: PAD('0 4px'),
          background: tab === t.id ? t.c : 'transparent',
          border: tab === t.id ? `1px solid ${t.c}` : '1px solid transparent',
          color: tab === t.id ? TOKENS.surface : 'rgba(0,0,0,0.6)',
          fontSize: FS(17), fontWeight: tab === t.id ? 600 : 500, whiteSpace: 'nowrap', borderRadius: "14px"
        }}>{t.label}</button>
        )}
      </div>
      <div style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.62)', marginBottom: SP(12), paddingLeft: SP(4) }}>
        {hints[tab]}
      </div>
      {tab === 'accounts' &&
      <AccountsManager data={data.accounts}
      onChange={(items) => onChange(items, 'accounts')} color={active.c}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances} />
      }
      {tab === 'brokers' &&
      <BrokerManager items={data.brokers}
      onChange={(items) => onChange(items, 'brokers')} color={active.c}
      settleOptions={(data.settle || []).map((s) => s.name)} />
      }
      {tab === 'settle' &&
      <SettleManager items={data.settle}
      onChange={(items) => onChange(items, 'settle')} color={active.c}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances} />
      }
    </>);

}

function CategoriesManager({ data, onChange, color }) {
  const [tab, setTab] = useStateSet('cat_exp');
  const tabs = [
  { id: 'cat_exp', label: '支出', c: TOKENS.red },
  { id: 'cat_inc', label: '收入', c: TOKENS.blue2 },
  { id: 'cat_xfer', label: '轉帳', c: TOKENS.orange },
  { id: 'asset_class', label: '股票類別', c: TOKENS.ink2 }];

  return (
    <>
      <div style={{
        display: 'flex', gap: SP(6), padding: SP(4), borderRadius: RS(18),
        background: TOKENS.warmBorder, border: '1px solid rgba(0,0,0,0.12)',
        marginBottom: SP(14)
      }}>
        {tabs.map((t) =>
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, height: 40, padding: PAD('0 4px'),
          background: tab === t.id ? t.c : 'transparent',
          border: tab === t.id ? `1px solid ${t.c}` : '1px solid transparent',
          color: tab === t.id ? TOKENS.surface : 'rgba(0,0,0,0.6)',
          fontSize: FS(17), fontWeight: tab === t.id ? 600 : 500, whiteSpace: 'nowrap', borderRadius: "14px"
        }}>{t.label}</button>
        )}
      </div>
      {tab === 'cat_inc' ?
      <IncomeGroupManager items={data.cat_inc} onChange={(items) => onChange(items, tab)} color={color} /> :
      tab === 'cat_exp' ?
      <IncomeGroupManager items={data.cat_exp} onChange={(items) => onChange(items, tab)}
      color={color} groups={window.EXP_GROUPS} defaultGroup="其他"
      groupColors={{ '餐飲': TOKENS.red, '交通': TOKENS.blue2, '日常': TOKENS.teal, '娛樂': TOKENS.gold,
        '醫療': TOKENS.green, '教育': TOKENS.indigo, '投資損失': TOKENS.orange, '其他': TOKENS.gray4 }}
      groupLabels={{}} /> :
      <StringListManager key={tab} items={data[tab]}
      onChange={(items) => onChange(items, tab)} color={color}
      placeholder={tab === 'asset_class' ? '新增股票類別…' : '新增分類…'} />
      }
    </>);

}

function StringListManager({ items, onChange, color, placeholder }) {
  const { Plus, X, Check, Tag, Trash } = window.Icons;
  const [editingIdx, setEditingIdx] = useStateSet(null);
  const [editVal, setEditVal] = useStateSet('');
  const [newVal, setNewVal] = useStateSet('');

  const startEdit = (i) => {setEditingIdx(i);setEditVal(items[i]);};
  const saveEdit = () => {
    if (editVal.trim()) {
      const next = items.slice();next[editingIdx] = editVal.trim();
      onChange(next);
    }
    setEditingIdx(null);
  };
  const remove = (i) => {onChange(items.filter((_, j) => j !== i));};
  const add = () => {
    if (newVal.trim()) {onChange([...items, newVal.trim()]);setNewVal('');}
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(6), marginBottom: SP(12) }}>
        {items.map((it, i) =>
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: SP(10),
          padding: PAD('10px 12px'), borderRadius: RS(18),
          background: TOKENS.surface,
          border: '1px solid rgba(0,0,0,0.12)'
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: RS(8),
            background: `${color}22`, border: `1px solid ${color}40`,
            color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}><Tag size={14} /></div>
            {editingIdx === i ?
          <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => {if (e.key === 'Enter') saveEdit();if (e.key === 'Escape') setEditingIdx(null);}}
          style={{
            flex: 1, minWidth: 0, height: 36, padding: PAD('0 10px'), borderRadius: RS(8),
            background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`,
            color: TOKENS.ink, fontSize: FS(19), outline: 'none'
          }} /> :

          <button onClick={() => startEdit(i)} style={{
            flex: 1, minWidth: 0, height: 36, background: 'transparent', border: 'none',
            color: TOKENS.ink, fontSize: FS(19), textAlign: 'left', padding: SP(0),
            cursor: 'pointer'
          }}>{it}</button>
          }
            {editingIdx === i ?
          <>
                <button onClick={saveEdit} style={{
              width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: `${color}22`, border: `1px solid ${color}55`,
              color, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Check size={16} strokeWidth={2.5} /></button>
                <button onClick={() => setEditingIdx(null)} style={{
              width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)',
              color: 'rgba(60,60,67,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><X size={16} /></button>
              </> :

          <button onClick={() => remove(i)} style={{
            width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
            background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)',
            color: TOKENS.red,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><Trash size={16} /></button>
          }
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', gap: SP(8), padding: SP(4), borderRadius: RS(18),
        background: TOKENS.surface, border: `1px dashed ${color}44`
      }}>
        <input value={newVal} onChange={(e) => setNewVal(e.target.value)}
        onKeyDown={(e) => {if (e.key === 'Enter') add();}}
        placeholder={placeholder}
        style={{
          flex: 1, height: 44, padding: PAD('0 14px'),
          background: 'transparent', border: 'none', outline: 'none',
          color: TOKENS.ink, fontSize: FS(19)
        }} />
        <button onClick={add} disabled={!newVal.trim()} style={{
          height: 44, padding: PAD('0 16px'), borderRadius: RS(8), flexShrink: 0,
          background: newVal.trim() ? '#d97757' : 'rgba(0,0,0,0.12)',
          border: 'none', color: newVal.trim() ? '#fff' : 'rgba(60,60,67,0.4)',
          fontSize: FS(18), fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: SP(4)
        }}>
          <Plus size={16} strokeWidth={2.5} /> 新增
        </button>
      </div>
    </div>);

}

function AccountsManager({ data, onChange, color, initialBalances, setInitialBalances }) {
  if (!initialBalances) initialBalances = {};
  const { Plus, X, Check, Wallet, Trash, Grip } = window.Icons;
  const { dragIdx, overIdx, getRowProps } = useDragReorder(data, onChange);
  const [editingIdx, setEditingIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({ name: '', kind: '', initBal: '' });
  const [adding, setAdding] = useStateSet(null); // kind 字串：在哪個群組下新增
  const [addV, setAddV] = useStateSet({ name: '', kind: '銀行', currency: 'TWD', initBal: '' });
  const KINDS = ['銀行', '信用卡', '現金', '電子支付', '儲值卡', '其他'];
  const KIND_COLORS = { '銀行': TOKENS.blue2, '信用卡': TOKENS.red, '現金': TOKENS.green,
    '電子支付': TOKENS.teal, '儲值卡': TOKENS.gold, '其他': TOKENS.gray4 };

  const startEdit = (i) => {
    setEditingIdx(i);
    setEdit({ ...data[i], initBal: String(initialBalances[data[i].name] !== undefined ? initialBalances[data[i].name] : '') });
  };
  const saveEdit = () => {
    if (edit.name.trim()) {
      const next = data.slice();next[editingIdx] = { name: edit.name.trim(), kind: edit.kind, sub: edit.sub, currency: edit.currency || 'TWD' };
      onChange(next);
      if (setInitialBalances && String(edit.initBal || '').trim() !== '') {
        const bal = parseFloat(String(edit.initBal).replace(/,/g, ''));
        if (!isNaN(bal)) setInitialBalances((prev) => ({ ...prev, [edit.name.trim()]: bal }));
      }
    }
    setEditingIdx(null);
  };
  const remove = (i) => onChange(data.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...data, { name: addV.name.trim(), kind: addV.kind, currency: addV.currency || 'TWD' }]);
      if (setInitialBalances && String(addV.initBal || '').trim() !== '') {
        const bal = parseFloat(String(addV.initBal).replace(/,/g, ''));
        if (!isNaN(bal)) setInitialBalances((prev) => ({ ...prev, [addV.name.trim()]: bal }));
      }
      setAddV({ name: '', kind: '銀行', currency: 'TWD', initBal: '' });setAdding(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP(16) }}>
      {KINDS.map((kind) => {
        const kc = KIND_COLORS[kind];
        const rows = data.map((it, i) => ({ it, i })).filter((r) =>
        r.it.kind === kind || kind === '其他' && KINDS.indexOf(r.it.kind) === -1);
        return (
          <div key={kind}>
            <div style={{ fontSize: FS(16), fontWeight: 600, color: kc, letterSpacing: 0.5,
              textTransform: 'uppercase', marginBottom: SP(8), paddingLeft: SP(4) }}>
              {kind}
            </div>
            <div style={{ background: TOKENS.surface, borderRadius: RS(18), overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.12)', marginBottom: SP(6) }}>
              {rows.map(({ it, i }, ri) =>
              <div key={i} {...getRowProps(i, editingIdx !== i)} style={{ padding: PAD('11px 14px'),
                borderBottom: ri < rows.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                opacity: dragIdx === i ? 0.4 : 1,
                background: overIdx === i && dragIdx !== i ? `${kc}0a` : 'transparent',
                transition: 'opacity 120ms, background 120ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
                    <div title="拖移排序" style={{ width: 20, flexShrink: 0, color: 'rgba(60,60,67,0.30)',
                    cursor: editingIdx === i ? 'default' : 'grab',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Grip size={16} />
                    </div>
                    <div style={{ width: 30, height: 30, borderRadius: RS(8), flexShrink: 0,
                    background: `${KIND_COLORS[it.kind] || kc}22`, border: `1px solid ${KIND_COLORS[it.kind] || kc}40`, color: KIND_COLORS[it.kind] || kc,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={14} />
                    </div>
                    {editingIdx === i ?
                  <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  style={{ flex: 1, minWidth: 0, height: 36, padding: PAD('0 10px'), borderRadius: RS(8),
                    background: 'rgba(0,0,0,0.08)', border: `1px solid ${kc}55`,
                    color: TOKENS.ink, fontSize: FS(19), outline: 'none' }} /> :
                  <button onClick={() => startEdit(i)} style={{ flex: 1, minWidth: 0, background: 'transparent',
                    border: 'none', textAlign: 'left', padding: SP(0), display: 'flex', flexDirection: 'column', gap: SP(2) }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: SP(6) }}>
                          <span style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink }}>{it.name}</span>
                          <CurrencyChip code={it.currency} />
                        </div>
                        <div style={{ fontSize: FS(15), color: 'rgba(60,60,67,0.78)', fontFamily: 'JetBrains Mono,monospace' }}>
                          {initialBalances[it.name] !== undefined && initialBalances[it.name] !== 0 ?
                      '初始 ' + Math.round(initialBalances[it.name]).toLocaleString() : '尚未設定初始餘額'}
                        </div>
                      </button>
                  }
                    {editingIdx === i ?
                  <><button onClick={saveEdit} style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                      background: `${kc}22`, border: `1px solid ${kc}55`, color: kc,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={15} strokeWidth={2.5} /></button>
                        <button onClick={() => setEditingIdx(null)} style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                      background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button></> :
                  <button onClick={() => remove(i)} style={{ width: 30, height: 30, borderRadius: RS(7), flexShrink: 0,
                    background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.22)', color: TOKENS.red,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={13} /></button>
                  }
                  </div>
                  {editingIdx === i &&
                <div style={{ marginTop: SP(10), paddingLeft: SP(38), paddingRight: SP(4), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                      <div style={{ display: 'flex', gap: SP(8) }}>
                        <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}
                    style={{ flex: 2, minWidth: 0, height: 36, padding: PAD('0 10px'), borderRadius: RS(8),
                      background: 'rgba(0,0,0,0.06)', border: `1px solid ${kc}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none' }}>
                          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <CurrencySelect value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} color={kc} style={{ flex: 1, minWidth: 0, height: 36 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                        <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>初始餘額</span>
                        <input value={edit.initBal} onChange={(e) => setEdit({ ...edit, initBal: e.target.value })} inputMode="decimal" placeholder="0"
                    style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
                      border: `1px solid ${kc}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
                      </div>
                    </div>
                }
                </div>
              )}
              {rows.length === 0 &&
              <div style={{ padding: PAD('12px 14px'), fontSize: FS(17), color: 'rgba(60,60,67,0.35)' }}>尚無帳戶</div>
              }
            </div>
            {adding === kind ?
            <div style={{ padding: PAD('12px 14px'), borderRadius: RS(18), background: `${kc}0a`, border: `1px solid ${kc}33` }}>
                <input autoFocus value={addV.name} onChange={(e) => setAddV({ ...addV, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addNew()} placeholder={`新增${kind}帳戶名稱…`}
              style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: TOKENS.surface,
                border: `1px solid ${kc}55`, fontSize: FS(19), color: TOKENS.ink, outline: 'none', marginBottom: SP(8) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(8) }}>
                  <CurrencySelect value={addV.currency} onChange={(v) => setAddV({ ...addV, currency: v })} color={kc} style={{ width: 90, background: TOKENS.surface }} />
                  <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap' }}>初始餘額</span>
                  <input value={addV.initBal} onChange={(e) => setAddV({ ...addV, initBal: e.target.value })} inputMode="decimal" placeholder="0"
                style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
                  border: `1px solid ${kc}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: SP(8) }}>
                  <button onClick={() => setAdding(null)} style={{ flex: 1, height: 36, borderRadius: RS(10),
                  background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(60,60,67,0.88)', fontSize: FS(17) }}>取消</button>
                  <button onClick={addNew} style={{ flex: 2, height: 36, borderRadius: RS(10),
                  background: `linear-gradient(135deg,${kc}dd,${kc})`, border: 'none', color: TOKENS.surface,
                  fontSize: FS(17), fontWeight: 600 }}>新增</button>
                </div>
              </div> :
            <button onClick={() => {setAdding(kind);setAddV({ name: '', kind, currency: 'TWD', initBal: '' });}} style={{
              height: 34, padding: PAD('0 14px'), borderRadius: RS(10),
              background: `${kc}10`, border: `1px dashed ${kc}55`, color: kc,
              fontSize: FS(17), fontWeight: 500, display: 'flex', alignItems: 'center', gap: SP(5) }}>
                <Plus size={13} /> 新增「{kind}」帳戶
              </button>
            }
          </div>);

      })}
    </div>);

}

/* ── BrokerManager: 證券戶 — name + sub + settleAccount ─────────────── */
function BrokerManager({ items, onChange, color, settleOptions = [] }) {
  const { Plus, X, Check, Grip, Trash, ArrowUpRight } = window.Icons;
  const [editIdx, setEditIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({ name: '', sub: '', settleAccount: '', currency: 'TWD' });
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '', settleAccount: '', currency: 'TWD' });
  const { dragIdx, overIdx, getRowProps } = useDragReorder(items, onChange);

  const startEdit = (i) => {setEditIdx(i);setEdit({ ...items[i] });};
  const saveEdit = () => {
    if (edit.name.trim()) {
      const next = items.slice();next[editIdx] = { ...edit, name: edit.name.trim() };
      onChange(next);
    }
    setEditIdx(null);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...items, { ...addV, name: addV.name.trim() }]);
      setAddV({ name: '', sub: '', settleAccount: '' });setAdding(false);
    }
  };

  const SettleSelect = ({ value, onChange: oc }) =>
  settleOptions.length === 0 ?
  <input value={value} onChange={(e) => oc(e.target.value)} placeholder="交割戶名稱"
  style={{ flex: 1, height: 34, padding: PAD('0 10px'), borderRadius: RS(8),
    background: 'rgba(0,0,0,0.06)', border: `1px solid ${color}40`,
    fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} /> :
  <select value={value} onChange={(e) => oc(e.target.value)}
  style={{ flex: 1, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
    background: 'rgba(0,0,0,0.06)', border: `1px solid ${color}40`,
    fontSize: FS(17), color: value ? TOKENS.ink : 'rgba(60,60,67,0.86)', outline: 'none' }}>
          <option value="">— 對應交割戶 —</option>
          {settleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>;


  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(6), marginBottom: SP(12) }}>
        {items.map((it, i) =>
        <div key={i} {...getRowProps(i, editIdx !== i)} style={{
          padding: PAD('10px 12px'), borderRadius: RS(18), background: TOKENS.surface,
          border: overIdx === i && dragIdx !== i ? `1px solid ${color}` : '1px solid rgba(0,0,0,0.12)',
          opacity: dragIdx === i ? 0.4 : 1, transition: 'opacity 120ms'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
              <div style={{ width: 22, flexShrink: 0, color: 'rgba(60,60,67,0.35)', cursor: editIdx === i ? 'default' : 'grab',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Grip size={18} /></div>
              <div style={{ width: 30, height: 30, borderRadius: RS(8), flexShrink: 0,
              background: `${color}22`, border: `1px solid ${color}40`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpRight size={14} /></div>
              {editIdx === i ?
            <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            style={{ flex: 1, minWidth: 0, height: 36, padding: PAD('0 10px'), borderRadius: RS(8),
              background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: TOKENS.ink, fontSize: FS(19), outline: 'none' }} /> :
            <button onClick={() => startEdit(i)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none',
              color: TOKENS.ink, fontSize: FS(19), textAlign: 'left', padding: SP(0), display: 'flex', flexDirection: 'column', gap: SP(2) }}>
                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: SP(6) }}>{it.name}<CurrencyChip code={it.currency} /></span>
                    {(it.sub || it.settleAccount) &&
              <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.88)' }}>
                        {[it.sub, it.settleAccount ? `交割：${it.settleAccount}` : ''].filter(Boolean).join(' · ')}
                      </span>
              }
                  </button>
            }
              {editIdx === i ?
            <><button onClick={saveEdit} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: `${color}22`, border: `1px solid ${color}55`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => setEditIdx(null)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)', color: 'rgba(60,60,67,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></> :
            <button onClick={() => remove(i)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: TOKENS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={16} /></button>
            }
            </div>
            {editIdx === i &&
          <div style={{ marginTop: SP(10), paddingLeft: SP(38), paddingRight: SP(4), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                <input value={edit.sub} onChange={(e) => setEdit({ ...edit, sub: e.target.value })} placeholder="帳號或備註"
            style={{ width: '100%', height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
              border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>幣別</span>
                  <CurrencySelect value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} color={color} style={{ flex: 1, minWidth: 0 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>對應交割戶</span>
                  <SettleSelect value={edit.settleAccount || ''} onChange={(v) => setEdit({ ...edit, settleAccount: v })} />
                </div>
              </div>
          }
          </div>
        )}
      </div>
      {adding ?
      <div style={{ padding: PAD('12px 14px'), borderRadius: RS(18), background: `${color}0a`, border: `1px solid ${color}33`, marginBottom: SP(8) }}>
          <input autoFocus value={addV.name} onChange={(e) => setAddV({ ...addV, name: e.target.value })} placeholder="證券戶名稱（券商）"
        style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: TOKENS.surface,
          border: `1px solid ${color}55`, fontSize: FS(19), color: TOKENS.ink, outline: 'none', marginBottom: SP(8) }} />
          <input value={addV.sub} onChange={(e) => setAddV({ ...addV, sub: e.target.value })} placeholder="帳號或備註"
        style={{ width: '100%', height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
          border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none', marginBottom: SP(8) }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(8) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap' }}>幣別</span>
            <CurrencySelect value={addV.currency} onChange={(v) => setAddV({ ...addV, currency: v })} color={color} style={{ flex: 1, minWidth: 0, background: TOKENS.surface }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(10) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap' }}>對應交割戶</span>
            <SettleSelect value={addV.settleAccount || ''} onChange={(v) => setAddV({ ...addV, settleAccount: v })} />
          </div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, height: 36, borderRadius: RS(10),
            background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(60,60,67,0.88)', fontSize: FS(17) }}>取消</button>
            <button onClick={addNew} style={{ flex: 2, height: 36, borderRadius: RS(10),
            background: `linear-gradient(135deg,${color}dd,${color})`, border: 'none', color: TOKENS.surface, fontSize: FS(17), fontWeight: 600 }}>新增</button>
          </div>
        </div> :

      <button onClick={() => setAdding(true)} style={{ width: '100%', height: 42, borderRadius: RS(14),
        background: `${color}12`, border: `1px dashed ${color}55`, color, fontSize: FS(18), fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6) }}><Plus size={16} /> 新增證券戶</button>
      }
    </>);

}

/* ── SettleManager: name + sub + initial balance ───────────────────── */
function SettleManager({ items, onChange, color, initialBalances = {}, setInitialBalances }) {
  const { Plus, X, Check, Grip, Trash, Banknote } = window.Icons;
  const [editIdx, setEditIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({ name: '', sub: '', initBal: '', currency: 'TWD' });
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '', initBal: '', currency: 'TWD' });
  const { dragIdx, overIdx, getRowProps } = useDragReorder(items, onChange);

  const startEdit = (i) => {setEditIdx(i);setEdit({ ...items[i], initBal: String(initialBalances[items[i].name] || '') });};
  const saveEdit = () => {
    if (edit.name.trim()) {
      const next = items.slice();next[editIdx] = { name: edit.name.trim(), sub: edit.sub, currency: edit.currency || 'TWD' };
      onChange(next);
      if (setInitialBalances && edit.initBal.trim()) {
        const bal = parseFloat(edit.initBal.replace(/,/g, ''));
        if (!isNaN(bal)) setInitialBalances((prev) => ({ ...prev, [edit.name.trim()]: bal }));
      }
    }
    setEditIdx(null);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...items, { name: addV.name.trim(), sub: addV.sub, currency: addV.currency || 'TWD' }]);
      if (setInitialBalances && addV.initBal.trim()) {
        const bal = parseFloat(addV.initBal.replace(/,/g, ''));
        if (!isNaN(bal)) setInitialBalances((prev) => ({ ...prev, [addV.name.trim()]: bal }));
      }
      setAddV({ name: '', sub: '', initBal: '' });setAdding(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(6), marginBottom: SP(12) }}>
        {items.map((it, i) =>
        <div key={i} {...getRowProps(i, editIdx !== i)} style={{
          padding: PAD('10px 12px'), borderRadius: RS(18), background: TOKENS.surface,
          border: overIdx === i && dragIdx !== i ? `1px solid ${color}` : '1px solid rgba(0,0,0,0.12)',
          opacity: dragIdx === i ? 0.4 : 1, transition: 'opacity 120ms'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
              <div style={{ width: 22, flexShrink: 0, color: 'rgba(60,60,67,0.35)', cursor: editIdx === i ? 'default' : 'grab',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Grip size={18} /></div>
              <div style={{ width: 30, height: 30, borderRadius: RS(8), flexShrink: 0,
              background: `${color}22`, border: `1px solid ${color}40`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Banknote size={14} /></div>
              {editIdx === i ?
            <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            style={{ flex: 1, minWidth: 0, height: 36, padding: PAD('0 10px'), borderRadius: RS(8),
              background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: TOKENS.ink, fontSize: FS(19), outline: 'none' }} /> :
            <button onClick={() => startEdit(i)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none',
              color: TOKENS.ink, fontSize: FS(19), textAlign: 'left', padding: SP(0), display: 'flex', flexDirection: 'column', gap: SP(2) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                      <span style={{ fontWeight: 500 }}>{it.name}</span>
                      <CurrencyChip code={it.currency} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                      {it.sub && <span style={{ fontSize: FS(15), color: 'rgba(60,60,67,0.55)' }}>{it.sub}</span>}
                      {initialBalances[it.name] ? <span style={{ fontSize: FS(15), color: 'rgba(60,60,67,0.55)', fontFamily: 'JetBrains Mono,monospace' }}>
                        ${Math.round(initialBalances[it.name]).toLocaleString()}
                      </span> : null}
                    </div>
                  </button>
            }
              {editIdx === i ?
            <><button onClick={saveEdit} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: `${color}22`, border: `1px solid ${color}55`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => setEditIdx(null)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)', color: 'rgba(60,60,67,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></> :
            <button onClick={() => remove(i)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: TOKENS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={16} /></button>
            }
            </div>
            {editIdx === i &&
          <div style={{ marginTop: SP(10), paddingLeft: SP(38), paddingRight: SP(4), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                <input value={edit.sub} onChange={(e) => setEdit({ ...edit, sub: e.target.value })} placeholder="備註"
            style={{ width: '100%', height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
              border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>幣別</span>
                  <CurrencySelect value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} color={color} style={{ flex: 1, minWidth: 0 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>初始餘額</span>
                  <input value={edit.initBal} onChange={(e) => setEdit({ ...edit, initBal: e.target.value })} inputMode="decimal" placeholder="0"
              style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
                border: `1px solid ${color}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
                </div>
              </div>
          }
          </div>
        )}
      </div>
      {adding ?
      <div style={{ padding: PAD('12px 14px'), borderRadius: RS(18), background: `${color}0a`, border: `1px solid ${color}33`, marginBottom: SP(8) }}>
          <input autoFocus value={addV.name} onChange={(e) => setAddV({ ...addV, name: e.target.value })} placeholder="交割戶名稱"
        style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: TOKENS.surface,
          border: `1px solid ${color}55`, fontSize: FS(19), color: TOKENS.ink, outline: 'none', marginBottom: SP(8) }} />
          <input value={addV.sub} onChange={(e) => setAddV({ ...addV, sub: e.target.value })} placeholder="備註"
        style={{ width: '100%', height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
          border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none', marginBottom: SP(8) }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(8) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap' }}>幣別</span>
            <CurrencySelect value={addV.currency} onChange={(v) => setAddV({ ...addV, currency: v })} color={color} style={{ flex: 1, minWidth: 0, background: TOKENS.surface }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(10) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(60,60,67,0.84)', whiteSpace: 'nowrap' }}>初始餘額</span>
            <input value={addV.initBal} onChange={(e) => setAddV({ ...addV, initBal: e.target.value })} inputMode="decimal" placeholder="0"
          style={{ flex: 1, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
            border: `1px solid ${color}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, height: 36, borderRadius: RS(10),
            background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(60,60,67,0.88)', fontSize: FS(17) }}>取消</button>
            <button onClick={addNew} style={{ flex: 2, height: 36, borderRadius: RS(10),
            background: `linear-gradient(135deg,${color}dd,${color})`, border: 'none', color: TOKENS.surface, fontSize: FS(17), fontWeight: 600 }}>新增</button>
          </div>
        </div> :

      <button onClick={() => setAdding(true)} style={{ width: '100%', height: 42, borderRadius: RS(14),
        background: `${color}12`, border: `1px dashed ${color}55`, color, fontSize: FS(18), fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6) }}><Plus size={16} /> 新增交割戶</button>
      }
    </>);

}

function KeyValueManager({ items, onChange, color, fields, placeholders }) {
  const { Plus, X, Check, ArrowUpRight, Grip, Trash } = window.Icons;
  const [editingIdx, setEditingIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({});
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '' });
  const { dragIdx, overIdx, getRowProps } = useDragReorder(items, onChange);

  const startEdit = (i) => {setEditingIdx(i);setEdit({ ...items[i] });};
  const saveEdit = () => {
    if (edit.name && edit.name.trim()) {
      const next = items.slice();next[editingIdx] = { ...edit, name: edit.name.trim() };
      onChange(next);
    }
    setEditingIdx(null);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...items, { ...addV, name: addV.name.trim() }]);
      setAddV({ name: '', sub: '' });setAdding(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(6), marginBottom: SP(12) }}>
        {items.map((it, i) =>
        <div key={i} {...getRowProps(i, editingIdx !== i)} style={{
          padding: PAD('10px 12px'), borderRadius: RS(18),
          background: TOKENS.surface,
          border: overIdx === i && dragIdx !== i ? `1px solid ${color}` : '1px solid rgba(0,0,0,0.12)',
          boxShadow: overIdx === i && dragIdx !== i ? `0 0 0 3px ${color}22` : 'none',
          opacity: dragIdx === i ? 0.4 : 1,
          transition: 'opacity 120ms, box-shadow 120ms'
        }}>
            {editingIdx === i ?
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                <input autoFocus value={edit.name || ''}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            placeholder={placeholders[0]}
            style={{
              height: 40, padding: PAD('0 12px'), borderRadius: RS(8),
              background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`,
              color: TOKENS.ink, fontSize: FS(19), fontWeight: 500, outline: 'none'
            }} />
                <input value={edit.sub || ''}
            onChange={(e) => setEdit({ ...edit, sub: e.target.value })}
            placeholder={placeholders[1]}
            style={{
              height: 36, padding: PAD('0 12px'), borderRadius: RS(8),
              background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.16)',
              color: TOKENS.ink, fontSize: FS(18), outline: 'none'
            }} />
                <div style={{ display: 'flex', gap: SP(8) }}>
                  <button onClick={() => setEditingIdx(null)} style={{
                flex: 1, height: 40, borderRadius: RS(8),
                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.16)',
                color: 'rgba(60,60,67,0.7)', fontSize: FS(18)
              }}>取消</button>
                  <button onClick={saveEdit} style={{
                flex: 2, height: 40, borderRadius: RS(8),
                background: `linear-gradient(135deg, ${color}, ${color}bb)`,
                border: 'none', color: TOKENS.inkDeep, fontSize: FS(18), fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(4)
              }}><Check size={14} strokeWidth={2.5} /> 儲存</button>
                </div>
              </div> :

          <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
                <div title="拖移排序" style={{
              width: 22, flexShrink: 0, color: 'rgba(60,60,67,0.35)', cursor: 'grab',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Grip size={18} /></div>
                <div style={{
              width: 30, height: 30, borderRadius: RS(8), flexShrink: 0,
              background: `${color}22`, border: `1px solid ${color}40`,
              color, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><ArrowUpRight size={14} /></div>
                <button onClick={() => startEdit(i)} style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none',
              color: TOKENS.ink, textAlign: 'left', padding: SP(0)
            }}>
                  <div style={{ fontSize: FS(19), fontWeight: 500 }}>{it.name}</div>
                  {it.sub &&
              <div style={{ fontSize: FS(18), color: 'rgba(60,60,67,0.5)', marginTop: SP(1) }}>{it.sub}</div>
              }
                </button>
                <button onClick={() => remove(i)} style={{
              width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)',
              color: TOKENS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Trash size={16} /></button>
              </div>
          }
          </div>
        )}
      </div>

      {adding ?
      <div style={{
        padding: SP(10), borderRadius: RS(18), background: TOKENS.surface,
        border: `1px dashed ${color}44`,
        display: 'flex', flexDirection: 'column', gap: SP(8)
      }}>
          <input autoFocus value={addV.name}
        onChange={(e) => setAddV({ ...addV, name: e.target.value })}
        placeholder={placeholders[0]}
        style={{
          height: 44, padding: PAD('0 14px'), borderRadius: RS(8),
          background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`,
          color: TOKENS.ink, fontSize: FS(19), outline: 'none'
        }} />
          <input value={addV.sub}
        onChange={(e) => setAddV({ ...addV, sub: e.target.value })}
        placeholder={placeholders[1]}
        style={{
          height: 40, padding: PAD('0 14px'), borderRadius: RS(8),
          background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.16)',
          color: TOKENS.ink, fontSize: FS(18), outline: 'none'
        }} />
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => {setAdding(false);setAddV({ name: '', sub: '' });}} style={{
            flex: 1, height: 44, borderRadius: RS(8),
            background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.16)',
            color: 'rgba(60,60,67,0.7)', fontSize: FS(18)
          }}>取消</button>
            <button onClick={addNew} disabled={!addV.name.trim()} style={{
            flex: 2, height: 44, borderRadius: RS(8),
            background: addV.name.trim() ? `linear-gradient(135deg, ${color}, ${color}bb)` : 'rgba(0,0,0,0.12)',
            border: 'none', color: addV.name.trim() ? TOKENS.inkDeep : 'rgba(60,60,67,0.4)',
            fontSize: FS(18), fontWeight: 600
          }}>新增</button>
          </div>
        </div> :

      <button onClick={() => setAdding(true)} style={{
        width: '100%', height: 48, borderRadius: RS(18),
        background: 'transparent', border: `1px dashed ${color}55`,
        color, fontSize: FS(19), fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6)
      }}><Plus size={16} /> 新增</button>
      }
    </>);

}

/* ══════════ AppearanceSheet — 外觀設計 ══════════ */
function AppearanceSheet({ open, onClose }) {
  const { X, RefreshCw } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  const [tab, setTab] = useStateSet('colors');
  const [tok, setTok] = useStateSet(() => ({ ...window.TOKENS }));

  React.useEffect(() => {
    const h = () => setTok({ ...window.TOKENS });
    window.addEventListener('ff-tokens-changed', h);
    return () => window.removeEventListener('ff-tokens-changed', h);
  }, []);
  React.useEffect(() => {
    if (open) {const id = setTimeout(() => setShown(true), 20);return () => clearTimeout(id);}
    setShown(false);
  }, [open]);

  if (!open) return null;

  const set = (key, val) => window.FFTokens.setMany({ [key]: val });
  const setNum = (key, val) => window.FFTokens.setMany({ [key]: parseFloat(val) });

  const CR = ({ label, sub, k, last }) =>
  <div style={{ display: 'flex', alignItems: 'center', gap: SP(12),
    padding: PAD('11px 14px'),
    borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FS(18), fontWeight: 500, color: TOKENS.ink }}>{label}</div>
        {sub && <div style={{ fontSize: FS(14), color: 'rgba(60,60,67,0.48)', marginTop: SP(1) }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: RS(7),
        background: tok[k] || '#888',
        border: '2px solid rgba(0,0,0,0.18)', flexShrink: 0 }} />
        <input type="color" value={(tok[k] || '#888888').slice(0, 7)}
      onChange={(e) => set(k, e.target.value)}
      style={{ width: 34, height: 28, border: '1px solid rgba(0,0,0,0.18)',
        borderRadius: RS(6), padding: 2, cursor: 'pointer', background: 'transparent' }} />
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(13),
        color: 'rgba(60,60,67,0.4)', minWidth: 56 }}>
          {(tok[k] || '').toUpperCase().slice(0, 7)}
        </span>
      </div>
    </div>;


  const SL = ({ label, k, min, max, step, fmt, last }) =>
  <div style={{ padding: PAD('12px 14px'),
    borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP(8) }}>
        <span style={{ fontSize: FS(18), fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: FS(17), color: TOKENS.accent }}>
          {fmt ? fmt(tok[k]) : tok[k]}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step}
    value={tok[k] ?? 1}
    onChange={(e) => setNum(k, e.target.value)}
    style={{ width: '100%', accentColor: TOKENS.accent, height: 4 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between',
      fontSize: FS(13), color: 'rgba(60,60,67,0.38)', marginTop: SP(4) }}>
        <span>{fmt ? fmt(min) : min}</span>
        <span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>;


  const SubHead = ({ label }) =>
  <div style={{ padding: PAD('10px 14px 4px'), fontSize: FS(13),
    color: 'rgba(60,60,67,0.45)', letterSpacing: 0.8, textTransform: 'uppercase',
    borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.025)' }}>
      {label}
    </div>;


  const TABS = [
  { id: 'colors', label: '全站配色' },
  { id: 'cats', label: '類別配色' },
  { id: 'type', label: '文字' }];


  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 82,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30,
        maxHeight: '90%', display: 'flex', flexDirection: 'column',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)')
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'rgba(0,0,0,0.28)' }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: PAD('8px 16px 10px') }}>
          <div style={{ fontSize: FS(22), fontWeight: 700, color: TOKENS.ink }}>外觀設計</div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => {window.FFTokens.reset();setTok({ ...window.TOKENS });}} style={{
              height: 34, padding: PAD('0 12px'), borderRadius: RS(10),
              background: 'rgba(0,0,0,0.08)', border: 'none', color: TOKENS.gray3,
              fontSize: FS(16), display: 'flex', alignItems: 'center', gap: SP(4)
            }}><RefreshCw size={13} /> 重置</button>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: RS(10),
              background: 'rgba(0,0,0,0.08)', border: 'none', color: TOKENS.gray3,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><X size={16} /></button>
          </div>
        </div>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: SP(6), padding: PAD('0 14px 10px') }}>
          {TABS.map((tb) =>
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            flex: 1, height: 38, borderRadius: RS(10),
            background: tab === tb.id ? TOKENS.ink2 : 'transparent',
            border: tab === tb.id ? `1px solid ${TOKENS.accent}` : '1px solid rgba(0,0,0,0.12)',
            color: tab === tb.id ? TOKENS.surface : 'rgba(60,60,67,0.7)',
            fontSize: FS(16), fontWeight: tab === tb.id ? 600 : 500
          }}>{tb.label}</button>
          )}
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: PAD('0 14px 32px') }}>
          <div style={{ background: TOKENS.surface, borderRadius: RS(18),
            border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden' }}>

            {tab === 'colors' && <>
              <SubHead label="背景" />
              <CR label="App 底色" sub="整體頁面背景" k="bgWarm2" />
              <CR label="暖色底色 2" sub="卡片區外背景" k="bgWarm" />
              <CR label="卡片底色" sub="清單 / 區塊背景" k="surface" />
              <CR label="次要卡片底色" k="surface2" last />
              <SubHead label="頁首 / 統計區色塊" />
              <CR label="頁首主色" sub="頂部統計區漸層深色" k="ink" />
              <CR label="頁首次色" sub="頂部統計區漸層淺色" k="gray2" />
              <CR label="強調色" sub="按鈕 / 高亮 / 邊框" k="accent" last />
            </>}

            {tab === 'cats' && <>
              <SubHead label="收支類型" />
              <CR label="支出" k="typeExp" />
              <CR label="收入" k="typeInc" />
              <CR label="轉帳" k="typeXfer" />
              <CR label="買進" k="typeBuy" />
              <CR label="賣出" k="typeSell" last />
              <SubHead label="帳戶類別" />
              <CR label="銀行" k="catBank" />
              <CR label="信用卡" k="catCredit" />
              <CR label="現金" k="catCash" />
              <CR label="證券戶" k="catBrokerage" />
              <CR label="儲值卡" k="catPrepaid" />
              <CR label="電子支付" k="catEpay" last />
              <SubHead label="投資類別" />
              <CR label="投資類別 1" k="inv1" />
              <CR label="投資類別 2" k="inv2" />
              <CR label="投資類別 3" k="inv3" />
              <CR label="投資類別 4" k="inv4" />
              <CR label="投資類別 5" k="inv5" />
              <CR label="投資類別 6" k="inv6" last />
            </>}

            {tab === 'type' && <>
              <SubHead label="字型大小" />
              <SL label="全站字型比例" k="fontScale" min={0.85} max={1.3} step={0.05}
              fmt={(v) => `${Math.round((v || 1) * 100)}%`} />
              <SL label="圓角比例" k="radiusScale" min={0.5} max={2} step={0.1}
              fmt={(v) => `${Math.round((v || 1) * 100)}%`} last />
              <SubHead label="文字顏色" />
              <CR label="主要文字" sub="標題、金額" k="ink" />
              <CR label="次要文字" sub="副標題、說明" k="gray3" />
              <CR label="備註文字" sub="提示、label" k="gray4" />
              <CR label="卡片上文字" sub="深色卡片白字" k="surface" last />
            </>}

          </div>
        </div>
      </div>
    </div>);

}

window.SettingsScreen = SettingsScreen;
window.DEFAULT_MASTER_DATA = DEFAULT_DATA;