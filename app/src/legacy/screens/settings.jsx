// Settings / 系統設定（含 AI 金鑰、主檔管理：記帳分類 / 記帳帳戶（一般帳戶、證券戶、交割戶））
const { useState: useStateSet } = React;

// AI 相關設定暫時隱藏（AI 顧問功能尚未上線）。改回 true 即可重新顯示。
const SHOW_AI_SETTINGS = false;

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
  { name: '租金', group: '被動' },
  { name: '股息', group: '被動' },
  { name: '債息', group: '被動' },
  { name: '利息', group: '被動' },
  { name: '紅利回饋', group: '被動' },
  { name: '台股', group: '投資收入' },
  { name: '美股', group: '投資收入' },
  { name: '投資收入', group: '投資收入' },
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

function SettingsScreen({ masterData, setMasterData, dashWidget, setDashWidget, initialBalances = {}, setInitialBalances, savedFlows = [], savedTrades = [], setSavedFlows, setSavedTrades, revealHidden, onToggleReveal, hiddenCount = 0 }) {
  const { Shield, Lock, Key, Bell, MessageCircle, Smartphone, Eye, EyeOff,
    ChevronRight, Sparkles, Check, Info, Mail, Tag, CreditCard, ArrowUpRight,
    Wallet, ChevronDown, Pencil, X, Clipboard, Trash } = window.Icons;

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

  const [defaultModel, setDefaultModelRaw] = useStateSet(() => {
    try {return localStorage.getItem('ff_default_model') || 'local';} catch {return 'local';}
  });
  const setDefaultModel = (id) => {setDefaultModelRaw(id);try {localStorage.setItem('ff_default_model', id);} catch {}};
  const [modelOpen, setModelOpen] = useStateSet(false);
  const activeModel = MODELS.find((m) => m.id === defaultModel) || MODELS[MODELS.length - 1];

  // External integrations
  const [smsListen, setSmsListen] = useStateSet(true);
  const [linePush, setLinePush] = useStateSet(false);
  const [biometric, setBiometric] = useStateSet(true);
  const [autoBackup, setAutoBackupRaw] = useStateSet(() => {
    try {return localStorage.getItem('ff_auto_backup') === '1';} catch {return false;}
  });
  const setAutoBackup = (v) => {
    const next = typeof v === 'function' ? v(autoBackup) : v;
    setAutoBackupRaw(next);
    try {localStorage.setItem('ff_auto_backup', next ? '1' : '0');} catch {}
    if (next && window.ffAutoSnapshot) window.ffAutoSnapshot(); // 立即先存一份
  };

  // Master data (lifted to App so 記帳 forms share the same lists)
  const data = masterData;
  const setData = setMasterData;
  const [sheet, setSheet] = useStateSet(null);
  const [notice, setNotice] = useStateSet(null);
  const [backupOpen, setBackupOpen] = useStateSet(false);
  const [recurOpen, setRecurOpen] = useStateSet(false);
  const [recurCount, setRecurCount] = useStateSet(() => {
    try {return (JSON.parse(localStorage.getItem('ff_recurring') || '[]') || []).length;} catch {return 0;}
  });
  const [lockOpen, setLockOpen] = useStateSet(false);
  const [lockOn, setLockOn] = useStateSet(() => {try {return !!localStorage.getItem('ff_lock_pin');} catch {return false;}});
  const [importOpen, setImportOpen] = useStateSet(false);
  const [clearOpen, setClearOpen] = useStateSet(false);
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
              color: 'rgba(44,44,50,0.88)',
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
              <Pencil size={13} style={{ color: 'rgba(44,44,50,0.30)' }} />
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
        <div style={{ position: 'absolute', top: -45, left: -30, width: 150, height: 150,
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

      {/* 匯入歷史紀錄（如：舊 Excel 記帳表） */}
      <Section label="資料匯入">
        <ManageRow icon={<Clipboard size={18} />} color={TOKENS.gray3}
        label="匯入歷史紀錄" count={null}
        sub="選擇匯入檔 → 對應帳戶 → 確認後才寫入"
        onClick={() => setImportOpen(true)} />
      </Section>

      {/* 自動扣款 / 定期支出 */}
      <Section label="自動扣款 / 定期支出">
        <ManageRow icon={<ArrowUpRight size={18} />} color={TOKENS.accent}
        label="自動扣款規則" count={recurCount}
        sub="每月定期支出 · 自動繳卡費"
        onClick={() => setRecurOpen(true)} />
      </Section>

      {/* AI default model */}
      {SHOW_AI_SETTINGS &&
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
              <div style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.5)' }}>對話與分析使用</div>
              <div style={{ marginTop: SP(1), fontSize: FS(20), fontWeight: 600 }}>{activeModel.name}</div>
            </div>
            <ChevronDown size={18} style={{ color: 'rgba(44,44,50,0.4)',
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
      }

      {/* AI Keys — dynamic CRUD */}
      {SHOW_AI_SETTINGS &&
      <Section label="AI 金鑰設定 (BYOK)">
        <AIKeyManager keys={aiKeys} onChange={setAiKeys} />
      </Section>
      }

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
        <Row icon={<Lock size={18} />} iconColor={TOKENS.green}
        label="App 密碼鎖" sub={lockOn ? '已啟用 · 進入需解鎖' : '進入 App 需輸入密碼 · 可用生物辨識'}
        onClick={() => setLockOpen(true)} chevron />
        <Divider />
        <ToggleRow icon={<Shield size={18} />} iconColor={TOKENS.gray3}
        label="本機自動備份" sub={autoBackup ? ffBackupSubtitle() : '開啟 App 時自動在本機保留資料快照'}
        value={autoBackup} onChange={setAutoBackup} />
        <Divider />
        <Row icon={<Key size={18} />} iconColor={TOKENS.red}
        label="加密備份 / 還原"
        sub={(() => {try {const t = localStorage.getItem('ff_last_export');return t ? '上次匯出 ' + ffFmtTime(t) : '尚未匯出 · 建議定期匯出到雲端';} catch {return '匯出或從備份檔還原 · 跨裝置';}})()}
        onClick={() => setBackupOpen(true)} chevron />
      </Section>

      {/* Danger zone */}
      <Section label="危險操作">
        <Row icon={<Trash size={18} />} iconColor={TOKENS.red}
        label="清除所有歷史資料" sub="只清除記帳與交易紀錄，不動主檔設定；無法復原"
        onClick={() => setClearOpen(true)} chevron />
      </Section>

      {/* About */}
      <Section label="關於">
        {/* 點「版本」= 開發者專用的隱藏顯示開關（無任何文字提示，其他使用者不會察覺） */}
        <Row icon={<Info size={18} />} iconColor={TOKENS.gray2} label="版本"
        detail="0.9.3 · Beta" onClick={onToggleReveal} />
      </Section>

      <div style={{ textAlign: 'center', marginTop: SP(28), fontSize: FS(18),
        color: 'rgba(44,44,50,0.3)', letterSpacing: 1, fontFamily: TOKENS.fontMono }}>
        FINFOLIO · LOCAL-FIRST · 2026
      </div>

      {/* Manage sheet */}
      <ManageSheet cfg={sheet} data={data} setData={setData} onClose={closeSheet}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances}
      savedFlows={savedFlows} savedTrades={savedTrades}
      setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
      onBlocked={setNotice} />

      {/* Encrypted backup / restore sheet */}
      <BackupSheet open={backupOpen} onClose={() => setBackupOpen(false)} />

      {/* 自動扣款 / 定期支出 */}
      <RecurringSheet open={recurOpen} data={data}
      onClose={() => {
        setRecurOpen(false);
        try {setRecurCount((JSON.parse(localStorage.getItem('ff_recurring') || '[]') || []).length);} catch {}
      }} />

      {/* App 密碼鎖 / 生物辨識 */}
      <LockSheet open={lockOpen} onClose={() => {
        setLockOpen(false);
        try {setLockOn(!!localStorage.getItem('ff_lock_pin'));} catch {}
      }} />

      {/* 匯入歷史紀錄 */}
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)}
      data={data} setData={setData}
      savedFlows={savedFlows} savedTrades={savedTrades}
      setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances} />

      {/* 清除所有歷史資料 */}
      <ClearDataSheet open={clearOpen} onClose={() => setClearOpen(false)} />

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

