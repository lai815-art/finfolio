// Expose React / ReactDOM as globals (the v3 code references them bare, the way
// the prototype consumed the CDN UMD builds), then load the app.
// React is bundled — no runtime CDN dependency.
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { migrateSchema } from './schema-migration.js';

window.React = React;
window.ReactDOM = ReactDOMClient;

// ── Data schema migration ──────────────────────────────────────────────
// Logic lives in ./schema-migration.js so it can be unit-tested on its own.
migrateSchema();

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
