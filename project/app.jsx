// Main App + Tab Bar (6 tabs, center FAB for 記帳 → bottom sheet)
const { useState: useStateApp, useEffect: useEffectApp } = React;

function StatusBar() {
  return (
    <div style={{
      height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 28px 8px', color: '#18110C', position: 'relative', zIndex: 5
    }}>
      <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 17, fontWeight: 600 }}>14:32</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill="#18110C">
          <rect x="0" y="7" width="3" height="4" rx="0.7" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.7" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="#18110C" strokeWidth="1.2">
          <path d="M1 4a10 10 0 0 1 14 0M3 6a7 7 0 0 1 10 0M5 8a4 4 0 0 1 6 0" />
          <circle cx="8" cy="10" r="1" fill="#18110C" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="#18110C" strokeOpacity="0.5" fill="none" />
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill="#A8BD8C" />
          <path d="M24 4v4c.8-.3 1.5-1.2 1.5-2s-.7-1.7-1.5-2Z" fill="#18110C" fillOpacity="0.5" />
        </svg>
      </div>
    </div>);

}

function NavHeader({ tab }) {
  const titles = {
    dashboard: 'FinFolio',
    accounts: '資產配置',
    advisor: 'AI 財富導師',
    settings: '設定'
  };
  return (
    <div style={{ padding: '6px 18px 12px' }}>
      <div style={{
        fontWeight: 700, color: '#18110C', letterSpacing: -0.5, fontSize: "30px"
      }}>{titles[tab]}</div>
    </div>);

}

function TabBar({ tab, setTab, onRecord }) {
  const { LayoutGrid, Wallet, Plus, Mic, Sparkles, Settings } = window.Icons;
  const pressTimer = React.useRef(null);
  const longFired = React.useRef(false);
  const [holding, setHolding] = useStateApp(false);

  const startPress = (e) => {
    e.preventDefault();
    longFired.current = false;
    setHolding(true);
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      setHolding(false);
      onRecord(true); // long-press → AI voice
    }, 450);
  };
  const endPress = () => {
    setHolding(false);
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (!longFired.current) onRecord(false); // tap → manual
  };
  const cancelPress = () => {
    setHolding(false);
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const tabs = [
  { id: 'dashboard', label: '看板', Icon: LayoutGrid },
  { id: 'accounts', label: '配置', Icon: Wallet },
  { id: 'record', label: '記帳', Icon: Plus, special: true },
  { id: 'advisor', label: 'AI 顧問', Icon: Sparkles },
  { id: 'settings', label: '設定', Icon: Settings }];

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 24, pointerEvents: 'none',
      background: 'linear-gradient(to top, #F7F2EC 55%, rgba(38,38,36,0))'
    }}>
      <div style={{
        margin: '0 14px', position: 'relative', pointerEvents: 'auto',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 20,
        border: '1px solid rgba(28,26,24,0.14)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        padding: '6px 6px', display: 'flex', alignItems: 'center', gap: 2
      }}>
        {tabs.map((t) => {
          if (t.special) {
            return (
              <button key={t.id}
                onPointerDown={startPress}
                onPointerUp={endPress}
                onPointerLeave={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                flex: '0 0 auto', width: 60, height: 60, borderRadius: 30,
                marginTop: -28, marginLeft: 2, marginRight: 2,
                background: 'linear-gradient(135deg, #E89878, #D97757)',
                border: '3px solid #F7F2EC',
                color: '#fff', position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: holding
                  ? '0 0 0 6px rgba(217,119,87,0.30), 0 10px 24px rgba(217,119,87,0.5)'
                  : '0 10px 24px rgba(217,119,87,0.45), 0 0 0 1px rgba(28,26,24,0.14)',
                transform: holding ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 140ms, box-shadow 200ms',
                touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none',
              }}>
                {holding && (
                  <span style={{ position: 'absolute', inset: -3, borderRadius: 33,
                    border: '2px solid rgba(28,26,24,0.55)',
                    animation: 'pulse 0.9s ease-out infinite' }}/>
                )}
                <t.Icon size={26} strokeWidth={2.4} />
                {/* mic badge — signals long-press voice */}
                <span style={{
                  position: 'absolute', right: -3, bottom: -3,
                  width: 24, height: 24, borderRadius: 14,
                  background: '#FBF7F2', border: '2px solid #F7F2EC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#F2B89C',
                }}>
                  <Mic size={12} strokeWidth={2.2}/>
                </span>
              </button>);

          }
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minWidth: 0, minHeight: 56, borderRadius: 14,
              background: active ? '#D97757' : 'transparent',
              border: active ? '1px solid #D97757' : '1px solid transparent',
              color: active ? '#FFFFFF' : 'rgba(18,17,12,0.72)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, transition: 'all 200ms', cursor: 'pointer', padding: 0
            }}>
              <t.Icon size={20} strokeWidth={active ? 2 : 1.6} />
              <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, letterSpacing: 0.2 }}>{t.label}</span>
            </button>);

        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: 'rgba(28,26,24,0.60)' }} />
      </div>
    </div>);

}

