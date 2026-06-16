// Expose React / ReactDOM as globals (the v3 code references them bare, the way
// the prototype consumed the CDN UMD builds), then load the app.
// React is bundled — no runtime CDN dependency.
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';

window.React = React;
window.ReactDOM = ReactDOMClient;

// Dynamic import so the globals above are set before any legacy module evaluates
// (static imports would be hoisted and run first).
import('./legacy/load.js');
