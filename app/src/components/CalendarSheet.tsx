import { useEffect, useState } from 'react';
import { ChevronRight } from '../icons';
import { TODAY } from '../data/demo';

interface CalendarSheetProps {
  open: boolean;
  date: Date;
  onPick: (d: Date) => void;
  onClose: () => void;
}

export default function CalendarSheet({ open, date, onPick, onClose }: CalendarSheetProps) {
  const [shown, setShown] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);
  useEffect(() => {
    if (open) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const isSel = (d: number) => d === date.getDate() && month === date.getMonth() && year === date.getFullYear();
  const isToday = (d: number) => d === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
  const isFuture = (d: number) => new Date(year, month, d) > TODAY;
  const week = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 65,
        background: shown ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 220ms ease-out',
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#F7F2EC',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0.18, 1)',
          boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
          padding: '12px 0 28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }}>
          <div style={{ width: 40, height: 4, borderRadius: 8, background: 'rgba(28,26,24,0.38)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 14px' }}>
          <button
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(28,26,24,0.12)',
              border: '1px solid rgba(28,26,24,0.14)',
              color: '#18110C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {year} 年 {month + 1} 月
          </div>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(28,26,24,0.12)',
              border: '1px solid rgba(28,26,24,0.14)',
              color: '#18110C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div style={{ padding: '0 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {week.map((w, i) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  padding: '6px 0',
                  color: i === 0 || i === 6 ? 'rgba(216,135,112,0.7)' : 'rgba(45,36,32,0.5)',
                }}
              >
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const sel = isSel(d);
              const td = isToday(d);
              const fut = isFuture(d);
              const dow = i % 7;
              return (
                <button
                  key={i}
                  disabled={fut}
                  onClick={() => onPick(new Date(year, month, d))}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 8,
                    background: sel
                      ? 'linear-gradient(135deg, #E89878, #D97757)'
                      : td
                        ? 'rgba(217,119,87,0.12)'
                        : 'transparent',
                    border: sel ? 'none' : td ? '1px solid rgba(217,119,87,0.3)' : '1px solid transparent',
                    color: sel ? '#fff' : fut ? 'rgba(45,36,32,0.2)' : dow === 0 || dow === 6 ? 'rgba(216,135,112,0.85)' : '#18110C',
                    fontSize: 15,
                    fontWeight: sel ? 700 : td ? 600 : 500,
                    fontFamily: 'JetBrains Mono, monospace',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: fut ? 'not-allowed' : 'pointer',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 16, padding: '0 18px', display: 'flex', gap: 10 }}>
          <button
            onClick={() => onPick(new Date(TODAY))}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              background: 'rgba(28,26,24,0.12)',
              border: '1px solid rgba(28,26,24,0.14)',
              color: 'rgba(45,36,32,0.75)',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            回到今日
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #E89878, #D97757)',
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
