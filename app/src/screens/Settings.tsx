import { useEffect, useState, type ReactNode } from 'react';
import {
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
  Check,
  Info,
  Tag,
  CreditCard,
  ArrowUpRight,
  Wallet,
  ChevronDown,
  X,
  Plus,
} from '../icons';

interface AccountItem {
  name: string;
  kind: string;
}
interface KVItem {
  name: string;
  sub: string;
}
type CatKey = 'cat_exp' | 'cat_inc' | 'cat_xfer';
interface MasterData {
  cat_exp: string[];
  cat_inc: string[];
  cat_xfer: string[];
  asset_class: string[];
  accounts: AccountItem[];
  brokers: KVItem[];
  settle: KVItem[];
}

const DEFAULT_DATA: MasterData = {
  cat_exp: ['餐飲', '交通', '生活雜貨', '娛樂', '醫療', '住房', '教育', '其他'],
  cat_inc: ['薪資', '獎金', '股利', '紅利回饋', '其他'],
  cat_xfer: ['日常轉帳', '投資轉入', '繳卡費'],
  asset_class: ['股票', 'ETF', '債券', '特別股'],
  accounts: [
    { name: '主要存款帳戶', kind: '銀行' },
    { name: '郵局帳戶', kind: '銀行' },
    { name: '數位帳戶', kind: '銀行' },
    { name: '信用卡 A', kind: '信用卡' },
    { name: '信用卡 B', kind: '信用卡' },
    { name: '現金 (錢包)', kind: '現金' },
    { name: 'LINE Pay', kind: '電子支付' },
    { name: '街口支付', kind: '電子支付' },
  ],
  brokers: [
    { name: '主要券商', sub: '富邦證券 · ••• 8832' },
    { name: '副券商', sub: '元大證券 · ••• 1024' },
    { name: '複委託', sub: '國泰證券 · ••• 2207' },
  ],
  settle: [
    { name: '券商交割戶', sub: '對應主要券商' },
    { name: '複委託交割戶', sub: '對應複委託 · 美股' },
    { name: '主要存款帳戶', sub: '部分券商可直接交割' },
  ],
};

interface SheetCfg {
  type: 'categories' | 'accounts' | 'brokers' | 'settle';
  title: string;
  color: string;
}

