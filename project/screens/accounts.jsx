// Asset Allocation / 資產配置（含股票、債券分項配置）
const { useState: useStateAlloc } = React;

function PieDonutA({ data, size = 168, thickness = 22 }) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(28,26,24,0.12)" strokeWidth={thickness}/>
      {data.map((d, i) => {
        const len = d.pct / 100 * C;
        const off = acc / 100 * C;
        acc += d.pct;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${C}`}
            strokeDashoffset={-off}/>
        );
      })}
    </svg>
  );
}

function AccountsScreen({ hideAmounts }) {
  const { CreditCard, Wallet, Banknote, TrendUp, Plus, ChevronDown, Smartphone,
    Tag, Key, ChartPie, ArrowUpRight, Activity } = window.Icons;

  const mask = (n) => hideAmounts ? '••••••' : Math.round(n).toLocaleString();

  // ============ data model ============
  // groups have: id, name, color, sign (+1 asset / -1 liab), assetClass (key in allocation)
  // each item: name, sub, amount, extra, badge, holding(optional for stock/bond detail)
  const groups = [
    {
      id: 'stocks', name: '股票持倉', color: '#D97757',
      Icon: TrendUp, sign: 1, assetClass: 'stock',
      detail: 'holding',
      items: [
        { code: '2330', name: '台積電',     qty: 200,  avg: 580, price: 1045 },
        { code: '2454', name: '聯發科',     qty: 50,   avg: 850, price: 1380 },
        { code: '0050', name: '元大台灣50', qty: 1200, avg: 142, price: 195 },
        { code: '2412', name: '中華電',     qty: 800,  avg: 118, price: 126 },
      ].map(s => ({
        ...s,
        badge: s.code.slice(-2),
        sub: `${s.qty.toLocaleString()} 股 · 均價 ${s.avg}`,
        amount: Math.round(s.qty * s.price),
        extra: (() => {
          const pnl = (s.price - s.avg) * s.qty;
          const pct = (s.price - s.avg) / s.avg * 100;
          return { pnl: Math.round(pnl), pct: pct.toFixed(1) };
        })(),
      })),
    },
    {
      id: 'bonds', name: '債券', color: '#BFA176',
      Icon: Activity, sign: 1, assetClass: 'bond',
      detail: 'bond',
      items: [
        { name: '00679B 元大美債20年',  sub: '殖利率 4.6% · 800 股',  amount: 26400, badge: 'US',
          extra: { ytm: '4.6%', dur: '17.3年' } },
        { name: '00772B 中信高評公司債', sub: '殖利率 5.2% · 1200 股', amount: 48600, badge: 'IG',
          extra: { ytm: '5.2%', dur: '11.8年' } },
        { name: '中華民國公債 117甲',     sub: '面額 100,000 · 票息 1.6%', amount: 102300, badge: 'TW',
          extra: { ytm: '1.6%', dur: '5.2年' } },
      ],
    },
    {
      id: 'cash', name: '現金', color: '#A8BD8C',
      Icon: Wallet, sign: 1, assetClass: 'cash',
      items: [
        { name: '皮夾現金',   sub: '紙鈔零錢',    amount: 18500, badge: '$' },
        { name: '保險箱外幣', sub: '美金 600 元', amount: 19500, badge: 'U' },
      ],
    },
    {
      id: 'bank', name: '銀行與證券交割戶', color: '#D4B87A',
      Icon: Banknote, sign: 1, assetClass: 'cash',
      items: [
        { name: '主要存款帳戶', sub: '••• 4521 · 活儲',  amount: 1842300, badge: 'B' },
        { name: '郵局帳戶',     sub: '定存 + 活存',       amount: 320000,  badge: 'P' },
        { name: '數位帳戶',     sub: '年利 1.5%',         amount: 156000,  badge: 'D' },
        { name: '券商交割戶',   sub: '台股 · ••• 8832',  amount: 145000,  badge: 'S' },
        { name: '複委託交割戶', sub: '美股 · ••• 2207',  amount: 268400,  badge: 'X' },
      ],
    },
    {
      id: 'epay', name: '儲值卡 / 電子支付', color: '#C5A07D',
      Icon: Smartphone, sign: 1, assetClass: 'cash',
      items: [
        { name: '悠遊卡',          sub: '通勤主卡',  amount: 480,  badge: 'E' },
        { name: '一卡通',          sub: '高鐵 + 捷運', amount: 1240, badge: 'I' },
        { name: 'LINE Pay Money',  sub: '綁定信用卡 A', amount: 3260, badge: 'L' },
        { name: '街口支付',         sub: '夜市常用',  amount: 850, badge: 'J' },
      ],
    },
    {
      id: 'other', name: '加密 / 外幣', color: '#8FA86F',
      Icon: Key, sign: 1, assetClass: 'other',
      items: [
        { name: '加密貨幣錢包', sub: 'BTC · ETH · USDT',  amount: 84600, badge: 'C' },
        { name: '外幣帳戶',     sub: '日圓 · 港幣 · 美元', amount: 42300, badge: 'F' },
      ],
    },
    {
      id: 'credit', name: '信用卡 (負債)', color: '#D88770',
      Icon: CreditCard, sign: -1, assetClass: 'debt',
      items: [
        { name: '信用卡 A',  sub: '••• 4521 · 額度 80,000', amount: 23450, badge: 'A',
          extra: { used: 29 } },
        { name: '信用卡 B',  sub: '••• 9012 · 額度 50,000', amount: 8120,  badge: 'B',
          extra: { used: 16 } },
        { name: '電子卡',    sub: '虛擬卡 · 額度 30,000',   amount: 1280,  badge: 'V',
          extra: { used: 4 } },
      ],
    },
  ];

  // ============ allocation rollup ============
  const classMeta = {
    cash:  { label: '現金 / 存款', color: '#A8BD8C' },
    stock: { label: '股票',        color: '#D97757' },
    bond:  { label: '債券',        color: '#BFA176' },
    other: { label: '其他資產',    color: '#8FA86F' },
  };
  const totals = { cash: 0, stock: 0, bond: 0, other: 0, debt: 0 };
  groups.forEach(g => {
    const sum = g.items.reduce((a, x) => a + x.amount, 0);
    totals[g.assetClass] += sum;
  });
  const totalAssets = totals.cash + totals.stock + totals.bond + totals.other;
  const netWorth = totalAssets - totals.debt;
  const pie = Object.entries(classMeta).map(([k, m]) => ({
    key: k, label: m.label, color: m.color,
    value: totals[k], pct: totals[k] / totalAssets * 100,
  }));

  const [openId, setOpenId] = useStateAlloc('stocks');

  return (
    <div style={{ padding: '8px 18px 32px', color: '#18110C' }}>
      {/* Net worth + allocation */}
      <div style={{
        padding: '18px 20px', borderRadius: 20,
        background: '#18110C',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>
              淨資產
            </div>
            <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono, monospace',
              fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: '#FFFFFF' }}>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginRight: 4 }}>NT$</span>
              {mask(netWorth)}
            </div>
          </div>
        </div>

        {/* Donut + legend */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <PieDonutA data={pie} size={140} thickness={20}/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>配置</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2,
                fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF' }}>4 類</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pie.map(p => (
              <div key={p.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 20, background: p.color }}/>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
                    fontWeight: 600, color: p.color }}>
                    {p.pct.toFixed(1)}%
                  </div>
                </div>
                <div style={{ marginTop: 4, height: 4, borderRadius: 8,
                  background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`,
                    background: p.color, opacity: 0.9 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI tip */}
      <div style={{
        marginTop: 14, padding: '12px 16px', borderRadius: 14,
        background: 'rgba(217,119,87,0.07)', border: '1px solid rgba(217,119,87,0.22)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <ChartPie size={16} style={{ color: '#E89878', flexShrink: 0, marginTop: 2 }}/>
        <div style={{ fontSize: 14, color: '#18110C', lineHeight: 1.55 }}>
          股票配置目前佔 <b style={{ color: '#D97757' }}>{pie.find(p => p.key === 'stock').pct.toFixed(0)}%</b>，
          債券僅佔 <b style={{ color: '#BFA176' }}>{pie.find(p => p.key === 'bond').pct.toFixed(1)}%</b>，
          建議加入 <b>更多投資等級債券 ETF</b> 提升防禦力。
        </div>
      </div>

      {/* Category groups */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map(g => {
          const open = openId === g.id;
          const sum = g.items.reduce((a, x) => a + x.amount, 0);
          return (
            <div key={g.id} style={{
              background: '#FFFFFF', borderRadius: 14,
              border: '1px solid rgba(28,26,24,0.12)', overflow: 'hidden',
            }}>
              <button onClick={() => setOpenId(open ? null : g.id)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', padding: '14px 18px',
                  color: '#18110C', display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left', minHeight: 72,
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                  background: `${g.color}1f`, border: `1px solid ${g.color}40`,
                  color: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <g.Icon size={20}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 14, color: 'rgba(28,26,24,0.60)', marginTop: 2 }}>
                    {g.items.length} 項 · 佔配置 {(sum / totalAssets * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600,
                    color: g.sign < 0 ? '#D88770' : '#18110C' }}>
                    {g.sign < 0 ? '-' : ''}{mask(sum)}
                  </div>
                </div>
                <ChevronDown size={18} style={{
                  color: 'rgba(45,36,32,0.4)',
                  transition: 'transform 250ms',
                  transform: open ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                }}/>
              </button>

              {open && (
                <div style={{ padding: '0 12px 12px' }}>
                  <div style={{ background: 'rgba(45,36,32,0.04)', borderRadius: 14,
                    border: '1px solid rgba(28,26,24,0.12)' }}>
                    {g.items.map((it, i) => (
                      <ItemRow key={i} item={it} group={g} mask={mask}
                        last={i === g.items.length - 1}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemRow({ item, group, mask, last }) {
  // Stock holding row
  if (group.detail === 'holding') {
    const pnl = item.extra.pnl;
    const up  = pnl >= 0;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderBottom: last ? 'none' : '1px solid rgba(28,26,24,0.12)',
        minHeight: 68,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, ${group.color}3a, ${group.color}1a)`,
          border: `1px solid ${group.color}40`,
          color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
        }}>{item.code.slice(-2)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600 }}>
              {item.code}
            </span>
            <span style={{ fontSize: 15, color: 'rgba(45,36,32,0.75)' }}>{item.name}</span>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 2,
            fontFamily: 'JetBrains Mono, monospace' }}>{item.sub}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600 }}>
            {mask(item.amount)}
          </div>
          <div style={{ marginTop: 2, fontFamily: 'JetBrains Mono, monospace', fontSize: 14,
            color: up ? '#A8BD8C' : '#D88770' }}>
            {up ? '+' : ''}{mask(pnl)} ({up ? '+' : ''}{item.extra.pct}%)
          </div>
        </div>
      </div>
    );
  }

  // Bond row
  if (group.detail === 'bond') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderBottom: last ? 'none' : '1px solid rgba(28,26,24,0.12)',
        minHeight: 68,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, ${group.color}3a, ${group.color}1a)`,
          border: `1px solid ${group.color}40`,
          color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
        }}>{item.badge}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
          <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 2 }}>
            {item.sub}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600 }}>
            {mask(item.amount)}
          </div>
          <div style={{ marginTop: 2, fontSize: 14, color: 'rgba(45,36,32,0.5)',
            fontFamily: 'JetBrains Mono, monospace' }}>
            YTM {item.extra.ytm} · {item.extra.dur}
          </div>
        </div>
      </div>
    );
  }

  // Credit card row
  if (group.id === 'credit') {
    return (
      <div style={{
        padding: '12px 14px',
        borderBottom: last ? 'none' : '1px solid rgba(28,26,24,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 26, borderRadius: 5, flexShrink: 0,
            background: `linear-gradient(135deg, ${group.color}, ${group.color}aa)`,
            color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          }}>{item.badge}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 2 }}>{item.sub}</div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15,
            fontWeight: 600, color: '#D88770' }}>
            -{mask(item.amount)}
          </div>
        </div>
        <div style={{ marginTop: 8, marginLeft: 48, height: 4, borderRadius: 8,
          background: 'rgba(28,26,24,0.12)', overflow: 'hidden' }}>
          <div style={{ height: '100%',
            width: `${item.extra.used}%`,
            background: item.extra.used > 70 ? '#D88770' : group.color,
            opacity: 0.85 }}/>
        </div>
      </div>
    );
  }

  // Default row (cash, bank, brokerage, prepaid, etc.)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderBottom: last ? 'none' : '1px solid rgba(28,26,24,0.12)',
      minHeight: 60,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${group.color}3a, ${group.color}1a)`,
        border: `1px solid ${group.color}40`,
        color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
      }}>{item.badge || '·'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
        <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.5)', marginTop: 2 }}>{item.sub}</div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600 }}>
        {mask(item.amount)}
      </div>
    </div>
  );
}

window.AccountsScreen = AccountsScreen;
