// 追蹤 / 本益成長比（PEG）：手動加入的追蹤清單比較
import { ffValuationRow, ffComparePeg, ffUpside } from '../valuation.js';

const { useState: useStateVal, useEffect: useEffectVal } = React;

const fmtVal = (n, d) => n == null ? '—' : n.toFixed(d);
const fmtPct = (n) => n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const fmtNum = (n) => n == null ? '—' : Math.round(n).toLocaleString();
// 模組層級取一次：ValuationDetail / ValuationRow 是模組層級元件，不能靠父層把 icon 傳進來
const ChevronRightVal = (props) => React.createElement(window.Icons.ChevronRight, props);
const TrashVal = (props) => React.createElement(window.Icons.Trash, props);
const SearchVal = (props) => React.createElement(window.Icons.Search, props);

// PEG 分區只是估值參考，不是買賣訊號——文案一律用「偏低／合理／偏高」，不用「買進／賣出」。
const ZONE_LABEL = { low: '偏低', fair: '合理', high: '偏高' };
// 主數字用的是哪一個成長率。沒標的話，有法人預估與只有回顧值的兩列會被誤讀成同一個基準。
const BASIS_LABEL = { forward: '預估 PEG', cagr: '歷史 PEG', yoy: '近期 PEG' };
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

// 季底日期 → 圖表下方的短標籤（2025-09-30 → 25Q3）。台股季底就是 3/6/9/12 月底，
// 美股是會計季底（例如 09-27），用月份分季一樣落在對的那一季。
const quarterLabel = (end) => end.slice(2, 4) + 'Q' + Math.ceil(Number(end.slice(5, 7)) / 3);