export default function SettingsScreen() {
  // BYOK
  const [geminiKey, setGeminiKey] = useState('AIzaSyBn••••••••••••••••••••••AbcD');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showClaude, setShowClaude] = useState(false);

  const MODELS = [
    { id: 'gemini', name: 'Google Gemini 1.5 Pro', color: '#D97757', has: !!geminiKey },
    { id: 'gpt4o', name: 'OpenAI GPT-4o', color: '#A8BD8C', has: !!openaiKey },
    { id: 'claude', name: 'Anthropic Claude 3.5', color: '#C5A07D', has: !!claudeKey },
    { id: 'local', name: 'Ollama 本機', color: '#BFA176', has: true },
  ];
  const [defaultModel, setDefaultModel] = useState('gemini');
  const [modelOpen, setModelOpen] = useState(false);
  const activeModel = MODELS.find((m) => m.id === defaultModel)!;

  // Security toggles
  const [biometric, setBiometric] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  // Master data
  const [data, setData] = useState<MasterData>(DEFAULT_DATA);
  const [sheet, setSheet] = useState<SheetCfg | null>(null);

  const openSheet = (cfg: SheetCfg) => setSheet(cfg);
  const closeSheet = () => setSheet(null);

  return (
    <div style={{ padding: '8px 18px 32px', color: '#18110C' }}>
      {/* Privacy hero */}
      <div
        style={{
          marginTop: 4,
          padding: '18px 20px',
          borderRadius: 20,
          background: '#18110C',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: 'rgba(168,189,140,0.22)',
              border: '1px solid rgba(168,189,140,0.45)',
              color: '#A8BD8C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#FFFFFF' }}>🔒 本機加密盾</div>
            <div style={{ marginTop: 4, fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 1.55 }}>
              資產與記帳資料 <b style={{ color: '#A8BD8C' }}>100% 儲存於此裝置</b>，絕不上雲。
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            ['加密', 'AES-256'],
            ['雲端同步', '關閉'],
            ['遙測', '無'],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#A8BD8C',
                  marginTop: 1,
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Master data management */}
      <Section label="主檔管理">
        <ManageRow
          icon={<Tag size={18} />}
          color="#D97757"
          label="記帳分類"
          count={data.cat_exp.length + data.cat_inc.length + data.cat_xfer.length}
          sub="支出 / 收入 / 轉帳 分類"
          onClick={() => openSheet({ type: 'categories', title: '記帳分類', color: '#D97757' })}
        />
        <Divider />
        <ManageRow
          icon={<Wallet size={18} />}
          color="#A8BD8C"
          label="記帳帳戶"
          count={data.accounts.length}
          sub="銀行 / 信用卡 / 電子支付"
          onClick={() => openSheet({ type: 'accounts', title: '記帳帳戶', color: '#A8BD8C' })}
        />
        <Divider />
        <ManageRow
          icon={<ArrowUpRight size={18} />}
          color="#C5A07D"
          label="券商"
          count={data.brokers.length}
          sub="股票買賣使用"
          onClick={() => openSheet({ type: 'brokers', title: '券商', color: '#C5A07D' })}
        />
        <Divider />
        <ManageRow
          icon={<CreditCard size={18} />}
          color="#D4B87A"
          label="交割戶"
          count={data.settle.length}
          sub="股票買賣交割使用"
          onClick={() => openSheet({ type: 'settle', title: '交割戶', color: '#D4B87A' })}
        />
      </Section>

      {/* AI default model */}
      <Section label="AI 預設模型">
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setModelOpen(!modelOpen)}
            style={{ width: '100%', minHeight: 64, padding: '12px 16px', background: 'transparent', border: 'none', color: '#18110C', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                flexShrink: 0,
                background: `${activeModel.color}22`,
                border: `1px solid ${activeModel.color}50`,
                color: activeModel.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)' }}>對話與分析使用</div>
              <div style={{ marginTop: 1, fontSize: 16, fontWeight: 600 }}>{activeModel.name}</div>
            </div>
            <ChevronDown size={18} style={{ color: 'rgba(45,36,32,0.4)', transition: 'transform 200ms', transform: modelOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {modelOpen && (
            <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setDefaultModel(m.id);
                    setModelOpen(false);
                  }}
                  disabled={!m.has}
                  style={{
                    minHeight: 48,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: m.id === defaultModel ? '#D97757' : 'transparent',
                    border: m.id === defaultModel ? '1px solid #D97757' : '1px solid transparent',
                    color: m.id === defaultModel ? '#FFFFFF' : m.has ? '#18110C' : 'rgba(28,26,24,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: m.id === defaultModel ? 600 : 500,
                  }}
                >
                  <Sparkles size={14} />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  {m.has ? <Check size={14} strokeWidth={2.5} /> : <span style={{ fontSize: 14, color: '#D88770' }}>未設定 Key</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* AI Keys */}
      <Section label="AI 金鑰設定 (BYOK)">
        <KeyRow
          icon={<Sparkles size={18} />}
          iconColor="#D97757"
          label="Google Gemini"
          sub="長上下文 · 中文佳"
          value={geminiKey}
          onChange={setGeminiKey}
          show={showGemini}
          onToggle={() => setShowGemini(!showGemini)}
          status={geminiKey ? 'connected' : 'empty'}
        />
        <Divider />
        <KeyRow
          icon={<Sparkles size={18} />}
          iconColor="#A8BD8C"
          label="OpenAI GPT-4o"
          sub="通用最強 · 速度快"
          value={openaiKey}
          onChange={setOpenaiKey}
          show={showOpenai}
          onToggle={() => setShowOpenai(!showOpenai)}
          status={openaiKey ? 'connected' : 'empty'}
        />
        <Divider />
        <KeyRow
          icon={<Sparkles size={18} />}
          iconColor="#C5A07D"
          label="Anthropic Claude"
          sub="分析嚴謹 · 推理強"
          value={claudeKey}
          onChange={setClaudeKey}
          show={showClaude}
          onToggle={() => setShowClaude(!showClaude)}
          status={claudeKey ? 'connected' : 'empty'}
        />
      </Section>

      {/* 外部連動 — 暫時先不做（Android 簡訊監聽 / LINE 記帳小幫手 / 股價提醒），刻意隱藏 */}

      {/* Security */}
      <Section label="安全與備份">
        <ToggleRow icon={<Lock size={18} />} iconColor="#A8BD8C" label="生物辨識解鎖" sub="Face ID / 指紋開啟 App" value={biometric} onChange={setBiometric} />
        <Divider />
        <ToggleRow icon={<Shield size={18} />} iconColor="#D4B87A" label="本機自動備份" sub="每日凌晨 3:00 加密快照" value={autoBackup} onChange={setAutoBackup} />
        <Divider />
        <Row icon={<Key size={18} />} iconColor="#D88770" label="匯出加密備份檔" sub="可存至 iCloud / Google Drive" chevron />
      </Section>

      {/* About */}
      <Section label="關於">
        <Row icon={<Info size={18} />} iconColor="#E89878" label="版本" detail="0.9.2 · Beta" />
      </Section>

      <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'rgba(45,36,32,0.3)', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>
        FINFOLIO · LOCAL-FIRST · 2026
      </div>

      {/* Manage sheet */}
      <ManageSheet cfg={sheet} data={data} setData={setData} onClose={closeSheet} />
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, padding: '0 4px' }}>{label}</div>
      <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(28,26,24,0.12)' }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(28,26,24,0.12)', marginLeft: 64 }} />;
}

