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
  var SCHEMA_VERSION = 3;
  try {
    var cur = parseInt(localStorage.getItem('ff_schema_version') || '0', 10) || 0;
    // v0 → v1: the current localStorage shape (ff_flows / ff_trades / …) is v1.
    // v1 → v2: 記帳分類(收入) 新增「投資收入」大類，把 股息/利息/紅利回饋/投資收入
    // 四個項目從「被動」移過去，讓已經自訂過分類的舊資料也套用新分組。
    if (cur < 2) {
      try {
        var md = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
        if (md && Array.isArray(md.cat_inc)) {
          var MOVE = { '股息': 1, '利息': 1, '紅利回饋': 1, '投資收入': 1 };
          md.cat_inc = md.cat_inc.map(function (c) {
            if (typeof c === 'string') return MOVE[c] ? { name: c, group: '投資收入' } : { name: c, group: '被動' };
            if (c && MOVE[c.name] && c.group === '被動') return Object.assign({}, c, { group: '投資收入' });
            return c;
          });
          localStorage.setItem('ff_master_data', JSON.stringify(md));
        }
      } catch (e) {/* 解析失敗就跳過，不影響其他資料 */}
    }
    // v2 → v3: 「投資收入」大類底下補上「台股 / 美股」兩個項目（已存在則略過）。
    if (cur < 3) {
      try {
        var md3 = JSON.parse(localStorage.getItem('ff_master_data') || 'null');
        if (md3 && Array.isArray(md3.cat_inc)) {
          var nameOf = function (c) {return typeof c === 'string' ? c : c && c.name;};
          var idx = md3.cat_inc.findIndex(function (c) {return nameOf(c) === '投資收入';});
          var at = idx >= 0 ? idx : md3.cat_inc.length; // 插在「投資收入」項目前，找不到就放最後
          ['美股', '台股'].forEach(function (nm) {
            if (!md3.cat_inc.some(function (c) {return nameOf(c) === nm;})) {
              md3.cat_inc.splice(at, 0, { name: nm, group: '投資收入' });
            }
          });
          localStorage.setItem('ff_master_data', JSON.stringify(md3));
        }
      } catch (e) {/* 略過 */}
    }
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
