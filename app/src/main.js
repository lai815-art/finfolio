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
  var SCHEMA_VERSION = 2;
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
