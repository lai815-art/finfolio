import { useEffect, useRef, useState } from 'react';
import { ChartPie, ChevronRight, ChevronDown, Check, TrendUp, Pencil, Wallet } from '../icons';
import { IconByName } from '../icons';
import PieDonut from '../components/PieDonut';
import { computePortfolio, ASSET_GROUPS, INVEST_HOLDINGS, type AssetGroup, type AccountEntry, type ClassKey } from '../data/portfolio';
import type { SavedFlow, SavedTrade, PieSlice } from '../data/types';

function fmtAcct(n: number) {
  return Math.round(n).toLocaleString();
}

export interface AccountDetailData {
  item: AccountEntry;
  group: AssetGroup;
}
type AcctOverrides = Record<string, Partial<AccountEntry>>;

/* ─── Hero Carousel ─── */
function HeroCarousel({ netWorth, pieLight, investPie, mask }: { netWorth: number; pieLight: PieSlice[]; investPie: PieSlice[]; mask: (n: number) => string }) {
  const [idx, setIdx] = useState(0);
  const touch = useRef({ x: 0, active: false });
  const slides = ['networth', 'invest', 'annual'];
  const go = (n: number) => setIdx(Math.max(0, Math.min(slides.length - 1, n)));
  const onStart = (e: React.TouchEvent | React.MouseEvent) => {
    const p = 'touches' in e ? e.touches[0] : e;
    touch.current = { x: p.clientX, active: true };
  };
  const onEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touch.current.active) return;
    const p = 'changedTouches' in e ? e.changedTouches[0] : e;
    const dx = p.clientX - touch.current.x;
    touch.current.active = false;
    if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
  };
  const annual = [
    { m: '1月', inc: 78, exp: 52 },
    { m: '2月', inc: 82, exp: 60 },
    { m: '3月', inc: 80, exp: 48 },
    { m: '4月', inc: 95, exp: 55 },
    { m: '5月', inc: 88, exp: 50 },
    { m: '6月', inc: 92, exp: 64 },
  ];
  const maxV = Math.max(...annual.map((d) => Math.max(d.inc, d.exp)), 1);

  return (
    <div onTouchStart={onStart} onTouchEnd={onEnd} onMouseDown={onStart} onMouseUp={onEnd} style={{ touchAction: 'pan-y', userSelect: 'none' }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '18px 20px', borderRadius: 28, minHeight: 210, background: 'linear-gradient(145deg, #E8916B 0%, #C2562F 100%)', boxShadow: '0 12px 28px rgba(194,90,51,0.35)' }}>
        <div style={{ position: 'absolute', top: -45, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

        {slides[idx] === 'networth' && (
          <>
            <div style={{ position: 'relative', fontSize: 14, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>淨資產</div>
            <div style={{ position: 'relative', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: '#FFFFFF' }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', marginRight: 4 }}>NT$</span>
              {mask(netWorth)}
            </div>
            <div style={{ position: 'relative', marginTop: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PieDonut data={pieLight} size={120} thickness={17} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)' }}>配置</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF' }}>4 類</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pieLight.map((p) => (
                  <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'rgba(255,255,255,0.90)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 26, background: p.color }} />
                      {p.label}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{p.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {slides[idx] === 'invest' && (
          <>
            <div style={{ position: 'relative', fontSize: 14, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>股債配置比例</div>
            <div style={{ position: 'relative', marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PieDonut data={investPie} size={116} thickness={16} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)' }}>投資</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF' }}>{investPie.length} 檔</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {investPie.slice(0, 6).map((p) => (
                  <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(255,255,255,0.90)', minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 26, background: p.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>{p.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {slides[idx] === 'annual' && (
          <>
            <div style={{ position: 'relative', fontSize: 14, color: 'rgba(255,255,255,0.82)', letterSpacing: 1, textTransform: 'uppercase' }}>年度收支</div>
            <div style={{ position: 'relative', marginTop: 16, display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
              {annual.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 88 }}>
                    <div style={{ width: 9, height: `${(d.inc / maxV) * 100}%`, background: '#FFFFFF', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 9, height: `${(d.exp / maxV) * 100}%`, background: 'rgba(255,255,255,0.40)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'JetBrains Mono, monospace' }}>{d.m}</div>
                </div>
              ))}
            </div>
            <div style={{ position: 'relative', marginTop: 10, display: 'flex', gap: 14, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FFFFFF' }} />
                收入
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.40)' }} />
                支出
              </span>
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 12 }}>
        {slides.map((s, i) => (
          <button key={s} onClick={() => go(i)} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 8, padding: 0, border: 'none', background: i === idx ? '#C2562F' : 'rgba(28,26,24,0.18)', transition: 'all 200ms', cursor: 'pointer' }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Account Detail Sheet ─── */
export function AccountDetailSheet({ data, mask, onClose, savedFlows = [], savedTrades = [] }: { data: AccountDetailData | null; mask: (n: number) => string; onClose: () => void; onSaveItem?: (groupId: string, orig: AccountEntry, patch: Partial<AccountEntry>) => void; savedFlows?: SavedFlow[]; savedTrades?: SavedTrade[] }) {
  const [shown, setShown] = useState(false);
  const [txnEdits, setTxnEdits] = useState<Record<number, { desc: string; amount: number }>>({});
  const [activeTxn, setActiveTxn] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmt, setEditAmt] = useState('');

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => setShown(true), 20);
      setTxnEdits({});
      setActiveTxn(null);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [data]);

  if (!data) return null;
  const { item, group } = data;
  const isCredit = group.id === 'credit';
  const isBrokerage = group.id === 'brokerage';
  const isCash = group.id === 'cash';
  const color = group.color;

  const fmtDate = (d: Date) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
  };

  const brokerKeywords: Record<string, string[]> = {
    凱基證券: ['凱基', '主要券商'],
    元大證券: ['元大', '副券商'],
    永豐證券: ['永豐'],
    Firstrade: ['Firstrade', '複委託'],
  };
  const brokerMatch = (tradeBroker: string) => {
    const kws = brokerKeywords[item.name] || [item.name];
    return kws.some((k) => tradeBroker && tradeBroker.includes(k));
  };

  const ACCT_MAP: Record<string, string[]> = {
    台新銀行: ['主要存款帳戶', '台新'],
    中華郵政: ['郵局帳戶', '郵政'],
    樂天銀行: ['數位帳戶', '樂天'],
    '凱基證 交割戶': ['券商交割戶', '凱基'],
    '元大證 交割戶': ['元大交割', '元大'],
    'Firstrade 交割': ['複委託交割戶', 'Firstrade'],
    國泰世華鈦金卡: ['信用卡 A'],
    '玉山 Pi 拍錢包': ['信用卡 B'],
    ' 台新 Richart 卡': ['電子卡'],
    悠遊卡: ['悠遊卡'],
    一卡通: ['一卡通'],
    'LINE Pay Money': ['LINE Pay'],
    悠遊付: ['悠遊付'],
    'iPass Money': ['街口支付', 'iPass'],
    皮夾現金: ['現金', '現金 (錢包)'],
  };
  const acctKeys = [item.name, ...(ACCT_MAP[item.name] || [])];
  const matchAcct = (a?: string) => acctKeys.some((k) => a && (a === k || a.includes(k)));

  const realFlows = savedFlows
    .filter((f) => matchAcct(f.account) || matchAcct(f.fromAccount) || matchAcct(f.toAccount))
    .map((f) => ({ date: fmtDate(f.date), desc: f.merchant || f.cat, amount: f.kind === 'inc' ? f.amount : f.kind === 'xfer' ? 0 : -f.amount }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const realTrades = isBrokerage
    ? savedTrades
        .filter((t) => brokerMatch(t.broker))
        .map((t) => ({ date: fmtDate(t.date), desc: `${t.side === 'buy' ? '買進' : '賣出'} ${t.code} ${t.name} ${t.shares}股`, amount: t.side === 'buy' ? -(t.shares * t.price) : t.shares * t.price }))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const allReal = [...realFlows, ...realTrades];
  const hasReal = allReal.length > 0;

  const openEdit = (i: number, desc: string, amt: number) => {
    setActiveTxn(i);
    setEditDesc(desc);
    setEditAmt(String(Math.abs(amt)));
  };
  const saveEdit = (i: number, origAmt: number) => {
    const sign = origAmt >= 0 ? 1 : -1;
    const newAmt = (parseFloat(editAmt) || Math.abs(origAmt)) * sign;
    setTxnEdits((prev) => ({ ...prev, [i]: { desc: editDesc.trim(), amount: newAmt } }));
    setActiveTxn(null);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 65, background: '#F7F2EC', transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 54, flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 12px' }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 14, flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)', color: '#18110C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#18110C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          {item.sub && <div style={{ fontSize: 13, color: 'rgba(28,26,24,0.48)', marginTop: 1 }}>{item.sub}</div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 18px 28px' }}>
        <div style={{ padding: '14px 18px', borderRadius: 22, marginBottom: 14, background: `linear-gradient(145deg, ${color}ee 0%, ${color}99 100%)`, boxShadow: `0 8px 20px ${color}44`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -35, right: -25, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', letterSpacing: 1, textTransform: 'uppercase' }}>{isCredit ? '本期帳款' : '目前餘額'}</div>
            <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.5 }}>
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.80)', marginRight: 4 }}>NT$</span>
              {mask(item.amount)}
            </div>
            {isCredit && item.extra && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
                  <span>使用 {item.extra.used}%</span>
                  <span>可用 NT$ {mask((item.extra.limit || 0) - item.amount)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 8, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 8, width: `${item.extra.used}%`, background: 'rgba(255,255,255,0.92)' }} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  {[['信用額度', mask(item.extra.limit || 0)], ['已使用', mask(item.amount)]].map(([label, value]) => (
                    <div key={label} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isBrokerage && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)', fontSize: 14, color: 'rgba(255,255,255,0.88)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendUp size={14} /> 詳細持倉請前往「投資組合」頁面
              </div>
            )}
          </div>
        </div>

        {hasReal && (
          <>
            <div style={{ fontSize: 12, color: 'rgba(28,26,24,0.48)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              已記帳交易 · {allReal.length} 筆
              <span style={{ fontSize: 11, color: 'rgba(28,26,24,0.35)', textTransform: 'none', letterSpacing: 0 }}>點選可編輯</span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
              {allReal.map((r, origIdx) => {
                const override = txnEdits[origIdx];
                const displayDesc = override?.desc !== undefined ? override.desc : r.desc;
                const displayAmt = override?.amount !== undefined ? override.amount : r.amount;
                const isInc = displayAmt > 0;
                const isZero = displayAmt === 0;
                const isActive = activeTxn === origIdx;
                return (
                  <div key={origIdx} style={{ borderBottom: origIdx < allReal.length - 1 ? '1px solid rgba(28,26,24,0.09)' : 'none' }}>
                    <div onClick={() => !isActive && openEdit(origIdx, displayDesc, displayAmt)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', background: isActive ? 'rgba(217,119,87,0.06)' : 'transparent' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(45,36,32,0.40)', flexShrink: 0, width: 42 }}>{r.date}</div>
                      <div style={{ flex: 1, fontSize: 15, color: '#18110C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</div>
                      {!isZero && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap', color: isInc ? '#3E8E5A' : '#D88770' }}>
                          {isInc ? '+' : '-'}
                          {mask(Math.abs(displayAmt))}
                        </div>
                      )}
                      <Pencil size={13} style={{ color: 'rgba(45,36,32,0.22)', flexShrink: 0 }} />
                    </div>
                    {isActive && (
                      <div style={{ padding: '10px 16px 14px', background: 'rgba(217,119,87,0.05)', borderTop: '1px solid rgba(217,119,87,0.15)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'rgba(45,36,32,0.50)', marginBottom: 4 }}>摘要</div>
                            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 10, background: '#FFFFFF', border: '1px solid rgba(217,119,87,0.35)', fontSize: 15, color: '#18110C', outline: 'none' }} />
                          </div>
                          {!isZero && (
                            <div style={{ width: 110 }}>
                              <div style={{ fontSize: 12, color: 'rgba(45,36,32,0.50)', marginBottom: 4 }}>金額</div>
                              <input value={editAmt} onChange={(e) => setEditAmt(e.target.value)} inputMode="decimal" style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 10, background: '#FFFFFF', border: '1px solid rgba(217,119,87,0.35)', fontSize: 15, color: '#18110C', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setActiveTxn(null)} style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(28,26,24,0.10)', border: '1px solid rgba(28,26,24,0.12)', color: 'rgba(45,36,32,0.65)', fontSize: 14 }}>取消</button>
                          <button onClick={() => saveEdit(origIdx, displayAmt)} style={{ flex: 2, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #E89878, #D97757)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <Check size={14} strokeWidth={2.5} /> 儲存
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isCash && (
          <div style={{ marginTop: 8, padding: '12px 16px', borderRadius: 16, background: 'rgba(168,189,140,0.08)', border: '1px solid rgba(168,189,140,0.20)', fontSize: 14, color: 'rgba(45,36,32,0.58)', lineHeight: 1.6 }}>
            現金資產不記錄電子交易，如需調整餘額請至「記帳」手動新增一筆。
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Asset Group Row ─── */
function AssetGroupRow({ group, openId, setOpenId, mask, onOpenDetail }: { group: AssetGroup; openId: string | null; setOpenId: (id: string | null) => void; mask: (n: number) => string; onOpenDetail: (d: AccountDetailData) => void }) {
  const open = openId === group.id;
  const sum = group.items.reduce((a, x) => a + x.amount, 0);
  const Icon = IconByName[group.icon] || Wallet;

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden' }}>
      <button onClick={() => setOpenId(open ? null : group.id)} style={{ width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', color: '#18110C', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', minHeight: 70 }}>
        <div style={{ width: 42, height: 42, borderRadius: 16, flexShrink: 0, background: `${group.color}1f`, border: `1px solid ${group.color}44`, color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{group.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(28,26,24,0.48)', marginTop: 2 }}>{group.items.length} 個帳戶</div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 4 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: group.sign < 0 ? '#D88770' : '#18110C' }}>
            {group.sign < 0 ? '-' : ''}
            {mask(sum)}
          </div>
        </div>
        <ChevronDown size={18} style={{ color: 'rgba(45,36,32,0.35)', flexShrink: 0, transition: 'transform 250ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ background: 'rgba(45,36,32,0.04)', borderRadius: 14, border: '1px solid rgba(28,26,24,0.10)', overflow: 'hidden' }}>
            {group.items.map((item, i) => (
              <AccountItemRow key={i} item={item} group={group} mask={mask} last={i === group.items.length - 1} onOpen={() => onOpenDetail({ item, group })} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountItemRow({ item, group, mask, last, onOpen }: { item: AccountEntry; group: AssetGroup; mask: (n: number) => string; last: boolean; onOpen: () => void }) {
  const isCredit = group.id === 'credit';
  return (
    <div onClick={onOpen} style={{ cursor: 'pointer', padding: '12px 14px', borderBottom: last ? 'none' : '1px solid rgba(28,26,24,0.09)', minHeight: 56, transition: 'background 120ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${group.color}18`, border: `1px solid ${group.color}30`, color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700 }}>{item.name.slice(0, 1)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#18110C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          {item.sub && <div style={{ fontSize: 12, color: 'rgba(28,26,24,0.45)', marginTop: 1 }}>{item.sub}</div>}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, flexShrink: 0, color: group.sign < 0 ? '#D88770' : '#18110C' }}>
          {group.sign < 0 ? '-' : ''}
          {mask(item.amount)}
        </div>
        <ChevronRight size={14} style={{ color: 'rgba(45,36,32,0.25)', flexShrink: 0 }} />
      </div>
      {isCredit && item.extra && (
        <div style={{ marginTop: 7, marginLeft: 46 }}>
          <div style={{ height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.10)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 8, width: `${item.extra.used}%`, background: (item.extra.used || 0) > 70 ? '#D88770' : '#D4B87A' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsScreen({ hideAmounts, onOpenDetail, acctOverrides }: { hideAmounts: boolean; onOpenDetail: (d: AccountDetailData) => void; acctOverrides?: AcctOverrides }) {
  const mask = (n: number) => (hideAmounts ? '••••••' : fmtAcct(n));
  const [openId, setOpenId] = useState<string | null>('bank');
  const overrides = acctOverrides || {};

  const { pie } = computePortfolio();
  const LIGHT_TINTS: Record<string, string> = { cash: '#FFFFFF', stock: '#FFE3C2', bond: '#FFE0A3', other: '#FFD0B5' };
  const pieLight: PieSlice[] = pie.map((p) => ({ ...p, color: LIGHT_TINTS[p.key as ClassKey] || '#FFFFFF' }));

  const INVEST_TINTS = ['#FFFFFF', '#FFE3C2', '#FFD0B5', '#FFE0A3', '#FFC9A8', '#FFEED0', '#FFD9B0'];
  const allInvest = INVEST_HOLDINGS.flatMap((g) => g.items);
  const investTotal = allInvest.reduce((a, x) => a + x.qty * x.price, 0);
  const investPie: PieSlice[] =
    allInvest.length === 0
      ? [{ key: 'empty', label: '尚無持倉', color: '#E0DAD3', pct: 100 }]
      : allInvest.map((it, i) => ({ key: it.code, label: `${it.code} ${it.name}`, color: INVEST_TINTS[i % INVEST_TINTS.length], pct: investTotal > 0 ? ((it.qty * it.price) / investTotal) * 100 : 0 }));

  const assetGroups: AssetGroup[] = ASSET_GROUPS.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      const key = `${g.id}::${item.name}`;
      return overrides[key] ? { ...item, ...overrides[key] } : item;
    }),
  }));

  const agNetWorth = assetGroups.reduce((a, g) => {
    const sum = g.items.reduce((b, it) => b + it.amount, 0);
    return a + (g.sign < 0 ? -sum : sum);
  }, 0);

  const stockPct = pie.find((p) => p.key === 'stock')?.pct || 0;
  const bondPct = pie.find((p) => p.key === 'bond')?.pct || 0;
  const hasData = agNetWorth > 0;

  return (
    <div style={{ padding: '8px 18px 32px', color: '#18110C' }}>
      <HeroCarousel netWorth={agNetWorth} pieLight={pieLight} investPie={investPie} mask={mask} />

      {hasData && (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 18, background: 'rgba(217,119,87,0.07)', border: '1px solid rgba(217,119,87,0.22)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <ChartPie size={16} style={{ color: '#E89878', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 15, color: '#18110C', lineHeight: 1.55 }}>
            股票配置目前佔 <b style={{ color: '#D97757' }}>{stockPct.toFixed(0)}%</b>，債券僅 <b style={{ color: '#BFA176' }}>{bondPct.toFixed(1)}%</b>，建議增加<b>投資等級債券 ETF</b> 提升防禦力。
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {assetGroups.map((g) => (
          <AssetGroupRow key={g.id} group={g} openId={openId} setOpenId={setOpenId} mask={mask} onOpenDetail={onOpenDetail} />
        ))}
      </div>
    </div>
  );
}
