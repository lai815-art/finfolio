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

/* ── 自動扣款 / 定期支出 ─────────────────────────────────────────────
   規則存於 localStorage ff_recurring：
   { id, type:'expense'|'card', name, enabled, dayOfMonth(1..28), lastRun:'YYYY-MM',
     // expense: amount, category, account
     // card:    fromAccount, cardAccount, cardMode:'full'|'fixed', fixedAmount }
   每次開 App 時把「上次產生之後、到本月為止且已過扣款日」的月份補記入帳。 */
function ffYM(d) {return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');}
function ffPrevYM(ym) {const a = ym.split('-').map(Number);return ffYM(new Date(a[0], a[1] - 2, 1));}
function ffInitialLastRun(day, now) {
  const cm = ffYM(now);
  return now.getDate() >= day ? cm : ffPrevYM(cm); // 扣款日已過→下月才跑；未到→本月仍會跑
}
function ffMonthsAfter(lastRun, now) {
  const res = [];const cy = now.getFullYear(),cm = now.getMonth() + 1;
  const a = (lastRun || '').split('-').map(Number);
  let cur = new Date(a[0] || cy, (a[1] || cm) - 1, 1);cur.setMonth(cur.getMonth() + 1);
  let guard = 0;
  while ((cur.getFullYear() < cy || cur.getFullYear() === cy && cur.getMonth() + 1 <= cm) && guard < 36) {
    res.push(ffYM(cur));cur.setMonth(cur.getMonth() + 1);guard++;
  }
  return res;
}
function ffRunRecurring(ctx) {
  let rules;
  try {rules = JSON.parse(localStorage.getItem('ff_recurring') || '[]');} catch {return null;}
  if (!Array.isArray(rules) || !rules.length) return null;
  const now = ctx.now || new Date();
  const cm = ffYM(now);
  const base = Date.now();let seq = 0;
  const mkDate = (ym, day) => ym + '-' + String(day).padStart(2, '0');
  const mkStamp = () => base + seq++;
  const newFlows = [];
  let acctGroups = null;
  let changed = false;

  rules.forEach((r) => {
    if (!r.enabled) return;
    const day = Math.min(Math.max(parseInt(r.dayOfMonth, 10) || 1, 1), 28);
    const due = ffMonthsAfter(r.lastRun || ffPrevYM(cm), now).
    filter((ym) => ym < cm || ym === cm && now.getDate() >= day);
    if (!due.length) return;

    const mkExpense = (ym, amt) => ({
      kind: 'exp', amount: amt, cat: r.category, merchant: '自動 · ' + (r.name || r.category || '定期支出'),
      account: r.account, date: mkDate(ym, day), icon: '🔁',
      auto: true, recurringId: r.id, time: '自動', _justAdded: mkStamp() });

    const mkCard = (ym, amt) => ({
      kind: 'xfer', amount: amt, cat: '繳卡費', merchant: '自動 · ' + (r.name || '繳卡費'),
      account: r.fromAccount + ' → ' + r.cardAccount, fromAccount: r.fromAccount, toAccount: r.cardAccount,
      xferFee: 0, date: mkDate(ym, day), icon: '↔️',
      auto: true, recurringId: r.id, time: '自動', _justAdded: mkStamp() });

    if (r.type === 'card' && r.cardMode === 'full') {
      // 全額繳清：只補「當期」一筆，金額 = 該卡目前未繳餘額（無欠款則略過）
      if (!acctGroups) acctGroups = computeAccounts(ctx.accounts, ctx.settle, ctx.flows.concat(newFlows), ctx.trades, ctx.initBal);
      const item = acctGroups.flatMap((g) => g.items).find((it) => it.name === r.cardAccount);
      // 信用卡的 item.amount 已是「正的應繳欠款」（computeAccounts 對負債群組取了 -raw），
      // 直接用它即可；無欠款(<=0)則略過本次繳款。
      const outstanding = item ? Math.max(0, item.amount || 0) : 0;
      const ym = due[due.length - 1];
      if (outstanding > 0) newFlows.push(mkCard(ym, Math.round(outstanding)));
      r.lastRun = ym;changed = true;
    } else if (r.type === 'card') {
      const amt = parseFloat(r.fixedAmount) || 0;
      due.forEach((ym) => {if (amt > 0) newFlows.push(mkCard(ym, amt));});
      r.lastRun = due[due.length - 1];changed = true;
    } else {
      const amt = parseFloat(r.amount) || 0;
      due.forEach((ym) => {if (amt > 0) newFlows.push(mkExpense(ym, amt));});
      r.lastRun = due[due.length - 1];changed = true;
    }
  });

  if (changed) {try {localStorage.setItem('ff_recurring', JSON.stringify(rules));} catch {}}
  return newFlows.length ? newFlows : null;
}
if (typeof window !== 'undefined') window.ffInitialLastRun = ffInitialLastRun;

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
const KIND_TO_GID = {
  '銀行': 'bank', '信用卡': 'credit', '現金': 'cash',
  '電子支付': 'epay', '儲值卡': 'prepaid', '交割戶': 'bank', '證券戶': 'brokerage', '其他': 'other'
};
const ACCT_GROUP_META = {
  credit: { name: '信用卡', icon: 'CreditCard', color: TOKENS.catCredit, sign: -1, assetClass: 'debt' },
  cash: { name: '現金', icon: 'Banknote', color: TOKENS.catCash, sign: 1, assetClass: 'cash' },
  bank: { name: '銀行', icon: 'Wallet', color: TOKENS.catBank, sign: 1, assetClass: 'cash' },
  brokerage: { name: '證券戶', icon: 'TrendUp', color: TOKENS.catBrokerage, sign: 1, assetClass: 'stock' },
  prepaid: { name: '儲值卡', icon: 'Tag', color: TOKENS.catPrepaid, sign: 1, assetClass: 'cash' },
  epay: { name: '電子支付', icon: 'Smartphone', color: TOKENS.catEpay, sign: 1, assetClass: 'cash' },
  other: { name: '其他', icon: 'Key', color: TOKENS.catOther, sign: 1, assetClass: 'other' }
};
const GID_ORDER = ['credit', 'cash', 'bank', 'brokerage', 'prepaid', 'epay', 'other'];

function computeAccounts(accounts, settleList, flows, trades, initialBalances) {
  if (!accounts || !flows || !trades) return GID_ORDER.map((gid) => ({ ...ACCT_GROUP_META[gid], id: gid, items: [] }));
  // Merge settle accounts that aren't already in accounts list
  const allAccts = [...accounts];
  (settleList || []).forEach((s) => {
    if (!allAccts.find((a) => a.name === s.name))
    allAccts.push({ name: s.name, kind: '銀行', sub: s.sub, currency: s.currency });
  });
  const bal = {};
  allAccts.forEach((a) => {bal[a.name] = parseFloat(initialBalances[a.name]) || 0;});
  // 未來日期的支出／收入／轉帳先不預先計入現有資產，等日期到了（<= 今天）才帶入餘額。
  const today = window.TODAY_DATE || new Date();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const isDue = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt) || dt <= todayEnd; // 日期解析失敗時不擋（保留舊資料相容）
  };
  flows.forEach((f) => {
    if (!isDue(f.date)) return;
    if (f.kind === 'exp') {if (bal[f.account] !== undefined) bal[f.account] -= f.amount;} else
    if (f.kind === 'inc') {if (bal[f.account] !== undefined) bal[f.account] += f.amount;} else
    if (f.kind === 'xfer') {
      const xfee = parseFloat(f.xferFee) || 0; // 手續費由轉出帳戶額外負擔
      if (bal[f.fromAccount] !== undefined) bal[f.fromAccount] -= f.amount + xfee;
      if (bal[f.toAccount] !== undefined) bal[f.toAccount] += f.amount;
    }
  });
  trades.forEach((t) => {
    // Only buys deduct from settlement; sells are handled via auto-generated flow entries
    if (t.side !== 'buy') return;
    const sh = parseFloat(t.shares) || 0,pr = parseFloat(t.price) || 0;
    const gross = sh * pr;
    const fee = t.fee != null && t.fee > 0 ? t.fee : sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
    const debit = t.net != null && t.net > 0 ? t.net : gross + fee;
    const broker = t.settleAccount || t.broker;
    if (broker && bal[broker] !== undefined) bal[broker] -= debit;
  });
  const groups = {};
  GID_ORDER.forEach((gid) => {groups[gid] = { ...ACCT_GROUP_META[gid], id: gid, items: [] };});
  accounts.forEach((a) => {
    const gid = KIND_TO_GID[a.kind] || 'other';
    const cur = a.currency || 'TWD';
    // 信用卡等負債群組：餘額以「應繳金額」正值表示（消費 → 增加欠款）
    const raw = bal[a.name] || 0;
    const amt = ACCT_GROUP_META[gid].sign < 0 ? -raw : raw;
    groups[gid].items.push({ name: a.name, sub: a.sub || a.kind, amount: amt,
      currency: cur, amountTWD: window.fxToTWD(amt, cur), badge: a.name.slice(0, 2) });
  });
  // Settle accounts not in the accounts list are bank-side 交割戶 → list them with 銀行
  (settleList || []).forEach((s) => {
    if (!accounts.find((a) => a.name === s.name)) {
      const cur = s.currency || 'TWD';
      groups['bank'].items.push({ name: s.name, sub: s.sub || '交割戶', amount: bal[s.name] || 0,
        currency: cur, amountTWD: window.fxToTWD(bal[s.name] || 0, cur), badge: s.name.slice(0, 2) });
    }
  });
  return GID_ORDER.map((gid) => groups[gid]);
}

