import { useState, type ReactNode } from 'react';
import { ChevronDown } from '../icons';

interface DropFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: ReactNode;
}

export default function DropField({ label, value, options, onChange, icon }: DropFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          minHeight: 60,
          padding: '8px 14px',
          borderRadius: 18,
          background: '#FFFFFF',
          border: open ? '1px solid rgba(217,119,87,0.45)' : '1px solid rgba(28,26,24,0.12)',
          color: '#18110C',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
        }}
      >
        {icon && <span style={{ color: 'rgba(45,36,32,0.5)', flexShrink: 0 }}>{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: 'rgba(45,36,32,0.5)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ marginTop: 1, fontSize: 17, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        </div>
        <ChevronDown size={16} style={{ color: 'rgba(45,36,32,0.5)', flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: '#FBF7F2',
            borderRadius: 18,
            padding: 6,
            border: '1px solid rgba(28,26,24,0.16)',
            boxShadow: '0 18px 36px rgba(0,0,0,0.12)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '8px 12px',
                borderRadius: 8,
                background: o === value ? '#D97757' : 'transparent',
                border: 'none',
                textAlign: 'left',
                color: o === value ? '#FFFFFF' : '#18110C',
                fontSize: 16,
                fontWeight: o === value ? 600 : 400,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