function RecordSheet({ open, autoVoice, onClose, onSaved }) {
  const { X, Mic, Plus } = window.Icons;
  // Mount-only animation
  const [shown, setShown] = useStateApp(false);
  useEffectApp(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    } else {
      setShown(false);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxHeight: '92%',
        background: '#F7F2EC',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.38)' }} />
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px 12px'
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#18110C',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              {autoVoice ? <><Mic size={18}/> AI 語音記帳</> : '記一筆'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>
              {autoVoice ? '說出關鍵字，AI 自動帶入欄位' : '輕點手動填寫 · 點麥克風可語音'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 14, flexShrink: 0,
            background: 'rgba(28,26,24,0.14)', border: 'none',
            color: 'rgba(45,36,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><X size={18} /></button>
        </div>
        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 32 }}>
          <AccountingScreen onSaved={onSaved} autoVoice={autoVoice} />
        </div>
      </div>
    </div>);

}

function App() {
  const [tab, setTab] = useStateApp('dashboard');
  const [hideAmounts, setHideAmounts] = useStateApp(false);
  const [recordOpen, setRecordOpen] = useStateApp(false);
  const [recordVoice, setRecordVoice] = useStateApp(false);
  const [savedFlows, setSavedFlows] = useStateApp([]);
  const [savedTrades, setSavedTrades] = useStateApp([]);
  const [dashWidget, setDashWidget] = useStateApp('accounts'); // 'accounts' | 'spending' | 'stocks'

  const FLOW_ICONS = {
    餐飲: '🍔', 交通: '🚕', 生活雜貨: '🛒', 娛樂: '🎬', 醫療: '💊',
    住房: '🏠', 教育: '📚', 薪資: '💼', 獎金: '💰',
    股利: '📈', 紅利回饋: '🎁', 轉帳: '↔️', 其他: '📝',
  };

  const nowStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const handleSaved = (kind, data) => {
    if (kind === 'flow') {
      const isXfer = data.kind === 'xfer';
      const entry = {
        kind: data.kind,
        amount: parseFloat(data.amount) || 0,
        cat: isXfer ? '轉帳' : data.category,
        merchant: data.note || (isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.category),
        account: isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.account,
        date: data.date,
        time: nowStr(),
        icon: isXfer ? '↔️' : (FLOW_ICONS[data.category] || (data.kind === 'inc' ? '💰' : '📝')),
        _justAdded: Date.now(),
      };
      setSavedFlows((s) => [entry, ...s]);
    } else if (kind === 'stock') {
      const entry = {
        side: data.side,
        code: data.code,
        name: data.name,
        shares: parseFloat(data.shares) || 0,
        price: parseFloat(data.price) || 0,
        broker: data.settleAccount,
        date: data.date,
        time: nowStr(),
        _justAdded: Date.now(),
      };
      setSavedTrades((t) => [entry, ...t]);
    }
    setRecordOpen(false);
    setTab('dashboard');
  };

  return (
    <div data-screen-label={`${tab}`} style={{
      width: 402, height: 874, borderRadius: 56, overflow: 'hidden',
      position: 'relative', background: '#F7F2EC',
      boxShadow: '0 50px 100px rgba(0,0,0,0.12), 0 0 0 12px #C8C3BB, 0 0 0 13px #B8B3AB',
      fontFamily: '"Noto Sans TC", -apple-system, system-ui, sans-serif',
      color: '#18110C',
      WebkitFontSmoothing: 'antialiased'
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 20, background: '#000', zIndex: 50
      }} />

      <StatusBar />
      <NavHeader tab={tab} />

      {/* Scrollable content */}
      {tab === 'advisor' ? (
        <div style={{
          position: 'absolute', top: 122, bottom: 110, left: 0, right: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <AdvisorScreen/>
        </div>
      ) : (
        <div style={{
          position: 'absolute', top: 122, bottom: 0, left: 0, right: 0,
          overflowY: 'auto', overflowX: 'hidden',
          paddingBottom: 130
        }}>
          {tab === 'dashboard' && <DashboardScreen hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} savedFlows={savedFlows} savedTrades={savedTrades} dashWidget={dashWidget} />}
          {tab === 'accounts' && <AccountsScreen hideAmounts={hideAmounts} />}
          {tab === 'settings' && <SettingsScreen dashWidget={dashWidget} setDashWidget={setDashWidget} />}
        </div>
      )}

      <TabBar tab={tab} setTab={setTab} onRecord={(voice) => { setRecordVoice(!!voice); setRecordOpen(true); }} />
      <RecordSheet open={recordOpen} autoVoice={recordVoice} onClose={() => setRecordOpen(false)} onSaved={handleSaved} />
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);