const TAB_COLORS = [TOKENS.ink2, TOKENS.gray3, TOKENS.gray2, TOKENS.gray4, TOKENS.gray1, TOKENS.ink];

// 交易依時間序排序（日期→建立時間），FIFO 計算用
const tradeChrono = (a, b) => {
  const da = new Date(a.date) - new Date(b.date);
  if (da !== 0) return da;
  return (a._justAdded || 0) - (b._justAdded || 0);
};

// FIFO 消耗：從 lots 前端取 n 股，回傳取出的成本
function fifoConsume(lots, n) {
  let left = n,cost = 0;
  while (left > 0 && lots.length) {
    const lot = lots[0];
    const take = Math.min(lot.qty, left);
    cost += take * lot.price;
    lot.qty -= take;left -= take;
    if (lot.qty <= 0) lots.shift();
  }
  return { cost, uncovered: left };
}

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

function computeHoldings(trades, masterData, livePrices = {}) {
  if (!trades) return [];
  const curMap = window.buildCurMap(masterData);
  const stocks = {};
  trades.slice().sort(tradeChrono).forEach((t) => {
    if (!t.code) return;
    if (!stocks[t.code]) stocks[t.code] = {
      code: t.code, name: t.name || t.code, qty: 0, lots: [],
      assetClass: t.assetClass || '股票', broker: t.broker || t.settleAccount || '',
      lastPrice: parseFloat(t.price) || 0
    };
    const s = stocks[t.code];
    const sh = parseFloat(t.shares) || 0,pr = parseFloat(t.price) || 0;
    if (t.side === 'buy') {
      const gross = sh * pr;
      // 有明確記錄手續費就採用（含 0，匯入資料的成本已內含費用）；只有完全沒有 fee 欄位
      // 的舊資料才回頭推算，避免對已含費用的成本再加一次手續費、灌大成本。
      const fee = t.fee != null ? t.fee : sh > 0 && pr > 0 ? Math.max(1, Math.round(gross * 0.001425)) : 0;
      const costPerShare = sh > 0 ? (gross + fee) / sh : pr;
      s.lots.push({ qty: sh, price: costPerShare });
      s.qty += sh;
    } else {fifoConsume(s.lots, sh);s.qty -= sh;}
    s.lastPrice = pr;
    if (t.assetClass) s.assetClass = t.assetClass;
  });
  // Group dynamically by assetClass
  const groups = {};
  Object.values(stocks).forEach((s) => {
    if (s.qty <= 0) return;
    const totalCost = s.lots.reduce((a, l) => a + l.qty * l.price, 0);
    const key = s.assetClass || '股票';
    if (!groups[key]) groups[key] = { id: key, name: key, items: [] };
    const avg = s.qty > 0 ? totalCost / s.qty : 0;
    const price = livePrices[s.code] || s.lastPrice || 0,mv = s.qty * price,pnl = mv - totalCost;
    const cur = curMap[s.broker] || 'TWD';
    groups[key].items.push({
      code: s.code, name: s.name,
      qty: Math.round(s.qty * 1000) / 1000, avg: Math.round(avg * 10) / 10,
      price, mv: Math.round(mv), pnl: Math.round(pnl),
      currency: cur,
      mvTWD: Math.round(window.fxToTWD(mv, cur)),
      costTWD: Math.round(window.fxToTWD(totalCost, cur)),
      pnlTWD: Math.round(window.fxToTWD(pnl, cur)),
      pct: totalCost > 0 ? pnl / totalCost * 100 : 0, broker: s.broker
    });
  });
  return Object.values(groups);
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
                '0 0 0 6px rgba(0,0,0,0.20), 0 10px 24px rgba(217, 119, 87,0.5)' :
                '0 10px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.14)',
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

function RecordSheet({ open, draft, onClose, onSaved, onDelete, masterData, computedHoldings }) {
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
        width: '100%', maxHeight: '92%',
        background: TOKENS.bg,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
        boxShadow: SH('0 -20px 40px rgba(0,0,0,0.5)'),
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: PAD('10px 0 4px') }}>
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
        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: SP(32) }}>
          <AccountingScreen onSaved={onSaved} onDelete={onDelete} initialDraft={draft} masterData={masterData} computedHoldings={computedHoldings} />
        </div>
      </div>
    </div>);

}

