// Asset Accounts / 資產帳戶（依帳戶種類 + 明細編輯）
const { useState: useStateAcct, useRef: useRefAcct } = React;

function PieDonutA({ data, size = 168, thickness = 22 }) {
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
        return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={d.color} strokeWidth={thickness}
        strokeDasharray={`${len} ${C}`} strokeDashoffset={-off} />;
      })}
    </svg>);

}

function fmtAcct(n) {return Math.round(n).toLocaleString();}

/* ─── 月收支折線 + 柱狀圖 Hero（統計加總換算台幣） ───────────────────── */
function MonthlyFlowHero({ savedFlows = [], masterData = {} }) {
  const md = masterData || {};
  const curMap = window.buildCurMap(md);
  const toTWD = (f) => window.fxToTWD(f.amount, curMap[f.account]);

  // 收入分類：主動 / 被動 / 投資收入（獨立一條線）
  const incCats = (md.cat_inc || []).map((c) => typeof c === 'string' ? { name: c, group: '主動' } : c);
  const investSet = new Set(['投資收入']);
  const passiveSet = new Set(incCats.filter((c) => c.group === '被動' && !investSet.has(c.name)).map((c) => c.name));

  const now = window.TODAY_DATE || new Date();
  const [yearOffset, setYearOffset] = useStateAcct(0);
  const curYear = now.getFullYear() + yearOffset;
  const canNextYear = yearOffset < 0;
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(curYear, i, 1);
    return { key: d.getFullYear() + '-' + d.getMonth(), label: i + 1 + '月', exp: 0, act: 0, pas: 0, inv: 0 };
  });
  (savedFlows || []).forEach((f) => {
    const d = f.date instanceof Date ? f.date : new Date(f.date);
    const m = months.find((x) => x.key === d.getFullYear() + '-' + d.getMonth());
    if (!m) return;
    const amt = toTWD(f);
    if (f.kind === 'exp') {m.exp += amt;} else
    if (f.kind === 'inc') {
      if (investSet.has(f.cat)) {m.inv += amt;} else
      if (passiveSet.has(f.cat)) {m.pas += amt;} else
      {m.act += amt;}
    }
  });

  const lines = [
  { key: 'exp', label: '支出', color: TOKENS.red, vals: months.map((m) => m.exp) },
  { key: 'act', label: '主動收入', color: TOKENS.blue2, vals: months.map((m) => m.act) },
  { key: 'pas', label: '被動收入', color: TOKENS.teal, vals: months.map((m) => m.pas) },
  { key: 'inv', label: '投資收入', color: TOKENS.gold, vals: months.map((m) => m.inv) }];
  const bars = months.map((m) => m.act + m.pas + m.inv - m.exp);

  const allVals = [...lines.flatMap((s) => s.vals), ...bars];
  const maxV = Math.max(...allVals, 1000);
  const minV = Math.min(...allVals, 0);
  const range = maxV - minV || 1;

  const W = 344,H = 190,padL = 12,padR = 12,padT = 10,padB = 22;
  const cW = W - padL - padR,cH = H - padT - padB;
  const toY = (v) => padT + cH - (v - minV) / range * cH;
  const toX = (i) => padL + i / (months.length - 1) * cW;
  const pts = (s) => months.map((_, i) => toX(i) + ',' + toY(s.vals[i])).join(' ');
  const zeroY = toY(0);
  const barW = 13;
  const hasData = allVals.some((v) => v !== 0);

  return (
    <div style={{ width: "100%", boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: SP(8), paddingBottom: SP(14), marginBottom: SP(14),
        borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <button onClick={() => setYearOffset(yearOffset - 1)} style={{
          width: 34, height: 34, borderRadius: RS(10), flexShrink: 0,
          background: TOKENS.bg, border: '1px solid rgba(0,0,0,0.12)',
          color: TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {window.Icons && window.Icons.ChevronRight ? <window.Icons.ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} /> : '‹'}
        </button>
        <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(17), fontWeight: 700, color: TOKENS.ink, letterSpacing: 0.5 }}>
          {curYear} 年
        </div>
        <button onClick={() => canNextYear && setYearOffset(yearOffset + 1)} disabled={!canNextYear} style={{
          width: 34, height: 34, borderRadius: RS(10), flexShrink: 0,
          background: TOKENS.bg, border: '1px solid rgba(0,0,0,0.12)',
          color: TOKENS.ink, opacity: canNextYear ? 1 : 0.35,
          cursor: canNextYear ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {window.Icons && window.Icons.ChevronRight ? <window.Icons.ChevronRight size={17} /> : '›'}
        </button>
      </div>
      {!hasData ?
      <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(44,44,50,0.4)', fontSize: FS(13) }}>尚無記帳資料</div> :

      <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block', overflow: 'visible', height: 'auto' }}>
          {/* 月收支餘額 柱狀圖 */}
          {bars.map((b, i) => {
          const x = toX(i) - barW / 2;
          const y = b >= 0 ? toY(b) : zeroY;
          const h = Math.max(Math.abs(zeroY - toY(b)), b === 0 ? 0 : 2);
          return <rect key={i} x={x} y={y} width={barW} height={h} rx={3}
          fill={b >= 0 ? 'rgba(0,0,0,0.13)' : 'rgba(184,92,74,0.42)'} />;
        })}
          {/* 零基準線 */}
          <line x1={padL - 6} y1={zeroY} x2={W - padR + 6} y2={zeroY}
        stroke="rgba(0,0,0,0.22)" strokeWidth={1} strokeDasharray="4 3" />
          {months.map((m, i) =>
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle"
        fill="rgba(60,60,67,0.6)" fontSize={13}>{i + 1}</text>
        )}
          {/* 折線：支出 / 主動收入 / 被動收入 / 投資收入 */}
          {lines.map((s) =>
        <polyline key={s.key} points={pts(s)} fill="none" stroke={s.color}
        strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
          {lines.map((s) =>
        <circle key={s.key} cx={toX(months.length - 1)} cy={toY(s.vals[months.length - 1])}
        r={3.5} fill={s.color} />
        )}
        </svg>
      }
      <div style={{ display: 'flex', gap: SP(10), flexWrap: 'wrap', marginTop: SP(10) }}>
        {lines.map((s) =>
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: SP(5), flexShrink: 0 }}>
            <span style={{ borderRadius: RS(2), background: s.color, flexShrink: 0, width: "8px", height: "8px" }}></span>
            <span style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.85)', whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(5), flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: RS(3), background: 'rgba(0,0,0,0.20)', flexShrink: 0 }}></span>
          <span style={{ fontSize: FS(13), color: 'rgba(44,44,50,0.85)', whiteSpace: 'nowrap' }}>收支餘額</span>
        </div>
      </div>

      {/* 每月數值明細 */}
      {hasData &&
      <div style={{ marginTop: SP(14), borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: SP(8) }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr 1.3fr', gap: SP(2),
          fontSize: FS(13), color: 'rgba(44,44,50,0.55)', letterSpacing: 0.5,
          padding: PAD('4px 4px'), textAlign: 'right' }}>
          <span style={{ textAlign: 'left' }}>月份</span>
          <span>收入</span>
          <span>支出</span>
          <span>結餘</span>
        </div>
        {months.map((m, i) => {
          const inc = m.act + m.pas + m.inv;
          const bal = inc - m.exp;
          if (inc === 0 && m.exp === 0) return null;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr 1.3fr', gap: SP(2),
              fontSize: FS(13), fontFamily: TOKENS.fontMono, textAlign: 'right',
              padding: PAD('5px 4px'), borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <span style={{ textAlign: 'left', color: 'rgba(44,44,50,0.7)' }}>{m.label}</span>
            <span style={{ color: inc > 0 ? TOKENS.blue2 : 'rgba(60,60,67,0.35)', fontSize: "13px" }}>{inc > 0 ? fmtAcct(inc) : '—'}</span>
            <span style={{ color: m.exp > 0 ? TOKENS.red : 'rgba(60,60,67,0.35)', fontSize: "13px" }}>{m.exp > 0 ? fmtAcct(m.exp) : '—'}</span>
            <span style={{ fontWeight: 600, color: bal >= 0 ? TOKENS.ink : TOKENS.red, fontSize: "13px" }}>{bal < 0 ? '-' : ''}{fmtAcct(Math.abs(bal))}</span>
          </div>);
        })}
      </div>
      }
    </div>);

}

/* ─── Mock transactions ──────────────────────────────────────────────── */
function genTxns(group, item) {
  // 假資料已清空 — 明細只顯示來自記帳的真實紀錄
  return [];
}

/* ─── Account Detail Sheet (per-transaction editing) ────────────────── */
function AccountDetailSheet({ data, mask, onClose, onSaveItem, savedFlows = [], savedTrades = [], computedHoldings = [], onEditRecord, hideAmounts, revealHidden, isHidden, onToggleHidden }) {
  const { ChevronRight, Check, X, TrendUp, Pencil } = window.Icons;
  const [txnEdits, setTxnEdits] = useStateAcct({});
  const [activeTxn, setActiveTxn] = useStateAcct(null);
  const [editDesc, setEditDesc] = useStateAcct('');
  const [editAmt, setEditAmt] = useStateAcct('');
  const [monthOff, setMonthOff] = useStateAcct(0); // 0 = 當月，負值往前

  React.useEffect(() => {
    if (data) { setTxnEdits({}); setActiveTxn(null); }
  }, [data]);

  if (!data) return null;
  const { item, group } = data;
  const isCredit = group.id === 'credit';
  const isBrokerage = group.id === 'brokerage';
  const isCash = group.id === 'cash';
  const color = group.color;

  // ── Build real transactions from savedFlows / savedTrades ──
  const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
  };

  // For brokerage: match by broker name (partial)
  const brokerKeywords = {
    '凱基證券': ['凱基', '主要券商'],
    '元大證券': ['元大', '副券商'],
    '永豐證券': ['永豐'],
    'Firstrade': ['Firstrade', '複委託']
  };
  const brokerMatch = (tradeBroker) => {
    const kws = brokerKeywords[item.name] || [item.name];
    return kws.some((k) => tradeBroker && tradeBroker.includes(k));
  };

  // Real flows: match account name (with fallback to master account names mapping)
  const ACCT_MAP = {
    '台新銀行': ['主要存款帳戶', '台新'],
    '中華郵政': ['郵局帳戶', '郵政'],
    '樂天銀行': ['數位帳戶', '樂天'],
    '凱基證 交割戶': ['券商交割戶', '凱基'],
    '元大證 交割戶': ['元大交割', '元大'],
    'Firstrade 交割': ['複委託交割戶', 'Firstrade'],
    '國泰世華鈦金卡': ['信用卡 A'],
    '玉山 Pi 拍錢包': ['信用卡 B'],
    '台新 Richart 卡': ['電子卡'],
    '悠遊卡': ['悠遊卡'],
    '一卡通': ['一卡通'],
    'LINE Pay Money': ['LINE Pay'],
    '悠遊付': ['悠遊付'],
    'iPass Money': ['街口支付', 'iPass'],
    '皮夾現金': ['現金', '現金 (錢包)']
  };
  const acctKeys = [item.name, ...(ACCT_MAP[item.name] || [])];
  const matchAcct = (a) => acctKeys.some((k) => a && (a === k || a.includes(k)));

  const realFlows = savedFlows.
  filter((f) => {
    // 證券戶看的是「持倉市值」，只列買賣交易；自動產生的「投資轉帳」現金流留在交割戶顯示，
    // 不在證券戶重複列出（否則買進會出現交易與轉帳兩筆、相抵混淆）。
    if (isBrokerage && f._autoGen && f.cat === '投資轉帳') return false;
    return matchAcct(f.account) || matchAcct(f.fromAccount) || matchAcct(f.toAccount);
  }).
  map((f) => ({
    date: fmtDate(f.date), _ts: new Date(f.date).getTime(), desc: f.merchant || f.cat,
    amount: f.kind === 'inc' ? f.amount :
    f.kind === 'xfer' ? matchAcct(f.toAccount) ? f.amount : -f.amount :
    -f.amount,
    source: 'real', _orig: f
  }));

  // 已有自動投資轉帳流水的買進 tradeJA 集合（避免交割戶重複列出買進交易）
  const buyXferJAs = new Set((savedFlows || []).filter((f) => f._buyXfer).map((f) => f._linkedTradeJA));

  const realTrades = isBrokerage ?
  savedTrades.filter((t) => brokerMatch(t.broker)).map((t) => ({
    date: fmtDate(t.date), _ts: new Date(t.date).getTime(),
    desc: `${t.side === 'buy' ? '買進' : '賣出'} ${t.code} ${t.name} ${t.shares}股`,
    amount: t.side === 'buy' ? -(t.shares * t.price) : t.shares * t.price,
    source: 'real', _orig: t, _isTrade: true
  })) :
  // 交割戶：新版買進已自動產生「投資轉帳」流水（realFlows 會列出），這裡就不再重複列出
  // 該買進交易，避免同一筆扣款出現兩次；舊資料的買進（沒有投資轉帳流水）才由這裡列出。
  savedTrades.filter((t) => t.side === 'buy' && matchAcct(t.settleAccount) && !buyXferJAs.has(t._justAdded)).map((t) => {
    const gross = (parseFloat(t.shares) || 0) * (parseFloat(t.price) || 0);
    const cost = t.net != null && t.net > 0 ? t.net : gross + (parseFloat(t.fee) || 0);
    return {
      date: fmtDate(t.date), _ts: new Date(t.date).getTime(),
      desc: `買進 ${t.name || t.code} ${(parseFloat(t.shares) || 0).toLocaleString()}股・轉入${t.broker || '證券戶'}`,
      amount: -cost,
      source: 'real', _orig: t, _isTrade: true
    };
  });

  // 依交易/執行日期排序（新到舊）
  const allReal = [...realFlows, ...realTrades].sort((a, b) => b._ts - a._ts);

  // Mock fallback (only shown when no real data, labelled clearly)
  const mockTxns = genTxns(group, item);
  const hasReal = allReal.length > 0;

  // ── 月份切換（以每月為單位顯示交易）──
  const nowD = new Date(window.TODAY_DATE || Date.now());
  const selDate = new Date(nowD.getFullYear(), nowD.getMonth() + monthOff, 1);
  const selY = selDate.getFullYear(), selM = selDate.getMonth();
  const inSelMonth = (ts) => {const d = new Date(ts);return d.getFullYear() === selY && d.getMonth() === selM;};
  // 開啟帳戶時，預設跳到最近一筆交易所在的月份
  React.useEffect(() => {
    if (allReal.length) {
      const d = new Date(allReal[0]._ts);
      setMonthOff((d.getFullYear() - nowD.getFullYear()) * 12 + (d.getMonth() - nowD.getMonth()));
    } else {
      setMonthOff(0);
    }
  }, [data]);
  const monthReal = allReal.filter((r) => inSelMonth(r._ts));
  const monthNet = monthReal.reduce((s, r) => s + (r.amount || 0), 0);

  const openEdit = (i, desc, amt) => {
    setActiveTxn(i);setEditDesc(desc);setEditAmt(String(Math.abs(amt)));
  };
  const saveEdit = (i, origAmt) => {
    const sign = origAmt >= 0 ? 1 : -1;
    const newAmt = (parseFloat(editAmt) || Math.abs(origAmt)) * sign;
    setTxnEdits((prev) => ({ ...prev, [i]: { desc: editDesc.trim(), amount: newAmt } }));
    setActiveTxn(null);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />

      {/* 開發者隱藏手勢：只有「眼睛關閉」時，點右上角空白處才切換隱藏此帳戶（眼睛張開時不觸發） */}
      {hideAmounts &&
      <button aria-hidden onClick={() => onToggleHidden && onToggleHidden()}
      style={{ position: 'absolute', top: 'var(--ff-detail-top, 62px)', right: 0, width: 66, height: 58,
        background: 'transparent', border: 'none', padding: 0, zIndex: 6 }} />
      }

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(10), padding: PAD('4px 10px 12px') }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
          background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
          color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FS(21), fontWeight: 700, color: TOKENS.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: SP(8) }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            {isHidden &&
            <span style={{ flexShrink: 0, fontSize: FS(12), fontWeight: 700, color: TOKENS.red,
              background: 'rgba(184,92,74,0.14)', border: '1px solid rgba(184,92,74,0.35)',
              borderRadius: RS(8), padding: PAD('2px 7px') }}>已隱藏</span>}
          </div>
          {/* 種類副標題不再顯示；只保留外幣帳戶的幣別 */}
          {item.currency && item.currency !== 'TWD' &&
          <div style={{ fontSize: FS(16), color: 'rgba(0,0,0,0.80)', marginTop: SP(1) }}>{item.currency}</div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 10px 28px') }}>

        {/* Balance hero card */}
        <div style={{
          padding: PAD('14px 18px'), borderRadius: RS(22), marginBottom: SP(14),
          background: `linear-gradient(145deg, ${color}ee 0%, ${color}99 100%)`,
          boxShadow: SH(`0 8px 20px ${color}44`),
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -35, left: -25, width: 110, height: 110,
            borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: FS(16), color: 'rgba(255,255,255,0.78)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {isCredit ? (item.amount < 0 ? '已溢繳（多付的會折抵下期）' : '本期帳款') : isBrokerage ? '目前市值' : '目前餘額'}
            </div>

            <div style={{ marginTop: SP(4), fontFamily: TOKENS.fontMono, fontSize: FS(28), fontWeight: 700, color: TOKENS.surface, letterSpacing: -0.5 }}>
              {item.currency && item.currency !== 'TWD' &&
              <span style={{ fontSize: FS(12), color: 'rgba(255,255,255,0.80)', marginRight: SP(4) }}>{item.currency}</span>
              }
              {mask(isCredit ? Math.abs(item.amount) : item.amount)}
            </div>

            {/* Credit card detail */}
            {isCredit && item.extra &&
            <div style={{ marginTop: SP(12) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: FS(16), color: 'rgba(255,255,255,0.75)', marginBottom: SP(6) }}>
                  <span>使用 {item.extra.used}%</span>
                  <span>可用 {mask(item.extra.limit - item.amount)}</span>
                </div>
                <div style={{ height: 6, borderRadius: RS(8), background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: RS(8), width: `${item.extra.used}%`, background: 'rgba(255,255,255,0.92)' }} />
                </div>
                <div style={{ marginTop: SP(10), display: 'flex', gap: SP(8) }}>
                  {[['信用額度', mask(item.extra.limit)], ['已使用', mask(item.amount)]].map(([label, value]) =>
                <div key={label} style={{ flex: 1, padding: PAD('8px 10px'), borderRadius: RS(10),
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
                      <div style={{ fontSize: FS(14), color: 'rgba(255,255,255,0.70)' }}>{label}</div>
                      <div style={{ fontSize: FS(17), fontWeight: 600, color: TOKENS.surface, marginTop: SP(2),
                    fontFamily: TOKENS.fontMono }}>{value}</div>
                    </div>
                )}
                </div>
              </div>
            }

            {/* Brokerage market value — removed */}
          </div>
        </div>

        {/* 月份切換（以每月為單位顯示交易） */}
        {hasReal &&
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(8), marginBottom: SP(12) }}>
          <button onClick={() => setMonthOff((m) => m - 1)} style={{
            width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /></button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: FS(18), fontWeight: 700, color: TOKENS.ink }}>{selY} 年 {selM + 1} 月</div>
            <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.5)', marginTop: SP(1) }}>
              本月變動 <span style={{ fontFamily: TOKENS.fontMono,
                color: monthNet > 0 ? TOKENS.incBlue : monthNet < 0 ? TOKENS.red : 'rgba(0,0,0,0.5)' }}>
                {item.currency && item.currency !== 'TWD' && <span style={{ fontSize: FS(12), fontWeight: 400, opacity: 0.72, marginRight: 2 }}>{item.currency}</span>}{monthNet > 0 ? '+' : monthNet < 0 ? '-' : ''}{mask(Math.abs(monthNet))}</span>
            </div>
          </div>
          <button onClick={() => setMonthOff((m) => Math.min(0, m + 1))} disabled={monthOff >= 0} style={{
            width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: monthOff >= 0 ? 0.35 : 1, cursor: monthOff >= 0 ? 'default' : 'pointer'
          }}><ChevronRight size={18} /></button>
        </div>
        }

        {/* Transactions — real data first, mock fallback */}
        {(hasReal || mockTxns.length > 0) && (() => {
          const displayList = hasReal ?
          allReal.map((r, i) => [r.date, r.desc, r.amount, i, r._orig, r._isTrade, r._ts]).filter((row) => inSelMonth(row[6])) :
          mockTxns.map(([d, desc, amt], i) => [d, desc, amt, i, null, false, 0]);
          const sectionLabel = hasReal ? `已記帳交易 · ${displayList.length} 筆` : `近期交易 · ${displayList.length} 筆`;
          const isMock = !hasReal;

          return (
            <>
              <div style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.80)', letterSpacing: 1,
                textTransform: 'uppercase', margin: PAD('0 4px 8px'), display: 'flex', alignItems: 'center', gap: SP(8) }}>
                {sectionLabel}
                {isMock && <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.30)',
                  textTransform: 'none', letterSpacing: 0, background: 'rgba(0,0,0,0.07)',
                  padding: PAD('1px 6px'), borderRadius: RS(4) }}>示範資料</span>}
                {!isMock && <span style={{ fontSize: FS(14), color: 'rgba(0,0,0,0.35)',
                  textTransform: 'none', letterSpacing: 0 }}>點選可編輯</span>}
              </div>
              <div style={{ background: TOKENS.surface, borderRadius: RS(18),
                border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                {displayList.length === 0 &&
                <div style={{ padding: PAD('28px 14px'), textAlign: 'center',
                  color: 'rgba(0,0,0,0.4)', fontSize: FS(17) }}>本月無交易</div>
                }
                {displayList.map(([date, desc, amt, origIdx, origData, isTrade]) => {
                  const override = txnEdits[origIdx];
                  const displayDesc = override?.desc !== undefined ? override.desc : desc;
                  const displayAmt = override?.amount !== undefined ? override.amount : amt;
                  const isInc = displayAmt > 0;
                  const isZero = displayAmt === 0;
                  const isActive = activeTxn === origIdx;
                  const handleClick = () => {
                    if (origData && onEditRecord) {
                      if (isTrade) {
                        onEditRecord({ intent: 'stock', edit: true,
                          recordId: 's-' + origData._justAdded,
                          apply: { side: origData.side, code: origData.code, name: origData.name,
                            shares: String(origData.shares), price: String(origData.price),
                            assetClass: origData.assetClass || '股票',
                            broker: origData.broker || '', settleAccount: origData.settleAccount || '',
                            feeOverride: origData.fee != null ? String(origData.fee) : null,
                            taxOverride: origData.tax != null ? String(origData.tax) : null,
                            date: origData.date instanceof Date ? origData.date : new Date(origData.date),
                            note: origData.note || '' },
                          text: '', summary: [] });
                      } else {
                        onEditRecord({ intent: 'flow', edit: true,
                          recordId: 's-' + origData._justAdded,
                          apply: { kind: origData.kind, amount: String(origData.amount),
                            category: origData.cat, account: origData.account || '',
                            fromAccount: origData.fromAccount || '', toAccount: origData.toAccount || '',
                            xferFee: origData.xferFee != null ? String(origData.xferFee) : '',
                            date: origData.date instanceof Date ? origData.date : new Date(origData.date),
                            note: origData.merchant || '' },
                          text: '', summary: [] });
                      }
                    } else if (!isActive) {
                      openEdit(origIdx, displayDesc, displayAmt);
                    }
                  };
                  return (
                    <div key={origIdx} style={{ borderBottom: origIdx < displayList.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none' }}>
                      <div onClick={handleClick}
                      style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('16px 14px'),
                        cursor: 'pointer', background: isActive ? 'rgba(0,0,0,0.04)' : 'transparent' }}>
                        <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(16),
                          color: 'rgba(44,44,50,0.86)', flexShrink: 0, width: 42 }}>{date}</div>
                        <div style={{ flex: 1, fontSize: FS(18), color: TOKENS.ink,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</div>
                        {!isZero &&
                        <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18),
                          fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
                          color: isInc ? TOKENS.incBlue : TOKENS.red }}>
                            {item.currency && item.currency !== 'TWD' && <span style={{ fontSize: FS(12), fontWeight: 400, opacity: 0.72, marginRight: 2 }}>{item.currency}</span>}{isInc ? '' : '-'}{mask(Math.abs(displayAmt))}
                          </div>
                        }
                        <Pencil size={13} style={{ color: 'rgba(44,44,50,0.22)', flexShrink: 0 }} />
                      </div>
                      {isActive &&
                      <div style={{ padding: PAD('10px 16px 14px'), background: 'rgba(0,0,0,0.04)',
                        borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                          <div style={{ display: 'flex', gap: SP(8), marginBottom: SP(8) }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.88)', marginBottom: SP(4) }}>摘要</div>
                              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                            style={{ width: '100%', height: 56, padding: PAD('0 10px'), borderRadius: RS(10),
                              background: TOKENS.surface, border: '1px solid rgba(217,119,87,0.35)',
                              fontSize: FS(18), color: TOKENS.ink, outline: 'none' }} />
                            </div>
                            {!isZero &&
                          <div style={{ width: 110 }}>
                                <div style={{ fontSize: FS(14), color: 'rgba(44,44,50,0.88)', marginBottom: SP(4) }}>金額</div>
                                <input value={editAmt} onChange={(e) => setEditAmt(e.target.value)} inputMode="decimal"
                            style={{ width: '100%', height: 56, padding: PAD('0 10px'), borderRadius: RS(10),
                              background: TOKENS.surface, border: '1px solid rgba(217,119,87,0.35)',
                              fontSize: FS(18), color: TOKENS.ink, outline: 'none',
                              fontFamily: TOKENS.fontMono }} />
                              </div>
                          }
                          </div>
                          <div style={{ display: 'flex', gap: SP(8) }}>
                            <button onClick={() => setActiveTxn(null)} style={{
                            flex: 1, height: 46, borderRadius: RS(10),
                            background: 'rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.12)',
                            color: 'rgba(44,44,50,0.88)', fontSize: FS(17) }}>取消</button>
                            <button onClick={() => saveEdit(origIdx, displayAmt)} style={{
                            flex: 2, height: 46, borderRadius: RS(10),
                            background: TOKENS.gradDark,
                            border: 'none', color: TOKENS.surface, fontSize: FS(17), fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(5)
                          }}><Check size={14} strokeWidth={2.5} /> 儲存</button>
                          </div>
                        </div>
                      }
                    </div>);

                })}
              </div>
            </>);

        })()}

        {/* Cash note */}
        {isCash &&
        <div style={{ marginTop: SP(8), padding: PAD('16px 14px'), borderRadius: RS(16),
          background: 'rgba(168,189,140,0.08)', border: '1px solid rgba(168,189,140,0.20)',
          fontSize: FS(17), color: 'rgba(44,44,50,0.58)', lineHeight: 1.6 }}>
            現金資產不記錄電子交易，如需調整餘額請至「記帳」手動新增一筆。
          </div>
        }
      </div>
    </div>);

}

