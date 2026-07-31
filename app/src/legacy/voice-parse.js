// 語音/文字記帳解析 pipeline — extracted out of app.jsx (pure logic, no React)
// so it can be unit-tested without pulling in the ReactDOM.createRoot(...)
// mount call at the bottom of that file.
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

export function parseUtterance(text, masterData = {}) {
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
  // 判定為股票買賣：有買/賣關鍵字，且（比對到清單／台股代號+股張／明講「股」）。
  // 加上「只要句中有『股』就算」→ 未在清單裡的股票（含美股代號如 SPCX）也能被判成股票。
  if ((sideBuy || sideSell) && (matched || codeInText && /股|張/.test(t) || /股/.test(t))) {
    let code = matched ? matched.code : '';
    let name = matched ? matched.name : '';
    if (!code) {
      const cands = (tNoMoney.match(/\b\d{4,6}[A-Z]?\b/g) || []).filter((c) => c !== shares);
      code = cands.find((c) => stockList.some((s) => s.code === c)) || cands[0] || '';
      // 台股數字代號抓不到 → 試著抓「在清單裡的美股英文代號」（安全，不亂猜）
      if (!code) {
        const us = (tNoMoney.toUpperCase().match(/\b[A-Z]{1,5}\b/g) || []);
        code = us.find((c) => stockList.some((s) => s.code === c)) || '';
      }
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