/* ============= Voice listening overlay (long-press) ============= */
// 把一句話解析成記帳草稿（語音或打字皆用）。一律回傳草稿（金額可空，讓使用者補）。
const INC_WORDS_V = ['薪水', '薪資', '獎金', '股息', '股利', '利息', '收入', '入帳', '退款', '租金', '分紅', '紅利', '中獎'];

// 關鍵字 → 預設「項目(leaf)」與「類別(group)」。先比對使用者實際的分類名稱，
// 對不到才用此表推斷；leaf 對不到時退而求其次用 group 的第一個項目。
const EXP_KW_V = [
  [/早餐|早點/, '早餐', '餐飲'],
  [/午餐|中餐|中午|便當|午飯|lunch/i, '午餐', '餐飲'],
  [/晚餐|晚飯|宵夜|消夜|dinner/i, '晚餐', '餐飲'],
  [/點心|甜點|蛋糕|麵包|下午茶/, '點心', '餐飲'],
  [/飲料|手搖|咖啡|奶茶|拿鐵|星巴克/, '飲料', '餐飲'],
  [/超商|便利商店|7-?11|全家|萊爾富/i, '飲料', '餐飲'],
  [/餐廳|吃飯|火鍋|燒烤|速食|麥當勞|肯德基|早午餐|拉麵|便當店|小吃|晚上吃|中午吃/, '午餐', '餐飲'],
  [/加油|油錢|加油站/, '加油', '交通'],
  [/捷運|公車|bus|ubike|youbike/i, '捷運', '交通'],
  [/火車|台鐵/, '火車', '交通'],
  [/高鐵/, '高鐵', '交通'],
  [/停車|停車費|停車場/, '停車費', '交通'],
  [/計程車|taxi|uber|車資|修車|保養|輪胎|機車行/i, '修車保養', '交通'],
  [/水費/, '水費', '日常'],
  [/電費/, '電費', '日常'],
  [/瓦斯/, '瓦斯費', '日常'],
  [/網路費|寬頻|手機費|電話費|電信/, '網路費', '日常'],
  [/netflix|spotify|youtube|disney|訂閱|串流|app ?store|google ?play/i, '數位平台', '日常'],
  [/購物|買衣|衣服|鞋|包包|蝦皮|momo|網購|百貨|商場/i, '購物', '娛樂'],
  [/電影|遊戲|ktv|唱歌|娛樂|展覽|演唱會|門票/i, '購物', '娛樂'],
  [/掛號|看醫生|診所|醫院|門診|牙醫|看病/, '掛號費', '醫療'],
  [/藥|保健|維他命|維生素|健康食品|營養品/, '保健食品', '醫療']];

