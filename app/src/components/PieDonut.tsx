import type { PieSlice } from '../data/demo';

interface PieDonutProps {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  /** lucide-style butt caps + track; matches dashboard widget look */
  butt?: boolean;
}

export default function PieDonut({ data, size = 168, thickness = 22, butt = true }: PieDonutProps) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(28,26,24,0.12)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.pct / 100) * C;
        const off = (acc / 100) * C;
        acc += d.pct;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${C}`}
            strokeDashoffset={-off}
            strokeLinecap={butt ? 'butt' : undefined}
          />
        );
      })}
    </svg>
  );
}
