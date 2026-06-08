import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Wallet, Plus, Mic, Sparkles, Settings as SettingsIcon, TrendUp, X, ChevronRight, Volume } from './icons';
import DashboardScreen from './screens/Dashboard';
import AccountsScreen, { AccountDetailSheet, type AccountDetailData } from './screens/Accounts';
import InvestScreen, { InvestDetailSheet, type InvestDetailData } from './screens/Invest';
import AccountingScreen, { type OnSaved, type OnDelete } from './screens/Accounting';
import AdvisorScreen from './screens/Advisor';
import SettingsScreen from './screens/Settings';
import { FLOW_ICONS, nowStr, VOICE_SCENARIOS } from './data/demo';
import { DEFAULT_MASTER_DATA } from './data/master';
import type { SavedFlow, SavedTrade, FlowState, StockState, Draft, MasterData, VoiceScenario } from './data/types';
import type { AccountEntry, HoldingItem } from './data/portfolio';

type Tab = 'dashboard' | 'accounts' | 'record' | 'invest' | 'advisor';
type RecordEdits = Record<string, Partial<SavedFlow> & Partial<SavedTrade>>;

function StatusBar() {
  return (
    <div style={{ height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 28px 8px', color: '#18110C', position: 'relative', zIndex: 5 }}>
      <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 18, fontWeight: 600 }}>14:32</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11">
          <g fill="#18110C">
            <rect x="0" y="7" width="3" height="4" rx="0.7" />
            <rect x="4.5" y="5" width="3" height="6" rx="0.7" />
            <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
            <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
          </g>
        </svg>
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
    </div>
  );
}