const INC_KW_V = [
  [/薪水|薪資|月薪|工資|發薪/, '薪資', '主動'],
  [/獎金|分紅|年終|三節/, '獎金', '主動'],
  [/加班費/, '加班費', '主動'],
  [/股息|股利|配息|除息/, '股息', '被動'],
  [/利息/, '利息', '被動'],
  [/租金/, '租金', '被動'],
  [/回饋|返現|紅利/, '紅利回饋', '被動'],
  [/投資收入|資本利得|價差/, '投資收入', '被動'],
  [/發票|中獎/, '發票中獎', '其他'],
  [/退稅|退費|退款/, '退稅', '其他']];

function flowCatsV(list) {return (list || []).map((c) => typeof c === 'string' ? { name: c, group: c } : c);}

// 從文字推斷分類「項目(leaf)」：①直接念到項目名 ②念到類別名→取該類別第一個項目 ③關鍵字表
function resolveCategoryV(t, list, kw) {
  const items = flowCatsV(list);
  const names = items.map((i) => i.name).filter(Boolean);
  const firstOfGroup = (g) => {const f = items.find((i) => i.group === g);return f ? f.name : g;};
  const leaf = names.slice().sort((a, b) => b.length - a.length).find((n) => t.includes(n));
  if (leaf) return leaf;
  const grp = [...new Set(items.map((i) => i.group).filter(Boolean))].find((g) => t.includes(g));
  if (grp) return firstOfGroup(grp);
  for (const [re, leafTarget, groupTarget] of kw) {
    if (re.test(t)) {
      if (leafTarget && names.includes(leafTarget)) return leafTarget;
      if (groupTarget && items.some((i) => i.group === groupTarget)) return firstOfGroup(groupTarget);
    }
  }
  return '';
}

// 從文字推斷帳戶：①直接念到帳戶名（忽略大小寫/空白） ②付款方式關鍵字 → 對應類型帳戶
function resolveAccountV(t, md) {
  const accts = [...(md.accounts || []), ...(md.settle || [])];
  const norm = (s) => (s || '').toLowerCase().replace(/[\s\-_()（）]/g, '');
  const nt = norm(t);
  const byName = accts.map((a) => a.name).filter(Boolean).
  sort((a, b) => norm(b).length - norm(a).length).
  find((n) => norm(n) && nt.includes(norm(n)));
  if (byName) return byName;
  const PAY = [
  [/linepay|line ?pay/i, (a) => /line/i.test(a.name)],
  [/街口/, (a) => /街口/.test(a.name)],
  [/悠遊付|悠遊卡|悠遊/, (a) => /悠遊/.test(a.name) || a.kind === '儲值卡'],
  [/全支付|全聯/, (a) => /全/.test(a.name)],
  [/現金|錢包/, (a) => a.kind === '現金'],
  [/刷卡|信用卡|刷/, (a) => a.kind === '信用卡'],
  [/電子支付|行動支付|手機支付/, (a) => a.kind === '電子支付']];
  for (const [re, pred] of PAY) {
    if (re.test(t)) {const hit = accts.find(pred);if (hit) return hit.name;}
  }
  return '';
}

