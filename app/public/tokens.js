/* ============================================================
   FinFolio — Design Tokens (single source of truth + live theming)
   • Edit DEFAULTS below for permanent changes.
   • The Design System page can override colors live via
     window.FFTokens.setMany({...}); overrides persist in
     localStorage and broadcast to every open FinFolio tab.
   • Loaded as plain JS BEFORE all babel scripts so screens can
     reference TOKENS at module-eval time.
   ============================================================ */
(function () {
  var COLORS = {
    /* Brand / accent (terracotta) */
    accent: '#D97757', accent2: '#D88770', accentLight: '#E89878',
    accentDark: '#B85B3F', onAccent: '#FFF6EE',
    accentTintHi: '#FFE3C2', accentTint: '#FFEED0', accentTint2: '#FFD9B0', accentTint3: '#FFC9A8',

    /* Ink & neutral ramp */
    ink: '#1C1C1E', inkDeep: '#1A1A1A', ink2: '#2C2C2E',
    gray1: '#3A3A3C', gray2: '#48484A', gray3: '#636366', gray4: '#8E8E93',

    /* Surfaces & backgrounds */
    surface: '#F8F7F3', surface2: '#F3F2EF',
    bg: '#F5F4F1', bgWarm: '#F3F2EF', bgWarm2: '#F0EFEC', bgWarm3: '#EEEDE9',
    warmBorder: '#DDDCDA', warmBorder2: '#CCCCCC', scrimInk: '#18110C',

    /* Semantic */
    green: '#6E9B6A', green2: '#7DAD79', greenDark: '#4E7A4E',
    sage: '#A8BD8C', sageDark: '#8FA86F', sageDarker: '#7C9A5A', sageText: '#5F7A44',
    red: '#B85C4A', red2: '#C47060', blue: '#7AAFC4',
    blue2: '#4E7FA0', indigo: '#7A6EA2', teal: '#5A8E88', orange: '#C4854A',

    /* 記帳類型配色 Transaction types — income blue softened (lower chroma) */
    typeExp: '#B85C4A', typeInc: '#6688A0', typeXfer: '#C4854A',
    typeBuy: '#B85C4A', typeSell: '#6688A0',
    incBlue: '#4A6E8C',

    /* 帳戶類別配色 Account categories */
    catCredit: '#B85C4A', catCash: '#6E9B6A', catBank: '#4E7FA0',
    catBrokerage: '#7A6EA2', catPrepaid: '#B09458', catEpay: '#5A8E88', catOther: '#8E8E93',

    /* 投資類別配色 Investment categories */
    inv1: '#4E7FA0', inv2: '#5A8E88', inv3: '#7A6EA2', inv4: '#C4854A', inv5: '#B09458', inv6: '#6E9B6A',

    /* Chart */
    chart1: '#FFD0B5', chart2: '#FFE0A3', chart3: '#A8E6B5',

    /* Accents / device chrome */
    gold: '#BFA176', gold2: '#D4B87A', gold3: '#C5A07D', bezel: '#C8C3BB', bezel2: '#B8B3AB',
  };

  var FONT = {
    fontSans: '"Noto Sans TC", -apple-system, system-ui, sans-serif',
    // 數字字型：改用系統無襯線字（iOS 為 San Francisco），其「0」是乾淨橢圓、
    // 沒有斜槓也沒有中間點；搭配 CSS 的 tabular-nums 讓數字等寬、表格仍對齊。
    // （先前用 Roboto Mono，裝置若沒載到就退回系統等寬字，畫出帶斜槓的 0。）
    fontMono: '-apple-system, system-ui, "Noto Sans TC", "Helvetica Neue", Arial, sans-serif',
  };

  var SCALE = {
    fsDisplay: 40, fsTitle: 30, fsH1: 22, fsH2: 20,
    fsBody: 18, fsSub: 17, fsSmall: 16, fsLabel: 14,
    rXs: 5, rSm: 8, rMd: 14, rLg: 18, rXl: 26, r2xl: 28, rPill: 999,
    sp1: 4, sp2: 8, sp3: 12, sp4: 14, sp5: 18, sp6: 24, sp7: 32,
  };

  var SHADOW = {
    shadowCard: '0 2px 5px rgba(0,0,0,0.5)',
    shadowRaised: '0 5px 28px rgba(0,0,0,0.25)',
    shadowPop: '0 5px 32px rgba(0,0,0,0.12)',
  };

  /* Global multipliers driven by the live editor (1 = unchanged). */
  var MULT = { fontScale: 1, spaceScale: 1, radiusScale: 1, shadowScale: 1 };

  var DEFAULTS = Object.assign({}, COLORS, FONT, SCALE, SHADOW, MULT);
  var STORAGE_KEY = 'ff_token_overrides';
  var COLOR_KEYS = Object.keys(COLORS);

  function readOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function camelToKebab(s){ return s.replace(/[A-Z0-9]+/g, function(m){ return '-' + m.toLowerCase(); }); }

  // Build / rebuild window.TOKENS from DEFAULTS + overrides (mutates in place).
  function build() {
    var ov = readOverrides();
    var T = window.TOKENS || {};
    Object.keys(DEFAULTS).forEach(function (k) { T[k] = (k in ov) ? ov[k] : DEFAULTS[k]; });
    // gradients derived from current color tokens
    T.gradDark = 'linear-gradient(145deg, ' + T.gray2 + ' 0%, ' + T.ink + ' 100%)';
    T.gradSage = 'linear-gradient(135deg, ' + T.sage + ', ' + T.sageDark + ')';
    T.gradWarm = 'linear-gradient(155deg, ' + T.bgWarm3 + ' 0%, ' + T.surface + ' 100%)';
    window.TOKENS = T;
    return T;
  }

  function inject() {
    var T = window.TOKENS, root = document.documentElement;
    if (!root) return;
    COLOR_KEYS.forEach(function (k) { root.style.setProperty('--ff-' + camelToKebab(k), T[k]); });
    Object.keys(FONT).forEach(function (k) { root.style.setProperty('--ff-' + camelToKebab(k), T[k]); });
    Object.keys(SCALE).forEach(function (k) {
      var v = T[k], isPx = (k[0] === 'r' && k !== 'red') || k.indexOf('fs') === 0 || k.indexOf('sp') === 0;
      root.style.setProperty('--ff-' + camelToKebab(k), isPx ? v + 'px' : v);
    });
    Object.keys(SHADOW).forEach(function (k) { root.style.setProperty('--ff-' + camelToKebab(k), T[k]); });
    ['gradDark', 'gradSage', 'gradWarm'].forEach(function (k) {
      root.style.setProperty('--ff-' + camelToKebab(k), T[k]);
    });
  }

  function refresh(broadcast) {
    build(); inject();
    // notify same-tab listeners (React app re-renders on this)
    try { window.dispatchEvent(new CustomEvent('ff-tokens-changed')); } catch (e) {}
    if (broadcast && chan) { try { chan.postMessage('changed'); } catch (e) {} }
  }

  // ---- cross-tab channel ----
  var chan = null;
  try { chan = new BroadcastChannel('ff-tokens'); } catch (e) { chan = null; }
  if (chan) chan.onmessage = function () { refresh(false); };
  window.addEventListener('storage', function (e) { if (e.key === STORAGE_KEY) refresh(false); });

  // ---- render-time helpers used by the App's inline styles ----
  // (read TOKENS live, so a re-render reflects new multipliers)
  window.FS = function (n) { var t = window.TOKENS, f = (t && t.fontScale != null) ? t.fontScale : 1; return Math.round(n * f); };
  window.RS = function (n) { var t = window.TOKENS, f = (t && t.radiusScale != null) ? t.radiusScale : 1; return n >= 100 ? n : Math.round(n * f); };
  window.SP = function (n) { var t = window.TOKENS, f = (t && t.spaceScale != null) ? t.spaceScale : 1; return Math.round(n * f); };
  window.PAD = function (s) {
    var t = window.TOKENS, f = (t && t.spaceScale != null) ? t.spaceScale : 1;
    return f === 1 ? s : String(s).replace(/(\d+)px/g, function (m, d) { return Math.round(d * f) + 'px'; });
  };
  window.SH = function (s) {
    var t = window.TOKENS, f = (t && t.shadowScale != null) ? t.shadowScale : 1;
    return f === 1 ? s : String(s).replace(/rgba\(([^)]+),\s*([\d.]+)\)/g, function (m, rgb, a) {
      return 'rgba(' + rgb + ',' + Math.min(1, parseFloat(a) * f).toFixed(3) + ')';
    });
  };

  // ---- public API (used by the Design System editor) ----
  window.FFTokens = {
    defaults: DEFAULTS,
    colorKeys: COLOR_KEYS,
    current: function () { return Object.assign({}, window.TOKENS); },
    overrides: readOverrides,
    setMany: function (obj) {
      var ov = readOverrides();
      Object.keys(obj).forEach(function (k) {
        if (obj[k] == null || obj[k] === DEFAULTS[k]) delete ov[k];
        else ov[k] = obj[k];
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ov)); } catch (e) {}
      refresh(true);
    },
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      refresh(true);
    },
  };

  // ---- FX: 全站統計加總一律換算成台幣 (TWD) ----
  window.FX_RATES = { TWD: 1, USD: 32.5, JPY: 0.215, EUR: 35.2, CNY: 4.48, HKD: 4.16 };
  window.fxToTWD = function (amount, currency) {
    var r = window.FX_RATES[currency || 'TWD'];
    return (parseFloat(amount) || 0) * (r == null ? 1 : r);
  };
  // 帳戶 / 交割戶 / 券商名稱 → 幣別 對照表
  window.buildCurMap = function (masterData) {
    var map = {}, md = masterData || {};
    ['accounts', 'settle', 'brokers'].forEach(function (k) {
      (md[k] || []).forEach(function (a) {
        if (a && a.name && map[a.name] == null) map[a.name] = a.currency || 'TWD';
      });
    });
    return map;
  };

  // 支出分類群組（與收入分類相同的兩層結構）
  window.EXP_GROUPS = ['餐飲', '交通', '日常', '娛樂', '醫療', '教育', '投資損失', '其他'];
  // 攤平支出分類供記帳選單使用：有子項目列子項目，空群組列群組本身
  window.flattenExpCats = function (catExp) {
    var items = (catExp || []).map(function (c) {
      return typeof c === 'string' ? { name: c, group: c } : c;
    });
    var groups = window.EXP_GROUPS.slice();
    items.forEach(function (c) {
      if (c.group && groups.indexOf(c.group) === -1) groups.push(c.group);
    });
    var out = [];
    groups.forEach(function (g) {
      var sub = items.filter(function (c) {return c.group === g && c.name !== g;});
      if (sub.length) {sub.forEach(function (c) {out.push(c.name);});} else {out.push(g);}
    });
    return out;
  };

  // ---- init ----
  build();
  if (document.documentElement) inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
