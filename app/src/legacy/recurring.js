/* ── 自動轉帳 / 定期支出 ─────────────────────────────────────────────
   規則存於 localStorage ff_recurring：
   { id, type:'expense'|'transfer', name, enabled, dayOfMonth(1..28), lastRun:'YYYY-MM',
     // expense:  amount, category, account
     // transfer: fromAccount, toAccount, amount }
   每次開 App 時把「上次產生之後、到本月為止且已過扣款日」的月份補記入帳。
   扣款日還沒到的月份一律不記，等當天開 App 才真的扣。純邏輯、無 React/DOM，
   從 app.jsx 抽出來以便單獨做單元測試。 */

export function ffYM(d) {return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');}
export function ffPrevYM(ym) {const a = ym.split('-').map(Number);return ffYM(new Date(a[0], a[1] - 2, 1));}

// 規則的扣款日：1–28（避開 29–31 在短月份沒有對應日期的問題）。
export function ffRecurringDay(r) {return Math.min(Math.max(parseInt(r && r.dayOfMonth, 10) || 1, 1), 28);}

export function ffInitialLastRun(day, now) {
  const cm = ffYM(now);
  return now.getDate() >= day ? cm : ffPrevYM(cm); // 扣款日已過→下月才跑；未到→本月仍會跑
}

export function ffMonthsAfter(lastRun, now) {
  const res = [];const cy = now.getFullYear(),cm = now.getMonth() + 1;
  const a = (lastRun || '').split('-').map(Number);
  let cur = new Date(a[0] || cy, (a[1] || cm) - 1, 1);cur.setMonth(cur.getMonth() + 1);
  let guard = 0;
  while ((cur.getFullYear() < cy || cur.getFullYear() === cy && cur.getMonth() + 1 <= cm) && guard < 36) {
    res.push(ffYM(cur));cur.setMonth(cur.getMonth() + 1);guard++;
  }
  return res;
}

// 算出某規則這次該補記哪幾個月（'YYYY-MM'，由舊到新）。
// 本月只有在「今天 >= 扣款日」時才列入——日期還沒到就先不扣款。
export function ffDueMonths(rule, now) {
  const cm = ffYM(now);
  const day = ffRecurringDay(rule);
  return ffMonthsAfter(rule.lastRun || ffPrevYM(cm), now).
  filter((ym) => ym < cm || ym === cm && now.getDate() >= day);
}

export function ffRunRecurring(ctx) {
  let rules;
  try {rules = JSON.parse(localStorage.getItem('ff_recurring') || '[]');} catch {return null;}
  if (!Array.isArray(rules) || !rules.length) return null;
  const now = ctx && ctx.now || new Date();
  const base = Date.now();let seq = 0;
  const mkDate = (ym, day) => ym + '-' + String(day).padStart(2, '0');
  const mkStamp = () => base + seq++;
  const newFlows = [];
  let changed = false;

  rules.forEach((r) => {
    if (!r.enabled) return;
    const day = ffRecurringDay(r);
    const due = ffDueMonths(r, now);
    if (!due.length) return;

    const mkExpense = (ym, amt) => ({
      kind: 'exp', amount: amt, cat: r.category, merchant: '自動 · ' + (r.name || r.category || '定期支出'),
      account: r.account, date: mkDate(ym, day), icon: '🔁',
      auto: true, recurringId: r.id, time: '自動', _justAdded: mkStamp() });

    const mkTransfer = (ym, amt) => ({
      kind: 'xfer', amount: amt, cat: '自動轉帳', merchant: '自動 · ' + (r.name || '自動轉帳'),
      account: r.fromAccount + ' → ' + r.toAccount, fromAccount: r.fromAccount, toAccount: r.toAccount,
      xferFee: 0, date: mkDate(ym, day), icon: '↔️',
      auto: true, recurringId: r.id, time: '自動', _justAdded: mkStamp() });

    const amt = parseFloat(r.amount) || 0;
    const mk = r.type === 'transfer' ? mkTransfer : mkExpense;
    due.forEach((ym) => {if (amt > 0) newFlows.push(mk(ym, amt));});
    r.lastRun = due[due.length - 1];changed = true;
  });

  if (changed) {try {localStorage.setItem('ff_recurring', JSON.stringify(rules));} catch {}}
  return newFlows.length ? newFlows : null;
}

if (typeof window !== 'undefined') Object.assign(window, { ffInitialLastRun, ffRecurringDay, ffDueMonths, ffRunRecurring });