// 中文數字轉阿拉伯數字（支援 五 / 十 / 一百 / 兩千五百…；純數字直接回傳）。
function cnNumV(s) {
  s = String(s || '').trim();
  if (!s) return NaN;
  if (/^[\d,]+$/.test(s)) return parseInt(s.replace(/,/g, ''), 10);
  const D = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 倆: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const U = { 十: 10, 百: 100, 千: 1000, 萬: 10000 };
  let total = 0, section = 0, cur = 0, matched = false;
  for (const ch of s) {
    if (D[ch] != null) {cur = D[ch];matched = true;} else
    if (U[ch] != null) {
      matched = true;
      const u = U[ch];
      if (u === 10000) {total = (total + section + cur) * u;section = 0;cur = 0;} else
      {section += (cur || 1) * u;cur = 0;}
    }
  }
  return matched ? total + section + cur : NaN;
}

// 蒐集可用的股票清單（內建 + 已載入快取）供語音以名稱/代號比對。
function ffStockUniverseV() {
  const out = [];
  const push = (arr) => {if (Array.isArray(arr)) arr.forEach((s) => {if (s && s.code && s.name) out.push({ code: String(s.code), name: String(s.name) });});};
  try {push(window.TW_STOCK_FALLBACK);} catch {}
  try {push(window.US_STOCK_LIST);} catch {}
  try {push(window.US_STOCK_LIST_EXTRA);} catch {}
  try {const c = JSON.parse(localStorage.getItem('ff_tw_stocks_v7') || 'null');if (c && Array.isArray(c.data)) push(c.data);} catch {}
  return out;
}
// 在文字裡找出被念到的股票（取名稱最長者，避免「台積」先於「台積電」命中）。
function matchStockV(t, list) {
  let best = null;
  for (const s of list) {
    if (s.name && s.name.length >= 2 && t.includes(s.name) && (!best || s.name.length > best.name.length)) best = s;
  }
  return best;
}
// 轉帳偵測：抓「轉出→轉入」兩個帳戶。
function resolveTransferV(t, md) {
  const strong = /轉帳|匯款|轉入|轉出|轉到|轉給|轉至|匯到|匯給/.test(t);
  const weak = /轉|匯/.test(t);
  if (!strong && !weak) return null;
  const m = t.match(/^(.*?)(?:轉帳|轉出|匯款|匯出|匯|轉)(.*?)(?:到|至|給|轉入)(.*)$/);
  let fromSeg, toSeg;
  if (m) {fromSeg = m[1];toSeg = m[3];} else
  {const parts = t.split(/轉帳|匯款|匯|轉/);fromSeg = parts[0] || '';toSeg = parts.slice(1).join(' ');}
  const from = resolveAccountV(fromSeg, md);
  const to = resolveAccountV(toSeg, md);
  if (strong || from && to) return { from, to };
  return null;
}

// 語音備註擷取：明講「備註…」的內容優先；否則抓句中的店家/品牌名帶入備註。
const MERCHANTS_V = ['麥當勞', '肯德基', '摩斯', '漢堡王', '必勝客', '達美樂', 'SUBWAY', '星巴克', '路易莎',
'85度C', '五十嵐', '清心', '可不可', '迷客夏', '麻古', 'COCO', '全聯', '家樂福', '大潤發', '好市多',
'COSTCO', '愛買', '美廉社', '7-11', '711', '小七', '全家', '萊爾富', 'OK超商', '蝦皮', 'MOMO',
'PCHOME', '淘寶', 'AMAZON', 'UBEREATS', 'UBER', 'FOODPANDA', '熊貓', 'NETFLIX', 'SPOTIFY',
'YOUTUBE', 'DISNEY', 'STEAM', 'IKEA', '宜得利', '屈臣氏', '康是美', '寶雅', '誠品', '博客來',
'中油', '加油站', '高鐵', '台鐵'];
function extractNoteV(t) {
  // 1) 明講備註：「備註(是/：)xxx」→ xxx 全部進備註，並從句子移除、避免干擾金額/分類解析
  const m = t.match(/(?:備註|备注|註記|附註)(?:是|為|：|:|，|,)?\s*(.+)$/);
  if (m && m[1]) {
    const note = m[1].replace(/[。.!！]+$/, '').trim();
    if (note) return { note, rest: t.slice(0, m.index).trim() };
  }
  // 2) 店家/品牌名：帶入備註（保留在原句，分類仍可據以判斷，如 麥當勞→午餐）
  const up = t.toUpperCase();
  const hit = MERCHANTS_V.find((w) => up.includes(w));
  if (hit) {
    const i = up.indexOf(hit);
    return { note: t.slice(i, i + hit.length), rest: t };
  }
  // 3) 「在/去 ○○ 買/吃/喝…」→ ○○ 當店家
  const g = t.match(/[在去]([^\s0-9$＄，。,]{2,10}?)(?:買|吃飯|吃|喝|消費|用餐|刷)/);
  if (g && g[1] && !/帳|卡|銀行|錢包/.test(g[1])) return { note: g[1], rest: t };
  return { note: '', rest: t };
}

