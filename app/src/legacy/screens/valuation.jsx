// 估值分析 / 本益成長比（PEG）：持股與關注標的放在同一張表比較
import { mergeHoldingsByCode } from '../compute.js';
import { ffValuationRow, ffComparePeg } from '../valuation.js';

const { useState: useStateVal, useEffect: useEffectVal } = React;

const fmtVal = (n, d) => n == null ? '—' : n.toFixed(d);
const fmtPct = (n) => n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

// PEG 分區只是估值參考，不是買賣訊號——文案一律用「偏低／合理／偏高」，不用「買進／賣出」。
const ZONE_LABEL = { low: '偏低', fair: '合理', high: '偏高' };
const zoneColor = (zone) =>
zone === 'low' ? TOKENS.green : zone === 'fair' ? TOKENS.gold2 : zone === 'high' ? TOKENS.red : TOKENS.gray4;

const cardStyleVal = { background: TOKENS.surface, borderRadius: RS(16),
  border: '1px solid rgba(0,0,0,0.07)', padding: PAD('14px') };

/* ─── 手動覆寫成長率的輸入框 ──────────────────────────────────────────
   必須留在模組層級：定義在 ValuationSheet 函式體內的話，父層每次 render 都會產生
   新的函式參考，React 會把輸入框卸載重掛，手機上打一個字鍵盤就收起來一次。 */
function OverrideInput({ label, auto, value, onCommit }) {
  const [txt, setTxt] = useStateVal(value == null ? '' : String(value));
  const commit = (v) => {
    setTxt(v);
    const s = v.trim();
    if (!s) return onCommit(null); // 清空 = 回到自動值
    const n = parseFloat(s);
    if (isFinite(n)) onCommit(n);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
      <div style={{ flex: 1, fontSize: FS(15), color: TOKENS.ink2 }}>{label}</div>
      <input type="number" inputMode="decimal" value={txt} onChange={(e) => commit(e.target.value)}
        placeholder={auto == null ? '自訂' : auto.toFixed(1)}
        style={{ width: 88, height: 36, textAlign: 'right', borderRadius: RS(10),
          border: '1px solid rgba(0,0,0,0.14)', background: TOKENS.surface2,
          padding: PAD('0 8px'), fontSize: FS(16), fontFamily: TOKENS.fontMono, color: TOKENS.ink }} />
      <div style={{ width: 14, fontSize: FS(15), color: TOKENS.ink2 }}>%</div>
    </div>);

}

/* ─── 展開的個股明細 ─────────────────────────────────────────────────── */
function ValuationDetail({ row, onOverride, onRemoveWatch }) {
  const years = Object.keys(row.epsAnnual).sort();
  const maxEps = Math.max(...years.map((y) => Math.abs(row.epsAnnual[y])), 0.01);
  return (
    <div style={{ marginTop: SP(10), paddingTop: SP(12), borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      {years.length > 0 &&
      <>
      <div style={{ fontSize: FS(14), color: TOKENS.ink2 }}>年度每股盈餘</div>
      <div style={{ marginTop: SP(8), display: 'flex', alignItems: 'flex-end', gap: SP(6), height: 72 }}>
        {years.map((y) => {
          const v = row.epsAnnual[y];
          return (
            <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP(3) }}>
              <div style={{ fontSize: FS(12), color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{v.toFixed(1)}</div>
              <div style={{ width: '100%', height: Math.max(3, Math.abs(v) / maxEps * 40), borderRadius: RS(4),
                background: v < 0 ? TOKENS.red : TOKENS.ink2, opacity: 0.85 }} />
              <div style={{ fontSize: FS(12), color: TOKENS.gray4 }}>{y.slice(2)}</div>
            </div>);

        })}
      </div>
      </>
      }

      <div style={{ marginTop: SP(12), display: 'flex', gap: SP(10), fontSize: FS(14), color: TOKENS.ink2 }}>
        <div>近四季 EPS <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.epsTTM, 2)}</span></div>
        <div>本益比 <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.pe, 1)}</span></div>
      </div>

      <div style={{ marginTop: SP(12), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        <OverrideInput label={'歷史成長率' + (row.cagrOverridden ? '（已自訂）' : '')}
          auto={row.autoCagr} value={row.cagrOverridden ? row.cagr : null}
          onCommit={(v) => onOverride(row.code, 'cagr', v)} />
        <OverrideInput label={'近期成長率' + (row.yoyOverridden ? '（已自訂）' : '')}
          auto={row.autoYoy} value={row.yoyOverridden ? row.yoy : null}
          onCommit={(v) => onOverride(row.code, 'yoy', v)} />
      </div>
      <div style={{ marginTop: SP(6), fontSize: FS(13), color: TOKENS.gray4, lineHeight: 1.5 }}>
        留空 = 用財報自動算。填入自己的預估值可覆寫。
      </div>

      {onRemoveWatch &&
      <button onClick={() => onRemoveWatch(row.code)}
        style={{ marginTop: SP(12), height: 38, width: '100%', borderRadius: RS(12),
          border: '1px solid rgba(0,0,0,0.12)', background: 'transparent',
          color: TOKENS.red, fontSize: FS(15), cursor: 'pointer' }}>
        從關注清單移除
      </button>
      }
    </div>);

}

