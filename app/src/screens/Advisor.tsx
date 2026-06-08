import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, Activity, Shield } from '../icons';

interface ChatMsg {
  role: 'ai' | 'me';
  text: string;
  time: string;
}

export default function AdvisorScreen() {
  // Active model is configured in Settings; show as small badge here.
  const model = { id: 'gemini', name: 'Google Gemini 1.5 Pro', color: '#D97757' };

  const suggestions = ['幫我分析本月消費週報', '目前股票資產安全嗎？', '我該如何調整資產比例？', '幫我擬一年期投資計劃'];

  const initialChat: ChatMsg[] = [{ role: 'ai', text: '午安，黃先生。我已讀取你的最新資產配置。要從哪裡開始？', time: '14:30' }];
  const [chat, setChat] = useState<ChatMsg[]>(initialChat);
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, aiTyping]);

  const aiReply = (q: string) => {
    setAiTyping(true);
    setTimeout(() => {
      let reply = '我會在保留隱私的前提下為您分析，請稍候。';
      if (q.includes('消費')) reply = '本月支出 NT$48,230，較上月 +6%。最大宗為餐飲（32%）與交通（21%）。建議將外食頻率從 18 次降至 12 次，可省下約 NT$3,200。';
      else if (q.includes('安全') || q.includes('股票'))
        reply = '台股佔比 60%，集中於半導體類股。短期波動風險偏高，但長期持有成本良好。若擔心回檔，可保留 3-6 個月生活費的現金緩衝。';
      else if (q.includes('比例') || q.includes('調整'))
        reply = '建議目標配置：股票 50% / 現金 30% / 債券 ETF 15% / 其他 5%。可分 3 個月逐步調整，避免一次性換股造成稅務與手續費負擔。';
      else if (q.includes('計劃') || q.includes('計畫'))
        reply = '初步一年計劃：1) 每月定期定額 NT$20,000 入 0050；2) 緊急預備金累積至 NT$300,000；3) Q3 評估是否加入債券 ETF。需要我列入待辦事項嗎？';
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
      {/* Scrollable region: badge, health, chat header, prompts, messages */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 18px 0' }}>
        {/* Privacy notice (one line) */}
        <div
          style={{
            marginTop: 10,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(168, 189, 140,0.06)',
            border: '1px solid rgba(168, 189, 140,0.15)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Shield size={12} style={{ color: '#A8BD8C', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'rgba(45,36,32,0.6)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            僅傳送匿名摘要給 AI · 明細留在本機
          </div>
        </div>

        {/* Health check card */}
        <div
          style={{
            marginTop: 22,
            fontSize: 14,
            color: 'rgba(18,17,12,0.72)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Activity size={14} /> 資產配置健康檢查
        </div>
        <div style={{ marginTop: 10, padding: '22px 22px', borderRadius: 20, background: '#FFFFFF', border: '1px solid rgba(28,26,24,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                fontSize: 14,
                color: '#D4B87A',
                fontWeight: 600,
                letterSpacing: 1,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(212, 184, 122,0.12)',
                border: '1px solid rgba(212, 184, 122,0.3)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              🔍 主動分析
            </div>
            <div style={{ fontSize: 14, color: 'rgba(45,36,32,0.4)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>05.27 14:30</div>
          </div>
          <div style={{ marginTop: 14, fontSize: 19, fontWeight: 500, color: '#18110C', lineHeight: 1.55, letterSpacing: 0.2 }}>
            目前股票資產佔比達 <b style={{ color: '#D88770' }}>60%</b> 偏高。 近期市場波動大，建議可適度提高現金比例至
            <b style={{ color: '#A8BD8C' }}> 30%</b> 以防禦風險。
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                background: 'rgba(168, 189, 140,0.12)',
                border: '1px solid rgba(168, 189, 140,0.3)',
                color: '#A8BD8C',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              查看完整報告
            </button>
            <button
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                background: 'rgba(28,26,24,0.12)',
                border: '1px solid rgba(28,26,24,0.16)',
                color: 'rgba(45,36,32,0.7)',
                fontSize: 15,
              }}
            >
              暫不調整
            </button>
          </div>
        </div>

        {/* Chat */}
        <div
          style={{
            marginTop: 24,
            fontSize: 14,
            color: 'rgba(18,17,12,0.72)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Bot size={14} /> 與 AI 財富導師對話
        </div>

        {/* Quick prompts */}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: '10px 14px',
                minHeight: 44,
                borderRadius: 14,
                background: 'rgba(217, 119, 87,0.08)',
                border: '1px solid rgba(217, 119, 87,0.22)',
                color: '#E89878',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 20,
            background: '#EDE8E3',
            border: '1px solid rgba(28,26,24,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 200,
          }}
        >
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'me' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {m.role === 'ai' && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: `${model.color}22`,
                    border: `1px solid ${model.color}44`,
                    color: model.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={15} />
                </div>
              )}
              <div
                style={{
                  maxWidth: '76%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: m.role === 'me' ? 'linear-gradient(135deg, #D97757, #B85B3F)' : 'rgba(28,26,24,0.12)',
                  color: m.role === 'me' ? '#F7F2EC' : '#18110C',
                  fontSize: 15,
                  lineHeight: 1.55,
                  letterSpacing: 0.1,
                  borderBottomRightRadius: m.role === 'me' ? 6 : 16,
                  borderBottomLeftRadius: m.role === 'me' ? 16 : 6,
                  fontWeight: m.role === 'me' ? 500 : 400,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {aiTyping && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: `${model.color}22`,
                  border: `1px solid ${model.color}44`,
                  color: model.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={15} />
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(28,26,24,0.12)', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: 20, background: 'rgba(45,36,32,0.5)', animation: `bob 1.1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom pinned: input + privacy footer */}
      <div style={{ padding: '10px 18px 12px', background: '#F7F2EC', borderTop: '1px solid rgba(28,26,24,0.12)' }}>
        {/* Input bar */}
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="問 AI 任何關於資產的問題…"
            style={{
              flex: 1,
              height: 56,
              padding: '0 18px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid rgba(28,26,24,0.14)',
              color: '#18110C',
              fontSize: 16,
              outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              flexShrink: 0,
              background: input.trim() ? 'linear-gradient(135deg, #A8BD8C, #8FA86F)' : 'rgba(28,26,24,0.12)',
              border: 'none',
              color: input.trim() ? '#F7F2EC' : 'rgba(45,36,32,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms',
            }}
          >
            <Send size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