function Row({ icon, iconColor, label, sub, detail, chevron, onClick }) {
  const { ChevronRight } = window.Icons;
  const ic = iconColor || TOKENS.gray3;
  return (
    <button onClick={onClick} style={{
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
        {sub && <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.68)', marginTop: SP(2) }}>{sub}</div>}
      </div>
      {detail && <span style={{ fontSize: FS(18), color: 'rgba(0,0,0,0.90)', marginRight: SP(4),
        fontFamily: TOKENS.fontMono, flexShrink: 0, whiteSpace: 'nowrap' }}>{detail}</span>}
      {chevron && <ChevronRight size={18} style={{ color: 'rgba(44,44,50,0.4)', flexShrink: 0 }} />}
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
        <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.68)', marginTop: SP(2) }}>{sub}</div>
      </div>
      {count != null &&
      <span style={{
        padding: PAD('3px 10px'), borderRadius: RS(8), fontSize: FS(18), fontWeight: 600,
        background: `${ic}14`, color: ic, fontFamily: TOKENS.fontMono
      }}>{count}</span>
      }
      <ChevronRight size={18} style={{ color: 'rgba(44,44,50,0.4)', flexShrink: 0 }} />
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
        {sub && <div style={{ fontSize: FS(15), color: 'rgba(0,0,0,0.68)', marginTop: SP(2) }}>{sub}</div>}
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

/* ── AIKeyEditForm: 提到模組層級（避免每次輸入都重建元件導致失焦／清空）── */
function AIKeyEditForm({ v, setV, onSave, onCancel, colors }) {
  const { Check } = window.Icons;
  return (
    <div style={{ padding: PAD('12px 16px'), display: 'flex', flexDirection: 'column', gap: SP(10) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        <input value={v.name || ''} onChange={(e) => setV({ ...v, name: e.target.value })}
        placeholder="服務名稱 (e.g. Google Gemini)"
        style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: 'rgba(0,0,0,0.06)',
          border: '1px solid ' + (v.color || TOKENS.ink2) + '55', fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
        <input value={v.sub || ''} onChange={(e) => setV({ ...v, sub: e.target.value })}
        placeholder="備註 (e.g. 長上下文 · 中文佳)"
        style={{ width: '100%', height: 38, padding: PAD('0 12px'), borderRadius: RS(10), background: 'rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.18)', fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
        <input value={v.key || ''} onChange={(e) => setV({ ...v, key: e.target.value })}
        type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="貼上 API Key…"
        style={{ width: '100%', height: 40, padding: PAD('0 12px'), borderRadius: RS(10),
          background: 'rgba(0,0,0,0.04)', border: '1px solid ' + (v.color || TOKENS.ink2) + '40',
          fontSize: FS(17), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: SP(6) }}>
        {(colors || []).map((c) =>
        <button key={c} onClick={() => setV({ ...v, color: c })} style={{
          width: 24, height: 24, borderRadius: RS(12), background: c, border: 'none',
          outline: v.color === c ? '2px solid ' + c : 'none', outlineOffset: 2, cursor: 'pointer' }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: SP(8) }}>
        <button onClick={onCancel} style={{ flex: 1, height: 36, borderRadius: RS(10),
        background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)',
        color: 'rgba(44,44,50,0.88)', fontSize: FS(17) }}>取消</button>
        <button onClick={onSave} style={{ flex: 2, height: 36, borderRadius: RS(10),
        background: 'linear-gradient(135deg,' + (v.color || TOKENS.ink2) + 'dd,' + (v.color || TOKENS.ink2) + ')',
        border: 'none', color: TOKENS.surface, fontSize: FS(17), fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(5) }}>
          <Check size={14} strokeWidth={2.5} /> 儲存</button>
      </div>
    </div>);
}

/* ── AIKeyManager: full CRUD for API keys ─────────────────────────── */
function AIKeyManager({ keys = [], onChange }) {
  const { Plus, X, Check, Trash, Sparkles, Info, ChevronDown } = window.Icons;
  const [editIdx, setEditIdx] = useStateSet(null);
  const [edit, setEdit] = useStateSet({});
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '', key: '', color: TOKENS.ink2 });
  const [helpOpen, setHelpOpen] = useStateSet(false);

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



  return (
    <div>
      {/* 如何取得 API 金鑰 — 折疊說明 */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
        <button onClick={() => setHelpOpen((o) => !o)} style={{ width: '100%', padding: PAD('13px 16px'),
          display: 'flex', alignItems: 'center', gap: SP(10), background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          {Info && <Info size={16} style={{ color: TOKENS.gray3, flexShrink: 0 }} />}
          <span style={{ flex: 1, fontSize: FS(17), fontWeight: 600, color: TOKENS.ink }}>如何取得 API 金鑰？</span>
          {ChevronDown && <ChevronDown size={16} style={{ color: 'rgba(44,44,50,0.5)', transform: helpOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />}
        </button>
        {helpOpen &&
        <div style={{ padding: PAD('0 16px 14px'), display: 'flex', flexDirection: 'column', gap: SP(10) }}>
          {[
          ['Google Gemini', '有免費額度、免綁卡，最快上手', 'https://aistudio.google.com/apikey', '登入 Google → 建立 API 金鑰 → 複製'],
          ['OpenAI (GPT)', '需先儲值額度（約 US$5）', 'https://platform.openai.com/api-keys', '登入 → Billing 儲值 → Create new secret key'],
          ['Anthropic Claude', '需先儲值額度；分析推理嚴謹', 'https://console.anthropic.com/settings/keys', '登入 → Billing 儲值 → API Keys → Create Key']].
          map(([name, note, url, steps]) =>
          <div key={name} style={{ padding: PAD('10px 12px'), borderRadius: RS(12),
            background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: FS(16), fontWeight: 600, color: TOKENS.ink }}>{name}</div>
              <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.6)', marginTop: SP(1) }}>{note}</div>
              <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.78)', marginTop: SP(4) }}>步驟：{steps}</div>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: SP(6),
              fontSize: FS(15), fontWeight: 600, color: TOKENS.green, textDecoration: 'none', wordBreak: 'break-all' }}>前往申請 ↗</a>
            </div>
          )}
          <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.55)', lineHeight: 1.5 }}>
            🔒 金鑰只儲存在本機、不會上傳；複製後回到下方對應服務點一下、貼上即可。金鑰通常只顯示一次，請妥善保存；若外洩，到該平台撤銷後再重建。
          </div>
        </div>
        }
      </div>
      {keys.map((k, i) =>
      <div key={k.id || i} style={{ borderBottom: i < keys.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none' }}>
          {editIdx === i ?
        <AIKeyEditForm v={edit} setV={setEdit} onSave={saveEdit} onCancel={() => setEditIdx(null)} colors={COLORS} /> :

        <div onClick={() => startEdit(i)} style={{ padding: PAD('13px 16px'), display: 'flex',
          alignItems: 'center', gap: SP(12), cursor: 'pointer' }}>
                <div style={{ ...{ width: 36, height: 36, borderRadius: RS(10), flexShrink: 0,
              background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
              color: TOKENS.gray2, display: 'flex', alignItems: 'center', justifyContent: 'center' }, borderRadius: "20px" }}>
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FS(19), fontWeight: 500, color: TOKENS.ink }}>{k.name}</div>
                  <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.88)', marginTop: SP(1),
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
            <AIKeyEditForm v={addV} setV={setAddV} onSave={addNew} onCancel={() => setAdding(false)} colors={COLORS} />
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
          color: 'rgba(44,44,50,0.6)',
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

    // ── 帳戶名稱不可重複：同一類別內、以及一般/證券/交割三類之間都不可同名 ──
    if (cfg.type === 'accounts') {
      const dupWithin = newNames.find((n, i) => n && newNames.indexOf(n) !== i);
      if (dupWithin) {
        onBlocked && onBlocked(`「${dupWithin}」名稱重複，同類別內不可有相同名稱。`);
        return;
      }
      const LABELS = { accounts: '一般帳戶', brokers: '證券戶', settle: '交割戶' };
      const otherKeys = ['accounts', 'brokers', 'settle'].filter((g) => g !== key);
      const clash = added.find((n) => otherKeys.some((g) => (data[g] || []).map(nameOf).includes(n)));
      if (clash) {
        const where = otherKeys.find((g) => (data[g] || []).map(nameOf).includes(clash));
        onBlocked && onBlocked(`「${clash}」已在「${LABELS[where] || '其他類別'}」使用，三類帳戶名稱不可相同。`);
        return;
      }
    }

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
            <div style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>新增、編輯或刪除項目</div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: RS(18),
            background: 'rgba(0,0,0,0.14)', border: 'none',
            color: 'rgba(44,44,50,0.7)',
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
  const GROUPS = groups || ['\u4e3b\u52d5', '\u88ab\u52d5', '\u6295\u8cc7\u6536\u5165', '\u5176\u4ed6'];
  const GROUP_COLORS = groupColors || { '\u4e3b\u52d5': '#1D4F9E', '\u88ab\u52d5': TOKENS.blue2, '\u6295\u8cc7\u6536\u5165': TOKENS.green2, '\u5176\u4ed6': '#4E86C4' };
  const GROUP_LABELS = groupLabels || { '\u4e3b\u52d5': '\u4e3b\u52d5\u6536\u5165', '\u88ab\u52d5': '\u88ab\u52d5\u6536\u5165', '\u6295\u8cc7\u6536\u5165': '\u6295\u8cc7\u6536\u5165', '\u5176\u4ed6': '\u5176\u4ed6' };
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
                  style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8),
                    background: 'rgba(0,0,0,0.06)', border: `1px solid ${gc}55`,
                    fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
                      <button onClick={saveEdit} style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                    background: gc, border: 'none', color: TOKENS.surface,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setEditing(null)} style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                    background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)',
                    color: 'rgba(44,44,50,0.84)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <div style={{ padding: PAD('12px 14px'), fontSize: FS(17), color: 'rgba(44,44,50,0.35)' }}>尚無項目</div>
              }
            </div>
            {adding === g ?
            <div style={{ display: 'flex', gap: SP(8) }}>
                <input autoFocus value={addVal} onChange={(e) => setAddVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(g)}
              placeholder={`新增${gl}…`}
              style={{ flex: 1, minWidth: 0, height: 36, padding: PAD('0 12px'), borderRadius: RS(10),
                background: TOKENS.surface, border: `1px solid ${gc}55`,
                fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
                <button onClick={() => addItem(g)} style={{ height: 36, padding: PAD('0 14px'), borderRadius: RS(10), flexShrink: 0,
                background: gc, border: 'none', color: TOKENS.surface,
                fontSize: FS(17), fontWeight: 600 }}>新增</button>
                <button onClick={() => {setAdding(null);setAddVal('');}} style={{ height: 36, padding: PAD('0 14px'), flexShrink: 0,
                borderRadius: RS(10), background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.12)',
                color: 'rgba(44,44,50,0.84)', fontSize: FS(17) }}>取消</button>
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
      <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.62)', marginBottom: SP(12), paddingLeft: SP(4) }}>
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
              background: color, border: 'none',
              color: TOKENS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Check size={16} strokeWidth={2.5} /></button>
                <button onClick={() => setEditingIdx(null)} style={{
              width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)',
              color: 'rgba(44,44,50,0.6)',
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
          flex: 1, minWidth: 0, height: 44, padding: PAD('0 14px'),
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

/* 初始餘額正負切換：iOS 的數字鍵盤(inputMode=decimal)沒有負號可按，
   信用卡要輸入「既有欠款」(負值) 得靠這顆按鈕切換。 */
function SignBtn({ value, onChange, color }) {
  const s = String(value || '').trim();
  const neg = s.startsWith('-');
  return (
    <button type="button" aria-label="切換正負號"
    onClick={() => onChange(neg ? s.slice(1) : '-' + s)}
    style={{ flexShrink: 0, width: 38, height: 34, borderRadius: RS(8),
      border: `1px solid ${neg ? 'rgba(184,92,74,0.5)' : 'rgba(0,0,0,0.16)'}`,
      background: neg ? 'rgba(184,92,74,0.12)' : TOKENS.surface,
      color: neg ? TOKENS.red : 'rgba(44,44,50,0.7)',
      fontSize: FS(18), fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }}>
      {neg ? '−' : '＋'}
    </button>);
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
                    <div title="拖移排序" style={{ width: 20, flexShrink: 0, color: 'rgba(44,44,50,0.30)',
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
                        <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.78)', fontFamily: 'JetBrains Mono,monospace' }}>
                          {initialBalances[it.name] !== undefined && initialBalances[it.name] !== 0 ?
                      '初始 ' + Math.round(initialBalances[it.name]).toLocaleString() : '尚未設定初始餘額'}
                        </div>
                      </button>
                  }
                    {editingIdx === i ?
                  <><button onClick={saveEdit} aria-label="儲存帳戶" style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                      background: kc, border: 'none', color: TOKENS.surface,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={15} strokeWidth={2.5} /></button>
                        <button onClick={() => setEditingIdx(null)} style={{ width: 34, height: 34, borderRadius: RS(8), flexShrink: 0,
                      background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(44,44,50,0.7)',
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
                        <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>初始餘額</span>
                        <SignBtn value={edit.initBal} onChange={(v) => setEdit({ ...edit, initBal: v })} />
                        <input value={edit.initBal} onChange={(e) => setEdit({ ...edit, initBal: e.target.value })} inputMode="decimal" placeholder="0"
                    style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: 'rgba(0,0,0,0.06)',
                      border: `1px solid ${kc}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
                      </div>
                      {edit.kind === '信用卡' &&
                  <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.5)', lineHeight: 1.5 }}>
                        💡 信用卡若有「開始記帳前」的既有欠款，請用 ＋/− 鈕輸入<b>負數</b>（例如欠 5,000 → -5000）；正數代表溢繳。
                      </div>
                  }
                    </div>
                }
                </div>
              )}
              {rows.length === 0 &&
              <div style={{ padding: PAD('12px 14px'), fontSize: FS(17), color: 'rgba(44,44,50,0.35)' }}>尚無帳戶</div>
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
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap' }}>初始餘額</span>
                  <SignBtn value={addV.initBal} onChange={(v) => setAddV({ ...addV, initBal: v })} />
                  <input value={addV.initBal} onChange={(e) => setAddV({ ...addV, initBal: e.target.value })} inputMode="decimal" placeholder="0"
                style={{ flex: 1, minWidth: 0, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
                  border: `1px solid ${kc}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: SP(8) }}>
                  <button onClick={() => setAdding(null)} style={{ flex: 1, height: 36, borderRadius: RS(10),
                  background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(44,44,50,0.88)', fontSize: FS(17) }}>取消</button>
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
  const [edit, setEdit] = useStateSet({ name: '', sub: '', settleAccount: '', currency: 'TWD', feeRate: '0.1425', discount: '' });
  const [adding, setAdding] = useStateSet(false);
  const [addV, setAddV] = useStateSet({ name: '', sub: '', settleAccount: '', currency: 'TWD', feeRate: '0.1425', discount: '' });
  const { dragIdx, overIdx, getRowProps } = useDragReorder(items, onChange);

  const startEdit = (i) => {setEditIdx(i);setEdit({ feeRate: '0.1425', ...items[i] });};
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
      setAddV({ name: '', sub: '', settleAccount: '', currency: 'TWD', feeRate: '0.1425', discount: '' });setAdding(false);
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
              <div style={{ width: 22, flexShrink: 0, color: 'rgba(44,44,50,0.35)', cursor: editIdx === i ? 'default' : 'grab',
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
                    <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.88)' }}>
                        {[
                  it.settleAccount ? `交割：${it.settleAccount}` : '',
                  `手續費 ${it.feeRate != null && String(it.feeRate).trim() !== '' ? it.feeRate : '0.1425'}%`,
                  (it.discount && parseFloat(it.discount) > 0 && parseFloat(it.discount) < 10) ? `${it.discount} 折` : ''].
                  filter(Boolean).join(' · ')}
                      </span>
                  </button>
            }
              {editIdx === i ?
            <><button onClick={saveEdit} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: color, border: 'none', color: TOKENS.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => setEditIdx(null)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)', color: 'rgba(44,44,50,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></> :
            <button onClick={() => remove(i)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: TOKENS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={16} /></button>
            }
            </div>
            {editIdx === i &&
          <div style={{ marginTop: SP(10), paddingLeft: SP(38), paddingRight: SP(4), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>幣別</span>
                  <CurrencySelect value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} color={color} style={{ flex: 1, minWidth: 0 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>對應交割戶</span>
                  <SettleSelect value={edit.settleAccount || ''} onChange={(v) => setEdit({ ...edit, settleAccount: v })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(6) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>手續費</span>
                  <input value={edit.feeRate != null ? edit.feeRate : ''} onChange={(e) => setEdit({ ...edit, feeRate: e.target.value.replace(/[。｡．]/g, '.') })} inputMode="decimal" placeholder="0.1425"
                    style={{ flex: 1, minWidth: 0, width: 0, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
                      background: 'rgba(0,0,0,0.06)', border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>%　折扣</span>
                  <input value={edit.discount || ''} onChange={(e) => setEdit({ ...edit, discount: e.target.value })} inputMode="decimal" placeholder="6＝六折"
                    style={{ flex: 1, minWidth: 0, width: 0, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
                      background: 'rgba(0,0,0,0.06)', border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>折</span>
                </div>
                <FeeHint feeRate={edit.feeRate != null && String(edit.feeRate).trim() !== '' ? edit.feeRate : '0.1425'} discount={edit.discount} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(8) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap' }}>幣別</span>
            <CurrencySelect value={addV.currency} onChange={(v) => setAddV({ ...addV, currency: v })} color={color} style={{ flex: 1, minWidth: 0, background: TOKENS.surface }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(10) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap' }}>對應交割戶</span>
            <SettleSelect value={addV.settleAccount || ''} onChange={(v) => setAddV({ ...addV, settleAccount: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(6), marginBottom: SP(10) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>手續費</span>
            <input value={addV.feeRate != null ? addV.feeRate : ''} onChange={(e) => setAddV({ ...addV, feeRate: e.target.value.replace(/[。｡．]/g, '.') })} inputMode="decimal" placeholder="0.1425"
              style={{ flex: 1, minWidth: 0, width: 0, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
                background: TOKENS.surface, border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>%　折扣</span>
            <input value={addV.discount || ''} onChange={(e) => setAddV({ ...addV, discount: e.target.value })} inputMode="decimal" placeholder="6＝六折"
              style={{ flex: 1, minWidth: 0, width: 0, height: 34, padding: PAD('0 8px'), borderRadius: RS(8),
                background: TOKENS.surface, border: `1px solid ${color}40`, fontSize: FS(17), color: TOKENS.ink, outline: 'none' }} />
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>折</span>
          </div>
          <div style={{ marginBottom: SP(10) }}>
            <FeeHint feeRate={addV.feeRate != null && String(addV.feeRate).trim() !== '' ? addV.feeRate : '0.1425'} discount={addV.discount} />
          </div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, height: 36, borderRadius: RS(10),
            background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(44,44,50,0.88)', fontSize: FS(17) }}>取消</button>
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


/* 費率試算提示：以 10 萬元成交試算，量級打錯（0.1425 打成 0.01425）一眼可見 */
function FeeHint({ feeRate, discount }) {
  const r = parseFloat(feeRate);
  if (isNaN(r) || r < 0) return null;
  const d = parseFloat(discount);
  const mult = d > 0 && d <= 10 ? d / 10 : 1;
  const fee = Math.round(100000 * (r / 100) * mult);
  const low = r > 0 && r < 0.05;
  return (
    <div style={{ fontSize: FS(13), color: low ? TOKENS.red : 'rgba(44,44,50,0.5)', lineHeight: 1.5 }}>
      試算：成交 100,000 元 ≈ 手續費 {fee.toLocaleString()} 元{low ? '　⚠️ 費率異常偏低，台股一般為 0.1425%' : ''}
    </div>);
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
              <div style={{ width: 22, flexShrink: 0, color: 'rgba(44,44,50,0.35)', cursor: editIdx === i ? 'default' : 'grab',
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
                      {initialBalances[it.name] ? <span style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.55)', fontFamily: 'JetBrains Mono,monospace' }}>
                        ${Math.round(initialBalances[it.name]).toLocaleString()}
                      </span> : null}
                    </div>
                  </button>
            }
              {editIdx === i ?
            <><button onClick={saveEdit} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: color, border: 'none', color: TOKENS.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={2.5} /></button>
                    <button onClick={() => setEditIdx(null)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
                background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.14)', color: 'rgba(44,44,50,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></> :
            <button onClick={() => remove(i)} style={{ width: 36, height: 36, borderRadius: RS(8), flexShrink: 0,
              background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: TOKENS.red,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={16} /></button>
            }
            </div>
            {editIdx === i &&
          <div style={{ marginTop: SP(10), paddingLeft: SP(38), paddingRight: SP(4), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>幣別</span>
                  <CurrencySelect value={edit.currency} onChange={(v) => setEdit({ ...edit, currency: v })} color={color} style={{ flex: 1, minWidth: 0 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap', flexShrink: 0 }}>初始餘額</span>
                  <SignBtn value={edit.initBal} onChange={(v) => setEdit({ ...edit, initBal: v })} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(8) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap' }}>幣別</span>
            <CurrencySelect value={addV.currency} onChange={(v) => setAddV({ ...addV, currency: v })} color={color} style={{ flex: 1, minWidth: 0, background: TOKENS.surface }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(10) }}>
            <span style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.84)', whiteSpace: 'nowrap' }}>初始餘額</span>
            <SignBtn value={addV.initBal} onChange={(v) => setAddV({ ...addV, initBal: v })} />
            <input value={addV.initBal} onChange={(e) => setAddV({ ...addV, initBal: e.target.value })} inputMode="decimal" placeholder="0"
          style={{ flex: 1, height: 34, padding: PAD('0 10px'), borderRadius: RS(8), background: TOKENS.surface,
            border: `1px solid ${color}40`, fontSize: FS(18), fontFamily: 'JetBrains Mono,monospace', color: TOKENS.ink, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: SP(8) }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, height: 36, borderRadius: RS(10),
            background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', color: 'rgba(44,44,50,0.88)', fontSize: FS(17) }}>取消</button>
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
                color: 'rgba(44,44,50,0.7)', fontSize: FS(18)
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
              width: 22, flexShrink: 0, color: 'rgba(44,44,50,0.35)', cursor: 'grab',
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
              <div style={{ fontSize: FS(18), color: 'rgba(44,44,50,0.5)', marginTop: SP(1) }}>{it.sub}</div>
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
            color: 'rgba(44,44,50,0.7)', fontSize: FS(18)
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
        {sub && <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.48)', marginTop: SP(1) }}>{sub}</div>}
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
        color: 'rgba(44,44,50,0.4)', minWidth: 56 }}>
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
      fontSize: FS(13), color: 'rgba(44,44,50,0.38)', marginTop: SP(4) }}>
        <span>{fmt ? fmt(min) : min}</span>
        <span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>;


  const SubHead = ({ label }) =>
  <div style={{ padding: PAD('10px 14px 4px'), fontSize: FS(13),
    color: 'rgba(44,44,50,0.45)', letterSpacing: 0.8, textTransform: 'uppercase',
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

/* ===================== Encrypted backup / restore ===================== */
function _b64(buf) {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}
function _ub64(str) {
  const bin = atob(str);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function _deriveKey(pass, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function ffFmtTime(iso) {
  try {
    const d = new Date(iso);const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {return '';}
}
function ffBackupSubtitle() {
  try {
    const ts = localStorage.getItem('ff_last_auto_backup');
    return ts ? '上次快照 ' + ffFmtTime(ts) : '已開啟 · 開 App 時自動保留快照';
  } catch {return '已開啟';}
}
function ffHasSnapshot() {try {return !!localStorage.getItem('ff_auto_snapshot');} catch {return false;}}
function ffRestoreSnapshot() {
  const raw = localStorage.getItem('ff_auto_snapshot');
  if (!raw) throw new Error('尚無本機快照');
  const blob = JSON.parse(raw);
  const data = blob && blob.data || {};
  Object.keys(data).forEach((k) => {if (k.indexOf('ff_') === 0) localStorage.setItem(k, data[k]);});
}
function ffExportedNow() {try {localStorage.setItem('ff_last_export', new Date().toISOString());} catch {}}
function ffExportOverdue() {
  try {
    if (localStorage.getItem('ff_auto_backup') !== '1') return false;
    const ts = localStorage.getItem('ff_last_export');
    if (!ts) return true;
    return Date.now() - new Date(ts).getTime() > 14 * 864e5;
  } catch {return false;}
}
async function ffExportBackup(pass) {
  // 純快取不進備份：ff_auto_snapshot 是全部資料的複本（會讓檔案倍增）、
  // ff_tw_stocks_v7 是可重新下載的台股清單快取。還原後會自動重建。
  const SKIP_EXPORT = { ff_auto_snapshot: 1, ff_tw_stocks_v7: 1 };
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf('ff_') === 0 && !SKIP_EXPORT[k]) data[k] = localStorage.getItem(k);
  }
  const pt = new TextEncoder().encode(JSON.stringify(data));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await _deriveKey(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  const blob = { v: 1, app: 'finfolio', ts: new Date().toISOString(), salt: _b64(salt), iv: _b64(iv), data: _b64(ct) };
  const filename = `finfolio-backup-${new Date().toISOString().slice(0, 10)}.finfolio`;
  const file = new File([JSON.stringify(blob)], filename, { type: 'application/octet-stream' });

  // 已「加入主畫面」的獨立 App：用 <a download> 觸發存檔會被系統丟給 Safari 的存檔
  // 對話框處理，常導致 App 視窗被降級成一般瀏覽器分頁（狀態列跑出來、全螢幕跟著
  // 失效，且不會自動恢復，需重開 App 才會好）。優先用原生分享面板（可選「儲存到
  // 檔案」/ iCloud）存檔，不會有這個副作用；不支援時才退回舊方法。
  let shared = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); shared = true; }
    catch (e) { if (e && e.name === 'AbortError') shared = true; /* 使用者自行取消，不再跳第二個存檔視窗 */ }
  }
  if (!shared) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  // 存檔對話框關閉後，保險起見重新套用一次版面（對應上方全螢幕失效的情況）。
  setTimeout(() => { try { window.fit && window.fit(); } catch (_) {} }, 500);
}
async function ffImportBackup(text, pass) {
  // 每一步失敗給出「可分辨」的訊息，才能知道到底是選錯檔、密碼錯還是空間不足。
  if (!text || !String(text).trim()) throw new Error('檔案是空的（若存在 iCloud，請先在「檔案」App 點開下載後再選取）');
  let blob;
  try { blob = JSON.parse(text); } catch { throw new Error('檔案格式不符：不是 FinFolio 備份檔（若你要匯入的是 finfolio-import.json，請改用「匯入歷史紀錄」）'); }
  if (!blob || blob.app !== 'finfolio' || !blob.data) throw new Error('檔案格式不符：不是 FinFolio 備份檔');
  let ptBuf;
  try {
    const key = await _deriveKey(pass, _ub64(blob.salt));
    ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _ub64(blob.iv) }, key, _ub64(blob.data));
  } catch { throw new Error('密碼錯誤（請輸入「匯出這個檔案當時」設定的密碼；注意大小寫、全形/半形與前後空白）'); }
  const data = JSON.parse(new TextDecoder().decode(ptBuf));
  // 舊版備份把大型快取也打包了（全資料複本 ff_auto_snapshot、台股清單 ff_tw_stocks_v7），
  // 還原時跳過（會自動重建）；並先清掉即將被覆蓋的舊值再寫入——否則新舊兩份並存，
  // 在獨立 App 較小的 localStorage 配額下會中途爆掉（Safari 容器較空所以沒事）。
  const SKIP_RESTORE = { ff_auto_snapshot: 1, ff_tw_stocks_v7: 1 };
  const keys = Object.keys(data).filter((k) => k.indexOf('ff_') === 0 && !SKIP_RESTORE[k]);
  try {
    const existing = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('ff_') === 0) existing.push(k);
    }
    existing.forEach((k) => { if (SKIP_RESTORE[k] || data[k] !== undefined) localStorage.removeItem(k); });
    // 由小到大寫入：萬一空間仍不足，重要的小型設定至少已先寫入
    keys.sort((a, b) => String(data[a]).length - String(data[b]).length);
    keys.forEach((k) => localStorage.setItem(k, data[k]));
  } catch { throw new Error('裝置儲存空間不足，資料可能只寫入一部分——請清出空間後再還原一次'); }
}

function BackupSheet({ open, onClose }) {
  const { X, Lock, Key, Shield } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  // 匯出與還原各自獨立的密碼欄位，避免共用一格造成「這是設定新密碼還是輸入舊密碼」的混淆。
  const [exportPass, setExportPass] = useStateSet('');
  const [importPass, setImportPass] = useStateSet('');
  const [fileText, setFileText] = useStateSet(null);
  const [fileName, setFileName] = useStateSet('');
  const [status, setStatus] = useStateSet(null); // {type:'ok'|'err', msg}
  const [busy, setBusy] = useStateSet(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open) { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); }
    setShown(false); setExportPass(''); setImportPass(''); setFileText(null); setFileName(''); setStatus(null); setBusy(false);
  }, [open]);

  if (!open) return null;

  const doExport = async () => {
    if (exportPass.length < 4) { setStatus({ type: 'err', msg: '請設定至少 4 個字的密碼' }); return; }
    setBusy(true); setStatus(null);
    try { await ffExportBackup(exportPass); ffExportedNow(); setStatus({ type: 'ok', msg: '備份檔已產生 ✓ 接著在跳出的畫面選擇儲存位置（建議存到「檔案」App 或 iCloud/雲端）。完成後這裡會記錄本次匯出時間。密碼請另外保管。' }); }
    catch (e) { setStatus({ type: 'err', msg: '匯出失敗：' + e.message }); }
    setBusy(false);
  };
  const onPickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // 獨立（加入主畫面）App 讀 iCloud 檔案時常拿到空內容——Safari 會自動下載、
    // 獨立 App 不會。這裡用 File.text() 讀、失敗再退回 FileReader，並把實際讀到的
    // 大小顯示出來，讓「讀檔失敗」與「密碼錯誤」可以一眼分辨。
    const readFallback = () => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('read error'));
      r.readAsText(f);
    });
    let t = '';
    try { t = f.text ? await f.text() : await readFallback(); }
    catch { try { t = await readFallback(); } catch { t = ''; } }
    if (!t.trim()) {
      setFileText(null); setFileName('');
      setStatus({ type: 'err', msg: `讀不到「${f.name}」的內容（讀到 ${t.length} 字元，檔案應為 ${f.size ? f.size.toLocaleString() : '?'} bytes）。若檔案存在 iCloud，請先開「檔案」App 點它一下、等雲朵圖示消失（下載完成）後再回來選取；或改用 AirDrop / 存到「我的 iPhone」。` });
      return;
    }
    setFileText(t); setFileName(`${f.name}（${Math.round(t.length / 1024).toLocaleString()} KB）`); setImportPass(''); setStatus(null);
  };
  const doRestoreSnapshot = async () => {
    setBusy(true); setStatus(null);
    try {
      ffRestoreSnapshot();
      setStatus({ type: 'ok', msg: '已從本機快照還原，即將重新載入…' });
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setStatus({ type: 'err', msg: '還原失敗：' + e.message });
      setBusy(false);
    }
  };
  const doImport = async () => {
    if (!fileText) { setStatus({ type: 'err', msg: '請先選擇備份檔' }); return; }
    if (importPass.length < 4) { setStatus({ type: 'err', msg: '請輸入這個備份檔設定時的密碼' }); return; }
    setBusy(true); setStatus(null);
    try {
      await ffImportBackup(fileText, importPass);
      setStatus({ type: 'ok', msg: '還原成功，即將重新載入…' });
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setStatus({ type: 'err', msg: '還原失敗：' + (e && e.message || '未知錯誤') });
      setBusy(false);
    }
  };

  const btn = (bg, color) => ({
    width: '100%', minHeight: 50, borderRadius: RS(14), border: 'none',
    background: bg, color, fontSize: FS(17), fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '90%', background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)', boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'), display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('8px 18px 14px') }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: SP(8) }}><Lock size={18} /> 加密備份 / 還原</div>
            <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>資料只存在你的裝置；備份檔以密碼加密</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: RS(18), background: 'rgba(0,0,0,0.14)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 28px') }}>
          {/* 逾期提醒：本機快照無法對抗「手動清除網站資料」，提醒定期匯出到雲端/其他裝置 */}
          {ffExportOverdue() &&
          <div style={{ marginBottom: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14), fontSize: FS(15), lineHeight: 1.5,
            background: 'rgba(212,151,88,0.12)', border: '1px solid rgba(212,151,88,0.35)', color: TOKENS.accent }}>
            ⏰ 已超過 14 天未匯出。本機快照無法對抗「清除網站資料」，建議現在加密匯出一份到 iCloud / 雲端。
          </div>
          }
          {/* 上次匯出狀態，讓使用者確認是否已備份 */}
          {(() => {
            let t = null;try {t = localStorage.getItem('ff_last_export');} catch {}
            return (
              <div style={{ marginBottom: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14),
                background: t ? 'rgba(110,155,106,0.12)' : 'rgba(0,0,0,0.05)',
                border: '1px solid ' + (t ? 'rgba(110,155,106,0.3)' : 'rgba(0,0,0,0.10)'),
                color: t ? TOKENS.greenDark : 'rgba(44,44,50,0.6)', fontSize: FS(15) }}>
                {t ? '✓ 上次匯出：' + ffFmtTime(t) : '尚未匯出過備份檔'}
              </div>);
          })()}
          {/* ── 匯出：獨立區塊，自己的密碼欄位（設定「新」密碼）── */}
          <div style={{ fontSize: FS(17), fontWeight: 700, color: TOKENS.ink, marginBottom: SP(10) }}>匯出備份</div>
          <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.6)', marginBottom: SP(6) }}>設定備份密碼（至少 4 字，還原時需要）</div>
          <input type="password" value={exportPass} onChange={(e) => setExportPass(e.target.value)} placeholder="設定新密碼"
            style={{ width: '100%', height: 50, padding: PAD('0 14px'), borderRadius: RS(14), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(17), outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ marginTop: SP(12) }}>
            <button disabled={busy} onClick={doExport} style={btn('linear-gradient(135deg, ' + TOKENS.accentLight + ', ' + TOKENS.accent + ')', '#fff')}>
              <Shield size={18} /> 加密匯出備份檔
            </button>
            <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.5)', marginTop: SP(6), lineHeight: 1.5 }}>
              匯出一個 .finfolio 檔，可存到 iCloud / Google Drive / 其他裝置。
            </div>
          </div>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: SP(10), margin: PAD('22px 0') }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.12)' }} />
            <span style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.4)' }}>或從備份還原</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.12)' }} />
          </div>

          {/* ── 還原：獨立區塊，選檔後才出現「這個檔案的密碼」欄位，跟上面匯出密碼完全分開 ── */}
          <div style={{ fontSize: FS(17), fontWeight: 700, color: TOKENS.ink, marginBottom: SP(10) }}>從備份檔還原</div>
          <input ref={fileRef} type="file" accept=".finfolio,application/json,application/octet-stream" onChange={onPickFile} style={{ display: 'none' }} />
          <button disabled={busy} onClick={() => fileRef.current && fileRef.current.click()} style={btn(TOKENS.surface, TOKENS.ink)}>
            <Key size={18} /> {fileName ? '已選：' + fileName : '選擇備份檔'}
          </button>
          {fileText && (
            <div style={{ marginTop: SP(12), padding: PAD('14px'), borderRadius: RS(16), background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.10)' }}>
              <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.65)', marginBottom: SP(6) }}>
                輸入<b>「{fileName}」這個備份檔</b>設定時的密碼（不是上面剛才設定的新密碼）
              </div>
              <input type="password" value={importPass} onChange={(e) => setImportPass(e.target.value)} placeholder="輸入此備份檔的密碼" autoFocus
                style={{ width: '100%', height: 50, padding: PAD('0 14px'), borderRadius: RS(14), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(17), outline: 'none', boxSizing: 'border-box' }} />
              <button disabled={busy} onClick={doImport} style={{ ...btn('linear-gradient(135deg, ' + TOKENS.green2 + ', ' + TOKENS.greenDark + ')', '#fff'), marginTop: SP(10) }}>
                還原此備份（會覆蓋目前資料）
              </button>
            </div>
          )}

          {/* 從本機自動快照還原（免密碼，僅限本機） */}
          {ffHasSnapshot() && (
            <>
              <div style={{ marginTop: SP(16), fontSize: FS(14), color: 'rgba(44,44,50,0.5)' }}>
                本機自動快照 · {ffFmtTime(localStorage.getItem('ff_last_auto_backup')) || '—'}
              </div>
              <button disabled={busy} onClick={doRestoreSnapshot} style={{ ...btn(TOKENS.surface, TOKENS.ink), marginTop: SP(6) }}>
                <Key size={18} /> 從本機快照還原（會覆蓋目前資料）
              </button>
            </>
          )}

          {status && (
            <div style={{ marginTop: SP(16), padding: PAD('12px 14px'), borderRadius: RS(14), fontSize: FS(15), lineHeight: 1.5,
              background: status.type === 'ok' ? 'rgba(110,155,106,0.12)' : 'rgba(184,92,74,0.10)',
              border: '1px solid ' + (status.type === 'ok' ? 'rgba(110,155,106,0.3)' : 'rgba(184,92,74,0.3)'),
              color: status.type === 'ok' ? TOKENS.greenDark : TOKENS.red }}>
              {status.msg}
            </div>
          )}

          <div style={{ marginTop: SP(16), fontSize: FS(14), color: 'rgba(44,44,50,0.45)', lineHeight: 1.6 }}>
            ⚠️ 密碼用於加密，<b>忘記密碼將無法還原</b>。備份檔不含密碼，請分開保存。
          </div>
        </div>
      </div>
    </div>);
}

/* ===================== 自動扣款 / 定期支出 ===================== */
function RecurringSheet({ open, onClose, data }) {
  const { X, Plus, Trash, Check, Calendar, Pencil } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  const [rules, setRules] = useStateSet([]);
  const [form, setForm] = useStateSet(null); // 正在新增/編輯的規則
  const [err, setErr] = useStateSet('');

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      try {setRules(JSON.parse(localStorage.getItem('ff_recurring') || '[]') || []);} catch {setRules([]);}
      setForm(null);setErr('');
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);

  if (!open) return null;

  const md = data || {};
  const allAccts = (md.accounts || []).map((a) => a.name);
  const creditAccts = (md.accounts || []).filter((a) => a.kind === '信用卡').map((a) => a.name);
  const payAccts = (md.accounts || []).filter((a) => a.kind !== '信用卡').map((a) => a.name);
  const expItems = (md.cat_exp || []).map((c) => typeof c === 'string' ? c : c.name);

  const persist = (next) => {setRules(next);try {localStorage.setItem('ff_recurring', JSON.stringify(next));} catch {}};
  const genId = () => 'r' + Date.now() + Math.floor(Math.random() * 1000);
  const blankExpense = () => ({ id: genId(), type: 'expense', name: '', enabled: true, dayOfMonth: 5, amount: '', category: expItems[0] || '', account: payAccts[0] || allAccts[0] || '', lastRun: '' });
  const blankCard = () => ({ id: genId(), type: 'card', name: '', enabled: true, dayOfMonth: 15, fromAccount: payAccts[0] || allAccts[0] || '', cardAccount: creditAccts[0] || '', cardMode: 'full', fixedAmount: '', lastRun: '' });

  const upd = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleRule = (id) => persist(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const removeRule = (id) => persist(rules.filter((r) => r.id !== id));

  const saveForm = () => {
    const f = form;
    if (!f) return;
    const day = Math.min(Math.max(parseInt(f.dayOfMonth, 10) || 1, 1), 28);
    if (f.type === 'expense') {
      if (!(parseFloat(f.amount) > 0)) {setErr('請輸入大於 0 的金額');return;}
      if (!f.category) {setErr('請選擇分類');return;}
      if (!f.account) {setErr('請選擇扣款帳戶');return;}
    } else {
      if (!f.fromAccount) {setErr('請選擇轉出帳戶');return;}
      if (!f.cardAccount) {setErr('請選擇信用卡帳戶（需先在帳戶新增信用卡）');return;}
      if (f.cardMode === 'fixed' && !(parseFloat(f.fixedAmount) > 0)) {setErr('固定金額需大於 0');return;}
    }
    const rule = { ...f, dayOfMonth: day };
    if (!rule.lastRun) rule.lastRun = window.ffInitialLastRun ? window.ffInitialLastRun(day, new Date()) : '';
    const idx = rules.findIndex((r) => r.id === rule.id);
    persist(idx >= 0 ? rules.map((r) => r.id === rule.id ? rule : r) : [...rules, rule]);
    setForm(null);setErr('');
  };

  const inp = { width: '100%', height: 46, padding: PAD('0 12px'), borderRadius: RS(12), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(17), outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: FS(15), color: 'rgba(44,44,50,0.6)', margin: PAD('12px 0 5px') };
  const seg = (on) => ({ flex: 1, height: 44, borderRadius: RS(10), border: on ? `1px solid ${TOKENS.accent}` : '1px solid rgba(0,0,0,0.14)', background: on ? TOKENS.accent : TOKENS.surface, color: on ? '#fff' : 'rgba(44,44,50,0.7)', fontSize: FS(16), fontWeight: on ? 600 : 500 });
  const bigBtn = (bg, color) => ({ width: '100%', minHeight: 50, borderRadius: RS(14), border: 'none', background: bg, color, fontSize: FS(17), fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8) });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '92%', background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)', boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'), display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('8px 18px 12px') }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink }}>自動扣款 / 定期支出</div>
            <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>每月開 App 時，到期自動補記入帳</div>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(18), background: 'rgba(0,0,0,0.14)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 28px') }}>
          {!form &&
          <>
              {/* 規則清單 */}
              {rules.length === 0 &&
            <div style={{ padding: PAD('26px 0'), textAlign: 'center', color: 'rgba(44,44,50,0.4)', fontSize: FS(16) }}>尚無自動扣款規則</div>
            }
              {rules.map((r) =>
            <div key={r.id} style={{ background: TOKENS.surface, borderRadius: RS(16), border: '1px solid rgba(0,0,0,0.12)', padding: PAD('12px 14px'), marginBottom: SP(10), opacity: r.enabled ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FS(18), fontWeight: 600, color: TOKENS.ink }}>
                        {r.name || (r.type === 'card' ? '繳卡費' : '定期支出')}
                        <span style={{ fontSize: FS(13), fontWeight: 500, color: TOKENS.accent, marginLeft: SP(8) }}>{r.type === 'card' ? '繳卡費' : '定期支出'}</span>
                      </div>
                      <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.6)', marginTop: SP(2) }}>
                        每月 {r.dayOfMonth} 日 · {r.type === 'card' ?
                    `${r.fromAccount} → ${r.cardAccount} · ${r.cardMode === 'full' ? '全額繳清' : '固定 ' + r.fixedAmount}` :
                    `${r.category} · ${r.account} · ${r.amount}`}
                      </div>
                    </div>
                    <button onClick={() => toggleRule(r.id)} style={{ width: 46, height: 28, borderRadius: RS(16), flexShrink: 0, background: r.enabled ? TOKENS.accent : 'rgba(60,60,67,0.14)', border: 'none', position: 'relative', padding: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: r.enabled ? 20 : 2, width: 24, height: 24, borderRadius: RS(14), background: '#fff', transition: 'left 180ms' }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: SP(8), marginTop: SP(10) }}>
                    <button onClick={() => {setErr('');setForm({ ...r });}} style={{ flex: 1, height: 38, borderRadius: RS(10), background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink, fontSize: FS(15), fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6) }}><Pencil size={14} /> 編輯</button>
                    <button onClick={() => removeRule(r.id)} style={{ width: 44, height: 38, borderRadius: RS(10), background: 'rgba(184,92,74,0.10)', border: '1px solid rgba(184,92,74,0.3)', color: TOKENS.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash size={15} /></button>
                  </div>
                </div>
            )}

              {/* 新增按鈕 */}
              <div style={{ display: 'flex', gap: SP(10), marginTop: SP(8) }}>
                <button onClick={() => {setErr('');setForm(blankExpense());}} style={bigBtn('linear-gradient(135deg, ' + TOKENS.accentLight + ', ' + TOKENS.accent + ')', '#fff')}><Plus size={18} /> 定期支出</button>
                <button onClick={() => {setErr('');setForm(blankCard());}} style={bigBtn(TOKENS.ink2, '#fff')}><Plus size={18} /> 自動繳卡費</button>
              </div>
            </>
          }

          {form &&
          <>
              <div style={{ display: 'flex', gap: SP(8), marginBottom: SP(4) }}>
                <button onClick={() => upd({ type: 'expense' })} style={seg(form.type === 'expense')}>定期支出</button>
                <button onClick={() => upd({ type: 'card' })} style={seg(form.type === 'card')}>自動繳卡費</button>
              </div>

              <div style={lbl}>名稱</div>
              <input value={form.name} onChange={(e) => upd({ name: e.target.value })} placeholder={form.type === 'card' ? '例：國泰卡費' : '例：房租、Netflix'} style={inp} />

              <div style={lbl}>每月扣款日（1–28）</div>
              <input value={form.dayOfMonth} onChange={(e) => upd({ dayOfMonth: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="5" style={inp} />

              {form.type === 'expense' ?
            <>
                  <div style={lbl}>金額</div>
                  <input value={form.amount} onChange={(e) => upd({ amount: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="0" style={inp} />
                  <div style={lbl}>分類（項目）</div>
                  <select value={form.category} onChange={(e) => upd({ category: e.target.value })} style={inp}>
                    {expItems.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={lbl}>扣款帳戶</div>
                  <select value={form.account} onChange={(e) => upd({ account: e.target.value })} style={inp}>
                    {allAccts.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </> :

            <>
                  <div style={lbl}>轉出帳戶（付款）</div>
                  <select value={form.fromAccount} onChange={(e) => upd({ fromAccount: e.target.value })} style={inp}>
                    {(payAccts.length ? payAccts : allAccts).map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div style={lbl}>信用卡帳戶</div>
                  {creditAccts.length === 0 ?
              <div style={{ ...inp, display: 'flex', alignItems: 'center', color: TOKENS.red, fontSize: FS(15) }}>尚無信用卡帳戶，請先到「記帳帳戶」新增</div> :
              <select value={form.cardAccount} onChange={(e) => upd({ cardAccount: e.target.value })} style={inp}>
                      {creditAccts.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
              }
                  <div style={lbl}>繳費金額</div>
                  <div style={{ display: 'flex', gap: SP(8) }}>
                    <button onClick={() => upd({ cardMode: 'full' })} style={seg(form.cardMode === 'full')}>全額繳清（當期應繳）</button>
                    <button onClick={() => upd({ cardMode: 'fixed' })} style={seg(form.cardMode === 'fixed')}>固定金額</button>
                  </div>
                  {form.cardMode === 'fixed' &&
              <input value={form.fixedAmount} onChange={(e) => upd({ fixedAmount: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="固定金額" style={{ ...inp, marginTop: SP(8) }} />
              }
                  <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.45)', marginTop: SP(6), lineHeight: 1.5 }}>
                    「全額繳清」會在扣款日產生一筆金額 = 該卡目前未繳餘額的轉帳。
                  </div>
                </>
            }

              {err && <div style={{ marginTop: SP(12), padding: PAD('10px 12px'), borderRadius: RS(12), background: 'rgba(184,92,74,0.10)', border: '1px solid rgba(184,92,74,0.3)', color: TOKENS.red, fontSize: FS(15) }}>{err}</div>}

              <div style={{ display: 'flex', gap: SP(10), marginTop: SP(18) }}>
                <button onClick={() => {setForm(null);setErr('');}} style={{ ...bigBtn(TOKENS.surface, TOKENS.ink), border: '1px solid rgba(0,0,0,0.14)' }}>取消</button>
                <button onClick={saveForm} style={bigBtn('linear-gradient(135deg, ' + TOKENS.accentLight + ', ' + TOKENS.accent + ')', '#fff')}><Check size={18} /> 儲存規則</button>
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}

/* ===================== App 密碼鎖 / 生物辨識 ===================== */
function LockSheet({ open, onClose }) {
  const { X, Lock, Check, Shield } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  const [pinSet, setPinSet] = useStateSet(false);
  const [bioOn, setBioOn] = useStateSet(false);
  const [bioAvail, setBioAvail] = useStateSet(false);
  const [mode, setMode] = useStateSet('set'); // set | view
  const [p1, setP1] = useStateSet('');
  const [p2, setP2] = useStateSet('');
  const [msg, setMsg] = useStateSet(null);

  React.useEffect(() => {
    if (!open) {setShown(false);return;}
    const t = setTimeout(() => setShown(true), 20);
    const ps = !!localStorage.getItem('ff_lock_pin');
    setPinSet(ps);
    setBioOn(localStorage.getItem('ff_lock_bio') === '1' && !!localStorage.getItem('ff_lock_cred'));
    setMode(ps ? 'view' : 'set');setP1('');setP2('');setMsg(null);
    (window.ffBioAvailable ? window.ffBioAvailable() : Promise.resolve(false)).then(setBioAvail).catch(() => setBioAvail(false));
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const savePin = async () => {
    if (!/^\d{4,6}$/.test(p1)) {setMsg({ t: 'err', m: '請輸入 4–6 位數字密碼' });return;}
    if (p1 !== p2) {setMsg({ t: 'err', m: '兩次輸入不一致' });return;}
    try {await window.ffSetPin(p1);setPinSet(true);setMode('view');setP1('');setP2('');setMsg({ t: 'ok', m: '已設定密碼，下次開啟 App 需解鎖' });}
    catch (e) {setMsg({ t: 'err', m: '設定失敗：' + e.message });}
  };
  const removePin = () => {
    window.ffClearLock();setPinSet(false);setBioOn(false);setMode('set');setP1('');setP2('');setMsg({ t: 'ok', m: '已移除密碼與生物辨識' });
  };
  const toggleBio = async () => {
    if (bioOn) {try {localStorage.removeItem('ff_lock_bio');localStorage.removeItem('ff_lock_cred');} catch {}setBioOn(false);return;}
    try {await window.ffBioRegister();localStorage.setItem('ff_lock_bio', '1');setBioOn(true);setMsg({ t: 'ok', m: '已啟用生物辨識解鎖' });}
    catch (e) {setMsg({ t: 'err', m: '生物辨識設定失敗或已取消' });}
  };

  const inp = { width: '100%', height: 50, padding: PAD('0 14px'), borderRadius: RS(14), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(20), letterSpacing: 4, outline: 'none', boxSizing: 'border-box', textAlign: 'center' };
  const bigBtn = (bg, color, extra) => ({ width: '100%', minHeight: 50, borderRadius: RS(14), border: 'none', background: bg, color, fontSize: FS(17), fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8), ...extra });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '90%', background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)', boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'), display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('8px 18px 14px') }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: SP(8) }}><Lock size={18} /> App 密碼鎖</div>
            <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>進入 App 需輸入密碼；密碼僅雜湊存於本機</div>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(18), background: 'rgba(0,0,0,0.14)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 28px') }}>
          {mode === 'set' ?
          <>
              <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.6)', marginBottom: SP(6) }}>設定密碼（4–6 位數字）</div>
              <input type="password" inputMode="numeric" value={p1} onChange={(e) => setP1(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="輸入密碼" style={inp} />
              <input type="password" inputMode="numeric" value={p2} onChange={(e) => setP2(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="再次輸入" style={{ ...inp, marginTop: SP(10) }} />
              <button onClick={savePin} style={{ ...bigBtn('linear-gradient(135deg, ' + TOKENS.accentLight + ', ' + TOKENS.accent + ')', '#fff'), marginTop: SP(16) }}><Check size={18} /> 設定密碼</button>
              {pinSet && <button onClick={() => {setMode('view');setMsg(null);}} style={{ ...bigBtn(TOKENS.surface, TOKENS.ink, { border: '1px solid rgba(0,0,0,0.14)' }), marginTop: SP(10) }}>取消</button>}
            </> :

          <>
              <div style={{ padding: PAD('14px 16px'), borderRadius: RS(16), background: 'rgba(110,155,106,0.12)', border: '1px solid rgba(110,155,106,0.3)', color: TOKENS.greenDark, fontSize: FS(16), display: 'flex', alignItems: 'center', gap: SP(8) }}>
                <Check size={18} /> 密碼鎖已啟用，開啟 App 時需解鎖
              </div>

              {/* 生物辨識 */}
              <div style={{ marginTop: SP(16), padding: PAD('14px 16px'), borderRadius: RS(16), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: SP(12) }}>
                <div style={{ width: 36, height: 36, borderRadius: RS(20), background: 'rgba(217,119,87,0.14)', border: '1px solid rgba(217,119,87,0.3)', color: TOKENS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FS(18), fontWeight: 600, color: TOKENS.ink }}>生物辨識解鎖</div>
                  <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', marginTop: SP(2) }}>{bioAvail ? 'Face ID / 指紋（此裝置支援）' : '此裝置或瀏覽器不支援'}</div>
                </div>
                <button disabled={!bioAvail} onClick={toggleBio} style={{ width: 52, height: 32, borderRadius: RS(18), flexShrink: 0, background: bioOn ? TOKENS.accent : 'rgba(60,60,67,0.14)', border: 'none', position: 'relative', padding: 0, opacity: bioAvail ? 1 : 0.4 }}>
                  <span style={{ position: 'absolute', top: 2, left: bioOn ? 22 : 2, width: 28, height: 28, borderRadius: RS(18), background: '#fff', transition: 'left 180ms' }} />
                </button>
              </div>

              <button onClick={() => {setMode('set');setP1('');setP2('');setMsg(null);}} style={{ ...bigBtn(TOKENS.surface, TOKENS.ink, { border: '1px solid rgba(0,0,0,0.14)' }), marginTop: SP(16) }}>變更密碼</button>
              <button onClick={removePin} style={{ ...bigBtn('rgba(184,92,74,0.10)', TOKENS.red, { border: '1px solid rgba(184,92,74,0.3)' }), marginTop: SP(10) }}>移除密碼鎖</button>
            </>
          }

          {msg && <div style={{ marginTop: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14), fontSize: FS(15), lineHeight: 1.5, background: msg.t === 'ok' ? 'rgba(110,155,106,0.12)' : 'rgba(184,92,74,0.10)', border: '1px solid ' + (msg.t === 'ok' ? 'rgba(110,155,106,0.3)' : 'rgba(184,92,74,0.3)'), color: msg.t === 'ok' ? TOKENS.greenDark : TOKENS.red }}>{msg.m}</div>}
        </div>
      </div>
    </div>);

}

/* ===================== 匯入歷史紀錄（如：舊 Excel 記帳表） =====================
   匯入檔是一份「純資料」JSON（由外部工具/對話產生，不含密碼、不會自動寫入）。
   使用者在這裡自己選檔、自己對應要接到哪個既有帳戶，確認後才會合併寫入本機資料；
   不會覆蓋任何既有紀錄，只會新增；同一份檔案重複匯入會被偵測並提示。 */
const NEW_SENTINEL = '__new__';

function ffCatFor(kind, name, amount) {
  if (kind === 'inc') return /債|定存|利息/.test(name || '') ? '利息' : '股息';
  return amount >= 0 ? '投資收入' : '台股';
}

function ImportSheet({ open, onClose, data, setData, savedFlows, savedTrades, setSavedFlows, setSavedTrades, initialBalances, setInitialBalances }) {
  const { X, Clipboard, Check, ArrowUpRight } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  const [parsed, setParsed] = useStateSet(null);
  const [fileName, setFileName] = useStateSet('');
  const [brokerSel, setBrokerSel] = useStateSet({}); // key -> { broker, settle }
  const [ledgerAccount, setLedgerAccount] = useStateSet('歷史投資記錄');
  const [busy, setBusy] = useStateSet(false);
  const [status, setStatus] = useStateSet(null);
  const [force, setForce] = useStateSet(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open) { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); }
    setShown(false); setParsed(null); setFileName(''); setBrokerSel({}); setStatus(null); setBusy(false); setForce(false);
  }, [open]);

  if (!open) return null;

  const md = data || {};
  const brokerNames = (md.brokers || []).map((b) => b.name);
  const settleNames = [...new Set([...(md.settle || []).map((s) => s.name), ...(md.accounts || []).map((a) => a.name)])];
  const alreadyImported = parsed && (
    (savedTrades || []).some((t) => t.importBatch === parsed.batchId) ||
    (savedFlows || []).some((f) => f.importBatch === parsed.batchId));

  const onPickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(String(r.result));
        if (!j || j.v !== 1 || !Array.isArray(j.brokerGroups) || !j.ledger) throw new Error('檔案格式不符');
        setParsed(j); setFileName(f.name); setStatus(null); setForce(false);
        const sel = {};
        j.brokerGroups.forEach((g) => {
          const b = brokerNames.includes(g.suggestedBroker) ? g.suggestedBroker : NEW_SENTINEL;
          const s = g.suggestedSettle && settleNames.includes(g.suggestedSettle) ? g.suggestedSettle : NEW_SENTINEL;
          sel[g.key] = { broker: b, settle: s };
        });
        setBrokerSel(sel);
        setLedgerAccount((j.ledger.suggestedAccount || '歷史投資記錄'));
      } catch (e) {
        setStatus({ type: 'err', msg: '讀取失敗：' + e.message });
        setParsed(null);
      }
    };
    r.readAsText(f);
  };

  const doImport = () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const nextData = { ...md, brokers: [...(md.brokers || [])], settle: [...(md.settle || [])], accounts: [...(md.accounts || [])], asset_class: [...(md.asset_class || [])], cat_inc: [...(md.cat_inc || [])], cat_exp: [...(md.cat_exp || [])] };
      const balDelta = {}; // settleName -> 要加的初始餘額
      const newTrades = [];
      const base = Date.now(); let seq = 0;
      const stamp = () => base + seq++;

      parsed.brokerGroups.forEach((g) => {
        const sel = brokerSel[g.key] || {};
        const brokerName = sel.broker === NEW_SENTINEL ? g.suggestedBroker : sel.broker;
        const settleName = sel.settle === NEW_SENTINEL ? (g.suggestedSettle || (g.key + '交割戶')) : sel.settle;
        if (!nextData.brokers.find((b) => b.name === brokerName)) {
          nextData.brokers.push({ name: brokerName, settleAccount: settleName, currency: g.currency });
        }
        if (!nextData.settle.find((s) => s.name === settleName) && !nextData.accounts.find((a) => a.name === settleName)) {
          nextData.settle.push({ name: settleName, sub: '對應 ' + brokerName, currency: g.currency });
        }
        balDelta[settleName] = (balDelta[settleName] || 0) + (g.totalCost || 0);
        g.stocks.forEach((s) => {
          const assetClass = s.assetClass || '股票';
          if (!nextData.asset_class.includes(assetClass)) nextData.asset_class.push(assetClass);
          s.lots.forEach((lot) => {
            const price = lot.shares > 0 ? lot.cost / lot.shares : 0;
            newTrades.push({
              side: 'buy', code: s.code, name: s.name, shares: lot.shares, price,
              fee: 0, net: lot.cost, broker: brokerName, settleAccount: settleName,
              assetClass, date: lot.date,
              importBatch: parsed.batchId, time: '歷史匯入', _justAdded: stamp() });
          });
        });
      });

      const ledgerName = (ledgerAccount || '歷史投資記錄').trim() || '歷史投資記錄';
      if (!nextData.accounts.find((a) => a.name === ledgerName)) {
        nextData.accounts.push({ name: ledgerName, kind: '銀行', currency: 'TWD' });
      }
      // 美股股息以美金計價，不能跟台幣記錄混在同一個帳戶裡，另開一個美金專用帳戶。
      const ledgerNameUSD = ledgerName + '（美股）';
      const hasUsdIncome = (parsed.ledger.income || []).some((x) => x.currency === 'USD');
      if (hasUsdIncome && !nextData.accounts.find((a) => a.name === ledgerNameUSD)) {
        nextData.accounts.push({ name: ledgerNameUSD, kind: '銀行', currency: 'USD' });
      }
      const newFlows = [];
      (parsed.ledger.income || []).forEach((x) => {
        const isUsd = x.currency === 'USD';
        newFlows.push({ kind: 'inc', amount: Math.abs(x.amount), cat: ffCatFor('inc', x.name, x.amount),
          merchant: '歷史匯入 · ' + x.name + (x.precision === 'year' ? '（年度彙總）' : ''),
          account: isUsd ? ledgerNameUSD : ledgerName, date: x.date, icon: '💰', importBatch: parsed.batchId, time: '歷史匯入', _justAdded: stamp() });
      });
      (parsed.ledger.realized || []).forEach((x) => {
        // 已實現損益比照 App 賣股的自動記錄：merchant 用「投資獲利/投資損失」、分類用
        // 台股/美股（投資收入/投資損失大類），投資收益年度表才會把它算進「買賣損益」，
        // 不會被誤當股息。市場預設台股，x.market==='US' 或 currency==='USD' 視為美股。
        const gain = x.pnl >= 0;
        const isUS = x.market === 'US' || x.currency === 'USD';
        newFlows.push({ kind: gain ? 'inc' : 'exp', amount: Math.abs(x.pnl),
          cat: isUS ? '美股' : '台股', merchant: gain ? '投資獲利' : '投資損失',
          note: '歷史匯入 · ' + x.name + '　已實現損益' + (x.precision === 'year' ? '（年度彙總）' : ''),
          account: ledgerName, date: x.date, icon: gain ? '💰' : '📝', importBatch: parsed.batchId, time: '歷史匯入', _justAdded: stamp() });
      });

      // 一般收支（檔案2 收支彙總）：直接帶 kind/cat/account，不套投資專用的分類推斷。
      // ensureCats 先把要用到但還沒有的收入/支出分類（含新增大類）補進主檔；flows 用到的
      // 帳戶不存在就自動建立。這樣薪資/餐飲/旅遊…等一般記帳也能正確匯入並歸到對的大類。
      const L = parsed.ledger || {};
      const catName = (c) => typeof c === 'string' ? c : c && c.name;
      if (L.ensureCats) {
        (L.ensureCats.inc || []).forEach((it) => {
          if (!nextData.cat_inc.some((c) => catName(c) === it.name)) nextData.cat_inc.push(it);
        });
        (L.ensureCats.exp || []).forEach((it) => {
          if (!nextData.cat_exp.some((c) => catName(c) === it.name)) nextData.cat_exp.push(it);
        });
      }
      (L.flows || []).forEach((x) => {
        const acct = x.account || ledgerName;
        const cur = x.currency || 'TWD';
        if (!nextData.accounts.find((a) => a.name === acct)) nextData.accounts.push({ name: acct, kind: x.acctKind || '銀行', currency: cur });
        newFlows.push({ kind: x.kind, amount: Math.abs(x.amount), cat: x.cat,
          merchant: x.merchant || ('歷史匯入 · ' + x.cat), account: acct, date: x.date,
          icon: x.kind === 'inc' ? '💰' : '📝', importBatch: parsed.batchId, time: '歷史匯入', _justAdded: stamp() });
      });

      // 重匯 = 取代：先移除「上一次歷史匯入」的紀錄並回退它對交割戶初始餘額的調整，
      // 才不會每匯一次就重複累加（例如修正檔重匯時交割戶餘額翻倍）。
      let prevMeta = null;try {prevMeta = JSON.parse(localStorage.getItem('ff_import_meta') || 'null');} catch {}
      const prevBatch = prevMeta && prevMeta.batchId;
      const nextTrades = [...(savedTrades || []).filter((t) => !prevBatch || t.importBatch !== prevBatch), ...newTrades];
      const nextFlows = [...newFlows, ...(savedFlows || []).filter((f) => !prevBatch || f.importBatch !== prevBatch)];

      // 匯入資料量大：背景的持久化 effect 遇到空間不足會「靜默失敗」——畫面顯示成功、
      // 重開 App 資料卻消失。所以這裡先清掉可自動重建的快取釋放空間，再「同步」寫入；
      // 寫不進去就直接讓匯入失敗，誠實告知，而不是假裝成功。
      try { localStorage.removeItem('ff_auto_snapshot'); localStorage.removeItem('ff_tw_stocks_v7'); } catch {}
      try {
        localStorage.setItem('ff_trades', JSON.stringify(nextTrades));
        localStorage.setItem('ff_flows', JSON.stringify(nextFlows));
      } catch (qe) {
        throw new Error('裝置儲存空間不足，匯入已中止（資料未寫入，現有資料不受影響）。請重新整理 App 後再試一次。');
      }

      setData(nextData);
      setSavedTrades(nextTrades);
      setSavedFlows(nextFlows);
      setInitialBalances((prev) => {
        const next = { ...prev };
        if (prevMeta && prevMeta.balDelta) Object.keys(prevMeta.balDelta).forEach((k) => {next[k] = (parseFloat(next[k]) || 0) - prevMeta.balDelta[k];});
        Object.keys(balDelta).forEach((k) => {next[k] = (parseFloat(next[k]) || 0) + balDelta[k];});
        return next;
      });
      try {localStorage.setItem('ff_import_meta', JSON.stringify({ batchId: parsed.batchId, balDelta }));} catch {}

      setStatus({ type: 'ok', msg: `匯入完成：新增 ${newTrades.length} 筆股票交易、${newFlows.length} 筆收支記錄。已自動調高 ${Object.keys(balDelta).length} 個交割戶的初始餘額以抵消歷史買進成本，現有現金餘額不受影響。` });
    } catch (e) {
      setStatus({ type: 'err', msg: '匯入失敗：' + e.message });
    }
    setBusy(false);
  };

  const inp = { width: '100%', height: 46, padding: PAD('0 12px'), borderRadius: RS(12), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(16), outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: FS(14), color: 'rgba(44,44,50,0.55)', margin: PAD('10px 0 4px') };
  const bigBtn = (bg, color, extra) => ({ width: '100%', minHeight: 50, borderRadius: RS(14), border: 'none', background: bg, color, fontSize: FS(17), fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8), opacity: busy ? 0.6 : 1, ...extra });

  const totalTrades = parsed ? parsed.brokerGroups.reduce((a, g) => a + g.stocks.reduce((b, s) => b + s.lots.length, 0), 0) : 0;
  const incomeTWD = parsed ? (parsed.ledger.income || []).filter((x) => x.currency !== 'USD') : [];
  const incomeUSD = parsed ? (parsed.ledger.income || []).filter((x) => x.currency === 'USD') : [];
  const totalIncomeAmtTWD = incomeTWD.reduce((a, x) => a + x.amount, 0);
  const totalIncomeAmtUSD = incomeUSD.reduce((a, x) => a + x.amount, 0);
  const totalRealizedAmt = parsed ? (parsed.ledger.realized || []).reduce((a, x) => a + x.pnl, 0) : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '92%', background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)', boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'), display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('8px 18px 12px') }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: SP(8) }}><Clipboard size={18} /> 匯入歷史紀錄</div>
            <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>只會新增，不會覆蓋既有資料；確認前可自由調整對應帳戶</div>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(18), background: 'rgba(0,0,0,0.14)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 28px') }}>
          {!parsed &&
          <>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={onPickFile} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current && fileRef.current.click()} style={bigBtn('linear-gradient(135deg, ' + TOKENS.accentLight + ', ' + TOKENS.accent + ')', '#fff')}>
                <ArrowUpRight size={18} /> 選擇匯入檔（.json）
              </button>
              {status && <div style={{ marginTop: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14), fontSize: FS(15), background: 'rgba(184,92,74,0.10)', border: '1px solid rgba(184,92,74,0.3)', color: TOKENS.red }}>{status.msg}</div>}
            </>
          }

          {parsed &&
          <>
              <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.6)', marginBottom: SP(14) }}>已選：{fileName}</div>

              {alreadyImported &&
            <div style={{ marginBottom: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14), background: 'rgba(212,151,88,0.12)', border: '1px solid rgba(212,151,88,0.35)', color: TOKENS.accent, fontSize: FS(15), lineHeight: 1.5 }}>
                ⚠️ 偵測到這份檔案先前已經匯入過，再匯入一次會造成重複記錄。
                <label style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginTop: SP(8), fontWeight: 600 }}>
                  <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                  我了解風險，仍要繼續匯入
                </label>
              </div>
            }

              {parsed.brokerGroups.map((g) => (
            <div key={g.key} style={{ background: TOKENS.surface, borderRadius: RS(16), border: '1px solid rgba(0,0,0,0.12)', padding: PAD('14px'), marginBottom: SP(10) }}>
                  <div style={{ fontSize: FS(18), fontWeight: 700, color: TOKENS.ink }}>{g.key}</div>
                  <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', marginTop: SP(2) }}>
                    {g.stocks.length} 檔標的 · {g.stocks.reduce((a, s) => a + s.lots.length, 0)} 筆買進 · 成本 {g.totalCost.toLocaleString()} {g.currency}
                  </div>
                  <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.45)', marginTop: SP(4) }}>
                    {Object.entries(g.stocks.reduce((m, s) => {const k = s.assetClass || '股票';m[k] = (m[k] || 0) + 1;return m;}, {}))
                    .map(([k, n]) => `${k} ${n}`).join(' · ')}
                  </div>
                  <div style={lbl}>證券戶</div>
                  <select value={(brokerSel[g.key] || {}).broker || NEW_SENTINEL} onChange={(e) => setBrokerSel((m) => ({ ...m, [g.key]: { ...m[g.key], broker: e.target.value } }))} style={inp}>
                    {brokerNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value={NEW_SENTINEL}>➕ 新增：{g.suggestedBroker}</option>
                  </select>
                  <div style={lbl}>交割戶（初始餘額會自動調高 {g.totalCost.toLocaleString()} {g.currency} 抵消買進成本）</div>
                  <select value={(brokerSel[g.key] || {}).settle || NEW_SENTINEL} onChange={(e) => setBrokerSel((m) => ({ ...m, [g.key]: { ...m[g.key], settle: e.target.value } }))} style={inp}>
                    {settleNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value={NEW_SENTINEL}>➕ 新增：{g.suggestedSettle || g.key + '交割戶'}</option>
                  </select>
                </div>
            ))}

              <div style={{ background: TOKENS.surface, borderRadius: RS(16), border: '1px solid rgba(0,0,0,0.12)', padding: PAD('14px'), marginBottom: SP(14) }}>
                <div style={{ fontSize: FS(18), fontWeight: 700, color: TOKENS.ink }}>股息／利息／已實現損益</div>
                <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.55)', marginTop: SP(2), lineHeight: 1.6 }}>
                  {incomeTWD.length} 筆台幣收入，共 {Math.round(totalIncomeAmtTWD).toLocaleString()} 元<br />
                  {incomeUSD.length > 0 && <>{incomeUSD.length} 筆美股股息，共 {totalIncomeAmtUSD.toLocaleString()} 美元<br /></>}
                  {(parsed.ledger.realized || []).length} 筆已實現損益，淨額 {Math.round(totalRealizedAmt).toLocaleString()} 元<br />
                  <span style={{ color: 'rgba(44,44,50,0.4)' }}>早期年份僅有年度彙總金額（無法還原到確切日期），會標註「年度彙總」。</span>
                </div>
                <div style={lbl}>記入哪個帳戶（會新增此帳戶，只用來放這批歷史記錄，不影響其他帳戶）</div>
                <input value={ledgerAccount} onChange={(e) => setLedgerAccount(e.target.value)} style={inp} />
                {incomeUSD.length > 0 && <div style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.45)', marginTop: SP(6) }}>
                  美股股息會另外存到「{(ledgerAccount || '歷史投資記錄').trim() || '歷史投資記錄'}（美股）」這個美金帳戶，跟台幣分開，不會混算。
                </div>}
              </div>

              {status && <div style={{ marginBottom: SP(14), padding: PAD('12px 14px'), borderRadius: RS(14), fontSize: FS(15), lineHeight: 1.5, background: status.type === 'ok' ? 'rgba(110,155,106,0.12)' : 'rgba(184,92,74,0.10)', border: '1px solid ' + (status.type === 'ok' ? 'rgba(110,155,106,0.3)' : 'rgba(184,92,74,0.3)'), color: status.type === 'ok' ? TOKENS.greenDark : TOKENS.red }}>{status.msg}</div>}

              {!(status && status.type === 'ok') &&
            <button disabled={busy || (alreadyImported && !force)} onClick={doImport} style={bigBtn('linear-gradient(135deg, ' + TOKENS.green2 + ', ' + TOKENS.greenDark + ')', '#fff')}>
                  <Check size={18} /> 確認匯入
                </button>
            }
              {status && status.type === 'ok' &&
            <button onClick={onClose} style={bigBtn(TOKENS.surface, TOKENS.ink, { border: '1px solid rgba(0,0,0,0.14)' })}>完成</button>
            }
            </>
          }
        </div>
      </div>
    </div>);

}