/* ─── Asset Group Row ────────────────────────────────────────────────── */
function AssetGroupRow({ group, openId, setOpenId, mask, onOpenDetail }) {
  const { ChevronDown } = window.Icons;
  const open = openId === group.id;
  const sum = group.items.reduce((a, x) => a + (x.amountTWD != null ? x.amountTWD : x.amount), 0);
  const Icon = window.Icons[group.icon] || window.Icons.Wallet;

  return (
    <div style={{ ...{ background: TOKENS.surface, borderRadius: RS(20), border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden' }, borderRadius: "11px", background: "rgb(248, 247, 243)", border: "1px solid rgb(204, 204, 204)" }}>
      <button onClick={() => setOpenId(open ? null : group.id)} style={{
        background: 'transparent', border: 'none', padding: PAD('12px 14px'),
        color: TOKENS.ink, display: 'flex', alignItems: 'center', gap: SP(14), textAlign: 'left', minHeight: 58, width: "382px"
      }}>
        <div style={{ ...{
            width: 42, height: 44, borderRadius: RS(16), flexShrink: 0,
            background: `${group.color}1f`, border: `1px solid ${group.color}44`,
            color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }, borderRadius: "20px" }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FS(20), fontWeight: 600 }}>{group.name}</div>
          <div style={{ fontSize: FS(16), color: 'rgba(0,0,0,0.80)', marginTop: SP(2) }}>{group.items.length} 個帳戶</div>
        </div>
        <div style={{ textAlign: 'right', marginRight: SP(4) }}>
          {(() => {
            // sum 對負債群組已是「應繳為正」；帶號取負即可——溢繳（sum<0）要顯示成正數資產，
            // 不能用 Math.abs 硬翻成更大的負債（否則繳完卡費看起來反而負更多）。
            const sv = group.sign < 0 ? -sum : sum;
            const neg = Math.round(sv) < 0; // 四捨五入後才判斷負號/紅字：-0.x 顯示成 0 不帶負號、不紅字
            return (
          <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(22), fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
            color: neg ? TOKENS.red : TOKENS.ink }}>
            {neg ? '-' : ''}{mask(Math.abs(sv))}
          </div>);
          })()}
        </div>
        <ChevronDown size={18} style={{ color: 'rgba(44,44,50,0.35)', flexShrink: 0,
          transition: 'transform 250ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open &&
      <div style={{ padding: PAD('0 12px 12px') }}>
          <div style={{ borderRadius: RS(14),
          overflow: 'hidden', border: "1px solid rgba(0, 0, 0, 0.153)", background: "rgba(235, 222, 207, 0.4)" }}>
            {group.items.map((item, i) =>
          <AccountItemRow key={i} item={item} group={group} mask={mask}
          last={i === group.items.length - 1}
          onOpen={() => onOpenDetail({ item, group })} />
          )}
          </div>
        </div>
      }
    </div>);

}

/* ─── Account Item Row ───────────────────────────────────────────────── */
function AccountItemRow({ item, group, mask, last, onOpen }) {
  const { ChevronRight } = window.Icons;
  const isCredit = group.id === 'credit';
  return (
    <div onClick={onOpen} style={{
      cursor: 'pointer', padding: PAD('12px 14px'),
      borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.09)',
      minHeight: 54, transition: 'background 120ms'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(12) }}>
        <div style={{ ...{
            width: 34, height: 34, borderRadius: RS(10), flexShrink: 0,
            background: `${group.color}18`, border: `1px solid ${group.color}30`,
            color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TOKENS.fontMono, fontSize: FS(14), fontWeight: 700
          }, borderRadius: "20px" }}>{item.name.slice(0, 1)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FS(18), fontWeight: 500, color: TOKENS.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
          {/* 帳戶已依種類分區顯示，列內不再重複種類副標題（例：銀行群組下的 xx 銀行不再顯示「銀行」）*/}
        </div>
        {(() => {
          const av = group.sign < 0 ? -item.amount : item.amount; // 帶號顯示：欠款為負、溢繳為正
          const neg = Math.round(av) < 0; // 四捨五入後才判斷負號/紅字：-0.x 顯示成 0 不帶負號、不紅字
          return (
        <div style={{ fontFamily: TOKENS.fontMono, fontSize: FS(18), fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
          color: neg ? TOKENS.red : TOKENS.ink }}>
          {item.currency && item.currency !== 'TWD' &&
          <span style={{ fontSize: FS(12), color: 'rgba(0,0,0,0.62)', marginRight: SP(3) }}>{item.currency}</span>
          }
          {neg ? '-' : ''}{mask(Math.abs(av))}
        </div>);
        })()}
        <ChevronRight size={14} style={{ color: 'rgba(44,44,50,0.25)', flexShrink: 0 }} />
      </div>
      {isCredit && item.extra &&
      <div style={{ marginTop: SP(7), marginLeft: SP(46) }}>
          <div style={{ height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.10)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: RS(8), width: `${item.extra.used}%`,
            background: item.extra.used > 70 ? TOKENS.red : TOKENS.gray3 }} />
          </div>
        </div>
      }
    </div>);

}