function Row({ icon, iconColor, label, sub, detail, chevron }: { icon: ReactNode; iconColor: string; label: string; sub?: string; detail?: string; chevron?: boolean }) {
  return (
    <button style={{ width: '100%', minHeight: 64, padding: '14px 16px', background: 'transparent', border: 'none', color: '#18110C', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: `${iconColor}22`,
          border: `1px solid ${iconColor}40`,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>{sub}</div>}
      </div>
      {detail && <span style={{ fontSize: 14, color: 'rgba(18,17,12,0.72)', marginRight: 4, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, whiteSpace: 'nowrap' }}>{detail}</span>}
      {chevron && <ChevronRight size={18} style={{ color: 'rgba(45,36,32,0.4)', flexShrink: 0 }} />}
    </button>
  );
}

function ManageRow({ icon, color, label, sub, count, onClick }: { icon: ReactNode; color: string; label: string; sub: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 68, padding: '14px 16px', background: 'transparent', border: 'none', color: '#18110C', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          flexShrink: 0,
          background: `${color}22`,
          border: `1px solid ${color}44`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: `${color}1a`, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
      <ChevronRight size={18} style={{ color: 'rgba(45,36,32,0.4)', flexShrink: 0 }} />
    </button>
  );
}

function ToggleRow({ icon, iconColor, label, sub, value, onChange }: { icon: ReactNode; iconColor: string; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ width: '100%', minHeight: 64, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, color: '#18110C' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: `${iconColor}22`,
          border: `1px solid ${iconColor}40`,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 52,
          height: 32,
          borderRadius: 14,
          flexShrink: 0,
          background: value ? '#A8BD8C' : 'rgba(45,36,32,0.12)',
          border: 'none',
          position: 'relative',
          transition: 'all 200ms',
          padding: 0,
        }}
      >
        <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 28, height: 28, borderRadius: 14, background: '#fff', transition: 'left 200ms', boxShadow: '0 2px 6px rgba(0,0,0,0.07)' }} />
      </button>
    </div>
  );
}