/* ===================== 清除所有歷史資料 ===================== */
// 只清除記帳交易本身：支出/收入/轉帳紀錄、股票交易紀錄，以及套在這些紀錄上的編輯/刪除覆寫。
// 不會清除：主檔設定（分類/帳戶/證券戶/交割戶/資產類別）、初始餘額、自動扣款規則、
// App 密碼鎖、AI 金鑰設定、外觀偏好——這些都是「設定」，不是「記帳交易」。
// ff_auto_snapshot 一併清：它是被清除紀錄的完整複本，留著會佔掉數 MB 儲存空間，
// 造成之後匯入/儲存時空間不足。ff_import_meta 也清：紀錄已刪，舊批次的初始餘額
// 回退資訊已無意義，留著會讓下次匯入誤扣一次交割戶餘額。
const FF_CLEAR_KEYS = ['ff_flows', 'ff_trades', 'ff_record_edits', 'ff_record_deletes', 'ff_auto_snapshot', 'ff_import_meta'];
const CLEAR_PHRASE = '清除';

function ClearDataSheet({ open, onClose }) {
  const { X, Trash } = window.Icons;
  const [shown, setShown] = useStateSet(false);
  const [phrase, setPhrase] = useStateSet('');
  const [done, setDone] = useStateSet(false);

  React.useEffect(() => {
    if (open) { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t); }
    setShown(false); setPhrase(''); setDone(false);
  }, [open]);

  if (!open) return null;

  const doClear = () => {
    FF_CLEAR_KEYS.forEach((k) => {try {localStorage.removeItem(k);} catch {}});
    setDone(true);
    setTimeout(() => location.reload(), 900);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 75, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '90%', background: TOKENS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32,0.72,0.18,1)', boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'), display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: PAD('8px 18px 12px') }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 700, color: TOKENS.red, display: 'flex', alignItems: 'center', gap: SP(8) }}><Trash size={18} /> 清除所有歷史資料</div>
            <div style={{ fontSize: FS(15), color: 'rgba(44,44,50,0.5)', marginTop: SP(2) }}>此操作無法復原</div>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(18), background: 'rgba(0,0,0,0.14)', border: 'none', color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 18px 28px') }}>
          {done ?
          <div style={{ padding: PAD('20px 14px'), borderRadius: RS(16), background: 'rgba(110,155,106,0.12)', border: '1px solid rgba(110,155,106,0.3)', color: TOKENS.greenDark, fontSize: FS(16), textAlign: 'center' }}>
              已清除，即將重新載入…
            </div> :

          <>
              <div style={{ padding: PAD('14px 16px'), borderRadius: RS(16), background: 'rgba(184,92,74,0.10)', border: '1px solid rgba(184,92,74,0.3)', color: TOKENS.red, fontSize: FS(15), lineHeight: 1.7 }}>
                <b>會被清除：</b>所有記帳紀錄（支出/收入/轉帳）、股票交易紀錄。
                <br /><br />
                <b>不會清除：</b>分類、帳戶、證券戶、交割戶等主檔設定、初始餘額、自動扣款規則、App 密碼鎖、AI 金鑰設定、外觀偏好。
              </div>
              <div style={{ marginTop: SP(14), fontSize: FS(15), color: 'rgba(44,44,50,0.6)', lineHeight: 1.6 }}>
                建議先到「安全與備份 → 加密備份 / 還原」匯出一份備份，以防日後需要找回資料。
              </div>
              <div style={{ marginTop: SP(16), fontSize: FS(15), color: 'rgba(44,44,50,0.6)' }}>
                請輸入「{CLEAR_PHRASE}」以確認：
              </div>
              <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CLEAR_PHRASE}
              style={{ width: '100%', height: 50, marginTop: SP(6), padding: PAD('0 14px'), borderRadius: RS(14), background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.14)', color: TOKENS.ink, fontSize: FS(17), outline: 'none', boxSizing: 'border-box' }} />
              <button disabled={phrase !== CLEAR_PHRASE} onClick={doClear} style={{
              width: '100%', minHeight: 50, marginTop: SP(16), borderRadius: RS(14), border: 'none',
              background: phrase === CLEAR_PHRASE ? TOKENS.red : 'rgba(184,92,74,0.3)', color: '#fff',
              fontSize: FS(17), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8) }}>
                <Trash size={18} /> 永久清除所有歷史資料
              </button>
            </>
          }
        </div>
      </div>
    </div>);

}

window.SettingsScreen = SettingsScreen;
window.DEFAULT_MASTER_DATA = DEFAULT_DATA;