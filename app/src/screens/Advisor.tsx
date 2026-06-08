import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles, Send, Bot, Activity, Shield } from '../icons';
import { computePortfolio } from '../data/portfolio';

interface ChatMsg {
  role: 'ai' | 'me';
  text: string;
  time: string;
}

export default function AdvisorScreen() {
  const model = { id: 'gemini', name: 'Google Gemini 1.5 Pro', color: '#D97757' };

  const { alloc } = computePortfolio();
  const stockPct = alloc.stockPct;
  const bondPct = alloc.bondPct;
  const cashPct = alloc.cashPct;
  const r0 = (n: number) => Math.round(n);
  const r1 = (n: number) => n.toFixed(1);

  const health: { score: number; level: string; node: ReactNode } = (() => {
    if (stockPct > 55) {
      return {
        score: r0(Math.max(40, 90 - (stockPct - 45))),
        level: '需留意',
        node: (
          <>
            目前股票資產佔比達 <b style={{ color: '#D88770' }}>{r0(stockPct)}%</b> 偏高。 近期市場波動大，建議可適度提高現金比例至
            <b style={{ color: '#A8BD8C' }}> 30%</b> 以防禦風險。
          </>
        ),
      };
    }
    if (cashPct > 55) {
      return {
        score: r0(Math.max(55, 88 - (cashPct - 55) * 0.6)),
        level: '可優化',
        node: (
          <>
            現金部位高達 <b style={{ color: '#A8BD8C' }}>{r0(cashPct)}%</b>，長期恐被通膨侵蝕。股票僅 <b style={{ color: '#D88770' }}>{r1(stockPct)}%</b>、債券 <b style={{ color: '#BFA176' }}>{r1(bondPct)}%</b>，建議分批將閒置現金配置至 <b>投資等級債券 ETF 與定期定額台股</b>，提升資產效率。
          </>
        ),
      };
    }
    return {
      score: 80,
      level: '良好',
      node: (
        <>
          資產配置大致均衡：股票 <b style={{ color: '#D88770' }}>{r1(stockPct)}%</b>、債券 <b style={{ color: '#BFA176' }}>{r1(bondPct)}%</b>、現金 <b style={{ color: '#A8BD8C' }}>{r1(cashPct)}%</b>。維持紀律、定期再平衡即可。
        </>
      ),
    };
  })();

  const suggestions = ['幫我分析本月消費週報', '目前股票資產安全嗎？', '我該如何調整資產比例？', '幫我擬一年期投資計劃'];

  const initialChat: ChatMsg[] = [{ role: 'ai', text: '午安，黃先生。我已讀取你的最新資產配置。要從哪裡開始？', time: '14:30' }];
  const [chat, setChat] = useState<ChatMsg[]>(initialChat);
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, aiTyping]);

  const aiReply = (q: string) => {
    setAiTyping(true);
    setTimeout(() => {
      let reply = '我會在保留隱私的前提下為您分析，請稍候。';
      if (q.includes('消費')) reply = '本月支出 NT$48,230，較上月 +6%。最大宗為餐飲（32%）與交通（21%）。建議將外食頻率從 18 次降至 12 次，可省下約 NT$3,200。';
      else if (q.includes('安全') || q.includes('股票')) reply = `台股佔比 ${r1(stockPct)}%，集中於半導體類股；現金部位約 ${r0(cashPct)}%，防禦力充足。若想提高長期報酬，可考慮分批將部分現金投入大盤型 ETF 與投資等級債券。`;
      else if (q.includes('比例') || q.includes('調整')) reply = '建議目標配置：股票 50% / 現金 30% / 債券 ETF 15% / 其他 5%。可分 3 個月逐步調整，避免一次性換股造成稅務與手續費負擔。';
      else if (q.includes('計劃') || q.includes('計畫')) reply = '初步一年計劃：1) 每月定期定額 NT$20,000 入 0050；2) 緊急預備金累積至 NT$300,000；3) Q3 評估是否加入債券 ETF。需要我列入待辦事項嗎？';
      setChat((c) => [...c, { role: 'ai', text: reply, time: '14:31' }]);
      setAiTyping(false);
    }, 1100);
  };

  const send = (text?: string) => {
    const v = (text ?? input).trim();
    if (!v) return;
    setChat((c) => [...c, { role: 'me', text: v, time: '14:31' }]);
    setInput('');
    aiReply(v);
  };

  return (
    <div style={{ height: '100%', color: '#18110C', display: 'flex', flexDirection: 'column' }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 18px 0' }}>
        <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(168, 189, 140,0.06)', border: '1px solid rgba(168, 189, 140,0.15)', display: 'flex', gap: 6, alignItems: 'center', overflow: 'hidden' }}>
          <Shield size={12} style={{ color: '#A8BD8C', flexShrink: 0 }} />
          <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.6)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>僅傳送匿名摘要給 AI · 明細留在本機</div>
        </div>

        <div style={{ marginTop: 22, fontSize: 15, color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={14} /> 資產配置健康檢查
        </div>
        <div style={{ marginTop: 10, padding: '22px 22px', borderRadius: 26, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 15, color: '#D4B87A', fontWeight: 600, letterSpacing: 1, padding: '4px 10px', borderRadius: 8, background: 'rgba(212, 184, 122,0.12)', border: '1px solid rgba(212, 184, 122,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>🔍 主動分析</div>
            <div style={{ fontSize: 15, color: 'rgba(45,36,32,0.4)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>05.27 14:30</div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(28,26,24,0.1)" strokeWidth="6" />
                <circle cx="32" cy="32" r="27" fill="none" stroke="#A8BD8C" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: '#18110C', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{health.score}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15, color: 'rgba(45,36,32,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>配置健康度</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#18110C', marginTop: 2 }}>{health.level}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 19, fontWeight: 500, color: '#18110C', lineHeight: 1.55, letterSpacing: 0.2 }}>{health.node}</div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, height: 48, borderRadius: 18, background: 'rgba(168, 189, 140,0.12)', border: '1px solid rgba(168, 189, 140,0.3)', color: '#A8BD8C', fontSize: 16, fontWeight: 500 }}>查看完整報告</button>
            <button style={{ flex: 1, height: 48, borderRadius: 18, background: 'rgba(28,26,24,0.12)', border: '1px solid rgba(28,26,24,0.16)', color: 'rgba(45,36,32,0.7)', fontSize: 16 }}>暫不調整</button>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 15, color: 'rgba(18,17,12,0.72)', letterSpacing: 1, textTransform: 'uppercase', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={14} /> 與 AI 財富導師對話
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} style={{ padding: '10px 14px', minHeight: 44, borderRadius: 18, background: 'rgba(217, 119, 87,0.08)', border: '1px solid rgba(217, 119, 87,0.22)', color: '#E89878', fontSize: 15, fontWeight: 500 }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 26, background: '#EDE8E3', border: '1px solid rgba(28,26,24,0.12)', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'me' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {m.role === 'ai' && (
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${model.color}22`, border: `1px solid ${model.color}44`, color: model.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={15} />
                </div>
              )}
              <div style={{ maxWidth: '76%', padding: '12px 14px', borderRadius: 18, background: m.role === 'me' ? 'linear-gradient(135deg, #D97757, #B85B3F)' : 'rgba(28,26,24,0.12)', color: m.role === 'me' ? '#F7F2EC' : '#18110C', fontSize: 16, lineHeight: 1.55, letterSpacing: 0.1, borderBottomRightRadius: m.role === 'me' ? 6 : 16, borderBottomLeftRadius: m.role === 'me' ? 16 : 6, fontWeight: m.role === 'me' ? 500 : 400 }}>
                {m.text}
              </div>
            </div>
          ))}
          {aiTyping && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${model.color}22`, border: `1px solid ${model.color}44`, color: model.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={15} />
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(28,26,24,0.12)', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: 26, background: 'rgba(45,36,32,0.5)', animation: `bob 1.1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div style={{ padding: '10px 18px 12px', background: '#F7F2EC', borderTop: '1px solid rgba(28,26,24,0.12)' }}>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="問 AI 任何關於資產的問題…"
            style={{ flex: 1, height: 56, padding: '0 18px', borderRadius: 18, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.14)', color: '#18110C', fontSize: 17, outline: 'none' }}
          />
          <button onClick={() => send()} style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0, background: input.trim() ? 'linear-gradient(135deg, #A8BD8C, #8FA86F)' : 'rgba(28,26,24,0.12)', border: 'none', color: input.trim() ? '#F7F2EC' : 'rgba(45,36,32,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
            <Send size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
