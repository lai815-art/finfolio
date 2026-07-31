import * as React from 'react';

// Legacy screens destructure hooks from a bare `React` global at module
// top-level (see main.js: window.React is set before they're ever loaded) —
// tests need the same global in place before importing any legacy module.
window.React = React;

// tokens.js is a plain script (no import/export) that assigns fxToTWD,
// calcAutoFee, floorAmt, buildCurMap etc. onto `window` as a side effect —
// legacy screens/compute functions call those as bare globals, so tests
// need the same globals in place before anything under test runs.
import '../public/tokens.js';
