/* ── 分類 → 上次使用的帳戶記憶 ──────────────────────────────────────
   存於 localStorage ff_last_acct_by_cat：
   { 'exp:早餐': { account }, 'inc:薪資': { account },
     'xfer:繳卡費': { fromAccount, toAccount } }
   key 加 kind 前綴，避免收入/支出同名分類互相污染。
   值直接存成可以丟給表單 update() 的 patch，套用端不必分辨型別。
   純邏輯、無 React/DOM，方便單獨做單元測試。 */

const LAST_ACCT_KEY = 'ff_last_acct_by_cat';

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_ACCT_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function mapKey(kind, category) {
  return kind && category ? kind + ':' + category : '';
}

// 讀回該分類記住的帳戶 patch。帳戶可能已被使用者刪除或改名，
// 所以用 validNames 過濾；全部欄位都失效（或沒記錄過）就回傳 null。
export function ffLastAccountFor(kind, category, validNames) {
  const key = mapKey(kind, category);
  if (!key) return null;
  const saved = readAll()[key];
  if (!saved || typeof saved !== 'object') return null;
  const valid = validNames || [];
  const patch = {};
  Object.keys(saved).forEach((field) => {
    if (valid.includes(saved[field])) patch[field] = saved[field];
  });
  return Object.keys(patch).length ? patch : null;
}

export function ffRememberAccount(kind, category, patch) {
  const key = mapKey(kind, category);
  if (!key || !patch) return;
  const clean = {};
  Object.keys(patch).forEach((field) => {
    if (patch[field]) clean[field] = patch[field];
  });
  if (!Object.keys(clean).length) return;
  const all = readAll();
  all[key] = clean;
  try {localStorage.setItem(LAST_ACCT_KEY, JSON.stringify(all));} catch {}
}
