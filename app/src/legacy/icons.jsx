// Lucide-style icon set as React components — original strokes built from
// 24×24 viewBox to match lucide-react's visual language without copying assets.

const Ico = ({ size = 22, strokeWidth = 1.75, children, style, className }) =>
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
  style={{ display: 'block', ...style }}
  className={className}>
  
    {children}
  </svg>;


const Icons = {
  LayoutGrid: (p) => <Ico {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Ico>,
  Receipt: (p) => <Ico {...p}><path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2.5 1.5L9 2 6.5 3.5 4 2Z" /><path d="M8 9h8" /><path d="M8 13h6" /></Ico>,
  Sparkles: (p) => <Ico {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3" /></Ico>,
  Settings: (p) => <Ico {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Ico>,
  RefreshCw: (p) => <Ico {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></Ico>,
  Plus: (p) => <Ico {...p}><path d="M12 5v14M5 12h14" /></Ico>,
  Mic: (p) => <Ico {...p}><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><path d="M12 19v3" /></Ico>,
  Clipboard: (p) => <Ico {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></Ico>,
  Send: (p) => <Ico {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></Ico>,
  TrendUp: (p) => <Ico {...p}><path d="M22 7 14 15l-4-4-8 8" /><path d="M16 7h6v6" /></Ico>,
  TrendDown: (p) => <Ico {...p}><path d="M22 17 14 9l-4 4-8-8" /><path d="M16 17h6v-6" /></Ico>,
  ArrowUpRight: (p) => <Ico {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Ico>,
  ArrowRight: (p) => <Ico {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Ico>,
  Pencil: (p) => <Ico {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>,
  Wallet: (p) => <Ico {...p}><path d="M3 6a2 2 0 0 1 2-2h12v4" /><path d="M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Z" /><circle cx="17" cy="14" r="1.2" /></Ico>,
  CreditCard: (p) => <Ico {...p}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></Ico>,
  LineChart: (p) => <Ico {...p}><path d="M3 3v18h18" /><path d="m7 15 4-5 4 3 5-7" /></Ico>,
  Lock: (p) => <Ico {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Ico>,
  Shield: (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Ico>,
  Key: (p) => <Ico {...p}><circle cx="7.5" cy="15.5" r="4" /><path d="m10.5 12.5 9-9" /><path d="m16 6 3 3" /><path d="m14 8 3 3" /></Ico>,
  Bell: (p) => <Ico {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></Ico>,
  ChevronRight: (p) => <Ico {...p}><path d="m9 6 6 6-6 6" style={{ stroke: "rgba(64, 64, 64, 0.604)" }} /></Ico>,
  ChevronDown: (p) => <Ico {...p}><path d="m6 9 6 6 6-6" style={{ stroke: "rgba(79, 79, 79, 0.6)" }} /></Ico>,
  Eye: (p) => <Ico {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Ico>,
  EyeOff: (p) => <Ico {...p}><path d="m3 3 18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.7" /><path d="M6.6 6.6A17 17 0 0 0 2 12s4 6 10 6a10 10 0 0 0 4.4-1" /><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" /></Ico>,
  Bot: (p) => <Ico {...p}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4" /><circle cx="12" cy="3" r="1" /><path d="M9 14h.01M15 14h.01" /><path d="M1 14v2M23 14v2" /></Ico>,
  Brain: (p) => <Ico {...p}><path d="M9 5a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1.5 2.6A3 3 0 0 0 6 18a3 3 0 0 0 3 3V5Z" /><path d="M15 5a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-1.5 2.6A3 3 0 0 1 18 18a3 3 0 0 1-3 3V5Z" /></Ico>,
  Check: (p) => <Ico {...p}><path d="M4 12 10 18 20 6" /></Ico>,
  X: (p) => <Ico {...p}><path d="M18 6 6 18M6 6l12 12" /></Ico>,
  Trash: (p) => <Ico {...p}><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Ico>,
  Grip: (p) => <Ico {...p}><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" /></Ico>,
  MessageCircle: (p) => <Ico {...p}><path d="M21 12a9 9 0 1 1-3.6-7.2L21 4l-1.4 4A9 9 0 0 1 21 12Z" /></Ico>,
  Smartphone: (p) => <Ico {...p}><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 19h2" /></Ico>,
  Calendar: (p) => <Ico {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Ico>,
  Tag: (p) => <Ico {...p}><path d="M20.6 11.4 12 20l-9-9V3h8l9.6 8.4a1.4 1.4 0 0 1 0 2Z" /><circle cx="7.5" cy="7.5" r="1" /></Ico>,
  Activity: (p) => <Ico {...p}><path d="M22 12h-4l-3 9-6-18-3 9H2" /></Ico>,
  Banknote: (p) => <Ico {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></Ico>,
  ChartPie: (p) => <Ico {...p}><path d="M21 12A9 9 0 1 1 12 3v9h9Z" /><path d="M14 3a9 9 0 0 1 7 7h-7V3Z" /></Ico>,
  Info: (p) => <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Ico>,
  Mail: (p) => <Ico {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="m2 7 10 7 10-7" /></Ico>,
  Zap: (p) => <Ico {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></Ico>,
  Volume: (p) => <Ico {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6a8 8 0 0 1 0 12" /></Ico>,
  Search: (p) => <Ico {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ico>,
  Utensils: (p) => <Ico {...p}><path d="M4 3v6a2 2 0 0 0 4 0V3" /><path d="M6 9v12" /><path d="M17 3c-1.6 0-2.6 1.9-2.6 4.2 0 2 1 3.3 2.6 3.3" /><path d="M17 3v18" /></Ico>,
  Coffee: (p) => <Ico {...p}><path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /><path d="M7 3v2M10 3v2M13 3v2" /></Ico>,
  Car: (p) => <Ico {...p}><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L20 11" /><path d="M3 11h18v5a1 1 0 0 1-1 1h-1" /><path d="M5 17H4a1 1 0 0 1-1-1v-5" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /></Ico>,
  ShoppingBag: (p) => <Ico {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Ico>,
  Home: (p) => <Ico {...p}><path d="m3 10.5 9-7.5 9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Ico>,
  Pill: (p) => <Ico {...p}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></Ico>,
  Film: (p) => <Ico {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 14h4M17 9h4M17 14h4" /></Ico>,
  BookOpen: (p) => <Ico {...p}><path d="M12 7v14" /><path d="M3 5h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6v13h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3H3Z" /></Ico>,
  Gift: (p) => <Ico {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v9h14v-9" /><path d="M12 8C12 8 11.2 3 8.5 3a2.5 2.5 0 0 0 0 5Z" /><path d="M12 8c0 0 .8-5 3.5-5a2.5 2.5 0 0 1 0 5Z" /></Ico>,
  Briefcase: (p) => <Ico {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M2 13h20" /></Ico>,
  PiggyBank: (p) => <Ico {...p}>
    <circle cx="11" cy="13" r="6.5" />
    <ellipse cx="17" cy="14" rx="2" ry="1.5" />
    <path d="M9.5 7.5h3" />
    <path d="M10 7.2 Q9.5 5 12 5.5" />
    <circle cx="13.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="16.3" cy="14" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="17.7" cy="14" r="0.4" fill="currentColor" stroke="none" />
    <path d="M4 13.5 Q2 12.5 2.5 10.5 Q3 9 2 7.5" />
    <path d="M7 19.5v2.5M10 20v2M13 20v2M16 19.5v2" />
  </Ico>
};

window.Icons = Icons;