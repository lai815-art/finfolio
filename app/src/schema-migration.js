// Data schema migration — extracted out of main.js so it can be unit-tested
// without also triggering main.js's dynamic import of the legacy app chain
// (which ends in a real ReactDOM.createRoot(...).render(...) mount).
//
// User records may live for years across app updates. Every release bumps
// SCHEMA_VERSION and adds an idempotent step here; data is never wiped.
export const SCHEMA_VERSION = 4;

export function migrateSchema() {
  try {
    var cur = parseInt(localStorage.getItem('ff_schema_version') || '0', 10) || 0;
    // v0 → v1: the current localStorage shape (ff_flows / ff_trades / …) is v1.
    // v1..v3 → v4: 記帳分類(收入) 分組定案，把既有自訂資料一次校正到最終結構：
    //   被動收入 = 租金 / 股息 / 債息 / 利息 / 紅利回饋
    //   投資收入 = 台股 / 美股 / 投資收入（買賣損益）
    // 只調整這幾個具名項目的大類、並補齊缺少的項目；其餘項目與使用者自訂皆不動。
    if (cur < 4) {
      try {
        var md = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
        if (md && Array.isArray(md.cat_inc)) {
          var PASSIVE = { '股息': 1, '債息': 1, '利息': 1, '紅利回饋': 1 };
          var INVEST = { '台股': 1, '美股': 1, '投資收入': 1 };
          var nameOf = function (c) {return typeof c === 'string' ? c : c && c.name;};
          md.cat_inc = md.cat_inc.map(function (c) {
            var n = nameOf(c);
            if (PASSIVE[n]) return { name: n, group: '被動' };
            if (INVEST[n]) return { name: n, group: '投資收入' };
            return c; // 其他項目維持原本大類
          });
          var ensure = function (name, group, beforeName) {
            if (md.cat_inc.some(function (c) {return nameOf(c) === name;})) return;
            var i = md.cat_inc.findIndex(function (c) {return nameOf(c) === beforeName;});
            var item = { name: name, group: group };
            if (i >= 0) md.cat_inc.splice(i, 0, item);else md.cat_inc.push(item);
          };
          ensure('債息', '被動', '利息');
          ensure('台股', '投資收入', '美股');
          ensure('美股', '投資收入', '投資收入');
          localStorage.setItem('ff_master_data', JSON.stringify(md));
        }
      } catch (e) {/* 解析失敗就跳過，不影響其他資料 */}
    }
    // 每次啟動都補齊「投資收入」相關的收入分類（冪等）：還原舊備份、或早期資料的
    // ff_schema_version 已 ≥4 但 cat_inc 沒有這些項目時，仍能自我修復——否則設定頁看得到
    // 「投資收入」大類，但記一筆的收入分類下拉卻選不到，兩邊不一致。
    try {
      var md2 = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
      if (md2 && Array.isArray(md2.cat_inc)) {
        var nameOf2 = function (c) {return typeof c === 'string' ? c : c && c.name;};
        var has = function (n) {return md2.cat_inc.some(function (c) {return nameOf2(c) === n;});};
        var before = function (n) {return md2.cat_inc.findIndex(function (c) {return nameOf2(c) === n;});};
        var ensure2 = function (name, group, beforeName) {
          if (has(name)) return false;
          var i = before(beforeName);
          var item = { name: name, group: group };
          if (i >= 0) md2.cat_inc.splice(i, 0, item);else md2.cat_inc.push(item);
          return true;
        };
        var changed = false;
        changed = ensure2('債息', '被動', '利息') || changed;
        changed = ensure2('台股', '投資收入', '發票中獎') || changed;
        changed = ensure2('美股', '投資收入', '發票中獎') || changed;
        changed = ensure2('投資收入', '投資收入', '發票中獎') || changed;
        if (changed) localStorage.setItem('ff_master_data', JSON.stringify(md2));
      }
    } catch (e) {/* 忽略 */}
    // 支出/收入「大類」清單：舊資料沒有 exp_groups/inc_groups 欄位時，補上目前畫面在用的預設大類與顏色，
    // 使用者之後才能在設定頁自由新增/編輯/刪除大類（大類清單本身也要能持久化，不能再是寫死常數）。
    try {
      var md4 = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
      if (md4) {
        var gChanged = false;
        if (!Array.isArray(md4.exp_groups) || md4.exp_groups.length === 0) {
          md4.exp_groups = [
          { name: '餐飲', color: '#B85C4A' },
          { name: '交通', color: '#4E7FA0' },
          { name: '日常', color: '#5A8E88' },
          { name: '投資損失', color: '#C4854A' },
          { name: '娛樂', color: '#BFA176' },
          { name: '醫療', color: '#6E9B6A' },
          { name: '教育', color: '#7A6EA2' },
          { name: '金融保險', color: '#7AAFC4' },
          { name: '其他', color: '#8E8E93' }];

          gChanged = true;
        }
        if (!Array.isArray(md4.inc_groups) || md4.inc_groups.length === 0) {
          md4.inc_groups = [
          { name: '主動', color: '#4A6E8C' },
          { name: '被動', color: '#6E9B6A' },
          { name: '投資收入', color: '#BFA176' },
          { name: '其他', color: '#636366' }];

          gChanged = true;
        }
        if (gChanged) localStorage.setItem('ff_master_data', JSON.stringify(md4));
      }
    } catch (e) {/* 忽略 */}
    // 大類排序（冪等，每次啟動都執行）：不可刪除的大類排最前面，「其他」永遠排最後，
    // 其餘大類維持原本相對順序不動。修正既有資料的排序，不只是新資料的預設值。
    try {
      var md5 = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
      if (md5) {
        var LOCKED_EXP = ['餐飲', '交通', '日常', '投資損失'];
        var LOCKED_INC = ['主動', '被動', '投資收入'];
        var sortGroups = function (groups, lockedNames) {
          var byName = {};
          groups.forEach(function (g) {byName[g.name] = g;});
          var lockedSet = {};lockedNames.forEach(function (n) {lockedSet[n] = 1;});
          var locked = lockedNames.map(function (n) {return byName[n];}).filter(Boolean);
          var rest = groups.filter(function (g) {return !lockedSet[g.name] && g.name !== '其他';});
          var other = groups.filter(function (g) {return g.name === '其他';});
          return locked.concat(rest, other);
        };
        var sameOrder = function (a, b) {
          return a.length === b.length && a.every(function (g, i) {return g.name === b[i].name;});
        };
        var sChanged = false;
        if (Array.isArray(md5.exp_groups)) {
          var sortedExp = sortGroups(md5.exp_groups, LOCKED_EXP);
          if (!sameOrder(sortedExp, md5.exp_groups)) {md5.exp_groups = sortedExp;sChanged = true;}
        }
        if (Array.isArray(md5.inc_groups)) {
          var sortedInc = sortGroups(md5.inc_groups, LOCKED_INC);
          if (!sameOrder(sortedInc, md5.inc_groups)) {md5.inc_groups = sortedInc;sChanged = true;}
        }
        if (sChanged) localStorage.setItem('ff_master_data', JSON.stringify(md5));
      }
    } catch (e) {/* 忽略 */}
    // 券商手續費率：沒設定的一律明確補上預設 0.1425（%），使用者仍可在設定中自行修改。
    try {
      var md3 = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
      if (md3 && Array.isArray(md3.brokers)) {
        var bChanged = false;
        md3.brokers.forEach(function (b) {
          if (b && (b.feeRate == null || String(b.feeRate).trim() === '')) {b.feeRate = '0.1425';bChanged = true;}
        });
        if (bChanged) localStorage.setItem('ff_master_data', JSON.stringify(md3));
      }
    } catch (e) {/* 忽略 */}
    if (cur < SCHEMA_VERSION) {
      localStorage.setItem('ff_schema_version', String(SCHEMA_VERSION));
    }
  } catch (e) {
    /* localStorage unavailable — run without persistence */
  }
}
