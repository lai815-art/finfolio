// Lucide-style icon set as React components — original strokes built from
// 24×24 viewBox to match lucide-react's visual language without copying assets.

const Ico = ({ size = 22, strokeWidth = 1.75, children, style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    {children}
  </svg>
);

const Icons = {
  LayoutGrid: (p) => <Ico {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ico>,
  Receipt: (p) => <Ico {...p}><path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2.5 1.5L9 2 6.5 3.5 4 2Z"/><path d="M8 9h8"/><path d="M8 13h6"/></Ico>,
  Sparkles: (p) => <Ico {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></Ico>,
  Settings: (p) => <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Ico>,
  RefreshCw: (p) => <Ico {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Ico>,
  Plus: (p) => <Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>,
  Mic: (p) => <Ico {...p}><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M19 10a7 7 0 0 1-14 0"/><path d="M12 19v3"/></Ico>,
  Clipboard: (p) => <Ico {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Ico>,
  Send: (p) => <Ico {...p}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></Ico>,
  TrendUp: (p) => <Ico {...p}><path d="M22 7 14 15l-4-4-8 8"/><path d="M16 7h6v6"/></Ico>,
  TrendDown: (p) => <Ico {...p}><path d="M22 17 14 9l-4 4-8-8"/><path d="M16 17h6v-6"/></Ico>,
  ArrowUpRight: (p) => <Ico {...p}><path d="M7 17 17 7"/><path d="M8 7h9v9"/></Ico>,
  ArrowRight: (p) => <Ico {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></Ico>,
  Wallet: (p) => <Ico {...p}><path d="M3 6a2 2 0 0 1 2-2h12v4"/><path d="M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Z"/><circle cx="17" cy="14" r="1.2"/></Ico>,
  CreditCard: (p) => <Ico {...p}><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></Ico>,
  LineChart: (p) => <Ico {...p}><path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-7"/></Ico>,
  Lock: (p) => <Ico {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></Ico>,
  Shield: (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></Ico>,
  Key: (p) => <Ico {...p}><circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 9-9"/><path d="m16 6 3 3"/><path d="m14 8 3 3"/></Ico>,
  Bell: (p) => <Ico {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></Ico>,
  ChevronRight: (p) => <Ico {...p}><path d="m9 6 6 6-6 6"/></Ico>,
  ChevronDown: (p) => <Ico {...p}><path d="m6 9 6 6 6-6"/></Ico>,
  Eye: (p) => <Ico {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Ico>,
  EyeOff: (p) => <Ico {...p}><path d="m3 3 18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.7"/><path d="M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a10 10 0 0 0 4.4-1"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></Ico>,
  Bot: (p) => <Ico {...p}><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><path d="M9 14h.01M15 14h.01"/><path d="M1 14v2M23 14v2"/></Ico>,
  Brain: (p) => <Ico {...p}><path d="M9 5a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1.5 2.6A3 3 0 0 0 6 18a3 3 0 0 0 3 3V5Z"/><path d="M15 5a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-1.5 2.6A3 3 0 0 1 18 18a3 3 0 0 1-3 3V5Z"/></Ico>,
  Check: (p) => <Ico {...p}><path d="M4 12 10 18 20 6"/></Ico>,
  X: (p) => <Ico {...p}><path d="M18 6 6 18M6 6l12 12"/></Ico>,
  MessageCircle: (p) => <Ico {...p}><path d="M21 12a9 9 0 1 1-3.6-7.2L21 4l-1.4 4A9 9 0 0 1 21 12Z"/></Ico>,
  Smartphone: (p) => <Ico {...p}><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 19h2"/></Ico>,
  Calendar: (p) => <Ico {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Ico>,
  Tag: (p) => <Ico {...p}><path d="M20.6 11.4 12 20l-9-9V3h8l9.6 8.4a1.4 1.4 0 0 1 0 2Z"/><circle cx="7.5" cy="7.5" r="1"/></Ico>,
  Activity: (p) => <Ico {...p}><path d="M22 12h-4l-3 9-6-18-3 9H2"/></Ico>,
  Banknote: (p) => <Ico {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></Ico>,
  ChartPie: (p) => <Ico {...p}><path d="M21 12A9 9 0 1 1 12 3v9h9Z"/><path d="M14 3a9 9 0 0 1 7 7h-7V3Z"/></Ico>,
  Info: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></Ico>,
  Mail: (p) => <Ico {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 7 10-7"/></Ico>,
  Zap: (p) => <Ico {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></Ico>,
  Volume: (p) => <Ico {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/></Ico>,
  Search: (p) => <Ico {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Ico>,
};

window.Icons = Icons;
