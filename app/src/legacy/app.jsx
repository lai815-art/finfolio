// Main App + Tab Bar (6 tabs, center FAB for 記帳 → bottom sheet)
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

// 是否以「加入主畫面」的獨立 App 方式開啟（此時系統已有真正的狀態列，不需畫假的）。
const IS_STANDALONE = typeof window !== 'undefined' && (
window.FF_STANDALONE === true ||
window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ||
window.navigator && window.navigator.standalone === true);
// 獨立 App 不畫假狀態列：頂部留白用 index.html fit() 算好的 --ff-main-top
// （畫布外探針量真實安全區、除以縮放比 k 校正，再收 8px）。
// 舊寫法 env()−18px 沒做縮放校正、又收太多，右上角眼睛按鈕會頂進系統狀態列被切到。
// ff_fundamentals 的快取形狀版本。Worker 的 /fundamentals 多回欄位時要 +1，
// 否則快取是以「月」為單位，使用者要等到下個月才看得到新欄位。
const FUND_CACHE_V = 3;
const TOP_INSET = IS_STANDALONE ? 'var(--ff-main-top, 44px)' : '62px';
const SBAR_H = TOP_INSET;
const CONTENT_TOP = IS_STANDALONE ? `calc(${TOP_INSET} + 60px)` : '122px';
if (typeof window !== 'undefined') window.FF_SBAR_H = SBAR_H;
// 明細頁（資產淨額明細／收支統計／投資組合明細）的返回箭頭+標題直接貼著這個間距，
// 沒有額外內距可以吃掉縮減量，所以用完整安全區，避免被瀏海/動態島蓋到。
const DETAIL_TOP = IS_STANDALONE ? 'max(0px, env(safe-area-inset-top, 0px))' : '62px';
if (typeof window !== 'undefined') window.FF_DETAIL_TOP = DETAIL_TOP;

// AI 顧問尚未完成（需使用者自備 API 金鑰），先隱藏整個分頁。改回 true 即可重新顯示。
const SHOW_ADVISOR = false;

// 本機自動備份：開啟後，於 App 開啟／離開時把所有 ff_ 資料另存一份本機快照。
// 可在「設定 → 加密備份 / 還原」用「從本機快照還原」回復。（無法對抗手動清除網站資料，故另有匯出提醒。）
function ffAutoSnapshot() {
  try {
    if (localStorage.getItem('ff_auto_backup') !== '1') return;
    const SKIP = { ff_auto_snapshot: 1, ff_auto_backup: 1, ff_last_auto_backup: 1, ff_last_export: 1 };
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('ff_') === 0 && !SKIP[k]) data[k] = localStorage.getItem(k);
    }
    const ts = new Date().toISOString();
    localStorage.setItem('ff_auto_snapshot', JSON.stringify({ v: 1, ts, data }));
    localStorage.setItem('ff_last_auto_backup', ts);
  } catch (e) {/* localStorage 無法使用時略過 */}
}
if (typeof window !== 'undefined') window.ffAutoSnapshot = ffAutoSnapshot;

// 找出「會造成餘額算錯」的重複帳戶名稱：同一類別內同名、或一般↔證券同名。
// 交割戶名稱與一般帳戶相同視為同一個可交割帳戶（合法、會被合併），不列入衝突。
function ffFindDupNames(md) {
  try {
    md = md || {};
    const acctNames = (md.accounts || []).map((a) => a && a.name).filter(Boolean);
    const brokerNames = (md.brokers || []).map((a) => a && a.name).filter(Boolean);
    const acctSet = new Set(acctNames);
    const settleExtra = (md.settle || []).map((s) => s && s.name).filter(Boolean).filter((n) => !acctSet.has(n));
    const all = [...acctNames, ...brokerNames, ...settleExtra];
    const seen = {},dups = [];
    all.forEach((n) => {if (seen[n]) {if (dups.indexOf(n) < 0) dups.push(n);} else seen[n] = true;});
    return dups;
  } catch {return [];}
}
if (typeof window !== 'undefined') window.ffFindDupNames = ffFindDupNames;

// 自動轉帳 / 定期支出的規則邏輯移到 ./recurring.js（見檔案開頭說明），
// 那裡也負責把 ffInitialLastRun 等掛到 window 供 settings.jsx 使用。

/* ── App 鎖定：進入需輸入密碼，可選生物辨識（Face ID / 指紋）─────────
   密碼以 SHA-256（加 salt）雜湊後存於本機，不存明碼。生物辨識用 WebAuthn
   平台驗證器（本機用途，不做伺服器驗證）。 */
async function ffSha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function ffLockEnabled() {try {return !!localStorage.getItem('ff_lock_pin');} catch {return false;}}
function ffLockLen() {try {return parseInt(localStorage.getItem('ff_lock_len'), 10) || 4;} catch {return 4;}}
async function ffSetPin(pin) {
  let salt = localStorage.getItem('ff_lock_salt');
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('ff_lock_salt', salt);
  }
  localStorage.setItem('ff_lock_pin', await ffSha256Hex(salt + ':' + pin));
  localStorage.setItem('ff_lock_len', String(pin.length));
}
async function ffCheckPin(pin) {
  const salt = localStorage.getItem('ff_lock_salt') || '';
  return (await ffSha256Hex(salt + ':' + pin)) === localStorage.getItem('ff_lock_pin');
}
function ffClearLock() {['ff_lock_pin', 'ff_lock_salt', 'ff_lock_len', 'ff_lock_bio', 'ff_lock_cred'].forEach((k) => {try {localStorage.removeItem(k);} catch {}});}
function ffBioOn() {try {return localStorage.getItem('ff_lock_bio') === '1' && !!localStorage.getItem('ff_lock_cred');} catch {return false;}}

function _b64buf(b64) {const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));const a = new Uint8Array(bin.length);for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);return a.buffer;}
function _bufb64(buf) {const a = new Uint8Array(buf);let s = '';for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);return btoa(s);}
async function ffBioAvailable() {
  try {return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());} catch {return false;}
}
async function ffBioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'FinFolio' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'finfolio', displayName: 'FinFolio' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000, attestation: 'none' } });
  if (!cred) throw new Error('未建立生物辨識');
  localStorage.setItem('ff_lock_cred', _bufb64(cred.rawId));
}
async function ffBioVerify() {
  const id = localStorage.getItem('ff_lock_cred');
  if (!id) throw new Error('尚未設定生物辨識');
  const a = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: _b64buf(id) }],
      userVerification: 'required', timeout: 60000 } });
  return !!a;
}
if (typeof window !== 'undefined') Object.assign(window, { ffLockEnabled, ffLockLen, ffSetPin, ffCheckPin, ffClearLock, ffBioOn, ffBioAvailable, ffBioRegister, ffBioVerify });

