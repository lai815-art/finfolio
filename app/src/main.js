// Expose React / ReactDOM as globals (the v3 code references them bare, the way
// the prototype consumed the CDN UMD builds), then load the app.
// React is bundled — no runtime CDN dependency.
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';

window.React = React;
window.ReactDOM = ReactDOMClient;

// ── Data schema migration ──────────────────────────────────────────────
// User records may live for years across app updates. Every release bumps
// SCHEMA_VERSION and adds an idempotent step here; data is never wiped.
(function migrate() {
  var SCHEMA_VERSION = 4;
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
    if (cur < SCHEMA_VERSION) {
      localStorage.setItem('ff_schema_version', String(SCHEMA_VERSION));
    }
  } catch (e) {
    /* localStorage unavailable — run without persistence */
  }
})();

// Dynamic import so the globals above are set before any legacy module evaluates
// (static imports would be hoisted and run first).
// Ask the browser to keep on-device data persistent (resists automatic eviction,
// e.g. iOS clearing storage for sites unused ~7 days). A deliberate "clear
// website data" still wipes it — the encrypted backup covers that case.
(function persist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(function (already) {
        if (!already) navigator.storage.persist();
      }).catch(function () {});
    }
  } catch (e) {/* ignore */}
})();

import('./legacy/load.js');