function NavHeader({ tab, onSettings }: { tab: Tab; onSettings: () => void }) {
  const titles: Record<string, string> = { dashboard: 'FinFolio', accounts: '資產帳戶', invest: '投資組合', advisor: 'AI 財富導師' };
  return (
    <div style={{ padding: '6px 18px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div style={{ fontWeight: 700, color: '#18110C', letterSpacing: -0.5, fontSize: '30px' }}>{titles[tab] || 'FinFolio'}</div>
      <button onClick={onSettings} style={{ width: 38, height: 38, borderRadius: 12, marginBottom: 2, flexShrink: 0, background: 'rgba(28,26,24,0.09)', border: '1px solid rgba(28,26,24,0.12)', color: 'rgba(45,36,32,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SettingsIcon size={18} />
      </button>
    </div>
  );
}

function TabBar({ tab, setTab, onVoice, onManualRecord }: { tab: Tab; setTab: (t: Tab) => void; onVoice: () => void; onManualRecord: () => void }) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const [holding, setHolding] = useState(false);

  const startPress = (e: React.PointerEvent) => {
    e.preventDefault();
    longFired.current = false;
    setHolding(true);
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      setHolding(false);
      onVoice();
    }, 450);
  };
  const endPress = () => {
    setHolding(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!longFired.current) onManualRecord();
  };
  const cancelPress = () => {
    setHolding(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const tabs = [
    { id: 'dashboard' as const, label: '看板', Icon: LayoutGrid },
    { id: 'accounts' as const, label: '資產', Icon: Wallet },
    { id: 'record' as const, label: '記帳', Icon: Plus, special: true },
    { id: 'invest' as const, label: '投資', Icon: TrendUp },
    { id: 'advisor' as const, label: 'AI 顧問', Icon: Sparkles },
  ];

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, paddingBottom: 24, pointerEvents: 'none', background: 'linear-gradient(to top, #F7F2EC 55%, rgba(38,38,36,0))' }}>
      <div style={{ margin: '0 14px', position: 'relative', pointerEvents: 'auto', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 26, border: '1px solid rgba(28,26,24,0.14)', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: '6px 6px', display: 'flex', alignItems: 'center', gap: 2 }}>
        {tabs.map((t) => {
          if (t.special) {
            return (
              <button
                key={t.id}
                onPointerDown={startPress}
                onPointerUp={endPress}
                onPointerLeave={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                style={{ flex: '0 0 auto', width: 60, height: 60, borderRadius: 30, marginTop: -28, marginLeft: 2, marginRight: 2, background: 'linear-gradient(135deg, #E89878, #D97757)', border: '3px solid #F7F2EC', color: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: holding ? '0 0 0 6px rgba(217, 119, 87,0.30), 0 10px 24px rgba(217, 119, 87,0.5)' : '0 10px 24px rgba(217, 119, 87,0.45), 0 0 0 1px rgba(28,26,24,0.14)', transform: holding ? 'scale(0.94)' : 'scale(1)', transition: 'transform 140ms, box-shadow 200ms', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              >
                {holding && <span style={{ position: 'absolute', inset: -3, borderRadius: 33, border: '2px solid rgba(28,26,24,0.55)', animation: 'pulse 0.9s ease-out infinite' }} />}
                <t.Icon size={26} strokeWidth={2.4} />
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 24, height: 24, borderRadius: 18, background: '#FBF7F2', border: '2px solid #F7F2EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2B89C' }}>
                  <Mic size={12} strokeWidth={2.2} />
                </span>
              </button>
            );
          }
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 0, minHeight: 56, borderRadius: 18, background: active ? '#D97757' : 'transparent', border: active ? '1px solid #D97757' : '1px solid transparent', color: active ? '#FFFFFF' : 'rgba(18,17,12,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 200ms', cursor: 'pointer', padding: 0 }}>
              <t.Icon size={20} strokeWidth={active ? 2 : 1.6} />
              <span style={{ fontSize: 15, fontWeight: active ? 600 : 500, letterSpacing: 0.2 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: 'rgba(28,26,24,0.60)' }} />
      </div>
    </div>
  );
}

function RecordSheet({ open, draft, onClose, onSaved, onDelete, masterData }: { open: boolean; draft: Draft | null; onClose: () => void; onSaved: OnSaved; onDelete: OnDelete; masterData: MasterData }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '92%', background: '#F7F2EC', borderTopLeftRadius: 30, borderTopRightRadius: 30, transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)', boxShadow: '0 -20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 12px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#18110C', display: 'flex', alignItems: 'center', gap: 8 }}>
              {draft ? draft.edit ? '編輯紀錄' : <><Sparkles size={18} /> 確認記帳內容</> : '記一筆'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>{draft ? (draft.edit ? '修改欄位後儲存' : 'AI 已解析並帶入，確認後送出') : '手動填寫收支、轉帳或股票'}</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: 'rgba(28,26,24,0.14)', border: 'none', color: 'rgba(45,36,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 32 }}>
          <AccountingScreen onSaved={onSaved} onDelete={onDelete} initialDraft={draft} masterData={masterData} />
        </div>
      </div>
    </div>
  );
}

function VoiceListenOverlay({ open, turn, onDone, onCancel }: { open: boolean; turn: number; onDone: (sc: VoiceScenario) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<'listening' | 'parsing'>('listening');
  const [text, setText] = useState('');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const sc = VOICE_SCENARIOS[turn % VOICE_SCENARIOS.length];
    setShown(true);
    setPhase('listening');
    setText('');
    let i = 0;
    const typer = setInterval(() => {
      i++;
      setText(sc.text.slice(0, i));
      if (i >= sc.text.length) {
        clearInterval(typer);
        setPhase('parsing');
        setTimeout(() => onDone(sc), 950);
      }
    }, 55);
    return () => clearInterval(typer);
  }, [open, turn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  return (
    <div onClick={onCancel} style={{ position: 'absolute', inset: 0, zIndex: 70, background: shown ? 'rgba(24,17,12,0.66)' : 'rgba(24,17,12,0)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', transition: 'background 220ms ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 116, height: 116, borderRadius: 60, position: 'relative', background: phase === 'parsing' ? 'linear-gradient(135deg, #A8BD8C, #8FA86F)' : 'linear-gradient(135deg, #E89878, #D97757)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 16px 40px rgba(217, 119, 87,0.45)', transition: 'background 300ms' }}>
        {phase === 'listening' && (
          <>
            <span style={{ position: 'absolute', inset: -14, borderRadius: 72, border: '2px solid rgba(232, 152, 120,0.55)', animation: 'pulse 1.5s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: -6, borderRadius: 66, border: '2px solid rgba(232, 152, 120,0.75)', animation: 'pulse 1.5s ease-out infinite .4s' }} />
          </>
        )}
        {phase === 'parsing' ? <Sparkles size={44} strokeWidth={2} /> : <Mic size={48} strokeWidth={2} />}
      </div>
      <div style={{ marginTop: 26, fontSize: 18, fontWeight: 600, color: '#FFF6EE', display: 'flex', alignItems: 'center', gap: 8 }}>
        {phase === 'listening' ? '正在聆聽…' : <><Sparkles size={16} /> AI 解析中…</>}
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 16, maxWidth: 320, minHeight: 52, padding: '14px 18px', borderRadius: 20, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', color: '#FFF6EE', fontSize: 17, lineHeight: 1.5, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: 'rgba(255,246,238,0.55)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          <Volume size={12} /> 語音轉文字
        </div>
        {text || <span style={{ opacity: 0.4 }}>請說出你的消費或交易…</span>}
        {phase === 'listening' && <span style={{ display: 'inline-block', width: 2, height: 16, background: '#F2B89C', marginLeft: 2, animation: 'blink 0.8s steps(2) infinite', verticalAlign: 'text-bottom' }} />}
      </div>
      <div style={{ marginTop: 14, fontSize: 14, color: 'rgba(255,246,238,0.5)' }}>{phase === 'listening' ? '連續說話，完成後自動解析' : '即將帶入記帳畫面'}</div>
      <button onClick={onCancel} style={{ marginTop: 28, width: 52, height: 52, borderRadius: 30, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={22} />
      </button>
    </div>
  );
}

function SettingsOverlay({ open, onClose, masterData, setMasterData }: { open: boolean; onClose: () => void; masterData: MasterData; setMasterData: React.Dispatch<React.SetStateAction<MasterData>> }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: '#F7F2EC', transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 54, flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 10px' }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', color: '#18110C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#18110C', letterSpacing: -0.5 }}>設定</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SettingsScreen masterData={masterData} setMasterData={setMasterData} />
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [acctDetail, setAcctDetail] = useState<AccountDetailData | null>(null);
  const [investDetail, setInvestDetail] = useState<{ item: HoldingItem; mask: (v: number) => string; savedTrades: SavedTrade[] } | null>(null);
  const [acctOverrides, setAcctOverrides] = useState<Record<string, Partial<AccountEntry>>>({});
  const [hideAmounts, setHideAmounts] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordDraft, setRecordDraft] = useState<Draft | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceTurn, setVoiceTurn] = useState(0);
  const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);
  const [savedTrades, setSavedTrades] = useState<SavedTrade[]>([]);
  const [masterData, setMasterData] = useState<MasterData>(DEFAULT_MASTER_DATA);
  const [recordEdits, setRecordEdits] = useState<RecordEdits>({});
  const [recordDeletes, setRecordDeletes] = useState<string[]>([]);

  const appMask = (n: number) => (hideAmounts ? '••••••' : Math.round(n).toLocaleString());

  const handleSaveAcctItem = (groupId: string, origItem: AccountEntry, patch: Partial<AccountEntry>) => {
    const key = `${groupId}::${origItem.name}`;
    setAcctOverrides((prev) => ({ ...prev, [key]: patch }));
    setAcctDetail((prev) => (prev ? { ...prev, item: { ...prev.item, ...patch } } : null));
  };

  const handleSaved: OnSaved = (kind, data) => {
    if (kind === 'flow') {
      const d = data as FlowState & { recordId?: string };
      const isXfer = d.kind === 'xfer';
      const entry: SavedFlow = {
        kind: d.kind,
        amount: parseFloat(d.amount) || 0,
        cat: isXfer ? '轉帳' : d.category,
        merchant: d.note || (isXfer ? `${d.fromAccount} → ${d.toAccount}` : d.category),
        account: isXfer ? `${d.fromAccount} → ${d.toAccount}` : d.account,
        date: d.date,
        icon: isXfer ? '↔️' : FLOW_ICONS[d.category] || (d.kind === 'inc' ? '💰' : '📝'),
      };
      if (d.recordId) {
        if (d.recordId.startsWith('s-')) setSavedFlows((s) => s.map((e) => 's-' + e._justAdded === d.recordId ? { ...e, ...entry } : e));
        else setRecordEdits((m) => ({ ...m, [d.recordId!]: entry }));
      } else {
        setSavedFlows((s) => [{ ...entry, time: nowStr(), _justAdded: Date.now() }, ...s]);
      }
    } else {
      const d = data as StockState & { recordId?: string };
      const entry: SavedTrade = {
        side: d.side,
        code: d.code,
        name: d.name,
        shares: parseFloat(d.shares) || 0,
        price: parseFloat(d.price) || 0,
        broker: d.settleAccount,
        date: d.date,
      };
      if (d.recordId) {
        if (d.recordId.startsWith('s-')) setSavedTrades((t) => t.map((e) => 's-' + e._justAdded === d.recordId ? { ...e, ...entry } : e));
        else setRecordEdits((m) => ({ ...m, [d.recordId!]: entry }));
      } else {
        setSavedTrades((t) => [{ ...entry, time: nowStr(), _justAdded: Date.now() }, ...t]);
      }
    }
    setRecordOpen(false);
    setRecordDraft(null);
    setTab('dashboard');
  };

  const handleDelete: OnDelete = (recordId) => {
    if (!recordId) return;
    if (recordId.startsWith('s-')) {
      setSavedFlows((s) => s.filter((e) => 's-' + e._justAdded !== recordId));
      setSavedTrades((t) => t.filter((e) => 's-' + e._justAdded !== recordId));
    } else {
      setRecordDeletes((d) => (d.includes(recordId) ? d : [...d, recordId]));
    }
    setRecordOpen(false);
    setRecordDraft(null);
    setTab('dashboard');
  };

  return (
    <div data-screen-label={`${tab}`} style={{ width: 402, height: 874, borderRadius: 56, overflow: 'hidden', position: 'relative', background: '#F7F2EC', boxShadow: '0 50px 100px rgba(0,0,0,0.12), 0 0 0 12px #C8C3BB, 0 0 0 13px #B8B3AB', fontFamily: '"Noto Sans TC", -apple-system, system-ui, sans-serif', color: '#18110C', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, borderRadius: 26, background: '#000', zIndex: 50 }} />

      <StatusBar />
      <NavHeader tab={tab} onSettings={() => setSettingsOpen(true)} />

      {tab === 'advisor' ? (
        <div style={{ position: 'absolute', top: 122, bottom: 110, left: 0, right: 0, display: 'flex', flexDirection: 'column' }}>
          <AdvisorScreen />
        </div>
      ) : (
        <div style={{ position: 'absolute', top: 122, bottom: 0, left: 0, right: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 130 }}>
          {tab === 'dashboard' && (
            <DashboardScreen
              hideAmounts={hideAmounts}
              setHideAmounts={setHideAmounts}
              savedFlows={savedFlows}
              savedTrades={savedTrades}
              recordEdits={recordEdits}
              recordDeletes={recordDeletes}
              onEditRecord={(d) => {
                setRecordDraft(d);
                setRecordOpen(true);
              }}
            />
          )}
          {tab === 'accounts' && <AccountsScreen hideAmounts={hideAmounts} onOpenDetail={setAcctDetail} acctOverrides={acctOverrides} />}
          {tab === 'invest' && <InvestScreen hideAmounts={hideAmounts} savedTrades={savedTrades} onOpenDetail={(d: InvestDetailData) => setInvestDetail({ ...d, mask: appMask, savedTrades })} />}
        </div>
      )}

      <TabBar
        tab={tab}
        setTab={setTab}
        onVoice={() => setListening(true)}
        onManualRecord={() => {
          setRecordDraft(null);
          setRecordOpen(true);
        }}
      />
      <VoiceListenOverlay
        open={listening}
        turn={voiceTurn}
        onCancel={() => setListening(false)}
        onDone={(sc) => {
          setListening(false);
          setVoiceTurn((t) => t + 1);
          setRecordDraft(sc);
          setRecordOpen(true);
        }}
      />
      <RecordSheet
        open={recordOpen}
        draft={recordDraft}
        masterData={masterData}
        onClose={() => {
          setRecordOpen(false);
          setRecordDraft(null);
        }}
        onSaved={handleSaved}
        onDelete={handleDelete}
      />
      <SettingsOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)} masterData={masterData} setMasterData={setMasterData} />

      {acctDetail && <AccountDetailSheet data={acctDetail} mask={appMask} savedFlows={savedFlows} savedTrades={savedTrades} onClose={() => setAcctDetail(null)} onSaveItem={handleSaveAcctItem} />}
      {investDetail && <InvestDetailSheet data={investDetail.item} mask={investDetail.mask || appMask} savedTrades={investDetail.savedTrades || []} onClose={() => setInvestDetail(null)} />}
    </div>
  );
}