/* ─── 展開的個股明細 ─────────────────────────────────────────────────── */
function ValuationDetail({ row, onOverride, onOpenEstimates }) {
  const [unit, setUnit] = useStateVal('year'); // year | quarter
  const annual = Object.keys(row.epsAnnual).sort().map((y) => ({ key: y, label: y.slice(2), val: row.epsAnnual[y] }));
  const quarterly = (row.epsQuarters || []).map((q) => ({ key: q.end, label: quarterLabel(q.end), val: q.val }));
  // 舊快取沒有季資料時不給切，免得切過去是一片空白
  const hasQuarters = quarterly.length > 0;
  const bars = unit === 'quarter' && hasQuarters ? quarterly : annual;
  const maxEps = Math.max(...bars.map((b) => Math.abs(b.val)), 0.01);
  // 年/季切換沿用收支統計的月/年切換視覺（dashboard.jsx 的 unitBtn）：
  // 淺灰底容器、選中的按鈕白底加陰影。全 App 的單位切換器維持同一種長相。
  const unitBtn = (id, lbl) => {
    const on = (unit === 'quarter' && hasQuarters ? 'quarter' : 'year') === id;
    return (
      <button key={id} onClick={() => setUnit(id)}
        style={{ width: 34, height: 30, borderRadius: RS(10), border: 'none',
          background: on ? TOKENS.surface : 'transparent',
          boxShadow: on ? SH('0 1px 4px rgba(0,0,0,0.14)') : 'none',
          color: on ? TOKENS.ink : 'rgba(44,44,50,0.6)',
          fontSize: FS(14), fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{lbl}</button>);

  };
  return (
    <div style={{ marginTop: SP(10), paddingTop: SP(12), borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      {bars.length > 0 &&
      <>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <div style={{ flex: 1, fontSize: FS(14), color: TOKENS.ink2 }}>
          {unit === 'quarter' && hasQuarters ? '單季每股盈餘' : '年度每股盈餘'}
        </div>
        {hasQuarters &&
        <div style={{ display: 'flex', gap: SP(2), padding: SP(3), borderRadius: RS(13), background: 'rgba(0,0,0,0.06)' }}>
          {unitBtn('year', '年')}{unitBtn('quarter', '季')}
        </div>
        }
      </div>
      <div style={{ marginTop: SP(8), display: 'flex', alignItems: 'flex-end', gap: SP(4), height: 72 }}>
        {bars.map((b) =>
        <div key={b.key} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP(3) }}>
          <div style={{ fontSize: FS(12), color: TOKENS.ink, fontFamily: TOKENS.fontMono, whiteSpace: 'nowrap' }}>{b.val.toFixed(1)}</div>
          <div style={{ width: '100%', height: Math.max(3, Math.abs(b.val) / maxEps * 40), borderRadius: RS(4),
            background: b.val < 0 ? TOKENS.red : TOKENS.ink2, opacity: 0.85 }} />
          <div style={{ fontSize: FS(12), color: TOKENS.gray3, whiteSpace: 'nowrap' }}>{b.label}</div>
        </div>
        )}
      </div>
      </>
      }

      <div style={{ marginTop: SP(12), display: 'flex', flexWrap: 'wrap', gap: SP(4) + 'px ' + SP(12) + 'px',
        fontSize: FS(14), color: TOKENS.ink2 }}>
        <div>近四季 EPS <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.epsTTM, 2)}</span></div>
        <div>本益比 <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.pe, 1)}</span></div>
      </div>

      {row.hasForward &&
      <div style={{ marginTop: SP(6), display: 'flex', flexWrap: 'wrap', gap: SP(4) + 'px ' + SP(12) + 'px',
        fontSize: FS(14), color: TOKENS.ink2 }}>
        <div>預估 EPS <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.fwdEps, 2)}</span>
          <span style={{ color: TOKENS.gray3 }}> → {fmtVal(row.fwdEpsNext, 2)}</span></div>
        <div>預估本益比 <span style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}>{fmtVal(row.fwdPe, 1)}</span></div>
      </div>
      }
      {row.hasForward &&
      // 點進去看共識的細節（區間、家數、最近被調升還是調降）。條件只看 hasForward，
      // 不看 analysts——家數偶爾會缺，缺了不該連入口都沒有。
      <div onClick={() => onOpenEstimates(row)}
        style={{ marginTop: SP(6), padding: PAD('8px 10px'), borderRadius: RS(12),
          background: 'rgba(0,0,0,0.04)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <div style={{ flex: 1, fontSize: FS(14), color: TOKENS.ink2 }}>
          {/* 家數少的共識就是一兩個人的看法，跟三十幾位分析師的共識不是同一回事 */}
          {row.analysts != null ?
          `法人預估來自 ${row.analysts} 位分析師${row.analysts < 3 ? '（家數少，參考性有限）' : ''}` :
          '法人預估明細'}
        </div>
        <ChevronRightVal size={16} style={{ color: TOKENS.gray4, flexShrink: 0 }} />
      </div>
      }

      <div style={{ marginTop: SP(12), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
        <OverrideInput label={'預估成長率' + (row.fwdOverridden ? '（已自訂）' : '')}
          auto={row.autoFwd} value={row.fwdOverridden ? row.fwdGrowth : null}
          onCommit={(v) => onOverride(row.code, 'fwd', v)} />
        <OverrideInput label={'歷史成長率' + (row.cagrOverridden ? '（已自訂）' : '')}
          auto={row.autoCagr} value={row.cagrOverridden ? row.cagr : null}
          onCommit={(v) => onOverride(row.code, 'cagr', v)} />
        <OverrideInput label={'近期成長率' + (row.yoyOverridden ? '（已自訂）' : '')}
          auto={row.autoYoy} value={row.yoyOverridden ? row.yoy : null}
          onCommit={(v) => onOverride(row.code, 'yoy', v)} />
      </div>
      <div style={{ marginTop: SP(6), fontSize: FS(14), color: TOKENS.gray3, lineHeight: 1.5 }}>
        留空 = 用財報與法人預估自動算。填入自己的預估值可覆寫。
      </div>
    </div>);

}

/* ─── 分析師預估明細頁 ───────────────────────────────────────────────
   列表上只看得到一個平均值，但共識的品質比平均值更值得看：實測 2330 明年預估平均
   138.43、區間卻是 93.3～159.67，同一個 PEG 0.78 照最低估值算會變成 1.2。
   這頁把區間、家數、以及預估最近被調升還是調降攤開。 */
const PERIOD_LABEL = { '0q': '本季', '+1q': '下季', '0y': '今年', '+1y': '明年' };
const REC_LABEL = { strong_buy: '強力買進', buy: '買進', hold: '持有', sell: '賣出', strong_sell: '強力賣出' };
const RATING_ROWS = [
  { key: 'strongBuy', label: '強力買進', color: TOKENS.green },
  { key: 'buy', label: '買進', color: TOKENS.green2 },
  { key: 'hold', label: '持有', color: TOKENS.gold2 },
  { key: 'sell', label: '賣出', color: TOKENS.red2 },
  { key: 'strongSell', label: '強力賣出', color: TOKENS.red }];


function EstimatesSheet({ row, onClose, onFetchEstimates }) {
  const { ChevronRight } = window.Icons;
  const [state, setState] = useStateVal({ loading: true, data: null, error: '' });

  useEffectVal(() => {
    let alive = true;
    setState({ loading: true, data: null, error: '' });
    Promise.resolve(onFetchEstimates ? onFetchEstimates(row.code) : { ok: false, reason: '未接上服務' })
      .then((r) => { if (alive) setState({ loading: false, data: r && r.ok ? r.data : null, error: r && r.ok ? '' : (r && r.reason) || '取得失敗' }); })
      .catch(() => { if (alive) setState({ loading: false, data: null, error: '取得失敗' }); });
    return () => { alive = false; };
  }, [row.code]);

  const d = state.data;
  const periods = d && d.periods || [];
  const target = d && d.target;
  const ratings = d && d.ratings;
  const upside = target ? ffUpside(row.price, target.mean) : null;
  const ratingTotal = ratings ? RATING_ROWS.reduce((a, r) => a + (ratings[r.key] || 0), 0) : 0;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 'var(--ff-detail-top, 62px)', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('3px 10px 8px') }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
          background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: FS(24), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: 1.25,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name || row.code}</div>
          <div style={{ fontSize: FS(14), color: TOKENS.gray3 }}>
            法人預估{d && d.symbol ? ' · ' + d.symbol : ''}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 12px 32px') }}>
        {state.loading &&
        <div style={{ ...cardStyleVal, textAlign: 'center', color: TOKENS.gray3, fontSize: FS(15), padding: PAD('28px 14px') }}>
          載入中…
        </div>
        }
        {!state.loading && state.error &&
        <div style={{ ...cardStyleVal, textAlign: 'center', color: TOKENS.red, fontSize: FS(15), padding: PAD('28px 14px') }}>
          {state.error}
        </div>
        }
        {!state.loading && !state.error && periods.length === 0 &&
        <div style={{ ...cardStyleVal, textAlign: 'center', color: TOKENS.gray3, fontSize: FS(15), padding: PAD('28px 14px') }}>
          這檔沒有分析師預估資料
        </div>
        }

        {target &&
        <div style={{ ...cardStyleVal, marginBottom: SP(8) }}>
          {/* 現價與目標價並排：上漲空間是拿這兩個數字算出來的，藏在小字裡對不起來 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: SP(20) }}>
            <div>
              <div style={{ fontSize: FS(14), color: TOKENS.ink2 }}>目標價</div>
              <div style={{ marginTop: SP(6), display: 'flex', alignItems: 'baseline', gap: SP(8) }}>
                <div style={{ fontSize: FS(26), fontWeight: 700, fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>
                  {fmtNum(target.mean)}
                </div>
                {upside != null &&
                <div style={{ fontSize: FS(16), fontWeight: 600, color: upside < 0 ? TOKENS.red : TOKENS.incBlue }}>
                  {fmtPct(upside)}
                </div>
                }
              </div>
            </div>
            {row.price != null &&
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: FS(14), color: TOKENS.ink2 }}>現價</div>
              <div style={{ marginTop: SP(6), fontSize: FS(22), fontWeight: 600,
                fontFamily: TOKENS.fontMono, color: TOKENS.ink2 }}>
                {fmtNum(row.price)}
              </div>
            </div>
            }
          </div>
          <div style={{ marginTop: SP(4), fontSize: FS(14), color: TOKENS.gray3 }}>
            區間 {fmtNum(target.low)} ~ {fmtNum(target.high)}
            {target.analysts ? ` · ${target.analysts} 位` : ''}
            {target.key && REC_LABEL[target.key] ? ` · ${REC_LABEL[target.key]}` : ''}
          </div>
        </div>
        }

        {ratings && ratingTotal > 0 &&
        <div style={{ ...cardStyleVal, marginBottom: SP(8) }}>
          <div style={{ fontSize: FS(14), color: TOKENS.ink2 }}>評等分布</div>
          <div style={{ marginTop: SP(8), display: 'flex', flexDirection: 'column', gap: SP(6) }}>
            {RATING_ROWS.map((r) => {
              const n = ratings[r.key] || 0;
              return (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
                  <div style={{ width: 62, fontSize: FS(14), color: TOKENS.ink2, flexShrink: 0 }}>{r.label}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: RS(4), background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: n / ratingTotal * 100 + '%', height: '100%', background: r.color, borderRadius: RS(4) }} />
                  </div>
                  <div style={{ width: 22, textAlign: 'right', fontSize: FS(14), fontFamily: TOKENS.fontMono,
                    color: n ? TOKENS.ink : TOKENS.gray3 }}>{n}</div>
                </div>);

            })}
          </div>
        </div>
        }

        {periods.map((p) => {
          const spread = p.low != null && p.high != null;
          const revUp = p.revisions && p.revisions.up30;
          const revDown = p.revisions && p.revisions.down30;
          const d30 = p.trend && p.trend.d30;
          const d90 = p.trend && p.trend.d90;
          return (
            <div key={p.key} style={{ ...cardStyleVal, marginBottom: SP(8) }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SP(8) }}>
                <div style={{ fontSize: FS(16), fontWeight: 600, color: TOKENS.ink }}>
                  {PERIOD_LABEL[p.key] || p.key}
                  {p.endDate ? <span style={{ fontSize: FS(14), fontWeight: 400, color: TOKENS.gray3 }}> {String(p.endDate).slice(0, 7)}</span> : null}
                </div>
                <div style={{ fontSize: FS(20), fontWeight: 700, fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>
                  {fmtVal(p.avg, 2)}
                </div>
              </div>
              <div style={{ marginTop: SP(4), fontSize: FS(14), color: TOKENS.ink2 }}>
                {spread ? `區間 ${fmtVal(p.low, 2)} ~ ${fmtVal(p.high, 2)}` : ''}
                {p.analysts ? ` · ${p.analysts} 位` : ''}
                {p.growth != null ? ` · 年增 ${fmtPct(p.growth * 100)}` : ''}
              </div>
              {(d30 != null || d90 != null) &&
              // 預估被調升還是調降，比預估值本身更接近「最近發生了什麼」
              <div style={{ marginTop: SP(4), fontSize: FS(14), color: TOKENS.gray3 }}>
                30 天前 {fmtVal(d30, 2)} · 90 天前 {fmtVal(d90, 2)}
                {revUp || revDown ? ` · 近 30 天 ${revUp || 0} 升 ${revDown || 0} 降` : ''}
              </div>
              }
            </div>);

        })}

        {periods.length > 0 &&
        <div style={{ marginTop: SP(8), fontSize: FS(14), color: TOKENS.gray3, lineHeight: 1.6 }}>
          資料為賣方分析師的共識預估（來源 Yahoo），會錯、也普遍偏樂觀，賣出評等本來就極少見。
          區間越寬代表分歧越大，平均值的參考性越低。此頁為資訊呈現，非投資建議。
        </div>
        }
      </div>
    </div>);

}

/* ─── 單一標的列 ─────────────────────────────────────────────────────── */
function ValuationRow({ row, expanded, onToggle, onOverride, onRemoveWatch, onOpenEstimates }) {
  // 展開的那一列要看得出來是「被選到的」：卡片邊框換成主色再加一圈淡光暈。
  const selected = expanded ? { border: '1px solid ' + TOKENS.accent,
    boxShadow: SH('0 0 0 3px rgba(217,119,87,0.20)') } : null;
  return (
    <div onClick={onToggle} style={{ ...cardStyleVal, ...selected, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(10) }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: zoneColor(row.zone) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 現價跟名稱同一行：它是每天在看的數字，擠在代號後面的小字裡太不顯眼 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: SP(8) }}>
            <div style={{ minWidth: 0, fontSize: FS(17), fontWeight: 600, color: TOKENS.ink, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name || row.code}</div>
            {row.price != null &&
            <div style={{ flexShrink: 0, fontSize: FS(17), fontWeight: 600,
              fontFamily: TOKENS.fontMono, color: TOKENS.ink }}>{row.price.toLocaleString()}</div>
            }
          </div>
          <div style={{ marginTop: SP(2), fontSize: FS(14), color: TOKENS.gray3 }}>{row.code}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {row.hasFundamentals ?
          <>
          <div style={{ fontSize: FS(19), fontWeight: 700, fontFamily: TOKENS.fontMono, color: zoneColor(row.zone) }}>
            {fmtVal(row.pegMain, 2)}
          </div>
          <div style={{ marginTop: SP(2), fontSize: FS(14), color: TOKENS.gray3 }}>
            {BASIS_LABEL[row.pegBasis] || ''}{row.zone ? ' · ' + ZONE_LABEL[row.zone] : ''}
          </div>
          </> :

          <div style={{ fontSize: FS(14), color: TOKENS.gray3 }}>
            {row.fetched ? '無 EPS 資料' : '尚未取得'}
          </div>
          }
        </div>
        {/* stopPropagation：這顆按鈕在可點的整列裡面，不擋住就會順便把列展開／收合。 */}
        <button onClick={(e) => {e.stopPropagation();onRemoveWatch(row.code);}} title="從追蹤移除"
          style={{ width: 34, height: 34, flexShrink: 0, borderRadius: RS(10),
            background: 'transparent', border: 'none', color: TOKENS.gray4, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrashVal size={17} />
        </button>
      </div>

      {/* 三種成長率是展開後才要看的細節，收合列只留主數字，清單才掃得快 */}
      {row.hasFundamentals && expanded &&
      <div style={{ marginTop: SP(8), display: 'flex', flexWrap: 'wrap', gap: SP(4) + 'px ' + SP(12) + 'px',
        fontSize: FS(14), color: TOKENS.ink2 }}>
        {row.hasForward || row.fwdOverridden ?
        <div>預估 {fmtPct(row.fwdGrowth)} · PEG {fmtVal(row.pegFwd, 2)}{row.fwdOverridden ? ' ✎' :
          row.analysts ? ` · ${row.analysts} 位分析師` : ''}</div> :

        // 沒有法人預估要講出來——主數字是回顧值，跟有預估的那幾列不是同一個基準
        <div style={{ color: TOKENS.gray3 }}>無法人預估</div>
        }
        <div>歷史 {fmtPct(row.cagr)} · PEG {fmtVal(row.pegCagr, 2)}{row.cagrOverridden ? ' ✎' : ''}</div>
        <div>近期 {fmtPct(row.yoy)} · PEG {fmtVal(row.pegYoy, 2)}{row.yoyOverridden ? ' ✎' : ''}</div>
      </div>
      }

      {expanded &&
      <div onClick={(e) => e.stopPropagation()}>
        <ValuationDetail row={row} onOverride={onOverride} onOpenEstimates={onOpenEstimates} />
      </div>
      }
    </div>);

}

/* ─── 搜尋並加入追蹤 ─────────────────────────────────────────────────── */
function AddWatchRow({ universe, onAdd }) {
  const [q, setQ] = useStateVal('');
  const key = q.trim().toLowerCase();
  const matches = key ? universe.filter((u) =>
  u.code.toLowerCase().startsWith(key) || u.name.includes(q.trim())).slice(0, 6) : [];
  return (
    <div style={cardStyleVal}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <SearchVal size={18} style={{ color: TOKENS.ink2, flexShrink: 0 }} />
        {/* autoFocus：這張卡是按放大鏡才展開的，展開了還要再點一次輸入框很囉唆 */}
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="輸入代號或名稱加入追蹤"
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
function ValuationSheet({ open, onClose, fundamentals = {}, livePrices = {},
  watchlist = [], setWatchlist, valuationOverride = {}, setValuationOverride, onFetchFundamentals, onFetchEstimates }) {
  const { ChevronRight, RefreshCw, Search } = window.Icons;
  const [searchOpen, setSearchOpen] = useStateVal(false);
  const [sort, setSort] = useStateVal('peg'); // peg | code
  const [expanded, setExpanded] = useStateVal(null);
  const [refreshing, setRefreshing] = useStateVal(false);
  const [note, setNote] = useStateVal('');
  const [estimatesFor, setEstimatesFor] = useStateVal(null); // 疊在這頁上的法人預估明細

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

  // 追蹤清單完全由使用者手動加入，不自動帶入持股——想追蹤的標的跟持有的部位是兩件事。
  const tracked = watchlist.filter((w) => w && w.code);

  // 開頁時補抓還沒有的基本面。財報是季頻資料，fetchFundamentals 內部只會問沒問過的代號。
  const codesKey = tracked.map((t) => t.code).join(',');
  useEffectVal(() => {
    if (!open || !onFetchFundamentals || !codesKey) return;
    onFetchFundamentals(codesKey.split(','));
  }, [open, codesKey]);

  if (!open) return null;

  const rowsOf = (list) => list.map((s) => {
    const f = fundamentals[s.code];
    const price = livePrices[s.code];
    const r = ffValuationRow(s.code, f, price, valuationOverride[s.code]);
    // 自動值單獨算一次，明細頁的輸入框 placeholder 要顯示「不覆寫的話會是多少」
    const auto = ffValuationRow(s.code, f, price, null);
    // 查過但沒有（ETF/債券，存成 null）與「還沒查過」要分開講，否則報價服務掛掉時
    // 整頁都會顯示「無 EPS 資料」，看起來像每一檔都沒有財報。
    const fetched = Object.prototype.hasOwnProperty.call(fundamentals, s.code);
    return { ...r, name: s.name,
      autoCagr: auto.cagr, autoYoy: auto.yoy, autoFwd: auto.fwdGrowth, fetched };
  });

  const sorted = rowsOf(tracked).sort(sort === 'peg' ? ffComparePeg :
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
      const o = next[code];
      if (o.cagr == null && o.yoy == null && o.fwd == null) delete next[code];
      return next;
    });
  };

  const addWatch = (s) => {
    if (watchlist.some((w) => w.code === s.code)) return;
    setWatchlist((prev) => [...prev, { code: s.code, name: s.name }]);
  };
  const removeWatch = (code) => {
    setWatchlist((prev) => prev.filter((w) => w.code !== code));
    // 只在刪掉的正好是展開中的那一列時才收合。垃圾桶現在在收合列上，
    // 一律清掉的話，刪 A 會順手把正在看的 B 收起來。
    setExpanded((cur) => cur === code ? null : cur);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: SP(12), padding: PAD('3px 10px 16px') }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
          background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, fontSize: FS(28), fontWeight: 700, color: TOKENS.ink,
          letterSpacing: -0.5, lineHeight: 1.3 }}>追蹤</div>
        <button onClick={() => setSearchOpen((v) => !v)} title="加入追蹤"
          style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: searchOpen ? TOKENS.ink2 : 'rgba(0,0,0,0.09)',
            border: '1px solid rgba(0,0,0,0.12)', color: searchOpen ? TOKENS.surface : 'rgba(60,60,67,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Search size={18} />
        </button>
        <button onClick={doRefresh} disabled={refreshing} title="更新財報資料"
          style={{ width: 40, height: 40, borderRadius: RS(20), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(60,60,67,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: refreshing ? 'default' : 'pointer' }}>
          <RefreshCw size={17} style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: PAD('0 12px 32px') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP(8) }}>
          <div style={{ flex: 1, fontSize: FS(14), color: TOKENS.gray3 }}>排序</div>
          {sortBtn('peg', 'PEG 由低到高')}{sortBtn('code', '代號')}
        </div>

        {note &&
        <div style={{ marginTop: SP(10), fontSize: FS(14), color: TOKENS.red }}>{note}</div>
        }

        <div style={{ marginTop: SP(12), display: 'flex', flexDirection: 'column', gap: SP(8) }}>
          {searchOpen && <AddWatchRow universe={universe} onAdd={addWatch} />}

          {sorted.length === 0 ?
          <div style={{ ...cardStyleVal, textAlign: 'center', color: TOKENS.gray3, fontSize: FS(15), padding: PAD('24px 14px') }}>
            尚無追蹤標的，用右上角的放大鏡加入
          </div> :

          sorted.map((r) =>
          <ValuationRow key={r.code} row={r}
            expanded={expanded === r.code}
            onToggle={() => setExpanded(expanded === r.code ? null : r.code)}
            onOverride={setOverride}
            onRemoveWatch={removeWatch}
            onOpenEstimates={setEstimatesFor} />
          )
          }
        </div>

        <div style={{ marginTop: SP(16), fontSize: FS(14), color: TOKENS.gray3, lineHeight: 1.6 }}>
          PEG = 本益比 ÷ EPS 成長率。低於 1 視為偏低、1～2 合理、高於 2 偏高。
          主數字優先用「預估 PEG」（分析師共識的下年度成長，來自 Yahoo），沒有覆蓋的標的
          退回「歷史 PEG」——兩者基準不同，跨標的比較時要看清楚標示。
          EPS 取自公開財報（台股 FinMind、美股 SEC EDGAR），可能延遲或缺漏；
          法人預估會錯，且分析師家數少時更不可靠。ETF 與債券沒有 EPS，不適用本指標。
          此頁為估值參考，非投資建議。
        </div>
      </div>

      {estimatesFor &&
      <EstimatesSheet row={estimatesFor} onClose={() => setEstimatesFor(null)}
        onFetchEstimates={onFetchEstimates} />
      }
    </div>);

}

window.ValuationSheet = ValuationSheet;