function KeyRow({
  icon,
  iconColor,
  label,
  sub,
  value,
  onChange,
  show,
  onToggle,
  status,
}: {
  icon: ReactNode;
  iconColor: string;
  label: string;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  status: 'connected' | 'empty';
}) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            flexShrink: 0,
            background: `${iconColor}22`,
            border: `1px solid ${iconColor}40`,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#18110C' }}>{label}</div>
          <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>{sub}</div>
        </div>
        {status === 'connected' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8, fontSize: 14, background: 'rgba(168,189,140,0.15)', color: '#A8BD8C', fontWeight: 600 }}>
            <Check size={11} strokeWidth={2.5} /> 已啟用
          </span>
        )}
        {status === 'empty' && (
          <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 14, background: 'rgba(216,135,112,0.12)', color: '#D88770', fontWeight: 600 }}>未設定</span>
        )}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, paddingLeft: 50 }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="貼上 API Key…"
          style={{
            flex: 1,
            minWidth: 0,
            height: 44,
            padding: '0 12px',
            borderRadius: 8,
            background: 'rgba(45,36,32,0.05)',
            border: '1px solid rgba(28,26,24,0.14)',
            color: '#18110C',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.5,
          }}
        />
        <button
          onClick={onToggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            flexShrink: 0,
            background: 'rgba(28,26,24,0.12)',
            border: '1px solid rgba(28,26,24,0.14)',
            color: 'rgba(45,36,32,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

/* ===================== Manage Sheet (bottom sheet) ===================== */
function ManageSheet({ cfg, data, setData, onClose }: { cfg: SheetCfg | null; data: MasterData; setData: React.Dispatch<React.SetStateAction<MasterData>>; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (cfg) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [cfg]);

  if (!cfg) return null;

  const onItemsChange = (newItems: string[] | AccountItem[] | KVItem[], sub?: CatKey) => {
    if (cfg.type === 'categories' && sub) {
      setData((d) => ({ ...d, [sub]: newItems as string[] }));
    } else if (cfg.type === 'accounts') {
      setData((d) => ({ ...d, accounts: newItems as AccountItem[] }));
    } else if (cfg.type === 'brokers') {
      setData((d) => ({ ...d, brokers: newItems as KVItem[] }));
    } else if (cfg.type === 'settle') {
      setData((d) => ({ ...d, settle: newItems as KVItem[] }));
    }
  };

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 65, background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)', transition: 'background 220ms ease-out', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '90%',
          background: '#F7F2EC',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
          boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#18110C' }}>管理 · {cfg.title}</div>
            <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 2 }}>新增、編輯或刪除項目</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 14, background: 'rgba(28,26,24,0.14)', border: 'none', color: 'rgba(45,36,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 18px 28px' }}>
          {cfg.type === 'categories' && <CategoriesManager data={data} onChange={onItemsChange} color={cfg.color} />}
          {cfg.type === 'accounts' && <AccountsManager data={data.accounts} onChange={(items) => onItemsChange(items)} color={cfg.color} />}
          {cfg.type === 'brokers' && (
            <KeyValueManager items={data.brokers} onChange={(items) => onItemsChange(items)} color={cfg.color} placeholders={['券商名稱', '證券帳號或備註']} />
          )}
          {cfg.type === 'settle' && (
            <KeyValueManager items={data.settle} onChange={(items) => onItemsChange(items)} color={cfg.color} placeholders={['交割戶名稱', '備註']} />
          )}
        </div>
      </div>
    </div>
  );
}

function CategoriesManager({ data, onChange, color }: { data: MasterData; onChange: (items: string[], sub: CatKey) => void; color: string }) {
  const [tab, setTab] = useState<CatKey>('cat_exp');
  const tabs: { id: CatKey; label: string; c: string }[] = [
    { id: 'cat_exp', label: '支出', c: '#D88770' },
    { id: 'cat_inc', label: '收入', c: '#A8BD8C' },
    { id: 'cat_xfer', label: '轉帳', c: '#C5A07D' },
  ];
  return (
    <>
      <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: '#EDE8E3', border: '1px solid rgba(28,26,24,0.12)', marginBottom: 14 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              background: tab === t.id ? t.c : 'transparent',
              border: tab === t.id ? `1px solid ${t.c}` : '1px solid transparent',
              color: tab === t.id ? '#FFFFFF' : 'rgba(28,26,24,0.6)',
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <StringListManager items={data[tab]} onChange={(items) => onChange(items, tab)} color={color} placeholder="新增分類…" />
    </>
  );
}