function LockScreen({ onUnlock }) {
  const { Lock, Check } = window.Icons;
  const [pin, setPin] = useStateApp('');
  const [err, setErr] = useStateApp(false);
  const [bioBusy, setBioBusy] = useStateApp(false);
  const len = ffLockLen();
  const bio = ffBioOn();

  const tryBio = () => {
    if (!bio || bioBusy) return;
    setBioBusy(true);
    ffBioVerify().then((ok) => {if (ok) onUnlock();}).catch(() => {}).then(() => setBioBusy(false));
  };
  // 一設定生物辨識就在開啟畫面自動啟動；若平台要求手勢（iOS 常見），
  // 畫面任一處第一次觸碰也會立即啟動，不必特地找按鈕。
  useEffectApp(() => {if (bio) tryBio();}, []);
  const onScreenTap = () => {if (bio) tryBio();};

  const push = (d) => {
    if (pin.length >= len) return;
    const next = pin + d;
    setErr(false);setPin(next);
    if (next.length === len) {
      ffCheckPin(next).then((ok) => {
        if (ok) onUnlock();else {setErr(true);setTimeout(() => setPin(''), 400);}
      });
    }
  };
  const back = () => {setErr(false);setPin(pin.slice(0, -1));};

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <div onPointerDown={onScreenTap} style={{ position: 'absolute', inset: 0, zIndex: 200, background: TOKENS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: PAD('0 30px') }}>
      <button onClick={tryBio} disabled={!bio} style={{ width: 64, height: 64, borderRadius: RS(22),
        background: bio ? TOKENS.accent : TOKENS.ink, border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.surface,
        opacity: bioBusy ? 0.6 : 1, cursor: bio ? 'pointer' : 'default' }}><Lock size={28} /></button>
      <div style={{ fontSize: FS(22), fontWeight: 700, color: TOKENS.ink, marginTop: SP(16) }}>{bio ? '以生物辨識解鎖' : '輸入密碼解鎖'}</div>
      <div style={{ fontSize: FS(16), color: 'rgba(44,44,50,0.5)', marginTop: SP(4) }}>{err ? '密碼錯誤，請再試一次' : bio ? '點畫面任一處，或用下方密碼' : 'FinFolio 已鎖定'}</div>

      {/* dots */}
      <div style={{ display: 'flex', gap: SP(14), margin: PAD('26px 0 30px'), animation: err ? 'shake 0.3s' : 'none' }}>
        {Array.from({ length: len }).map((_, i) =>
        <div key={i} style={{ width: 16, height: 16, borderRadius: RS(10),
          background: i < pin.length ? err ? TOKENS.red : TOKENS.ink : 'transparent',
          border: `2px solid ${err ? TOKENS.red : i < pin.length ? TOKENS.ink : 'rgba(0,0,0,0.28)'}` }} />
        )}
      </div>

      {/* keypad（點數字鍵不應觸發生物辨識，故阻擋冒泡）*/}
      <div onPointerDown={(e) => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 76px)', gap: SP(16) }}>
        {KEYS.map((k, i) => {
          if (k === '') return <div key={i} />;
          if (k === 'del') return (
            <button key={i} onClick={back} style={{ height: 76, borderRadius: RS(40), background: 'transparent', border: 'none',
              color: TOKENS.ink, fontSize: FS(26), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌫</button>);
          return (
            <button key={i} onClick={() => push(k)} style={{ height: 76, borderRadius: RS(40),
              background: TOKENS.surface, border: '1px solid rgba(0,0,0,0.12)', color: TOKENS.ink,
              fontSize: FS(28), fontWeight: 500, fontFamily: TOKENS.fontMono }}>{k}</button>);
        })}
      </div>
      {bio &&
      <button onPointerDown={(e) => e.stopPropagation()} onClick={tryBio} style={{
        marginTop: SP(22), background: 'transparent', border: 'none', color: TOKENS.accent,
        fontSize: FS(17), fontWeight: 600 }}>
        使用生物辨識解鎖
      </button>
      }
    </div>);

}

/* ─── Data compute helpers ────────────────────────────────────────── */
// computeAccounts/computeHoldings/tradeChrono/fifoConsume moved to ./compute.js
// (pure logic, no React) so they can be unit-tested without importing this
// file's ReactDOM.createRoot(...) mount call at the bottom.
import { computeAccounts, computeHoldings, tradeChrono, fifoConsume,
  excludeHiddenAccounts, excludeHiddenHoldings } from './compute.js';
import { parseUtterance } from './voice-parse.js';
import { ffRunRecurring } from './recurring.js';
import { ffRememberAccount } from './last-account.js';

const TAB_COLORS = [TOKENS.ink2, TOKENS.gray3, TOKENS.gray2, TOKENS.gray4, TOKENS.gray1, TOKENS.ink];

// 模擬即時報價：外部報價 API 在預覽環境會被 CORS 擋下，
// 取不到真實報價時，依股票代號產生穩定且合理的「現價」做為備援。
function simCurrentPrice(code, base) {
  if (!base || base <= 0) return base || 0;
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  const r = ((h >>> 0) % 1000) / 1000; // 0..1, 穩定
  const delta = (r - 0.42) * 0.18; // 約 -7.6% ~ +10.4%
  const p = base * (1 + delta);
  return base >= 100 ? Math.round(p * 10) / 10 : Math.round(p * 100) / 100;
}

function StatusBar() {
  const [now, setNow] = useStateApp(() => new Date());
  useEffectApp(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // 獨立 App：系統自帶狀態列，留同高度的空白即可（不重複畫時間/電量）。
  if (IS_STANDALONE) return <div style={{ height: SBAR_H }} />;
  return (
    <div style={{
      height: 62, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: PAD('0 28px 8px'), color: TOKENS.ink, position: 'relative', zIndex: 5
    }}>
      <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: FS(20), fontWeight: 600 }}>{clock}</span>
      <div style={{ display: 'flex', gap: SP(6), alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill={TOKENS.ink}>
          <rect x="0" y="7" width="3" height="4" rx="0.7" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.7" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.7" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.7" />
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={TOKENS.ink} strokeWidth="1.2">
          <path d="M1 4a10 10 0 0 1 14 0M3 6a7 7 0 0 1 10 0M5 8a4 4 0 0 1 6 0" />
          <circle cx="8" cy="10" r="1" fill={TOKENS.ink} />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={TOKENS.ink} strokeOpacity="0.5" fill="none" />
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill={TOKENS.green} />
          <path d="M24 4v4c.8-.3 1.5-1.2 1.5-2s-.7-1.7-1.5-2Z" fill={TOKENS.ink} fillOpacity="0.5" />
        </svg>
      </div>
    </div>);

}

function NavHeader({ tab, onSettings, hideAmounts, setHideAmounts }) {
  const { Settings, Eye, EyeOff } = window.Icons;
  const titles = {
    dashboard: 'FinFolio',
    accounts: '資產帳戶',
    invest: '投資組合',
    advisor: 'AI 財富導師'
  };
  const headBtn = {
    borderRadius: "20px", marginBottom: SP(2), flexShrink: 0,
    background: 'rgba(0,0,0,0.09)',
    color: 'rgba(44,44,50,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: "40px", height: "40px", margin: "1px 0px 2px",
    border: "1px solid rgba(0, 0, 0, 0.12)", lineHeight: "1.5"
  };
  return (
    <div style={{ ...{ padding: PAD('6px 18px 12px'), display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }, padding: "2px 14px 8px" }}>
      <div style={{ fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, fontSize: FS(30), lineHeight: "1.1" }}>
        {titles[tab] || 'FinFolio'}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: SP(8) }}>
        {setHideAmounts &&
        <button onClick={() => setHideAmounts(!hideAmounts)} aria-label="切換金額顯示" style={headBtn}>
          {hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        }
      </div>
    </div>);

}

function TabBar({ tab, setTab, onVoice, onManualRecord, onSettings }) {
  const { LayoutGrid, PiggyBank, Plus, Mic, Sparkles, Settings } = window.Icons;
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
      onVoice(); // long-press → AI voice record
    }, 450);
  };
  const endPress = () => {
    setHolding(false);
    if (pressTimer.current) {clearTimeout(pressTimer.current);pressTimer.current = null;}
    if (!longFired.current) onManualRecord(); // tap → manual record
  };
  const cancelPress = () => {
    setHolding(false);
    if (pressTimer.current) {clearTimeout(pressTimer.current);pressTimer.current = null;}
  };

  const { TrendUp: TrendUpTab } = window.Icons;
  const tabs = [
  { id: 'dashboard', label: '看板', Icon: LayoutGrid },
  { id: 'accounts', label: '資產', Icon: PiggyBank },
  { id: 'record', label: '記帳', Icon: Plus, special: true },
  { id: 'invest', label: '投資', Icon: TrendUpTab },
  ...(SHOW_ADVISOR ? [{ id: 'advisor', label: 'AI 顧問', Icon: Sparkles }] : []),
  { id: 'settings', label: '設定', Icon: Settings, isSettings: true }];

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: SP(20), pointerEvents: 'none',
      background: `linear-gradient(to top, ${TOKENS.bgWarm} 55%, rgba(38,38,36,0))`
    }}>
      <div style={{ ...{
          margin: PAD('0 14px'), position: 'relative', pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: RS(26),
          border: '1px solid rgba(0,0,0,0.14)',
          boxShadow: SH('0 12px 32px rgba(0,0,0,0.12)'),
          padding: PAD('6px 6px'), display: 'flex', alignItems: 'center', gap: SP(2)
        }, borderRadius: "20px" }}>
        {tabs.map((t) => {
          if (t.special) {
            return (
              <button key={t.id}
              onPointerDown={startPress}
              onPointerUp={endPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                flex: '0 0 auto', width: 68, height: 84, borderRadius: RS(34),
                marginTop: -32, marginLeft: SP(2), marginRight: SP(2),
                background: TOKENS.gradDark,
                border: `3px solid ${TOKENS.bg}`,
                color: TOKENS.surface, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: holding ?
                TOKENS.innerGlow + ', 0 0 0 6px rgba(0,0,0,0.20), 0 10px 24px rgba(217, 119, 87,0.5)' :
                TOKENS.innerGlow + ', 0 10px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.14)',
                transform: holding ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 140ms, box-shadow 200ms',
                touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none'
              }}>
                {holding &&
                <span style={{ position: 'absolute', inset: -3, borderRadius: RS(33),
                  border: '2px solid rgba(0,0,0,0.84)',
                  animation: 'pulse 0.9s ease-out infinite' }} />
                }
                <t.Icon size={34} strokeWidth={2.4} />
                {/* mic badge — signals long-press voice record */}
                <span style={{
                  position: 'absolute', right: -5, bottom: -5,
                  width: 30, height: 30, borderRadius: RS(20),
                  background: TOKENS.surface2, border: `2px solid ${TOKENS.bgWarm}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: TOKENS.gray4
                }}>
                  <Mic size={20} strokeWidth={2.2} />
                </span>
              </button>);

          }
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => t.isSettings ? onSettings() : setTab(t.id)} style={{ ...{
                flex: 1, minWidth: 0, minHeight: 70, borderRadius: RS(18),
                background: active ? TOKENS.ink2 : 'transparent',
                boxShadow: active ? TOKENS.innerGlow : 'none',
                border: active ? `1px solid ${TOKENS.accent}` : '1px solid transparent',
                color: active ? TOKENS.surface : 'rgba(0,0,0,0.90)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: SP(3), transition: 'all 200ms', cursor: 'pointer', padding: SP(0), width: "70px"
              }, border: "1px solid rgba(255, 255, 255, 0)" }}>
              <t.Icon size={32} strokeWidth={active ? 2 : 1.6} />
              <span style={{ ...{ fontSize: FS(13), fontWeight: active ? 600 : 500, letterSpacing: 0.2 }, fontSize: "13px" }}>{t.label}</span>
            </button>);

        })}
      </div>
      {/* 選單距離底部固定 ~20px（上方 paddingBottom），不再額外加整段安全區，
          讓中間可顯示的內容區域更大。 */}
    </div>);

}

function RecordSheet({ open, draft, onClose, onSaved, onDelete, masterData, computedHoldings, defaultDate }) {
  const { X, Mic, Plus, Sparkles, Pencil } = window.Icons;
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

  // 關閉：先向下滑出（shown→false），動畫結束後才真正關閉，做出滑出效果。
  const animateClose = () => { setShown(false); setTimeout(() => onClose && onClose(), 280); };

  if (!open) return null;
  return (
    <div style={{
      // zIndex 高於帳戶/個股詳情頁(65)，這樣編輯時詳情頁可以留在底下不卸載，
      // 記一筆滑出時直接露出底下的詳情頁，不會先閃一下資產清單再跳回詳情頁。
      position: 'absolute', inset: 0, zIndex: 100,
      background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
      transition: 'background 220ms ease-out',
      display: 'flex', alignItems: 'flex-end'
    }} onClick={animateClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', height: '100%',
        background: TOKENS.bg,
        borderRadius: 0,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'),
        display: 'flex', flexDirection: 'column'
      }}>
        {/* 頂部安全區留白（全螢幕：讓標題不被狀態列/瀏海切到） */}
        <div style={{ height: 'var(--ff-main-top, 28px)', flexShrink: 0 }} />
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('4px 0 4px') }}>
          <div style={{ width: 40, height: 4, borderRadius: RS(8), background: 'rgba(0,0,0,0.38)' }} />
        </div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: PAD('8px 18px 12px')
        }}>
          <div>
            <div style={{ fontSize: FS(20), fontWeight: 600, color: TOKENS.ink,
              display: 'flex', alignItems: 'center', gap: SP(8) }}>
              {draft ? draft.edit ? <><Pencil size={18} /> 編輯紀錄</> : <><Sparkles size={18} /> 確認記帳內容</> : '記一筆'}
            </div>
            <div style={{ fontSize: FS(17), color: 'rgba(0,0,0,0.86)', marginTop: SP(2) }}>
              {draft ? draft.edit ? '修改欄位後儲存' : 'AI 已解析並帶入，確認後送出' : '手動填寫收支、轉帳或股票'}
            </div>
          </div>
          <button onClick={animateClose} style={{ ...{
              width: 36, height: 46, borderRadius: RS(18), flexShrink: 0,
              background: 'rgba(0,0,0,0.14)', border: 'none',
              color: 'rgba(44,44,50,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }, width: "40px", height: "40px", borderRadius: "18px" }}><X size={18} /></button>
        </div>
        {/* 內容區：表單自行捲動，動作按鈕固定在底部 */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AccountingScreen onSaved={onSaved} onDelete={onDelete} initialDraft={draft} masterData={masterData} computedHoldings={computedHoldings} defaultDate={defaultDate} />
        </div>
      </div>
    </div>);

}

/* ============= Voice listening overlay (long-press) ============= */

function VoiceListenOverlay({ open, onDone, onCancel, masterData }) {
  const { Mic, X, Volume, Sparkles, Check } = window.Icons;
  const [phase, setPhase] = useStateApp('input'); // input | parsing
  const [listening, setListening] = useStateApp(false);
  const [text, setText] = useStateApp('');
  const [shown, setShown] = useStateApp(false);
  const recRef = React.useRef(null);
  const finalRef = React.useRef('');
  const doneRef = React.useRef(false);

  useEffectApp(() => {
    if (!open) {setShown(false);return;}
    setShown(true);setPhase('input');setText('');setListening(false);finalRef.current = '';doneRef.current = false;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // 不支援語音 → 直接打字（輸入框一律顯示）
    let rec;
    try {
      rec = new SR();
      rec.lang = 'zh-TW';rec.interimResults = true;rec.continuous = false;
      rec.onstart = () => setListening(true);
      rec.onresult = (e) => {
        let finalT = '',interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalT += r[0].transcript;else interim += r[0].transcript;
        }
        finalRef.current = finalT;
        setText((finalT + interim).trim());
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false); // 不自動送出，交由使用者按「完成」
      recRef.current = rec;
      rec.start();
    } catch (err) {setListening(false);}

    return () => {try {doneRef.current = true;recRef.current && recRef.current.abort();} catch {}};
  }, [open]);

  const finishWith = (t) => {
    const v = (t || '').trim();
    if (!v || doneRef.current) return;
    doneRef.current = true;
    try {recRef.current && recRef.current.stop();} catch {}
    setPhase('parsing');
    setTimeout(() => onDone(parseUtterance(v, masterData)), 350);
  };

  if (!open) return null;
  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: shown ? 'rgba(24,17,12,0.66)' : 'rgba(24,17,12,0)',
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      transition: 'background 220ms ease-out',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: PAD('0 28px')
    }}>
      {/* Mic orb */}
      <div style={{
        width: 116, height: 116, borderRadius: RS(60), position: 'relative',
        background: phase === 'parsing' ? TOKENS.gradSage : TOKENS.gradDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: TOKENS.surface, boxShadow: SH('0 16px 40px rgba(0,0,0,0.30)'),
        transition: 'background 300ms'
      }} onClick={(e) => e.stopPropagation()}>
        {listening && phase !== 'parsing' &&
        <>
            <span style={{ position: 'absolute', inset: -14, borderRadius: RS(72),
            border: '2px solid rgba(232, 152, 120,0.55)', animation: 'pulse 1.5s ease-out infinite' }} />
            <span style={{ position: 'absolute', inset: -6, borderRadius: RS(66),
            border: '2px solid rgba(232, 152, 120,0.75)', animation: 'pulse 1.5s ease-out infinite .4s' }} />
          </>
        }
        {phase === 'parsing' ?
        <Sparkles size={44} strokeWidth={2} /> :
        <Mic size={48} strokeWidth={2} />}
      </div>

      {/* Status */}
      <div style={{ marginTop: SP(26), fontSize: FS(20), fontWeight: 600, color: TOKENS.onAccent,
        display: 'flex', alignItems: 'center', gap: SP(8) }}>
        {phase === 'parsing' ? <><Sparkles size={16} /> 解析中…</> : listening ? '正在聆聽…' : '說話或直接打字'}
      </div>

      {/* Always-editable transcript / input box (speech results stream in here too) */}
      {phase !== 'parsing' &&
      <div style={{
        marginTop: SP(16), width: '100%', maxWidth: 340, padding: PAD('14px 18px'), borderRadius: RS(20),
        background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
        color: TOKENS.onAccent, boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(6),
          fontSize: FS(16), color: 'rgba(255,246,238,0.55)', letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: SP(8) }}>
          <Volume size={12} /> 語音轉文字 · 也可直接打字
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {if (e.key === 'Enter') finishWith(text);}}
        placeholder="例：午餐 120 / 買進 2330 1000股 1045"
        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: RS(12), padding: PAD('10px 12px'), outline: 'none',
          color: TOKENS.onAccent, fontSize: FS(19), textAlign: 'center', boxSizing: 'border-box' }} />
      </div>
      }

      <div style={{ marginTop: SP(14), fontSize: FS(16), color: 'rgba(255,246,238,0.5)', textAlign: 'center' }}>
        {phase === 'parsing' ? '即將帶入記帳畫面' : '聽不到聲音？點上面輸入框直接打字，再按「完成」'}
      </div>

      {/* Actions: 完成 + 取消 */}
      {phase !== 'parsing' &&
      <div style={{ marginTop: SP(24), display: 'flex', alignItems: 'center', gap: SP(16) }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onCancel} style={{
          width: 52, height: 52, borderRadius: RS(30),
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          color: TOKENS.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><X size={22} /></button>
        <button onClick={() => finishWith(text)} disabled={!text.trim()} style={{
          height: 52, padding: PAD('0 24px'), borderRadius: RS(30),
          background: text.trim() ? TOKENS.gradSage : 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: TOKENS.onAccent, fontSize: FS(18), fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP(8),
          opacity: text.trim() ? 1 : 0.6 }}><Check size={20} /> 完成</button>
      </div>
      }
    </div>);

}

/* ─── Settings full-screen overlay ──────────────────────────────────── */
function SettingsOverlay({ open, onClose, masterData, setMasterData, dashWidget, setDashWidget, initialBalances, setInitialBalances, savedFlows, savedTrades, setSavedFlows, setSavedTrades, revealHidden, onToggleReveal, hiddenCount }) {
  const { ChevronRight } = window.Icons;
  const [shown, setShown] = useStateApp(false);
  useEffectApp(() => {
    if (open) {const t = setTimeout(() => setShown(true), 20);return () => clearTimeout(t);}
    setShown(false);
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, background: TOKENS.bg,
      transform: shown ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 300ms cubic-bezier(0.32,0.72,0.18,1)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ height: SBAR_H, flexShrink: 0 }} />
      <div style={{ ...{ display: 'flex', alignItems: 'center', gap: SP(12) }, padding: "2px 13px 6px" }}>
        <button onClick={onClose} style={{ ...{
            width: 40, borderRadius: RS(14), flexShrink: 0,
            background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.12)',
            color: 'rgba(60,60,67,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: "40px"
          }, height: "40px", width: "40px", borderRadius: "20px" }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ fontSize: FS(30), fontWeight: 700, color: TOKENS.ink, letterSpacing: -0.5, lineHeight: "1.1" }}>設定</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SettingsScreen masterData={masterData} setMasterData={setMasterData}
        dashWidget={dashWidget} setDashWidget={setDashWidget}
        savedFlows={savedFlows} savedTrades={savedTrades}
        setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
        initialBalances={initialBalances} setInitialBalances={setInitialBalances}
        revealHidden={revealHidden} onToggleReveal={onToggleReveal} hiddenCount={hiddenCount} />
      </div>
    </div>);

}

function App() {
  const [tab, setTab] = useStateApp('dashboard');
  const [locked, setLocked] = useStateApp(() => ffLockEnabled());
  const [dupNames, setDupNames] = useStateApp([]);
  const [dupDismissed, setDupDismissed] = useStateApp(false);
  const [, _bumpTokens] = useStateApp(0);
  useEffectApp(() => {
    const h = () => _bumpTokens((n) => n + 1);
    window.addEventListener('ff-tokens-changed', h);
    return () => window.removeEventListener('ff-tokens-changed', h);
  }, []);
  const [settingsOpen, setSettingsOpen] = useStateApp(false);
  const [statsOpen, setStatsOpen] = useStateApp(false);
  const [netWorthOpen, setNetWorthOpen] = useStateApp(false);
  const [investBreakdownOpen, setInvestBreakdownOpen] = useStateApp(false);
  const [valuationOpen, setValuationOpen] = useStateApp(false);
  const [acctDetail, setAcctDetail] = useStateApp(null);
  const [investDetail, setInvestDetail] = useStateApp(null);
  const [acctOverrides, setAcctOverrides] = useStateApp({});

  // 眼睛只遮最上層總額（總資產淨額/本月收支/投資總市值）；明細頁等一般數字一律正常顯示
  const appMask = (n) => Math.round(n).toLocaleString();

  const handleSaveAcctItem = (groupId, origItem, patch) => {
    const key = `${groupId}::${origItem.name}`;
    setAcctOverrides((prev) => ({ ...prev, [key]: patch }));
    setAcctDetail((prev) => prev ? { ...prev, item: { ...prev.item, ...patch } } : null);
  };

  // (computedAcctGroups and computedHoldings are declared after all state hooks below)
  const [hideAmounts, setHideAmounts] = useStateApp(() => {
    try {return localStorage.getItem('ff_hide_amounts') === 'true';} catch {return false;}
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_hide_amounts', String(hideAmounts));} catch {}
  }, [hideAmounts]);
  const [livePrices, setLivePrices] = useStateApp(() => {
    try {
      const s = JSON.parse(localStorage.getItem('ff_prices') || 'null');
      if (s && s.prices) { if (s.fx && s.fx.USD) window.FX_RATES.USD = s.fx.USD; return s.prices; }
    } catch (e) {}
    return {};
  });
  const [pricesFetchedAt, setPricesFetchedAt] = useStateApp(() => {
    try { const s = JSON.parse(localStorage.getItem('ff_prices') || 'null'); if (s && s.date) return new Date(s.date); } catch (e) {}
    return null;
  });
  const savedTradesRef = React.useRef([]);

  // 估值分析：關注清單（未持有但想追蹤的標的）與手動覆寫的成長率。
  // 兩個 key 都是 ff_ 前綴，備份／還原／清除會自動涵蓋，不用改 settings。
  const [watchlist, setWatchlist] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_watchlist');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_watchlist', JSON.stringify(watchlist));} catch {}
  }, [watchlist]);
  const [valuationOverride, setValuationOverride] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_valuation_override');if (s) return JSON.parse(s);} catch {}
    return {};
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_valuation_override', JSON.stringify(valuationOverride));} catch {}
  }, [valuationOverride]);
  const watchlistRef = React.useRef([]);
  useEffectApp(() => {watchlistRef.current = watchlist;}, [watchlist]);

  // Daily-close prices via the FinFolio price Worker (sends only stock codes).
  // Shows cached prices instantly; this refreshes in the background / on demand.
  // If the service is unset or unreachable, holdings fall back to the
  // transaction price (see computeHoldings).
  const fetchLivePrices = React.useCallback(async () => {
    // 只問「目前還持有」的代號（買進減賣出後仍為正）。以前是把歷史上交易過的每個代號都送出去，
    // 匯入歷史後會夾帶大量已賣光／下市的標的：那些不但佔掉報價服務單次可查的額度，還會逼它走
    // 最貴的補價路徑（下市代號本來就永遠查不到），結果整批請求失敗、所有持股都拿不到報價。
    const qty = {};
    savedTradesRef.current.forEach((t) => {
      if (!t.code) return;
      const sh = parseFloat(t.shares) || 0;
      qty[t.code] = (qty[t.code] || 0) + (t.side === 'buy' ? sh : -sh);
    });
    // 關注清單的標的沒有持股數，但估值分析要有現價才算得出本益比，所以一併問。
    const codes = [...new Set([
      ...Object.keys(qty).filter((c) => qty[c] > 0),
      ...watchlistRef.current.map((w) => w && w.code).filter(Boolean)])];
    if (!codes.length) return { ok: true, updated: 0, missing: 0 };
    const base = window.FF_PRICE_API;
    if (!base) return { ok: false, reason: '未設定報價服務' };
    try {
      const res = await fetch(base + '/quotes?codes=' + encodeURIComponent(codes.join(',')));
      if (!res.ok) return { ok: false, reason: '報價服務錯誤 ' + res.status };
      const data = await res.json();
      if (data && data.fx && data.fx.USD) window.FX_RATES.USD = data.fx.USD;
      const got = data && data.prices ? data.prices : {};
      if (Object.keys(got).length > 0) {
        setLivePrices((prev) => {
          const merged = { ...prev, ...got };
          // 匯率只在真的拿到時才覆寫：報價服務回報 partial 時 fx 可能是空物件，直接寫回去會
          // 把上次的匯率清掉，美股持股的台幣市值就會用預設匯率算，變成靜靜地算錯。
          let fx = data.fx && data.fx.USD ? data.fx : null;
          if (!fx) {
            try { const prevSaved = JSON.parse(localStorage.getItem('ff_prices') || 'null');fx = prevSaved && prevSaved.fx || {}; } catch (e) { fx = {}; }
          }
          try { localStorage.setItem('ff_prices', JSON.stringify({ prices: merged, fx, date: data.date || null })); } catch (e) {}
          return merged;
        });
        setPricesFetchedAt(data.date ? new Date(data.date) : new Date());
      }
      // 少數代號查無報價是正常的（下市、興櫃），回報缺幾檔讓 UI 能誠實顯示，而不是假裝成功。
      const missing = codes.filter((c) => got[c] == null);
      return { ok: true, updated: Object.keys(got).length, missing: missing.length, missingCodes: missing };
    } catch (e) {
      return { ok: false, reason: '連線失敗' }; // offline / blocked — keep cached prices
    }
  }, []);

  // 基本面（EPS）供估值分析用。財報是季頻資料，跨月才重抓一次——每次開頁都問一輪
  // 只是白白打上游（FinMind 無金鑰有流量限制），資料一個月內也不會變。
  // 快取只認目前這個版本：Worker 回傳的欄位變了（例如加上季 EPS）就得整批重抓，
  // 否則快取是以「月」為單位，使用者要等到下個月才看得到新欄位。
  const [fundamentals, setFundamentals] = useStateApp(() => {
    try {
      const s = JSON.parse(localStorage.getItem('ff_fundamentals') || 'null');
      if (s && s.items && s.v === FUND_CACHE_V) return s.items;
    } catch (e) {}
    return {};
  });
  const fetchFundamentals = React.useCallback(async (codes, force) => {
    const want = [...new Set((codes || []).filter(Boolean))];
    if (!want.length) return { ok: true, updated: 0, missing: 0 };
    const base = window.FF_PRICE_API;
    if (!base) return { ok: false, reason: '未設定報價服務' };
    let cached = {};
    let month = null;
    try {
      const s = JSON.parse(localStorage.getItem('ff_fundamentals') || 'null');
      if (s && s.v === FUND_CACHE_V) { cached = s.items || {}; month = s.month || null; }
    } catch (e) {}
    const thisMonth = new Date().toISOString().slice(0, 7);
    // 同月內只補「還沒問過的代號」；跨月、換快取版本或手動刷新才整批重抓。
    const stale = force || month !== thisMonth;
    const asked = stale ? want : want.filter((c) => cached[c] === undefined);
    if (!asked.length) return { ok: true, updated: 0, missing: 0 };
    try {
      const res = await fetch(base + '/fundamentals?codes=' + encodeURIComponent(asked.join(',')));
      if (!res.ok) return { ok: false, reason: '基本面服務錯誤 ' + res.status };
      const data = await res.json();
      const got = data && data.items ? data.items : {};
      const missing = data && Array.isArray(data.missing) ? data.missing : [];
      setFundamentals(() => {
        // 查無資料的代號存成 null（ETF、債券 ETF 本來就沒有 EPS），下次才不會一直重問。
        const merged = { ...(stale ? {} : cached), ...got };
        missing.forEach((c) => { merged[c] = null; });
        try { localStorage.setItem('ff_fundamentals', JSON.stringify({ items: merged, month: thisMonth, v: FUND_CACHE_V })); } catch (e) {}
        return merged;
      });
      return { ok: true, updated: Object.keys(got).length, missing: missing.length };
    } catch (e) {
      return { ok: false, reason: '連線失敗' }; // offline — 沿用快取的基本面
    }
  }, []);

  const [recordOpen, setRecordOpen] = useStateApp(false);
  const [recordDraft, setRecordDraft] = useStateApp(null);
  const dashDateRef = React.useRef(null); // 看板目前檢視的日期，供「+記一筆」預設帶入
  const [recordReturnTab, setRecordReturnTab] = useStateApp('dashboard');
  const [recordReturnAcctDetail, setRecordReturnAcctDetail] = useStateApp(null);
  const [recordReturnInvestDetail, setRecordReturnInvestDetail] = useStateApp(null);
  const [listening, setListening] = useStateApp(false);
  const [voiceTurn, setVoiceTurn] = useStateApp(0);
  const [savedFlows, setSavedFlows] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_flows');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  const [savedTrades, setSavedTrades] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_trades');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_flows', JSON.stringify(savedFlows));} catch {}
  }, [savedFlows]);
  useEffectApp(() => {
    try {localStorage.setItem('ff_trades', JSON.stringify(savedTrades));} catch {}
  }, [savedTrades]);

  // 自動扣款 / 定期支出：開 App 時把到期的月份補記入帳。
  useEffectApp(() => {
    try {
      const gen = ffRunRecurring({
        now: new Date(),
        flows: savedFlows, trades: savedTrades,
        accounts: masterData && masterData.accounts || [],
        settle: masterData && masterData.settle || [],
        initBal: initialBalances });
      if (gen && gen.length) setSavedFlows((s) => [...gen, ...s]);
    } catch (e) {console.error('[recurring]', e);}
    // 還原/開啟時偵測會造成餘額算錯的重複帳戶名稱，提示使用者去改名。
    try {setDupNames(ffFindDupNames(masterData));} catch {}
  }, []);

  // App 鎖定：切到背景時，若已設定密碼則重新上鎖，回到前景需再次解鎖。
  useEffectApp(() => {
    const onVis = () => {if (document.visibilityState === 'hidden' && ffLockEnabled()) setLocked(true);};
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // 本機自動備份：開啟 App 時存一份快照，離開（切到背景）時再存最新的一份。
  useEffectApp(() => {
    ffAutoSnapshot();
    const onHide = () => {if (document.visibilityState === 'hidden') ffAutoSnapshot();};
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', ffAutoSnapshot);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', ffAutoSnapshot);
    };
  }, []);

  // 同步 ref 並在持倉或關注清單有變化時拉最新報價。
  // 關注清單也要進來：只看持股的話，未持有的關注標的永遠沒有現價，估值頁就算不出本益比
  // （症狀是成長率有值、PE 一直是「—」）。
  useEffectApp(() => {
    savedTradesRef.current = savedTrades;
    if (savedTrades.some((t) => t.code) || watchlist.length) fetchLivePrices();
  }, [savedTrades, watchlist]);
  const [dashWidget, setDashWidget] = useStateApp(() => {
    try {return localStorage.getItem('ff_dash_widget') || 'accounts';} catch {return 'accounts';}
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_dash_widget', dashWidget);} catch {}
  }, [dashWidget]);
  const [masterData, setMasterDataRaw] = useStateApp(() => {
    try {
      const s = localStorage.getItem('ff_master_data');
      if (s) return JSON.parse(s);
    } catch {}
    return window.DEFAULT_MASTER_DATA || {};
  });
  const setMasterData = (v) => {
    setMasterDataRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {localStorage.setItem('ff_master_data', JSON.stringify(next));} catch {}
      return next;
    });
  };
  // 一次性遷移：補上「金融保險」大類的預設支出分類（各種稅金／保險費）。只跑一次，
  // 之後使用者自行刪除不會再被加回。
  useEffectApp(() => {
    try {
      if (localStorage.getItem('ff_migrate_finins') === '1') return;
      setMasterData((md) => {
        const cx = Array.isArray(md.cat_exp) ? md.cat_exp.slice() : [];
        const has = (n) => cx.some((c) => (typeof c === 'string' ? c : c.name) === n);
        const add = [];
        if (!has('各種稅金')) add.push({ name: '各種稅金', group: '金融保險' });
        if (!has('保險費')) add.push({ name: '保險費', group: '金融保險' });
        return add.length ? { ...md, cat_exp: [...cx, ...add] } : md;
      });
      localStorage.setItem('ff_migrate_finins', '1');
    } catch {}
  }, []);
  const [recordEdits, setRecordEdits] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_record_edits');if (s) return JSON.parse(s);} catch {}
    return {};
  });
  const [recordDeletes, setRecordDeletes] = useStateApp(() => {
    try {const s = localStorage.getItem('ff_record_deletes');if (s) return JSON.parse(s);} catch {}
    return [];
  });
  useEffectApp(() => {
    try {localStorage.setItem('ff_record_edits', JSON.stringify(recordEdits));} catch {}
  }, [recordEdits]);
  useEffectApp(() => {
    try {localStorage.setItem('ff_record_deletes', JSON.stringify(recordDeletes));} catch {}
  }, [recordDeletes]);
  const [initialBalances, setInitialBalancesRaw] = useStateApp(() => {
    try {return JSON.parse(localStorage.getItem('ff_init_bal') || '{}');} catch {return {};}
  });
  const setInitialBalances = (v) => {
    const next = typeof v === 'function' ? v(initialBalances) : v;
    setInitialBalancesRaw(next);
    try {localStorage.setItem('ff_init_bal', JSON.stringify(next));} catch {}
  };

  // ── 開發者隱藏：把特定帳戶／股票從清單與所有統計中排除 ──────────────
  // ff_hidden 持久保存被隱藏的帳戶名稱 / 股票代號。revealHidden 為工作階段開關
  // （設定頁點「版本」切換，重開 App 會重置）：開啟時被隱藏的項目暫時全部顯示並重新計入統計。
  const [hidden, setHidden] = useStateApp(() => {
    try {
      const h = JSON.parse(localStorage.getItem('ff_hidden') || 'null');
      if (h && typeof h === 'object') return { accts: h.accts || [], stocks: h.stocks || [] };
    } catch {}
    return { accts: [], stocks: [] };
  });
  useEffectApp(() => {try {localStorage.setItem('ff_hidden', JSON.stringify(hidden));} catch {}}, [hidden]);
  const [revealHidden, setRevealHidden] = useStateApp(false);
  const hiddenAcctSet = React.useMemo(() => new Set(hidden.accts), [hidden]);
  const hiddenStockSet = React.useMemo(() => new Set(hidden.stocks), [hidden]);
  const hiddenCount = hidden.accts.length + hidden.stocks.length;
  const toggleAcctHidden = (name) => setHidden((h) => ({ ...h,
    accts: h.accts.includes(name) ? h.accts.filter((n) => n !== name) : [...h.accts, name] }));
  // key 為 code + '|' + broker，跟 computeHoldings() 內部分組 key 一致，讓同一檔股票在
  // 不同券商可以各自獨立隱藏，不會互相牽連。
  const toggleStockHidden = (code, broker) => { const key = code + '|' + (broker || ''); setHidden((h) => ({ ...h,
    stocks: h.stocks.includes(key) ? h.stocks.filter((c) => c !== key) : [...h.stocks, key] })); };

  // revealHidden 開啟時等同「沒有任何隱藏」，下游一律看這兩個集合。
  const EMPTY_SET = React.useMemo(() => new Set(), []);
  const displayHiddenAccts = revealHidden ? EMPTY_SET : hiddenAcctSet;
  const displayHiddenStocks = revealHidden ? EMPTY_SET : hiddenStockSet;

  // 只給「清單顯示」用的流水／交易：命中隱藏帳戶（或隱藏個股）的紀錄不列在紀錄清單、
  // 也不進收支統計。注意這裡刻意不看 t.settleAccount——隱藏一個銀行交割戶不該讓該戶
  // 結算的股票交易從紀錄與投資頁消失（餘額與持倉都是用完整資料算的，見下方）。
  const visibleFlows = React.useMemo(() => !displayHiddenAccts.size ? savedFlows :
  savedFlows.filter((f) => !(f.account && displayHiddenAccts.has(f.account)) &&
  !(f.fromAccount && displayHiddenAccts.has(f.fromAccount)) && !(f.toAccount && displayHiddenAccts.has(f.toAccount))),
  [savedFlows, displayHiddenAccts]);
  const visibleTrades = React.useMemo(() => !displayHiddenStocks.size && !displayHiddenAccts.size ? savedTrades :
  savedTrades.filter((t) => !displayHiddenStocks.has(t.code + '|' + (t.broker || t.settleAccount || '')) &&
  !(t.broker && displayHiddenAccts.has(t.broker))),
  [savedTrades, displayHiddenStocks, displayHiddenAccts]);

  // 動態計算：帳戶餘額與投資持倉（必須在所有 state 宣告後）
  // 計算一律吃「完整資料」（未過濾的帳戶／流水／交易），算完才用 excludeHidden* 把隱藏
  // 項目從清單與加總摘掉。順序反過來的話，隱藏帳戶的轉帳會讓對手帳戶餘額少一筆、隱藏
  // 交割戶／個股也會讓持倉與扣款一起算錯。
  const computedAcctGroupsAll = useMemoApp(() =>
  computeAccounts(masterData?.accounts || [], masterData?.settle || [], savedFlows, savedTrades, initialBalances),
  [masterData, savedFlows, savedTrades, initialBalances]
  );
  const computedHoldingsAll = useMemoApp(() =>
  computeHoldings(savedTrades, masterData, livePrices),
  [savedTrades, masterData, livePrices]
  );
  const computedAcctGroups = useMemoApp(() =>
  excludeHiddenAccounts(computedAcctGroupsAll, displayHiddenAccts),
  [computedAcctGroupsAll, displayHiddenAccts]
  );
  const computedHoldings = useMemoApp(() =>
  excludeHiddenHoldings(computedHoldingsAll, displayHiddenStocks, displayHiddenAccts),
  [computedHoldingsAll, displayHiddenStocks, displayHiddenAccts]
  );
  // 由 {group, item} 快照解析出最新的帳戶詳情資料。
  // 一般帳戶直接從 computedAcctGroups 取最新餘額；證券戶（brokerage）的 items
  // 是由 computedHoldings 依券商加總而來、不在 computedAcctGroups 內，需另外重算，
  // 否則會找不到而無法還原（使用者回報「證券戶都沒有回到證券戶內頁」）。
  const resolveAcctDetail = (snap) => {
    if (!snap) return null;
    if (snap.group.id === 'brokerage') {
      const mv = (x) => (x.mvTWD != null ? x.mvTWD : x.mv || 0);
      const holdings = computedHoldings.flatMap((g) => g.items);
      const amount = holdings
      .filter((it) => (it.broker || '其他') === snap.item.name)
      .reduce((a, it) => a + mv(it), 0);
      return { group: snap.group, item: { ...snap.item, amount } };
    }
    const g = computedAcctGroups.find((x) => x.id === snap.group.id);
    const it = g && g.items.find((x) => x.name === snap.item.name);
    return g && it ? { group: g, item: it } : null;
  };
  // 帳戶詳情回復：儲存/刪除後回到該帳戶詳情頁（取最新餘額）。
  // 故意依賴 [savedFlows, savedTrades]（實際記帳資料），不依賴 computedAcctGroups——
  // 後者還會因即時報價（livePrices）背景刷新而重新計算，若依賴它，使用者編輯中途
  // 剛好遇到報價刷新，就會被這個 effect 用「編輯前的舊資料」提前觸發並清掉還原旗標，
  // 導致存檔後畫面沒有跳回、看起來像「沒有更新成功」。
  useEffectApp(() => {
    if (!recordReturnAcctDetail) return;
    const snap = recordReturnAcctDetail; // 完整 {group, item} 快照
    const fresh = resolveAcctDetail(snap);
    setAcctDetail(fresh || snap); // 找不到最新資料就退回快照，至少能跳回原本內頁
    setRecordReturnAcctDetail(null);
  }, [savedFlows, savedTrades]);
  // 個股詳情回復：編輯/新增後回到該個股詳情頁（取最新持倉）。同上，依賴 savedTrades
  // 而非 computedHoldings，避免被背景報價刷新提前觸發。
  useEffectApp(() => {
    if (!recordReturnInvestDetail) return;
    const { code, broker } = recordReturnInvestDetail;
    const items = computedHoldings.flatMap((g) => g.items);
    // 同一檔股票可能分屬不同券商，先找同券商那筆，找不到（例如已賣光）才退回同代號任一筆。
    const item = items.find((it) => it.code === code && it.broker === broker) || items.find((it) => it.code === code);
    if (item) {
      setInvestDetail({ item, mask: appMask, savedTrades });
      setRecordReturnInvestDetail(null);
    }
  }, [savedTrades]);

  const FLOW_ICONS = {
    餐飲: '🍔', 交通: '🚕', 生活雜貨: '🛒', 娛樂: '🎬', 醫療: '💊',
    住房: '🏠', 教育: '📚', 薪資: '💼', 獎金: '💰',
    股利: '📈', 股息: '📈', 紅利回饋: '🎁', 轉帳: '↔️', 其他: '📝'
  };

  const nowStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 加 n 個營業日（跳過六日）：台股 T+2 入帳規則用
  const addBizDays = (d, n) => {
    const x = new Date(d);
    let left = n;
    while (left > 0) {
      x.setDate(x.getDate() + 1);
      const w = x.getDay();
      if (w !== 0 && w !== 6) left--;
    }
    return x;
  };

  const handleSaved = (kind, data, keepOpen) => {
    try {
      if (kind === 'flow') {
        const isXfer = data.kind === 'xfer';
        const entry = {
          kind: data.kind,
          amount: parseFloat(data.amount) || 0,
          cat: isXfer ? data.category || '轉帳' : data.category,
          merchant: data.note || (isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.category),
          account: isXfer ? `${data.fromAccount} → ${data.toAccount}` : data.account,
          fromAccount: isXfer ? data.fromAccount : undefined,
          toAccount: isXfer ? data.toAccount : undefined,
          xferFee: isXfer ? parseFloat(data.xferFee) || 0 : undefined,
          date: data.date,
          icon: isXfer ? '↔️' : FLOW_ICONS[data.category] || (data.kind === 'inc' ? '💰' : '📝')
        };
        // 記住這個分類這次用的帳戶，下次選到同一分類時自動帶入
        ffRememberAccount(data.kind, data.category, isXfer ?
        { fromAccount: data.fromAccount, toAccount: data.toAccount } :
        { account: data.account });
        if (data.recordId) {
          // edit in place
          if (String(data.recordId).startsWith('s-')) {
            setSavedFlows((s) => s.map((e) => 's-' + e._justAdded === data.recordId ? { ...e, ...entry } : e));
          } else {
            setRecordEdits((m) => ({ ...m, [data.recordId]: entry }));
          }
        } else {
          setSavedFlows((s) => [{ ...entry, time: nowStr(), _justAdded: Date.now() }, ...s]);
        }
      } else if (kind === 'stock') {
        const entry = {
          side: data.side, code: data.code, name: data.name,
          shares: parseFloat(data.shares) || 0,
          price: parseFloat(data.price) || 0,
          fee: parseFloat(data.fee) || 0,
          tax: parseFloat(data.tax) || 0,
          net: parseFloat(data.net) || 0,
          broker: data.broker,
          settleAccount: data.settleAccount,
          assetClass: data.assetClass || '股票',
          date: data.date
        };

        // Build auto-gen flows for a trade.
        // buy  → 一筆 T+2「投資轉帳」把買進金額(含手續費)從交割戶轉到券商部位（與賣出對稱）。
        // sell → xfer(成本轉回交割戶) + pnl(損益計收支)。
        // tradeJA = the trade's _justAdded stamp used to link flows.
        // excludeRecordId = 's-XXX' of the trade being edited (to remove it from FIFO history).
        const buildTradeFlows = (tradeJA, excludeRecordId) => {
          if (!data.settleAccount) return [];
          const isTW = /^\d/.test(String(data.code || '')); // 用於損益分類（台股/美股）
          // 交割是否 T+2：優先看該證券戶設定的 t2 旗標；沒設定則沿用舊行為（依代號判斷，
          // 台股數字代號 T+2、美股當日）。美股帳戶把 t2 設為 false 即可當日交割。
          const brokerRec = (masterData.brokers || []).find((b) => b.name === data.broker);
          const useT2 = brokerRec && brokerRec.t2 != null ? !!brokerRec.t2 : isTW;
          const settleDate = useT2 ? addBizDays(data.date, 2) : data.date;
          // ── 買進：T+2 從交割戶扣款的投資轉帳 ──
          if (data.side === 'buy') {
            const sh = parseFloat(data.shares) || 0;
            const pr = parseFloat(data.price) || 0;
            const gross = window.floorAmt(sh * pr);
            const buyFee = data.fee != null ? data.fee : (window.calcAutoFee(gross, sh, 0.1425, 1));
            const debit = data.net != null && data.net > 0 ? data.net : gross + buyFee;
            return [{
              kind: 'xfer', amount: debit,
              fromAccount: data.settleAccount, // 交割戶扣款
              toAccount: data.broker || '__stock_position__', // 券商部位（非現金帳戶，不影響其他餘額）
              account: `${data.settleAccount} → ${data.broker || ''}`,
              cat: '投資轉帳',
              merchant: `買進 ${data.name || data.code || ''}`.trim() || '證券戶',
              note: data.broker || data.name || '',
              date: settleDate || new Date(),
              time: nowStr(), _autoGen: true, _buyXfer: true,
              _linkedTradeJA: tradeJA,
              _justAdded: tradeJA + 1
            }];
          }
          // ── 賣出：成本轉回交割戶 + 損益 ──
          if (data.side !== 'sell') return [];
          const sh = parseFloat(data.shares) || 0;
          const pr = parseFloat(data.price) || 0;
          const gross = window.floorAmt(sh * pr);
          const sellFee = data.fee != null ? data.fee : window.calcAutoFee(gross, sh, 0.1425, 1);
          const sellTax = data.tax != null ? data.tax : window.calcAutoTax(gross, 0.003);
          const proceeds = gross - sellFee - sellTax;

          // FIFO cost basis — exclude the trade being edited from history
          const hist = savedTrades
            .filter((t) => t.code === data.code && (excludeRecordId ? ('s-' + t._justAdded !== excludeRecordId) : true))
            .slice().sort(tradeChrono);
          const lots = [];
          hist.forEach((t) => {
            const hsh = parseFloat(t.shares) || 0, hpr = parseFloat(t.price) || 0;
            const hgross = window.floorAmt(hsh * hpr);
            // 與持倉/明細一致：有記錄手續費就採用（含 0），只有缺欄位才推算，
            // 否則賣出時轉回交割戶的成本會比原始成本多算一次手續費。
            const hfee = t.fee != null ? t.fee : window.calcAutoFee(hgross, hsh, 0.1425, 1);
            const costPerShare = hsh > 0 ? (hgross + hfee) / hsh : hpr;
            if (t.side === 'buy') { lots.push({ qty: hsh, price: costPerShare }); } else { fifoConsume(lots, hsh); }
          });
          const fifo = fifoConsume(lots, sh);
          const costBasis = Math.round(fifo.cost + fifo.uncovered * pr);
          const pnl = proceeds - costBasis;

          const flows = [{
            kind: 'xfer', amount: costBasis,
            fromAccount: data.broker || '__stock_position__',
            toAccount: data.settleAccount,
            account: `${data.broker || ''} → ${data.settleAccount}`,
            cat: '投資轉帳',
            merchant: data.broker || data.name || '證券戶',
            note: data.name || '',
            date: settleDate || new Date(),
            time: nowStr(), _autoGen: true,
            _linkedTradeJA: tradeJA,
            _justAdded: tradeJA + 1
          }];
          if (Math.abs(pnl) > 0) {
            const pnlNote = `${data.name} 賣出 ${parseFloat(data.price).toLocaleString()} × ${sh.toLocaleString()}股`;
            flows.push({
              // 損益判斷台/美股：獲利→收入的「台股/美股」(投資收入大類)，虧損→支出的「台股/美股」(投資損失大類)。
              kind: pnl > 0 ? 'inc' : 'exp',
              amount: Math.abs(pnl),
              account: data.settleAccount,
              cat: isTW ? '台股' : '美股',
              merchant: pnl > 0 ? '投資獲利' : '投資損失',
              note: pnlNote,
              date: settleDate || new Date(),
              time: nowStr(), _autoGen: true,
              _linkedTradeJA: tradeJA,
              _justAdded: tradeJA + 2
            });
          }
          return flows;
        };

        if (data.recordId) {
          if (String(data.recordId).startsWith('s-')) {
            const tradeJA = parseInt(data.recordId.slice(2));
            // Update the trade record
            setSavedTrades((t) => t.map((e) => 's-' + e._justAdded === data.recordId ? { ...e, ...entry } : e));
            // Regenerate linked auto-gen flows (remove old, add new)
            const newFlows = buildTradeFlows(tradeJA, data.recordId);
            setSavedFlows((s) => {
              const kept = s.filter((f) => f._linkedTradeJA !== tradeJA);
              return [...newFlows, ...kept];
            });
          } else {
            setRecordEdits((m) => ({ ...m, [data.recordId]: entry }));
          }
        } else {
          const tradeJA = Date.now();
          setSavedTrades((t) => [{ ...entry, time: nowStr(), _justAdded: tradeJA }, ...t]);
          const newFlows = buildTradeFlows(tradeJA, null);
          if (newFlows.length) {
            setSavedFlows((s) => [...newFlows.slice().reverse(), ...s]);
          }
        }
      }
      if (!keepOpen) {
        setRecordOpen(false);
        setRecordDraft(null);
        setTab(recordReturnTab);
        setRecordReturnTab('dashboard');
      }
    } catch (e) {
      console.error('[handleSaved crash]', e);
      alert('\u5132\u5b58\u6642\u767c\u751f\u932f\u8aa4\uff1a' + e.message);
    }
  };

  const handleDelete = (recordId) => {
    if (!recordId) return;
    if (String(recordId).startsWith('s-')) {
      const tradeJA = parseInt(recordId.slice(2));
      // Remove the trade itself
      setSavedTrades((t) => t.filter((e) => 's-' + e._justAdded !== recordId));
      // Remove linked auto-gen flows (xfer + pnl) AND the flow record itself if it's a flow
      setSavedFlows((s) => s.filter((e) =>
        's-' + e._justAdded !== recordId &&
        e._linkedTradeJA !== tradeJA
      ));
    } else {
      setRecordDeletes((d) => d.includes(recordId) ? d : [...d, recordId]);
    }
    setRecordOpen(false);
    setRecordDraft(null);
    setTab(recordReturnTab);
    setRecordReturnTab('dashboard');
  };

  return (
    <div data-screen-label={`${tab}`} style={{ ...{
        width: 402, height: 'var(--app-h, 874px)', borderRadius: 0, overflow: 'hidden',
        position: 'relative', background: TOKENS.bg,
        boxShadow: 'none',
        fontFamily: TOKENS.fontSans,
        color: TOKENS.ink,
        WebkitFontSmoothing: 'antialiased'
      }, background: "rgb(240, 238, 231)" }}>
      {/* Dynamic island（僅在瀏覽器預覽時畫；獨立 App 有系統真正的瀏海）*/}
      {!IS_STANDALONE &&
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: RS(26), background: '#000', zIndex: 50
      }} />
      }

      <StatusBar />
      <NavHeader tab={tab} onSettings={() => setSettingsOpen(true)} hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} />

      {/* Scrollable content */}
      {tab === 'advisor' ?
      <div style={{
        position: 'absolute', top: CONTENT_TOP, bottom: 110, left: 0, right: 0,
        display: 'flex', flexDirection: 'column'
      }}>
          <AdvisorScreen
          computedAcctGroups={computedAcctGroups}
          computedHoldings={computedHoldings}
          masterData={masterData}
          savedFlows={visibleFlows}
          hideAmounts={hideAmounts}
          onRecord={(draft) => { setRecordReturnTab('advisor'); setRecordDraft(draft); setRecordOpen(true); }} />
        </div> :

      <div style={{
        position: 'absolute', top: CONTENT_TOP, bottom: 0, left: 0, right: 0,
        overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: SP(130)
      }}>
          {tab === 'dashboard' && <DashboardScreen hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} savedFlows={visibleFlows} savedTrades={visibleTrades} dashWidget={dashWidget} recordEdits={recordEdits} recordDeletes={recordDeletes} onEditRecord={(d) => {setRecordReturnTab('dashboard');setRecordDraft(d);setRecordOpen(true);}} computedAcctGroups={computedAcctGroups} computedHoldings={computedHoldings} masterData={masterData} onOpenStats={() => setStatsOpen(true)} onDateChange={(d) => { dashDateRef.current = d; }} />}
          {tab === 'accounts' && <AccountsScreen hideAmounts={hideAmounts}
        computedAcctGroups={computedAcctGroups}
        computedHoldings={computedHoldings}
        savedFlows={visibleFlows}
        masterData={masterData}
        hiddenAccts={displayHiddenAccts}
        onOpenNetWorth={() => setNetWorthOpen(true)}
        onOpenDetail={setAcctDetail} />}
          {tab === 'invest' && <InvestScreen hideAmounts={hideAmounts}
        computedHoldings={computedHoldings}
        savedTrades={visibleTrades}
        masterData={masterData}
        hiddenAccts={displayHiddenAccts}
        pricesFetchedAt={pricesFetchedAt}
        onRefreshPrices={fetchLivePrices}
        onOpenBreakdown={() => setInvestBreakdownOpen(true)}
        onOpenValuation={() => setValuationOpen(true)}
        onOpenDetail={(d) => setInvestDetail({ ...d, mask: appMask, savedTrades: visibleTrades })} />}
        </div>
      }

      <TabBar tab={tab} setTab={setTab}
      onVoice={() => setListening(true)}
      onManualRecord={() => {setRecordReturnTab('dashboard');setRecordDraft(null);setRecordOpen(true);}}
      onSettings={() => setSettingsOpen(true)} />
      <VoiceListenOverlay open={listening} masterData={masterData}
      onCancel={() => setListening(false)}
      onDone={(draft) => {
        setListening(false);
        setRecordDraft(draft);
        setRecordReturnTab('dashboard');
        setRecordOpen(true);
      }} />
      <RecordSheet open={recordOpen} draft={recordDraft} masterData={masterData}
      defaultDate={tab === 'dashboard' ? dashDateRef.current : null}
      computedHoldings={computedHoldings}
      onClose={() => {
        setRecordOpen(false);
        setRecordDraft(null);
        if (recordReturnAcctDetail) {
          setTab(recordReturnTab);
          // 回到帳戶詳情：關閉時沒有資料變動，直接用現有資料還原（含證券戶）
          setAcctDetail(resolveAcctDetail(recordReturnAcctDetail) || recordReturnAcctDetail);
          setRecordReturnAcctDetail(null);
          setRecordReturnTab('dashboard');
        }
        if (recordReturnInvestDetail) {
          setTab(recordReturnTab);
          const { code, broker } = recordReturnInvestDetail;
          const items = computedHoldings.flatMap((g) => g.items);
          const item = items.find((it) => it.code === code && it.broker === broker) || items.find((it) => it.code === code);
          if (item) setInvestDetail({ item, mask: appMask, savedTrades });
          setRecordReturnInvestDetail(null);
          setRecordReturnTab('dashboard');
        }
      }}
      onSaved={handleSaved} onDelete={handleDelete} />
      <SettingsOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)}
      masterData={masterData} setMasterData={setMasterData}
      dashWidget={dashWidget} setDashWidget={setDashWidget}
      savedFlows={savedFlows} savedTrades={savedTrades}
      setSavedFlows={setSavedFlows} setSavedTrades={setSavedTrades}
      initialBalances={initialBalances} setInitialBalances={setInitialBalances}
      revealHidden={revealHidden} onToggleReveal={() => setRevealHidden((v) => !v)} hiddenCount={hiddenCount} />

      {(() => {
        const StatsSheet = window.MonthlyStatsSheet;
        return StatsSheet ? <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)}
        savedFlows={visibleFlows} masterData={masterData} hideAmounts={hideAmounts}
        nowDate={window.TODAY_DATE || new Date()} mask={appMask} /> : null;
      })()}
      {(() => {
        const NWSheet = window.NetWorthSheet;
        if (!NWSheet) return null;
        const nwAcct = computedAcctGroups.reduce((a, g) => {
          const s = g.items.reduce((b, it) => b + (it.amountTWD != null ? it.amountTWD : it.amount), 0);
          return a + (g.sign < 0 ? -s : s);
        }, 0);
        const nwInvest = computedHoldings.flatMap((g) => g.items).reduce((a, it) => a + (it.mvTWD != null ? it.mvTWD : it.mv || 0), 0);
        return <NWSheet open={netWorthOpen} onClose={() => setNetWorthOpen(false)}
          total={nwAcct + nwInvest} computedAcctGroups={computedAcctGroups} computedHoldings={computedHoldings}
          mask={appMask} hideAmounts={hideAmounts} savedFlows={visibleFlows} masterData={masterData} />;
      })()}
      {(() => {
        const IBSheet = window.InvestBreakdownSheet;
        return IBSheet ? <IBSheet open={investBreakdownOpen} onClose={() => setInvestBreakdownOpen(false)}
          computedHoldings={computedHoldings} masterData={masterData} mask={appMask}
          savedTrades={visibleTrades} savedFlows={visibleFlows} /> : null;
      })()}

      {(() => {
        const VSheet = window.ValuationSheet;
        return VSheet ? <VSheet open={valuationOpen} onClose={() => setValuationOpen(false)}
          computedHoldings={computedHoldings} fundamentals={fundamentals} livePrices={livePrices}
          watchlist={watchlist} setWatchlist={setWatchlist}
          valuationOverride={valuationOverride} setValuationOverride={setValuationOverride}
          onFetchFundamentals={fetchFundamentals} /> : null;
      })()}

      {/* ── Detail sheets at phone-frame root (避免被 overflow 容器截切) ── */}
      {(() => {
        const AcctSheet = window.AccountDetailSheet;
        const InvSheet = window.InvestDetailSheet;
        return (
          <>
            {AcctSheet && acctDetail &&
            <AcctSheet data={acctDetail} mask={appMask}
            savedFlows={visibleFlows} savedTrades={visibleTrades}
            computedHoldings={computedHoldings}
            onClose={() => setAcctDetail(null)}
            onSaveItem={handleSaveAcctItem}
            hideAmounts={hideAmounts} revealHidden={revealHidden}
            isHidden={hiddenAcctSet.has(acctDetail.item.name)}
            onToggleHidden={() => {
              const wasHidden = hiddenAcctSet.has(acctDetail.item.name);
              toggleAcctHidden(acctDetail.item.name);
              if (!wasHidden) setRevealHidden(false); // 新隱藏 → 立即從清單與統計消失
              setAcctDetail(null);
            }}
            onEditRecord={(d) => {
              // 不卸載詳情頁：記一筆疊在上面(zIndex 100)，關閉滑出後直接露出底下的詳情頁，
              // 避免「先跳回資產清單再跳進詳情頁」的閃跳。存完整 {group, item} 快照以便存檔後更新。
              setRecordDraft(d);
              setRecordReturnTab('accounts');
              setRecordReturnAcctDetail(acctDetail);
              setRecordOpen(true);
            }} />}
            {InvSheet && investDetail &&
            <InvSheet data={investDetail.item}
            mask={investDetail.mask || appMask}
            savedTrades={visibleTrades}
            onClose={() => setInvestDetail(null)}
            hideAmounts={hideAmounts} revealHidden={revealHidden}
            isHidden={hiddenStockSet.has(investDetail.item.code + '|' + (investDetail.item.broker || ''))}
            onToggleHidden={() => {
              const wasHidden = hiddenStockSet.has(investDetail.item.code + '|' + (investDetail.item.broker || ''));
              toggleStockHidden(investDetail.item.code, investDetail.item.broker);
              if (!wasHidden) setRevealHidden(false); // 新隱藏 → 立即從清單與統計消失
              setInvestDetail(null);
            }}
            onEditRecord={(d) => {
              // 同帳戶詳情：不卸載個股詳情頁，記一筆疊在上面，關閉後直接露出，避免閃跳。
              // 帶上 broker：同一檔股票可能分屬不同券商，回復時要認得是哪一筆持股。
              const { code, broker } = investDetail.item;
              setRecordDraft(d);
              setRecordReturnTab('invest');
              setRecordReturnInvestDetail({ code, broker });
              setRecordOpen(true);
            }} />}
          </>);

      })()}

      {/* 重複帳戶名稱提示（會造成餘額算錯）*/}
      {dupNames.length > 0 && !dupDismissed && !locked &&
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 112, zIndex: 55,
        display: 'flex', justifyContent: 'center', padding: PAD('0 14px'), pointerEvents: 'none' }}>
        <div style={{ maxWidth: 380, width: '100%', pointerEvents: 'auto',
          background: TOKENS.ink, color: TOKENS.surface, borderRadius: RS(16),
          padding: PAD('12px 14px'), boxShadow: SH('0 12px 30px rgba(0,0,0,0.4)') }}>
          <div style={{ fontSize: FS(15), lineHeight: 1.5 }}>
            ⚠️ 偵測到重複的帳戶名稱：<b>{dupNames.join('、')}</b>。同名會造成餘額計算錯誤,請到「設定 → 記帳帳戶」改名。
          </div>
          <div style={{ display: 'flex', gap: SP(8), marginTop: SP(10) }}>
            <button onClick={() => {setDupDismissed(true);setSettingsOpen(true);}} style={{ flex: 1, height: 38, borderRadius: RS(10),
              background: TOKENS.accent, border: 'none', color: '#fff', fontSize: FS(15), fontWeight: 600 }}>前往設定改名</button>
            <button onClick={() => setDupDismissed(true)} style={{ width: 72, height: 38, borderRadius: RS(10),
              background: 'rgba(255,255,255,0.16)', border: 'none', color: TOKENS.surface, fontSize: FS(15) }}>稍後</button>
          </div>
        </div>
      </div>
      }

      {/* App 鎖定畫面（最上層）*/}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
    </div>);

}

class ErrorBoundary extends React.Component {
  constructor(p) {super(p);this.state = { err: null };}
  static getDerivedStateFromError(e) {return { err: e };}
  componentDidCatch(e, info) {
    const msg = e.message + '\n\n' + (info.componentStack || '');
    localStorage.setItem('ff_debug_crash', msg);
    console.error('[ErrorBoundary]', e, info);
  }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 20, color: 'red', background: '#fff', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
        <b>Render Error:</b>{'\n'}{this.state.err.message}{'\n\n'}
        <button onClick={() => this.setState({ err: null })}>重試</button>
      </div>);

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);