function parseUtterance(text, masterData = {}) {
  const raw = (text || '').trim();
  const { note: vNote, rest } = extractNoteV(raw);
  const t = rest || raw;
  const nums = (t.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((s) => parseFloat(s.replace(/,/g, '')));
  const amount = nums.length ? Math.max.apply(null, nums) : '';
  const sideSell = /賣出|賣掉|賣股|出脫|賣/.test(t);
  const sideBuy = /買進|買入|買股|加碼|買/.test(t);

  // 股數（含中文數字、「張」= 1000 股）
  let shares = '';
  const shM = t.match(/([0-9,一二三四五六七八九十百千兩零]+)\s*(股|張)/);
  if (shM) {const n = cnNumV(shM[1]);if (!isNaN(n)) shares = String(shM[2] === '張' ? n * 1000 : n);}

  // ── 股票買賣 ──
  const stockList = ffStockUniverseV();
  const matched = matchStockV(t, stockList);
  const tNoMoney = t.replace(/[$＄]\s?[\d,]+(?:\.\d+)?/g, ' '); // 去掉「$金額」避免被當成代號
  const codeInText = /\b\d{4,6}[A-Z]?\b/.test(tNoMoney);
  if ((sideBuy || sideSell) && (matched || codeInText && /股|張/.test(t))) {
    let code = matched ? matched.code : '';
    let name = matched ? matched.name : '';
    if (!code) {
      const cands = (tNoMoney.match(/\b\d{4,6}[A-Z]?\b/g) || []).filter((c) => c !== shares);
      code = cands.find((c) => stockList.some((s) => s.code === c)) || cands[0] || '';
      const found = stockList.find((s) => s.code === code);
      if (found) name = found.name;
    }
    let price = '';
    const prM = t.match(/(?:成交價|單價|每股|價位|價|@)\s*[$＄]?\s*([\d,]+(?:\.\d+)?)/);
    if (prM) price = prM[1].replace(/,/g, '');
    const moneyM = t.match(/[$＄]\s?([\d,]+(?:\.\d+)?)/);
    const money = moneyM ? parseFloat(moneyM[1].replace(/,/g, '')) : null;
    if (!price) {
      if (money != null && shares && parseFloat(shares) > 0) {
        price = String(Math.round(money / parseFloat(shares) * 100) / 100);
      } else {
        const leftover = nums.filter((n) => String(n) !== code && String(n) !== shares && n !== money);
        if (leftover.length) price = String(leftover[leftover.length - 1]);
      }
    }
    const summary = [];
    if (code || name) summary.push(['標的', (code ? code + ' ' : '') + (name || '')]);
    if (vNote) summary.push(['備註', vNote]);
    return { intent: 'stock', edit: false, text: raw, summary,
      apply: { side: sideSell ? 'sell' : 'buy', code: code || '', name: name || '', shares: shares || '', price: price || '', note: vNote } };
  }

  // ── 轉帳 ──
  const xfer = resolveTransferV(t, masterData);
  if (xfer) {
    const summary = [];
    if (xfer.from) summary.push(['轉出', xfer.from]);
    if (xfer.to) summary.push(['轉入', xfer.to]);
    if (vNote) summary.push(['備註', vNote]);
    const apply = { kind: 'xfer', amount: String(amount), note: vNote };
    if (xfer.from) apply.fromAccount = xfer.from;
    if (xfer.to) apply.toAccount = xfer.to;
    return { intent: 'flow', edit: false, text: raw, summary, apply };
  }

  // ── 一般收支 ──
  const kind = INC_WORDS_V.some((w) => t.includes(w)) ? 'inc' : 'exp';
  const category = kind === 'inc' ?
  resolveCategoryV(t, masterData.cat_inc, INC_KW_V) :
  resolveCategoryV(t, masterData.cat_exp, EXP_KW_V);
  const account = resolveAccountV(t, masterData);
  // 備註只帶「明講的備註內容」或「店家/品牌名」，不把整句辨識文字塞進去
  //（原句仍顯示在「AI 已帶入」提示）。
  const summary = [];
  if (category) summary.push(['分類', category]);
  if (account) summary.push(['帳戶', account]);
  if (vNote) summary.push(['備註', vNote]);
  const apply = { kind, amount: String(amount), note: vNote };
  if (category) apply.category = category;
  if (account) apply.account = account;
  return { intent: 'flow', edit: false, text: raw, summary, apply };
}
if (typeof window !== 'undefined') window.ffParseUtterance = parseUtterance;

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
  const [acctDetail, setAcctDetail] = useStateApp(null);
  const [investDetail, setInvestDetail] = useStateApp(null);
  const [acctOverrides, setAcctOverrides] = useStateApp({});

  const appMask = (n) => hideAmounts ? '••••••' : Math.round(n).toLocaleString();

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

  // Daily-close prices via the FinFolio price Worker (sends only stock codes).
  // Shows cached prices instantly; this refreshes in the background / on demand.
  // If the service is unset or unreachable, holdings fall back to the
  // transaction price (see computeHoldings).
  const fetchLivePrices = React.useCallback(async () => {
    const codes = [...new Set(
      savedTradesRef.current.filter((t) => t.code).map((t) => t.code)
    )];
    if (!codes.length) return;
    const base = window.FF_PRICE_API;
    if (!base) return; // price service not configured yet
    try {
      const res = await fetch(base + '/quotes?codes=' + encodeURIComponent(codes.join(',')));
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.fx && data.fx.USD) window.FX_RATES.USD = data.fx.USD;
      if (data && data.prices && Object.keys(data.prices).length > 0) {
        setLivePrices((prev) => {
          const merged = { ...prev, ...data.prices };
          try { localStorage.setItem('ff_prices', JSON.stringify({ prices: merged, fx: data.fx || {}, date: data.date || null })); } catch (e) {}
          return merged;
        });
        setPricesFetchedAt(data.date ? new Date(data.date) : new Date());
      }
    } catch (e) { /* offline / blocked — keep cached prices */ }
  }, []);

  const [recordOpen, setRecordOpen] = useStateApp(false);
  const [recordDraft, setRecordDraft] = useStateApp(null);
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

  // 同步 ref 並在持倉有變化時拉最新報價
  useEffectApp(() => {
    savedTradesRef.current = savedTrades;
    if (savedTrades.some((t) => t.code)) fetchLivePrices();
  }, [savedTrades]);
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
  const toggleStockHidden = (code) => setHidden((h) => ({ ...h,
    stocks: h.stocks.includes(code) ? h.stocks.filter((c) => c !== code) : [...h.stocks, code] }));

  // 排除隱藏項目後的「有效資料」；revealHidden 開啟或沒有任何隱藏時等同原始資料。
  const effFlows = React.useMemo(() => revealHidden || !hiddenAcctSet.size ? savedFlows :
  savedFlows.filter((f) => !(f.account && hiddenAcctSet.has(f.account)) &&
  !(f.fromAccount && hiddenAcctSet.has(f.fromAccount)) && !(f.toAccount && hiddenAcctSet.has(f.toAccount))),
  [savedFlows, hiddenAcctSet, revealHidden]);
  const effTrades = React.useMemo(() => revealHidden || !hiddenStockSet.size && !hiddenAcctSet.size ? savedTrades :
  savedTrades.filter((t) => !hiddenStockSet.has(t.code) &&
  !(t.settleAccount && hiddenAcctSet.has(t.settleAccount)) && !(t.broker && hiddenAcctSet.has(t.broker))),
  [savedTrades, hiddenStockSet, hiddenAcctSet, revealHidden]);
  const effAccounts = React.useMemo(() => revealHidden || !hiddenAcctSet.size ? masterData?.accounts || [] :
  (masterData?.accounts || []).filter((a) => !hiddenAcctSet.has(a.name)), [masterData, hiddenAcctSet, revealHidden]);
  const effSettle = React.useMemo(() => revealHidden || !hiddenAcctSet.size ? masterData?.settle || [] :
  (masterData?.settle || []).filter((s) => !hiddenAcctSet.has(s.name)), [masterData, hiddenAcctSet, revealHidden]);

  // 動態計算：帳戶餘額與投資持倉（必須在所有 state 宣告後）
  const computedAcctGroups = useMemoApp(() =>
  computeAccounts(effAccounts, effSettle, effFlows, effTrades, initialBalances),
  [effAccounts, effSettle, effFlows, effTrades, initialBalances]
  );
  const computedHoldings = useMemoApp(() =>
  computeHoldings(effTrades, masterData, livePrices),
  [effTrades, masterData, livePrices]
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
    const code = recordReturnInvestDetail.code;
    const item = computedHoldings.flatMap((g) => g.items).find((it) => it.code === code);
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

        // Build auto-gen flows for a sell trade (xfer + pnl).
        // tradeJA = the trade's _justAdded stamp used to link flows.
        // excludeRecordId = 's-XXX' of the trade being edited (to remove it from FIFO history).
        const buildSellFlows = (tradeJA, excludeRecordId) => {
          if (data.side !== 'sell' || !data.settleAccount) return [];
          const sh = parseFloat(data.shares) || 0;
          const pr = parseFloat(data.price) || 0;
          const gross = Math.round(sh * pr);
          const sellFee = data.fee != null && data.fee > 0 ? data.fee : Math.max(1, Math.round(gross * 0.001425));
          const sellTax = data.tax != null && data.tax > 0 ? data.tax : Math.round(gross * 0.003);
          const proceeds = gross - sellFee - sellTax;

          // FIFO cost basis — exclude the trade being edited from history
          const hist = savedTrades
            .filter((t) => t.code === data.code && (excludeRecordId ? ('s-' + t._justAdded !== excludeRecordId) : true))
            .slice().sort(tradeChrono);
          const lots = [];
          hist.forEach((t) => {
            const hsh = parseFloat(t.shares) || 0, hpr = parseFloat(t.price) || 0;
            const hgross = hsh * hpr;
            // 與持倉/明細一致：有記錄手續費就採用（含 0），只有缺欄位才推算，
            // 否則賣出時轉回交割戶的成本會比原始成本多算一次手續費。
            const hfee = t.fee != null ? t.fee : hsh > 0 && hpr > 0 ? Math.max(1, Math.round(hgross * 0.001425)) : 0;
            const costPerShare = hsh > 0 ? (hgross + hfee) / hsh : hpr;
            if (t.side === 'buy') { lots.push({ qty: hsh, price: costPerShare }); } else { fifoConsume(lots, hsh); }
          });
          const fifo = fifoConsume(lots, sh);
          const costBasis = Math.round(fifo.cost + fifo.uncovered * pr);
          const pnl = proceeds - costBasis;
          const isTW = /^\d/.test(String(data.code || ''));
          const settleDate = isTW ? addBizDays(data.date, 2) : data.date;

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
            const newFlows = buildSellFlows(tradeJA, data.recordId);
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
          const newFlows = buildSellFlows(tradeJA, null);
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
          savedFlows={effFlows}
          hideAmounts={hideAmounts}
          onRecord={(draft) => { setRecordReturnTab('advisor'); setRecordDraft(draft); setRecordOpen(true); }} />
        </div> :

      <div style={{
        position: 'absolute', top: CONTENT_TOP, bottom: 0, left: 0, right: 0,
        overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: SP(130)
      }}>
          {tab === 'dashboard' && <DashboardScreen hideAmounts={hideAmounts} setHideAmounts={setHideAmounts} savedFlows={effFlows} savedTrades={effTrades} dashWidget={dashWidget} recordEdits={recordEdits} recordDeletes={recordDeletes} onEditRecord={(d) => {setRecordReturnTab('dashboard');setRecordDraft(d);setRecordOpen(true);}} computedAcctGroups={computedAcctGroups} computedHoldings={computedHoldings} masterData={masterData} onOpenStats={() => setStatsOpen(true)} />}
          {tab === 'accounts' && <AccountsScreen hideAmounts={hideAmounts}
        computedAcctGroups={computedAcctGroups}
        computedHoldings={computedHoldings}
        savedFlows={effFlows}
        masterData={masterData}
        onOpenNetWorth={() => setNetWorthOpen(true)}
        onOpenDetail={setAcctDetail} />}
          {tab === 'invest' && <InvestScreen hideAmounts={hideAmounts}
        computedHoldings={computedHoldings}
        savedTrades={effTrades}
        masterData={masterData}
        pricesFetchedAt={pricesFetchedAt}
        onRefreshPrices={fetchLivePrices}
        onOpenBreakdown={() => setInvestBreakdownOpen(true)}
        onOpenDetail={(d) => setInvestDetail({ ...d, mask: appMask, savedTrades: effTrades })} />}
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
          const code = recordReturnInvestDetail.code;
          const item = computedHoldings.flatMap((g) => g.items).find((it) => it.code === code);
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
        savedFlows={effFlows} masterData={masterData} hideAmounts={hideAmounts}
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
          mask={appMask} hideAmounts={hideAmounts} />;
      })()}
      {(() => {
        const IBSheet = window.InvestBreakdownSheet;
        return IBSheet ? <IBSheet open={investBreakdownOpen} onClose={() => setInvestBreakdownOpen(false)}
          computedHoldings={computedHoldings} masterData={masterData} mask={appMask}
          savedTrades={effTrades} savedFlows={effFlows} /> : null;
      })()}

      {/* ── Detail sheets at phone-frame root (避免被 overflow 容器截切) ── */}
      {(() => {
        const AcctSheet = window.AccountDetailSheet;
        const InvSheet = window.InvestDetailSheet;
        return (
          <>
            {AcctSheet && acctDetail &&
            <AcctSheet data={acctDetail} mask={appMask}
            savedFlows={effFlows} savedTrades={effTrades}
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
            savedTrades={effTrades}
            onClose={() => setInvestDetail(null)}
            hideAmounts={hideAmounts} revealHidden={revealHidden}
            isHidden={hiddenStockSet.has(investDetail.item.code)}
            onToggleHidden={() => {
              const wasHidden = hiddenStockSet.has(investDetail.item.code);
              toggleStockHidden(investDetail.item.code);
              if (!wasHidden) setRevealHidden(false); // 新隱藏 → 立即從清單與統計消失
              setInvestDetail(null);
            }}
            onEditRecord={(d) => {
              // 同帳戶詳情：不卸載個股詳情頁，記一筆疊在上面，關閉後直接露出，避免閃跳。
              const code = investDetail.item.code;
              setRecordDraft(d);
              setRecordReturnTab('invest');
              setRecordReturnInvestDetail({ code });
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