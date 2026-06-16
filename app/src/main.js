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
  var SCHEMA_VERSION = 1;
  try {
    var cur = parseInt(localStorage.getItem('ff_schema_version') || '0', 10) || 0;
    // v0 → v1: the current localStorage shape (ff_flows / ff_trades / …) is v1.
    // Future steps: if (cur < 2) { …transform… }
    if (cur < SCHEMA_VERSION) {
      localStorage.setItem('ff_schema_version', String(SCHEMA_VERSION));
    }
  } catch (e) {
    /* localStorage unavailable — run without persistence */
  }
})();

// Dynamic import so the globals above are set before any legacy module evaluates
// (static imports would be hoisted and run first).
import('./legacy/load.js');