/* ─── Main AccountsScreen ────────────────────────────────────────────── */
function AccountsScreen({ hideAmounts, onOpenDetail, computedAcctGroups = [], computedHoldings = [], savedFlows = [], masterData, onOpenNetWorth }) {
  const { ChartPie } = window.Icons;
  const mask = (n) => fmtAcct(n); // 一般數字（含群組小計、單一帳戶）不再受眼睛遮蔽；只遮最上層總資產淨額
  const [openId, setOpenId] = useStateAcct(null);

  const LIGHT_TINTS = { cash: TOKENS.surface, stock: TOKENS.accentTintHi, bond: TOKENS.chart2, other: TOKENS.chart1 };
  // Build pieLight from computedAcctGroups（統計加總換算台幣）
  const amtTWD = (x) => x.amountTWD != null ? x.amountTWD : x.amount;
  const mvTWD = (x) => x.mvTWD != null ? x.mvTWD : x.mv || 0;
  const totals = { cash: 0, stock: 0, bond: 0, other: 0 };
  computedAcctGroups.forEach((g) => {
    const sum = g.items.reduce((a, x) => a + (g.sign < 0 ? 0 : amtTWD(x)), 0);
    if (g.assetClass === 'cash') totals.cash += sum;
    if (g.assetClass === 'stock') totals.stock += sum;
    if (g.assetClass === 'other') totals.other += sum;
  });
  // Add investment MV to stock
  computedHoldings.forEach((g) => {
    g.items.forEach((it) => {totals.stock += mvTWD(it);});
  });
  const totalAssets = totals.cash + totals.stock + totals.bond + totals.other;
  const pieLight = totalAssets === 0 ?
  [{ key: 'empty', label: '尚無資產', color: TOKENS.warmBorder2, pct: 100 }] :
  Object.entries(totals).
  filter(([, v]) => v > 0).
  map(([k, v]) => ({ key: k, label: { cash: '現金/存款', stock: '投資', bond: '債券', other: '其他' }[k],
    color: LIGHT_TINTS[k] || TOKENS.surface, pct: v / totalAssets * 100 }));

  const INVEST_TINTS = [TOKENS.surface, TOKENS.accentTintHi, TOKENS.chart1, TOKENS.chart2, TOKENS.accentTint3, TOKENS.accentTint, TOKENS.accentTint2];
  const allInvest = computedHoldings.flatMap((g) => g.items);
  const investTotal = allInvest.reduce((a, x) => a + mvTWD(x), 0);
  const investPie = allInvest.length === 0 ?
  [{ key: 'empty', label: '尚無持倉', color: TOKENS.warmBorder2, pct: 100 }] :
  allInvest.map((it, i) => ({
    key: it.code, label: `${it.code} ${it.name}`,
    color: INVEST_TINTS[i % INVEST_TINTS.length],
    pct: investTotal > 0 ? mvTWD(it) / investTotal * 100 : 0
  }));

  // 證券戶 group = 設定內的證券戶清單 + 證券持倉市值（依證券戶加總）
  const secByBroker = {};
  (masterData && masterData.brokers || []).forEach((b) => {
    // 種類副標題不再顯示，只保留外幣資訊（透過 currency 欄位在金額前顯示幣別）
    secByBroker[b.name] = { name: b.name, currency: b.currency, amount: 0, badge: b.name.slice(0, 2) };
  });
  computedHoldings.flatMap((g) => g.items).forEach((it) => {
    const b = it.broker || '其他';
    if (!secByBroker[b]) secByBroker[b] = { name: b, currency: it.currency, amount: 0, badge: b.slice(0, 2) };
    secByBroker[b].amount += mvTWD(it);
  });
  const secItems = Object.values(secByBroker).sort((a, b) => b.amount - a.amount);

  // Decorate groups with Icon; brokerage(證券戶) lists holdings by broker
  const assetGroups = computedAcctGroups.map((g) =>
  g.id === 'brokerage' ?
  { ...g, items: secItems, Icon: window.Icons[g.icon] || window.Icons.Wallet } :
  { ...g, Icon: window.Icons[g.icon] || window.Icons.Wallet }
  );

  const agNetWorth = computedAcctGroups.reduce((a, g) => {
    const sum = g.items.reduce((b, it) => b + amtTWD(it), 0);
    return a + (g.sign < 0 ? -sum : sum);
  }, 0);
  const investMv = computedHoldings.flatMap((g) => g.items).reduce((a, it) => a + (it.mvTWD != null ? it.mvTWD : it.mv || 0), 0);
  const netWorth = agNetWorth + investMv;

  const stockPct = totalAssets > 0 ? totals.stock / totalAssets * 100 : 0;
  const bondPct = totalAssets > 0 ? totals.bond / totalAssets * 100 : 0;
  const hasData = agNetWorth !== 0 || totalAssets > 0;

  return (
    <div style={{ color: TOKENS.ink, padding: "0px 10px 40px" }}>
      {/* 總資產淨額卡片 */}      <div onClick={onOpenNetWorth} style={{
        cursor: 'pointer', marginBottom: SP(12),
        padding: PAD('14px 18px'), borderRadius: RS(22),
        background: TOKENS.gradDark,
        boxShadow: SH('0 8px 20px rgba(0,0,0,0.20)'),
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -30, left: -20, width: 110, height: 110,
          borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: FS(16), color: 'rgba(255,255,255,0.78)', letterSpacing: 1, textTransform: 'uppercase' }}>
              總資產淨額
            </div>
            <div style={{ marginTop: SP(4), fontFamily: TOKENS.fontMono, fontSize: FS(30), fontWeight: 700,
              color: TOKENS.surface, letterSpacing: -0.5 }}>
              {hideAmounts ? '••••••' : fmtAcct(netWorth)}
            </div>
          </div>
        </div>
      </div>

      {/* Category groups */}
      <div style={{ marginTop: SP(12), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        {assetGroups.map((g) =>
        <AssetGroupRow key={g.id} group={g} openId={openId} setOpenId={setOpenId}
        mask={mask} onOpenDetail={onOpenDetail} />
        )}
      </div>
    </div>);

}

window.AccountsScreen = AccountsScreen;
window.AccountDetailSheet = AccountDetailSheet;
window.MonthlyFlowHero = MonthlyFlowHero;