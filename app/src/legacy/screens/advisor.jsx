// AI Advisor / AI 個人資產管理師
const { useState: useStateAI, useEffect: useEffectAI, useRef: useRefAI } = React;

function AdvisorScreen({ computedAcctGroups = [], computedHoldings = [], masterData = {}, savedFlows = [], hideAmounts = false, onRecord }) {
  const { Brain, Sparkles, Send, Bot, Activity, Shield } = window.Icons;

  // BYOK：讀取使用者在「設定 → AI 金鑰」貼上的金鑰，取第一個有填的為使用中模型。
  const aiKeys = (() => {
    try {return JSON.parse(localStorage.getItem('ff_ai_keys') || 'null') || [];} catch {return [];}
  })();
  const defaultModelId = (() => {try {return localStorage.getItem('ff_default_model') || '';} catch {return '';}})();
  const hasKey = (k) => k && k.key && String(k.key).trim();
  // 優先使用設定頁選的「預設模型」；若該模型未填金鑰（或選了本機），退而用第一個有金鑰的。
  const activeKey = aiKeys.find((k) => k.id === defaultModelId && hasKey(k)) || aiKeys.find(hasKey);
  const model = activeKey ?
  { id: activeKey.id, name: activeKey.name, color: activeKey.color || TOKENS.accent } :
  { id: 'none', name: '未設定 AI 金鑰', color: TOKENS.gray3 };

  const r0 = (n) => Math.round(n);
  const r1 = (n) => n.toFixed(1);

  // 真實資產配置：現金（帳戶餘額 − 負債）＋ 持倉市值（依債券 / 其他分類）。
  const alloc = (() => {
    const amtTWD = (x) => x.amountTWD != null ? x.amountTWD : x.amount || 0;
    const mvTWD = (x) => x.mvTWD != null ? x.mvTWD : x.mv || 0;
    let cash = 0;
    (computedAcctGroups || []).forEach((g) => {
      const sum = (g.items || []).reduce((a, it) => a + amtTWD(it), 0);
      cash += g.sign < 0 ? -sum : sum; // 帶號：溢繳的信用卡是資產，不能翻成負債
    });
    cash = Math.max(0, cash);
    let stock = 0,bond = 0;
    (computedHoldings || []).forEach((g) => {
      const mv = (g.items || []).reduce((a, it) => a + mvTWD(it), 0);
      if (/債/.test(g.id || g.name || '')) bond += mv;else stock += mv;
    });
    const total = cash + stock + bond;
    const pct = (v) => total > 0 ? v / total * 100 : 0;
    return { cash, stock, bond, total, stockPct: pct(stock), bondPct: pct(bond), cashPct: pct(cash) };
  })();
  const stockPct = alloc.stockPct,bondPct = alloc.bondPct,cashPct = alloc.cashPct;

  // 本月收入 / 支出（用於匿名摘要）
  const monthIO = (() => {
    const now = new Date(window.TODAY_DATE || Date.now());
    let inc = 0,exp = 0;
    (savedFlows || []).forEach((f) => {
      const d = f.date instanceof Date ? f.date : new Date(f.date);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
      if (f.kind === 'inc') inc += f.amount;else if (f.kind === 'exp') exp += f.amount;
    });
    return { inc, exp };
  })();

  // Pick the most relevant insight from current allocation.
  const health = (() => {
    if (stockPct > 55) {
      return {
        score: r0(Math.max(40, 90 - (stockPct - 45))), level: '需留意',
        node: <>目前股票資產佔比達 <b style={{ color: TOKENS.accent2 }}>{r0(stockPct)}%</b> 偏高。
          近期市場波動大，建議可適度提高現金比例至
          <b style={{ color: TOKENS.sage }}> 30%</b> 以防禦風險。</>
      };
    }
    if (cashPct > 55) {
      return {
        score: r0(Math.max(55, 88 - (cashPct - 55) * 0.6)), level: '可優化',
        node: <>現金部位高達 <b style={{ color: TOKENS.sage }}>{r0(cashPct)}%</b>，
          長期恐被通膨侵蝕。股票僅 <b style={{ color: TOKENS.accent2 }}>{r1(stockPct)}%</b>、
          債券 <b style={{ color: TOKENS.gold }}>{r1(bondPct)}%</b>，
          建議分批將閒置現金配置至 <b>投資等級債券 ETF 與定期定額台股</b>，提升資產效率。</>
      };
    }
    return {
      score: 80, level: '良好',
      node: <>資產配置大致均衡：股票 <b style={{ color: TOKENS.accent2 }}>{r1(stockPct)}%</b>、
        債券 <b style={{ color: TOKENS.gold }}>{r1(bondPct)}%</b>、
        現金 <b style={{ color: TOKENS.sage }}>{r1(cashPct)}%</b>。維持紀律、定期再平衡即可。</>
    };
  })();

  const suggestions = [
  '幫我分析本月消費週報',
  '目前股票資產安全嗎？',
  '我該如何調整資產比例？',
  '幫我擬一年期投資計劃'];


  const pad2 = (x) => String(x).padStart(2, '0');
  const nowHM = () => `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;
  const _n = new Date();
  const analysedAt = `${pad2(_n.getMonth() + 1)}.${pad2(_n.getDate())} ${pad2(_n.getHours())}:${pad2(_n.getMinutes())}`;
  const initialChat = [
  { role: 'ai', text: '您好，我是您的資產管理師。資料只留在您的裝置，對話僅傳送匿名摘要。要從哪裡開始？', time: nowHM() }];

  const [chat, setChat] = useStateAI(initialChat);
  const [input, setInput] = useStateAI('');
  const [aiTyping, setAiTyping] = useStateAI(false);
  const chatEndRef = useRefAI(null);
  const scrollRef = useRefAI(null);

  useEffectAI(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, aiTyping]);

  // ── 匿名摘要：只送配置百分比與概略收支，不送帳戶 / 個股名稱或身分 ──
  const anonSummary = () => {
    const k = (n) => Math.round(n / 1000) + 'k';
    const parts = [
    `資產配置：股票約 ${r0(stockPct)}%、債券約 ${r0(bondPct)}%、現金約 ${r0(cashPct)}%`,
    alloc.total > 0 ? `資產總額約 ${k(alloc.total)} 元` : '尚無資產資料'];
    if (monthIO.inc || monthIO.exp) parts.push(`本月收入約 ${k(monthIO.inc)}、支出約 ${k(monthIO.exp)}`);
    return parts.join('；') + '。';
  };

  const SYS_PROMPT =
  '你是一位專業、謹慎的台灣個人資產管理師，服務對象多為退休族與穩健型投資人。' +
  '請用繁體中文、口語、簡潔回答（多數情況 3～5 句內），語氣親切不誇大，不保證報酬。' +
  '只根據使用者提供的「匿名資產摘要」與問題作答；不要索取個人身分或帳戶明細。' +
  '涉及具體標的時提醒這非投資建議、需自行評估風險。';

  // 送出當下「即時」讀取金鑰（避免顧問頁先掛載、之後才在設定填金鑰造成讀到舊狀態）
  const getActiveKey = () => {
    let keys = [];
    try {keys = JSON.parse(localStorage.getItem('ff_ai_keys') || 'null') || [];} catch {}
    let dm = '';
    try {dm = localStorage.getItem('ff_default_model') || '';} catch {}
    return keys.find((k) => k.id === dm && hasKey(k)) || keys.find(hasKey) || null;
  };

  // ── BYOK：呼叫使用者自己的模型（Gemini / OpenAI / Claude）──
  const providerOf = (key) => {
    const s = ((key && (key.id + ' ' + key.name)) || '').toLowerCase();
    if (/gemini|google/.test(s)) return 'gemini';
    if (/openai|gpt/.test(s)) return 'openai';
    if (/claude|anthropic/.test(s)) return 'claude';
    return 'openai';
  };
  const httpErr = async (r) => {
    let detail = '';
    try {const j = await r.json();detail = j.error && (j.error.message || j.error.status) || '';} catch {}
    return 'HTTP ' + r.status + (detail ? '：' + String(detail).slice(0, 140) : '');
  };
  const callAI = async (history, userText, keyObj) => {
    const key = keyObj.key.trim();
    const provider = providerOf(keyObj);
    const sys = SYS_PROMPT + '\n\n[使用者匿名資產摘要] ' + anonSummary();
    // 只取最近 12 則、且確保以使用者訊息開頭、嚴格交替
    const turns = history.filter((m) => m.role === 'me' || m.role === 'ai').slice(-12);
    const msgs = [];
    turns.forEach((m) => {
      const role = m.role === 'me' ? 'user' : 'assistant';
      if (!msgs.length && role !== 'user') return; // 丟掉開頭的招呼
      if (msgs.length && msgs[msgs.length - 1].role === role) {msgs[msgs.length - 1].content += '\n' + m.text;return;}
      msgs.push({ role, content: m.text });
    });
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: userText });

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
      const body = {
        systemInstruction: { parts: [{ text: sys }] },
        contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      };
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await httpErr(r));
      const d = await r.json();
      return (((d.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '（無回應）';
    }
    if (provider === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'x-api-key': key,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1024, system: sys, messages: msgs })
      });
      if (!r.ok) throw new Error(await httpErr(r));
      const d = await r.json();
      return (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n') || '（無回應）';
    }
    // openai（相容介面）
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, ...msgs] })
    });
    if (!r.ok) throw new Error(await httpErr(r));
    const d = await r.json();
    return ((d.choices || [])[0] || {}).message?.content || '（無回應）';
  };

  // ── 意圖判斷：是「記帳」還是「提問」──
  const looksLikeQuestion = (t) => /[?？]|嗎|呢|如何|怎麼|怎樣|為什麼|為何|建議|分析|評估|安全|該不該|划算|值得|風險|比例|配置|計劃|計畫|多少|哪|可不可以|能不能/.test(t);
  const INC_WORDS = ['薪水', '薪資', '獎金', '股息', '股利', '利息', '收入', '入帳', '退款', '租金', '分紅', '紅利', '中獎'];
  const parseRecordIntent = (text) => {
    if (looksLikeQuestion(text)) return null;
    const nums = (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((s) => parseFloat(s.replace(/,/g, '')));
    if (!nums.length) return null;
    const sideSell = /賣出|賣掉|賣股|出脫|賣/.test(text);
    const sideBuy = /買進|買入|買股|加碼|買/.test(text);
    const codeM = text.match(/\b\d{4,6}[A-Z]?\b/);
    // 股票：要有買/賣 + 代號 + 「股」字（避免把一般金額誤判）
    if ((sideBuy || sideSell) && codeM && /股/.test(text)) {
      const code = codeM[0];
      const shM = text.match(/(\d[\d,]*)\s*股/);
      const shares = shM ? shM[1].replace(/,/g, '') : '';
      const leftover = nums.filter((n) => String(n) !== code && String(n) !== shares);
      const prM = text.match(/(?:成交價|單價|價|@)\s*(\d[\d,]*(?:\.\d+)?)/);
      const price = prM ? prM[1].replace(/,/g, '') : leftover.length ? String(leftover[leftover.length - 1]) : '';
      return { intent: 'stock', edit: false, text, summary: [],
        apply: { side: sideSell ? 'sell' : 'buy', code, name: '', shares: String(shares || ''), price: String(price || '') } };
    }
    // 收支：金額（取最大數字）+ 收入關鍵字判斷 inc/exp
    const amount = Math.max.apply(null, nums);
    if (!amount || amount < 1) return null;
    const kind = INC_WORDS.some((w) => text.includes(w)) ? 'inc' : 'exp';
    // 嘗試對應主檔分類
    const cats = kind === 'inc' ?
    (masterData.cat_inc || []).map((c) => typeof c === 'string' ? c : c.name) :
    (masterData.cat_exp || []).map((c) => typeof c === 'string' ? c : c.name);
    const category = (cats || []).find((c) => c && text.includes(c)) || '';
    const note = text.replace(/\d[\d,]*(?:\.\d+)?\s*(?:元|塊|\$)?/g, '').replace(/\s+/g, ' ').trim();
    return { intent: 'flow', edit: false, text, summary: [],
      apply: { kind, amount: String(amount), category, note } };
  };

  const aiReply = async (history, userText) => {
    const keyObj = getActiveKey();
    if (!keyObj) {
      setChat((c) => [...c, { role: 'ai', text: '尚未設定 AI 金鑰。請到「設定 → AI 金鑰設定 (BYOK)」貼上你的 API Key（支援 Gemini / OpenAI / Claude）並按儲存，即可開始對話分析。', time: nowHM() }]);
      return;
    }
    setAiTyping(true);
    try {
      const reply = await callAI(history, userText, keyObj);
      setChat((c) => [...c, { role: 'ai', text: reply, time: nowHM() }]);
    } catch (e) {
      const m = e.message || '連線失敗';
      let hint = '請確認金鑰是否正確、或稍後再試。';
      if (/\b429\b|quota|rate/i.test(m)) hint = '這通常代表該 AI 服務的「額度不足或請求過於頻繁」：請到該平台確認帳戶已儲值／未超出免費額度（OpenAI 新帳號常需先儲值），或改用有免費額度的 Google Gemini，稍後再試。';else
      if (/\b401\b|\b403\b|invalid|unauthor/i.test(m)) hint = '金鑰可能無效或權限不足，請回設定重新貼上正確的金鑰。';
      setChat((c) => [...c, { role: 'ai', text: `AI 服務暫時無法使用（${m}）。${hint}`, time: nowHM() }]);
    } finally {
      setAiTyping(false);
    }
  };

  const send = (text) => {
    const v = (text ?? input).trim();
    if (!v) return;
    setInput('');
    // 先判斷是不是「記帳」
    const draft = parseRecordIntent(v);
    if (draft && onRecord) {
      const what = draft.intent === 'stock' ?
      `${draft.apply.side === 'sell' ? '賣出' : '買進'} ${draft.apply.code} ${draft.apply.shares || ''}股` :
      `${draft.apply.kind === 'inc' ? '收入' : '支出'} ${Number(draft.apply.amount).toLocaleString()}`;
      setChat((c) => [...c,
      { role: 'me', text: v, time: nowHM() },
      { role: 'ai', text: `看起來你想記一筆（${what}），我已幫你開啟記帳頁並預先填好，請確認後儲存。`, time: nowHM() }]);
      onRecord(draft);
      return;
    }
    setChat((c) => {
      const next = [...c, { role: 'me', text: v, time: nowHM() }];
      aiReply(next, v);
      return next;
    });
  };

  return (
    <div style={{ height: '100%', color: TOKENS.scrimInk, display: 'flex', flexDirection: 'column' }}>
      {/* Scrollable region: badge, health, chat header, prompts, messages */}
      <div ref={scrollRef} style={{ ...{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: PAD('8px 18px 0') }, padding: "6px 10px 0px" }}>
      {/* Privacy notice (one line) */}
      <div style={{
          marginTop: SP(10), padding: PAD('6px 10px'), borderRadius: RS(8),
          background: 'rgba(168, 189, 140,0.06)', border: '1px solid rgba(168, 189, 140,0.15)',
          display: 'flex', gap: SP(6), alignItems: 'center', overflow: 'hidden'
        }}>
        <Shield size={12} style={{ color: TOKENS.sage, flexShrink: 0 }} />
        <div style={{ fontSize: FS(14), color: 'rgba(45,36,32,0.72)', lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          僅傳送匿名摘要給 AI · 明細留在本機
        </div>
      </div>

      {/* Health check card */}
      <div style={{ marginTop: SP(14), fontSize: FS(15), color: 'rgba(18,17,12,0.72)', letterSpacing: 1,
          textTransform: 'uppercase', padding: PAD('0 4px'), display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <Activity size={14} /> 資產配置健康檢查
      </div>
      <div style={{
          marginTop: SP(10), padding: PAD('16px 18px'), borderRadius: RS(26),
          background: TOKENS.surface,
          border: '1px solid rgba(28,26,24,0.12)'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SP(12) }}>
          <div style={{ fontSize: FS(15), color: TOKENS.gold2, fontWeight: 600, letterSpacing: 1,
              padding: PAD('4px 10px'), borderRadius: RS(8), background: 'rgba(212, 184, 122,0.12)',
              border: '1px solid rgba(212, 184, 122,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            🔍 主動分析
          </div>
          <div style={{ fontSize: FS(15), color: 'rgba(45,36,32,0.62)', fontFamily: TOKENS.fontMono, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {analysedAt}
          </div>
        </div>
        <div style={{ marginTop: SP(12), display: 'flex', alignItems: 'center', gap: SP(14) }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(28,26,24,0.1)" strokeWidth="6" />
              <circle cx="32" cy="32" r="27" fill="none" stroke={TOKENS.sage} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${health.score / 100 * 2 * Math.PI * 27} ${2 * Math.PI * 27}`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: FS(19), fontWeight: 700, color: TOKENS.scrimInk,
                  fontFamily: TOKENS.fontMono, lineHeight: 1 }}>{health.score}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: FS(15), color: 'rgba(45,36,32,0.82)', letterSpacing: 1,
                textTransform: 'uppercase' }}>配置健康度</div>
            <div style={{ fontSize: FS(22), fontWeight: 700, color: TOKENS.scrimInk, marginTop: SP(2) }}>{health.level}</div>
          </div>
        </div>
        <div style={{ marginTop: SP(12), fontSize: FS(19), fontWeight: 500, color: TOKENS.scrimInk, lineHeight: 1.55, letterSpacing: 0.2 }}>
          {health.node}
        </div>
        <div style={{ marginTop: SP(12), display: 'flex', gap: SP(10) }}>
          <button style={{
              flex: 1, height: 48, borderRadius: RS(18),
              background: 'rgba(168, 189, 140,0.12)', border: '1px solid rgba(168, 189, 140,0.3)',
              color: TOKENS.sage, fontSize: FS(16), fontWeight: 500
            }}>查看完整報告</button>
          <button style={{
              flex: 1, height: 48, borderRadius: RS(18),
              background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.16)',
              color: 'rgba(45,36,32,0.82)', fontSize: FS(16)
            }}>暫不調整</button>
        </div>
      </div>

      {/* Chat */}
      <div style={{ marginTop: SP(16), fontSize: FS(15), color: 'rgba(18,17,12,0.72)', letterSpacing: 1,
          textTransform: 'uppercase', padding: PAD('0 4px'), display: 'flex', alignItems: 'center', gap: SP(8) }}>
        <Bot size={14} /> 與 AI 財富導師對話
      </div>

      {/* Quick prompts */}
      <div style={{ marginTop: SP(10), display: 'flex', flexWrap: 'wrap', gap: SP(8) }}>
        {suggestions.map((s) =>
          <button key={s} onClick={() => send(s)} style={{ ...{
              padding: PAD('10px 14px'), minHeight: 44, borderRadius: RS(18),
              background: 'rgba(217, 119, 87,0.08)',
              border: '1px solid rgba(217, 119, 87,0.22)',
              color: TOKENS.accentLight, fontSize: FS(15), fontWeight: 500
            }, color: "rgb(70, 70, 70)" }}>{s}</button>
          )}
      </div>

      {/* Chat messages */}
      <div style={{ ...{
            marginTop: SP(14), padding: SP(14), borderRadius: RS(26),
            background: TOKENS.warmBorder, border: '1px solid rgba(28,26,24,0.12)',
            display: 'flex', flexDirection: 'column', gap: SP(12), minHeight: 200
          }, background: "rgb(255, 253, 250)" }}>
        {chat.map((m, i) =>
          <div key={i} style={{
            display: 'flex', gap: SP(10),
            flexDirection: m.role === 'me' ? 'row-reverse' : 'row',
            alignItems: 'flex-end'
          }}>
            {m.role === 'ai' &&
            <div style={{
              width: 32, height: 32, borderRadius: RS(8), flexShrink: 0,
              background: `${model.color}22`, border: `1px solid ${model.color}44`,
              color: model.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Sparkles size={15} /></div>
            }
            <div style={{
              maxWidth: '76%',
              padding: PAD('12px 14px'), borderRadius: RS(18),
              background: m.role === 'me' ? 'linear-gradient(135deg, #D97757, #B85B3F)' : 'rgba(28,26,24,0.12)',
              color: m.role === 'me' ? TOKENS.bgWarm : TOKENS.scrimInk,
              fontSize: FS(16), lineHeight: 1.55, letterSpacing: 0.1,
              borderBottomRightRadius: m.role === 'me' ? 6 : 16,
              borderBottomLeftRadius: m.role === 'me' ? 16 : 6,
              fontWeight: m.role === 'me' ? 500 : 400
            }}>
              {m.text}
            </div>
          </div>
          )}
        {aiTyping &&
          <div style={{ display: 'flex', gap: SP(10), alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 32, borderRadius: RS(8), flexShrink: 0,
              background: `${model.color}22`, border: `1px solid ${model.color}44`,
              color: model.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={15} />
            </div>
            <div style={{ padding: PAD('14px 16px'), borderRadius: RS(18), background: 'rgba(28,26,24,0.12)',
              display: 'flex', gap: SP(5), alignItems: 'center' }}>
              {[0, 1, 2].map((i) =>
              <span key={i} style={{ width: 7, height: 7, borderRadius: RS(26),
                background: 'rgba(45,36,32,0.5)',
                animation: `bob 1.1s ease-in-out ${i * 0.15}s infinite` }} />
              )}
            </div>
          </div>
          }
        <div ref={chatEndRef} />
      </div>

      </div>
      {/* Bottom pinned: input + privacy footer */}
      <div style={{ flexShrink: 0, background: TOKENS.bgWarm,
          borderTop: '1px solid rgba(28,26,24,0.12)', padding: "10px 10px 12px", width: "100%", boxSizing: "border-box" }}>
      {/* Input bar */}
      <div style={{ display: 'flex', gap: SP(10), alignItems: 'center' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {if (e.key === 'Enter') send();}}
          placeholder="問 AI 任何關於資產的問題…"
          style={{
            flex: 1, minWidth: 0, height: 56, padding: PAD('0 18px'), borderRadius: RS(18),
            background: TOKENS.surface, border: '1px solid rgba(28,26,24,0.14)',
            color: TOKENS.scrimInk, fontSize: FS(17), outline: 'none'
          }} />
        <button onClick={() => send()} style={{
            width: 56, height: 56, borderRadius: RS(18), flexShrink: 0,
            background: input.trim() ?
            TOKENS.gradSage :
            'rgba(28,26,24,0.12)',
            border: 'none',
            color: input.trim() ? TOKENS.bgWarm : 'rgba(45,36,32,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 200ms'
          }}><Send size={20} strokeWidth={2} /></button>
      </div>
      </div>
    </div>);

}

window.AdvisorScreen = AdvisorScreen;