function StringListManager({ items, onChange, color, placeholder }: { items: string[]; onChange: (items: string[]) => void; color: string; placeholder: string }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newVal, setNewVal] = useState('');
  const [sortMode, setSortMode] = useState(false);

  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditVal(items[i]);
  };
  const saveEdit = () => {
    if (editVal.trim() && editingIdx !== null) {
      const next = items.slice();
      next[editingIdx] = editVal.trim();
      onChange(next);
    }
    setEditingIdx(null);
  };
  const remove = (i: number) => {
    onChange(items.filter((_, j) => j !== i));
  };
  const add = () => {
    if (newVal.trim()) {
      onChange([...items, newVal.trim()]);
      setNewVal('');
    }
  };

  return (
    <div>
      {/* Sort toggle header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={() => {
            setSortMode((s) => !s);
            setEditingIdx(null);
          }}
          style={{
            height: 34,
            padding: '0 12px',
            borderRadius: 8,
            background: sortMode ? `${color}22` : 'rgba(28,26,24,0.12)',
            border: sortMode ? `1px solid ${color}55` : '1px solid rgba(28,26,24,0.14)',
            color: sortMode ? color : 'rgba(45,36,32,0.6)',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
          {sortMode ? '完成排序' : '排序'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
            {sortMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  style={{
                    width: 30,
                    height: 18,
                    borderRadius: 8,
                    background: i === 0 ? 'rgba(45,36,32,0.04)' : `${color}1a`,
                    border: `1px solid ${i === 0 ? 'rgba(28,26,24,0.12)' : color + '40'}`,
                    color: i === 0 ? 'rgba(28,26,24,0.38)' : color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  style={{
                    width: 30,
                    height: 18,
                    borderRadius: 8,
                    background: i === items.length - 1 ? 'rgba(45,36,32,0.04)' : `${color}1a`,
                    border: `1px solid ${i === items.length - 1 ? 'rgba(28,26,24,0.12)' : color + '40'}`,
                    color: i === items.length - 1 ? 'rgba(28,26,24,0.38)' : color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            ) : (
              <div
                style={{ width: 30, height: 30, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}40`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Tag size={14} />
              </div>
            )}
            {editingIdx === i ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') setEditingIdx(null);
                }}
                style={{ flex: 1, minWidth: 0, height: 36, padding: '0 10px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: '#18110C', fontSize: 15, outline: 'none' }}
              />
            ) : (
              <button
                onClick={() => !sortMode && startEdit(i)}
                style={{ flex: 1, minWidth: 0, height: 36, background: 'transparent', border: 'none', color: '#18110C', fontSize: 15, textAlign: 'left', padding: 0, cursor: sortMode ? 'default' : 'pointer' }}
              >
                {it}
              </button>
            )}
            {sortMode ? null : editingIdx === i ? (
              <>
                <button
                  onClick={saveEdit}
                  style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}55`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setEditingIdx(null)}
                  style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)', color: 'rgba(45,36,32,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => remove(i)}
                style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: '#D88770', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: sortMode ? 'none' : 'flex', gap: 8, padding: 4, borderRadius: 14, background: '#FFFFFF', border: `1px dashed ${color}44` }}>
        <input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder={placeholder}
          style={{ flex: 1, height: 44, padding: '0 14px', background: 'transparent', border: 'none', outline: 'none', color: '#18110C', fontSize: 15 }}
        />
        <button
          onClick={add}
          disabled={!newVal.trim()}
          style={{
            height: 44,
            padding: '0 16px',
            borderRadius: 8,
            flexShrink: 0,
            background: newVal.trim() ? `linear-gradient(135deg, ${color}, ${color}bb)` : 'rgba(28,26,24,0.12)',
            border: 'none',
            color: newVal.trim() ? '#1a1a1a' : 'rgba(45,36,32,0.4)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> 新增
        </button>
      </div>
    </div>
  );
}

function AccountsManager({ data, onChange, color }: { data: AccountItem[]; onChange: (items: AccountItem[]) => void; color: string }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [edit, setEdit] = useState<AccountItem>({ name: '', kind: '' });
  const [adding, setAdding] = useState(false);
  const [addV, setAddV] = useState<AccountItem>({ name: '', kind: '銀行' });

  const KINDS = ['銀行', '信用卡', '現金', '電子支付', '儲值卡', '券商', '其他'];

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEdit({ ...data[i] });
  };
  const saveEdit = () => {
    if (edit.name.trim() && editingIdx !== null) {
      const next = data.slice();
      next[editingIdx] = { ...edit, name: edit.name.trim() };
      onChange(next);
    }
    setEditingIdx(null);
  };
  const remove = (i: number) => onChange(data.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...data, { ...addV, name: addV.name.trim() }]);
      setAddV({ name: '', kind: '銀行' });
      setAdding(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {data.map((it, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}40`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={14} />
              </div>
              {editingIdx === i ? (
                <input
                  autoFocus
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  style={{ flex: 1, minWidth: 0, height: 36, padding: '0 10px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: '#18110C', fontSize: 15, outline: 'none' }}
                />
              ) : (
                <button
                  onClick={() => startEdit(i)}
                  style={{ flex: 1, minWidth: 0, height: 36, background: 'transparent', border: 'none', color: '#18110C', fontSize: 15, textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span>{it.name}</span>
                  <span style={{ fontSize: 14, padding: '2px 6px', borderRadius: 5, background: 'rgba(28,26,24,0.12)', color: 'rgba(18,17,12,0.72)' }}>{it.kind}</span>
                </button>
              )}
              {editingIdx === i ? (
                <>
                  <button
                    onClick={saveEdit}
                    style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}55`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setEditingIdx(null)}
                    style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.14)', color: 'rgba(45,36,32,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => remove(i)}
                  style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: '#D88770', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {editingIdx === i && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 40 }}>
                {KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setEdit({ ...edit, kind: k })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      background: edit.kind === k ? `${color}28` : 'rgba(28,26,24,0.12)',
                      border: edit.kind === k ? `1px solid ${color}55` : '1px solid rgba(28,26,24,0.14)',
                      color: edit.kind === k ? color : 'rgba(45,36,32,0.6)',
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ padding: 10, borderRadius: 14, background: '#FFFFFF', border: `1px dashed ${color}44` }}>
          <input
            autoFocus
            value={addV.name}
            onChange={(e) => setAddV({ ...addV, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNew();
            }}
            placeholder="新帳戶名稱"
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: '#18110C', fontSize: 15, outline: 'none' }}
          />
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setAddV({ ...addV, kind: k })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  background: addV.kind === k ? `${color}28` : 'rgba(28,26,24,0.12)',
                  border: addV.kind === k ? `1px solid ${color}55` : '1px solid rgba(28,26,24,0.14)',
                  color: addV.kind === k ? color : 'rgba(45,36,32,0.6)',
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setAdding(false);
                setAddV({ name: '', kind: '銀行' });
              }}
              style={{ flex: 1, height: 44, borderRadius: 8, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.16)', color: 'rgba(45,36,32,0.7)', fontSize: 14 }}
            >
              取消
            </button>
            <button
              onClick={addNew}
              disabled={!addV.name.trim()}
              style={{
                flex: 2,
                height: 44,
                borderRadius: 8,
                background: addV.name.trim() ? `linear-gradient(135deg, ${color}, ${color}bb)` : 'rgba(28,26,24,0.12)',
                border: 'none',
                color: addV.name.trim() ? '#1a1a1a' : 'rgba(45,36,32,0.4)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              新增帳戶
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ width: '100%', height: 48, borderRadius: 14, background: 'transparent', border: `1px dashed ${color}55`, color, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> 新增帳戶
        </button>
      )}
    </>
  );
}

function KeyValueManager({ items, onChange, color, placeholders }: { items: KVItem[]; onChange: (items: KVItem[]) => void; color: string; placeholders: [string, string] }) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [edit, setEdit] = useState<KVItem>({ name: '', sub: '' });
  const [adding, setAdding] = useState(false);
  const [addV, setAddV] = useState<KVItem>({ name: '', sub: '' });

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEdit({ ...items[i] });
  };
  const saveEdit = () => {
    if (edit.name && edit.name.trim() && editingIdx !== null) {
      const next = items.slice();
      next[editingIdx] = { ...edit, name: edit.name.trim() };
      onChange(next);
    }
    setEditingIdx(null);
  };
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const addNew = () => {
    if (addV.name.trim()) {
      onChange([...items, { ...addV, name: addV.name.trim() }]);
      setAddV({ name: '', sub: '' });
      setAdding(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 14, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
            {editingIdx === i ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  value={edit.name || ''}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder={placeholders[0]}
                  style={{ height: 40, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: '#18110C', fontSize: 15, fontWeight: 500, outline: 'none' }}
                />
                <input
                  value={edit.sub || ''}
                  onChange={(e) => setEdit({ ...edit, sub: e.target.value })}
                  placeholder={placeholders[1]}
                  style={{ height: 36, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(28,26,24,0.16)', color: '#18110C', fontSize: 14, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditingIdx(null)}
                    style={{ flex: 1, height: 40, borderRadius: 8, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.16)', color: 'rgba(45,36,32,0.7)', fontSize: 14 }}
                  >
                    取消
                  </button>
                  <button
                    onClick={saveEdit}
                    style={{ flex: 2, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${color}, ${color}bb)`, border: 'none', color: '#1a1a1a', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <Check size={14} strokeWidth={2.5} /> 儲存
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}40`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUpRight size={14} />
                </div>
                <button onClick={() => startEdit(i)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: '#18110C', textAlign: 'left', padding: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{it.name}</div>
                  {it.sub && <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 1 }}>{it.sub}</div>}
                </button>
                <button
                  onClick={() => remove(i)}
                  style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: 'rgba(216,135,112,0.10)', border: '1px solid rgba(216,135,112,0.25)', color: '#D88770', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ padding: 10, borderRadius: 14, background: '#FFFFFF', border: `1px dashed ${color}44`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            value={addV.name}
            onChange={(e) => setAddV({ ...addV, name: e.target.value })}
            placeholder={placeholders[0]}
            style={{ height: 44, padding: '0 14px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: `1px solid ${color}55`, color: '#18110C', fontSize: 15, outline: 'none' }}
          />
          <input
            value={addV.sub}
            onChange={(e) => setAddV({ ...addV, sub: e.target.value })}
            placeholder={placeholders[1]}
            style={{ height: 40, padding: '0 14px', borderRadius: 8, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(28,26,24,0.16)', color: '#18110C', fontSize: 14, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setAdding(false);
                setAddV({ name: '', sub: '' });
              }}
              style={{ flex: 1, height: 44, borderRadius: 8, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.16)', color: 'rgba(45,36,32,0.7)', fontSize: 14 }}
            >
              取消
            </button>
            <button
              onClick={addNew}
              disabled={!addV.name.trim()}
              style={{
                flex: 2,
                height: 44,
                borderRadius: 8,
                background: addV.name.trim() ? `linear-gradient(135deg, ${color}, ${color}bb)` : 'rgba(28,26,24,0.12)',
                border: 'none',
                color: addV.name.trim() ? '#1a1a1a' : 'rgba(45,36,32,0.4)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              新增
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ width: '100%', height: 48, borderRadius: 14, background: 'transparent', border: `1px dashed ${color}55`, color, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> 新增
        </button>
      )}
    </>
  );
}