/* ─── 單一標的列 ─────────────────────────────────────────────────────── */
function ValuationRow({ row, expanded, onToggle, onOverride, onRemoveWatch }) {
  return (
    <div onClick={onToggle} style={{ ...cardStyleVal, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: zoneColor(row.zone) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FS(17), fontWeight: 600, color: TOKENS.ink, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name || row.code}</div>
          <div style={{ marginTop: SP(2), fontSize: FS(13), color: TOKENS.gray4 }}>
            {row.code}{row.price != null ? ' · ' + row.price.toLocaleString() : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {row.hasFundamentals ?
          <>
          <div style={{ fontSize: FS(19), fontWeight: 700, fontFamily: TOKENS.fontMono, color: zoneColor(row.zone) }}>
            {fmtVal(row.pegCagr != null ? row.pegCagr : row.pegYoy, 2)}
          </div>
          <div style={{ marginTop: SP(2), fontSize: FS(13), color: TOKENS.gray4 }}>
            PE {fmtVal(row.pe, 1)}{row.zone ? ' · ' + ZONE_LABEL[row.zone] : ''}
          </div>
          </> :

          <div style={{ fontSize: FS(14), color: TOKENS.gray4 }}>
            {row.fetched ? '無 EPS 資料' : '尚未取得'}
          </div>
          }
        </div>
      </div>

      {row.hasFundamentals &&
      <div style={{ marginTop: SP(8), display: 'flex', gap: SP(14), fontSize: FS(13), color: TOKENS.ink2 }}>
        <div>歷史 {fmtPct(row.cagr)} · PEG {fmtVal(row.pegCagr, 2)}{row.cagrOverridden ? ' ✎' : ''}</div>
        <div>近期 {fmtPct(row.yoy)} · PEG {fmtVal(row.pegYoy, 2)}{row.yoyOverridden ? ' ✎' : ''}</div>
      </div>
      }

      {expanded &&
      <div onClick={(e) => e.stopPropagation()}>
        <ValuationDetail row={row} onOverride={onOverride} onRemoveWatch={onRemoveWatch} />
      </div>
      }
    </div>);

}

/* ─── 新增關注標的 ───────────────────────────────────────────────────── */
function AddWatchRow({ universe, onAdd }) {
  const [q, setQ] = useStateVal('');
  const { Plus } = window.Icons;
  const key = q.trim().toLowerCase();
  const matches = key ? universe.filter((u) =>
  u.code.toLowerCase().startsWith(key) || u.name.includes(q.trim())).slice(0, 6) : [];
  return (
    <div style={cardStyleVal}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <Plus size={18} style={{ color: TOKENS.ink2, flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="輸入代號或名稱加入關注"
          style={{ flex: 1, height: 38, border: 'none', background: 'transparent', outline: 'none',
            fontSize: FS(16), color: TOKENS.ink }} />
      </div>
      {matches.length > 0 &&
      <div style={{ marginTop: SP(8), borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        {matches.map((m) =>
        <div key={m.code} onClick={() => {onAdd(m);setQ('');}}
          style={{ padding: PAD('10px 2px'), display: 'flex', gap: SP(10), alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: 62, fontSize: FS(15), fontFamily: TOKENS.fontMono, color: TOKENS.ink2 }}>{m.code}</div>
          <div style={{ flex: 1, fontSize: FS(16), color: TOKENS.ink, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
        </div>
        )}
      </div>
      }
    </div>);

}

/* ─── Main sheet ─────────────────────────────────────────────────────── */
function ValuationSheet({ open, onClose, computedHoldings = [], fundamentals = {}, livePrices = {},
  watchlist = [], setWatchlist, valuationOverride = {}, setValuationOverride, onFetchFundamentals }) {
  const { ChevronRight, RefreshCw } = window.Icons;
  const [tab, setTab] = useStateVal('holdings'); // holdings | watch
  const [sort, setSort] = useStateVal('peg'); // peg | code
  const [expanded, setExpanded] = useStateVal(null);
  const [refreshing, setRefreshing] = useStateVal(false);
  const [note, setNote] = useStateVal('');

  // 股票搜尋資料庫：台股即時清單 + 美股清單（與記一筆的股票代號欄同一份來源）
  const [universe, setUniverse] = useStateVal(() => window.US_STOCK_LIST || []);
  useEffectVal(() => {
    const p = window._twStockPromise || (window.loadTWStocks ? window.loadTWStocks() : Promise.resolve([]));
    p.then((tw) => {
      const seen = new Set();
      const merged = [];
      [...tw, ...(window.US_STOCK_LIST_EXTRA || []), ...(window.US_STOCK_LIST || [])].forEach((s) => {
        if (s && s.code && !seen.has(s.code)) {seen.add(s.code);merged.push(s);}
      });
      if (merged.length > 0) setUniverse(merged);
    });
  }, []);

  // 持股（跨券商合併——估值看的是公司，不是分別放在哪家券商的部位）
  const held = mergeHoldingsByCode(computedHoldings.flatMap((g) => g.items || [])).filter((it) => it.code);

  // 開頁時補抓還沒有的基本面。財報是季頻資料，fetchFundamentals 內部只會問沒問過的代號。
  const codesKey = [...held.map((h) => h.code), ...watchlist.map((w) => w.code)].join(',');
  useEffectVal(() => {
    if (!open || !onFetchFundamentals || !codesKey) return;
    onFetchFundamentals(codesKey.split(','));
  }, [open, codesKey]);

  if (!open) return null;

  const rowsOf = (list) => list.map((s) => {
    const f = fundamentals[s.code];
    const price = livePrices[s.code] != null ? livePrices[s.code] : s.price;
    const r = ffValuationRow(s.code, f, price, valuationOverride[s.code]);
    // 自動值單獨算一次，明細頁的輸入框 placeholder 要顯示「不覆寫的話會是多少」
    const auto = ffValuationRow(s.code, f, price, null);
    // 查過但沒有（ETF/債券，存成 null）與「還沒查過」要分開講，否則報價服務掛掉時
    // 整頁都會顯示「無 EPS 資料」，看起來像每一檔都沒有財報。
    const fetched = Object.prototype.hasOwnProperty.call(fundamentals, s.code);
    return { ...r, name: s.name, mvT: s.mvTWD != null ? s.mvTWD : 0, autoCagr: auto.cagr, autoYoy: auto.yoy, fetched };
  });

  const rows = rowsOf(tab === 'holdings' ? held : watchlist);
  const sorted = rows.slice().sort(sort === 'peg' ? ffComparePeg :
  (a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

  const doRefresh = async () => {
    if (refreshing || !onFetchFundamentals) return;
    setRefreshing(true);
    setNote('');
    let msg = '';
    try {
      const r = await onFetchFundamentals(codesKey.split(',').filter(Boolean), true);
      if (r && !r.ok) msg = r.reason || '基本面更新失敗';
      else if (r && r.missing > 0) msg = `${r.missing} 檔查無 EPS 資料`;
    } catch (e) { msg = '基本面更新失敗'; }
    setRefreshing(false);
    if (msg) {setNote(msg);setTimeout(() => setNote(''), 4000);}
  };

  const setOverride = (code, field, value) => {
    setValuationOverride((prev) => {
      const next = { ...prev, [code]: { ...(prev[code] || {}), [field]: value } };
      if (next[code].cagr == null && next[code].yoy == null) delete next[code];
      return next;
    });
  };

  const addWatch = (s) => {
    if (watchlist.some((w) => w.code === s.code)) return;
    setWatchlist((prev) => [...prev, { code: s.code, name: s.name }]);
  };
  const removeWatch = (code) => {
    setWatchlist((prev) => prev.filter((w) => w.code !== code));
    setExpanded(null);
  };

  // 分段控制器沿用看板統計頁的視覺：容器淺灰底，選中的按鈕白底加陰影
  const segBtn = (id, lbl) => {
    const on = tab === id;
    return (
      <button key={id} onClick={() => {setTab(id);setExpanded(null);}}
        style={{ flex: 1, height: 44, borderRadius: RS(14), border: 'none',
          background: on ? TOKENS.surface : 'transparent',
          boxShadow: on ? SH('0 2px 8px rgba(0,0,0,0.12)') : 'none',
          color: on ? TOKENS.ink : 'rgba(44,44,50,0.65)',
          fontSize: FS(16), fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{lbl}</button>);

  };
  const sortBtn = (id, lbl) => {
    const on = sort === id;
    return (
      <button key={id} onClick={() => setSort(id)}
        style={{ height: 30, padding: PAD('0 12px'), borderRadius: RS(999),
          border: '1px solid ' + (on ? 'transparent' : 'rgba(0,0,0,0.14)'),
          background: on ? TOKENS.ink2 : 'transparent', color: on ? TOKENS.surface : TOKENS.ink2,
          fontSize: FS(14), cursor: 'pointer' }}>{lbl}</button>);

  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('3px 10px 8px') }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
          background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, fontSize: FS(28), fontWeight: 700, color: TOKENS.ink,
          letterSpacing: -0.5, lineHeight: 1.3 }}>估值分析</div>
        <button onClick={doRefresh} disabled={refreshing} title="更新財報資料"
          style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: refreshing ? 'default' : 'pointer' }}>
          <RefreshCw size={17} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 12px 32px') }}>
        <div style={{ display: 'flex', gap: SP(4), padding: SP(4), borderRadius: RS(18), background: 'rgba(0,0,0,0.06)' }}>
          {segBtn('holdings', '持股')}{segBtn('watch', '關注')}
        </div>

        <div style={{ marginTop: SP(12), display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <div style={{ flex: 1, fontSize: FS(14), color: TOKENS.gray4 }}>排序</div>
          {sortBtn('peg', 'PEG 由低到高')}{sortBtn('code', '代號')}
        </div>

        {note &&
        <div style={{ marginTop: SP(10), fontSize: FS(14), color: TOKENS.red }}>{note}</div>
        }

        <div style={{ marginTop: SP(12), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
          {tab === 'watch' && <AddWatchRow universe={universe} onAdd={addWatch} />}

          {sorted.length === 0 ?
          <div style={{ ...cardStyleVal, textAlign: 'center', color: TOKENS.gray4, fontSize: FS(15), padding: PAD('24px 14px') }}>
            {tab === 'holdings' ? '尚無持倉' : '尚未加入關注標的'}
          </div> :

          sorted.map((r) =>
          <ValuationRow key={r.code} row={r}
            expanded={expanded === r.code}
            onToggle={() => setExpanded(expanded === r.code ? null : r.code)}
            onOverride={setOverride}
            onRemoveWatch={tab === 'watch' ? removeWatch : null} />
          )
          }
        </div>

        <div style={{ marginTop: SP(16), fontSize: FS(13), color: TOKENS.gray4, lineHeight: 1.6 }}>
          PEG = 本益比 ÷ EPS 成長率。低於 1 視為偏低、1～2 合理、高於 2 偏高。
          EPS 取自公開財報（台股 FinMind、美股 SEC EDGAR），可能延遲或缺漏；
          ETF 與債券沒有 EPS，不適用本指標。此頁為估值參考，非投資建議。
        </div>
      </div>
    </div>);

}

window.ValuationSheet = ValuationSheet;
