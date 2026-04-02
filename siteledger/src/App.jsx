import * as API from "./api";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";

/* ════════════════════════════════════════════════════
   TOKENS & THEME
════════════════════════════════════════════════════ */
const LIGHT = {
  bg:"#f0f2f5", surf:"#ffffff", surf2:"#f7f8fa", surf3:"#eef0f5",
  bdr:"#e2e5eb", bdr2:"#cdd1da",
  tx:"#0f1623", tx2:"#4a5568", tx3:"#8896a8",
  acc:"#1a56db", accL:"#ebf0fd", accD:"#1240a8",
  grn:"#0d7a4e", grnL:"#e6f7f1",
  red:"#c0392b", redL:"#fdf0ee",
  amb:"#b45309", ambL:"#fef3e2",
  sh:"0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04)",
  shLg:"0 8px 28px rgba(0,0,0,.12)",
};
const DARK = {
  bg:"#0d0f18", surf:"#161924", surf2:"#1e2235", surf3:"#252a3d",
  bdr:"#252a3d", bdr2:"#313754",
  tx:"#e8eaf0", tx2:"#8a95b0", tx3:"#4a5270",
  acc:"#4d80ee", accL:"#162050", accD:"#7aacff",
  grn:"#34d47a", grnL:"#0a2818",
  red:"#f05a4e", redL:"#28100e",
  amb:"#f5a623", ambL:"#281a06",
  sh:"0 1px 3px rgba(0,0,0,.3)",
  shLg:"0 8px 28px rgba(0,0,0,.5)",
};

/* ════════════════════════════════════════════════════
   CONTEXT
════════════════════════════════════════════════════ */
const GEMINI_KEY = "AIzaSyDzfECs8BGkHyt6FJtfOxezGFTDPqvDZGg";
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ════════════════════════════════════════════════════
   SEED DATA
════════════════════════════════════════════════════ */
const SEED_USERS = [
  { id:1, username:"admin",   password:"admin123",   role:"Administrator", name:"Rajesh Kumar",   ini:"RK" },
  { id:2, username:"manager", password:"manager123", role:"Site Manager",  name:"Suresh Menon",   ini:"SM" },
  { id:3, username:"entry",   password:"entry123",   role:"Data Entry",    name:"Priya Nair",     ini:"PN" },
  { id:4, username:"account", password:"account123", role:"Accountant",    name:"Arun Krishnan",  ini:"AK" },
];
const SEED_MATS = [
  { id:1, name:"Cement",     unit:"bags",    stock:120,  min:50,  cost:320 },
  { id:2, name:"Steel Rods", unit:"pieces",  stock:85,   min:30,  cost:150 },
  { id:3, name:"Sand",       unit:"cu.ft",   stock:200,  min:80,  cost:45  },
  { id:4, name:"Bricks",     unit:"pieces",  stock:1500, min:500, cost:12  },
  { id:5, name:"Gravel",     unit:"cu.ft",   stock:150,  min:60,  cost:55  },
  { id:6, name:"Timber",     unit:"pieces",  stock:40,   min:20,  cost:280 },
  { id:7, name:"Paint",      unit:"litres",  stock:60,   min:20,  cost:180 },
];
const SEED_WORKERS = [
  { id:1, name:"Mohammed Aslam", role:"Mason",       rate:700, phone:"9876543210" },
  { id:2, name:"Vinod Kumar",    role:"Carpenter",   rate:800, phone:"9876543211" },
  { id:3, name:"Santhosh T.",    role:"Helper",      rate:500, phone:"9876543212" },
  { id:4, name:"Rajan P.",       role:"Electrician", rate:900, phone:"9876543213" },
  { id:5, name:"Babu Raj",       role:"Helper",      rate:500, phone:"9876543214" },
  { id:6, name:"Ajith Mohan",    role:"Plumber",     rate:850, phone:"9876543215" },
];
const SEED_VENDORS = [
  { id:1, name:"Alappuzha Cement Works", cat:"Materials",  ph:"9800000001", bal:45000 },
  { id:2, name:"KG Steel Suppliers",     cat:"Materials",  ph:"9800000002", bal:18000 },
  { id:3, name:"Fast Transport Co.",     cat:"Transport",  ph:"9800000003", bal:8500  },
  { id:4, name:"Power Electricals",      cat:"Equipment",  ph:"9800000004", bal:22000 },
];
const SEED_TASKS = [
  { id:1, title:"Foundation pour — Block A",  assigned:"Mohammed Aslam", due:"2026-04-05", status:"In Progress", pri:"High"   },
  { id:2, title:"Shuttering — Column 3",       assigned:"Vinod Kumar",    due:"2026-04-03", status:"Pending",     pri:"Medium" },
  { id:3, title:"Electrical conduit install",  assigned:"Rajan P.",       due:"2026-04-08", status:"Pending",     pri:"High"   },
  { id:4, title:"Backfill north boundary",     assigned:"Babu Raj",       due:"2026-04-02", status:"Completed",   pri:"Low"    },
];
const DEF_CATS = ["Materials","Equipment Rental","Transport","Subcontractor","Food & Water","Safety Gear","Tools","Utilities","Miscellaneous"];
const DEF_ROLES = ["Mason","Carpenter","Electrician","Plumber","Helper","Supervisor","Driver","Other"];

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */
const today = () => new Date().toISOString().split("T")[0];
const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");
const Nf = n => Number(n||0).toLocaleString("en-IN");
let _nid = 200;
const uid = () => ++_nid;

/* ════════════════════════════════════════════════════
   GLOBAL STYLES (injected once)
════════════════════════════════════════════════════ */
function GlobalStyles({ tk }) {
  useEffect(() => {
    const id = "sl-styles";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body, #root { height: 100%; overflow: hidden; }
      body { font-family: 'DM Sans', sans-serif; background: ${tk.bg}; color: ${tk.tx}; font-size: 14px; line-height: 1.5; transition: background .25s, color .25s; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-thumb { background: ${tk.bdr2}; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
      @keyframes slideUp { from { transform:translateY(100%) } to { transform:none } }
      @keyframes scaleIn { from { opacity:0; transform:translateY(-6px) scale(.97) } to { opacity:1; transform:none } }
      @keyframes badgePop { from { transform:scale(0) } to { transform:scale(1) } }
      @keyframes pulse { 0%,100%{ opacity:.3; transform:scale(.8) } 50%{ opacity:1; transform:scale(1) } }
      @keyframes spinnerRing { to { transform: rotate(360deg) } }
    `;
  }, [tk]);
  return null;
}

/* ════════════════════════════════════════════════════
   DESIGN PRIMITIVES
════════════════════════════════════════════════════ */
function Card({ children, style, delay = 0 }) {
  const { tk } = useApp();
  return (
    <div style={{
      background: tk.surf, border: `1px solid ${tk.bdr}`,
      borderRadius: 14, padding: 16, marginBottom: 14,
      boxShadow: tk.sh,
      animation: `fadeUp .3s ease ${delay}s both`,
      ...style
    }}>{children}</div>
  );
}

function CardTitle({ icon: Icon, children, action }) {
  const { tk } = useApp();
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:700, color:tk.tx }}>
        {Icon && <Icon size={14} color={tk.tx3} />}
        {children}
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, delay=0 }) {
  const { tk } = useApp();
  const colors = { acc:[tk.acc,tk.accL], grn:[tk.grn,tk.grnL], red:[tk.red,tk.redL], amb:[tk.amb,tk.ambL] };
  const [fg, bg] = colors[color] || colors.acc;
  return (
    <div style={{
      background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius:14,
      padding:"14px 16px", boxShadow: tk.sh, position:"relative", overflow:"hidden",
      animation: `fadeUp .3s ease ${delay}s both`,
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"14px 14px 0 0", background:fg }} />
      <div style={{ width:30, height:30, borderRadius:8, background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <Icon size={15} />
      </div>
      <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-.5px", fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:11, color:tk.tx3, fontWeight:500 }}>{label}</div>
    </div>
  );
}

function Btn({ children, variant="primary", onClick, disabled, fullWidth, small, style }) {
  const { tk } = useApp();
  const [pressed, setPressed] = useState(false);
  const variants = {
    primary: { bg:tk.acc, color:"#fff", border:"none" },
    secondary: { bg:tk.surf2, color:tk.tx, border:`1.5px solid ${tk.bdr}` },
    danger: { bg:tk.redL, color:tk.red, border:`1.5px solid ${tk.red}` },
    ghost: { bg:"transparent", color:tk.tx2, border:`1.5px solid ${tk.bdr}` },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7,
        padding: small ? "5px 10px" : "9px 16px",
        borderRadius: small ? 6 : 10,
        fontSize: small ? 11 : 13, fontWeight:600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .6 : 1,
        width: fullWidth ? "100%" : "auto",
        transition:"all .15s", transform: pressed ? "scale(.96)" : "scale(1)",
        whiteSpace:"nowrap",
        ...v, ...style
      }}
    >{children}</button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".03em", marginBottom:5, opacity:.7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type="text", placeholder, autoComplete }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width:"100%", border:`1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius:10, padding:"10px 12px", fontSize:14, color:tk.tx,
        background: tk.surf2, outline:"none",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition:"border-color .15s, box-shadow .15s",
        WebkitAppearance:"none",
      }}
    />
  );
}

function Select({ value, onChange, children }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value} onChange={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width:"100%", border:`1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius:10, padding:"10px 12px", fontSize:14, color:tk.tx,
        background: tk.surf2, outline:"none",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition:"border-color .15s, box-shadow .15s",
        WebkitAppearance:"none", cursor:"pointer",
      }}
    >{children}</select>
  );
}

function Textarea({ value, onChange, rows=4, placeholder }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width:"100%", border:`1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius:10, padding:"10px 12px", fontSize:14, color:tk.tx,
        background: tk.surf2, outline:"none", resize:"vertical",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition:"border-color .15s, box-shadow .15s",
      }}
    />
  );
}

function FormGrid({ children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10 }}>
      {children}
    </div>
  );
}

function Alert({ type="ok", children }) {
  const { tk } = useApp();
  const cfg = {
    ok:   { bg:tk.grnL, color:tk.grn, border:`1px solid ${tk.grn}33` },
    err:  { bg:tk.redL, color:tk.red, border:`1px solid ${tk.red}33` },
    warn: { bg:tk.ambL, color:tk.amb, border:`1px solid ${tk.amb}33` },
  };
  const c = cfg[type];
  return (
    <div style={{ ...c, borderRadius:10, padding:"9px 12px", fontSize:13, marginBottom:12, animation:"fadeUp .2s ease", display:"flex", alignItems:"flex-start", gap:8 }}>
      {children}
    </div>
  );
}

function Badge({ children, color="gray" }) {
  const { tk } = useApp();
  const cfg = {
    green: { bg:tk.grnL, color:tk.grn },
    red:   { bg:tk.redL, color:tk.red },
    amber: { bg:tk.ambL, color:tk.amb },
    blue:  { bg:tk.accL, color:tk.acc },
    gray:  { bg:tk.surf2, color:tk.tx2 },
  };
  const c = cfg[color] || cfg.gray;
  return (
    <span style={{ ...c, display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function SummaryRow({ label, value, bold }) {
  const { tk } = useApp();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${tk.bdr}`, fontSize:13 }}>
      <span style={{ color: bold ? tk.tx : tk.tx2, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace", color: bold ? tk.acc : tk.tx }}>{value}</span>
    </div>
  );
}

function TableWrap({ children }) {
  return <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", borderRadius:8 }}>{children}</div>;
}

function ProgressBar({ label, value, max, color }) {
  const { tk } = useApp();
  const pct = Math.min(100, (value / Math.max(value, max)) * 100);
  const c = value <= max * .33 ? tk.red : value <= max * .6 ? tk.amb : tk.grn;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
        <strong style={{ color:tk.tx }}>{label}</strong>
        <span style={{ color:tk.tx2 }}>{Nf(value)}</span>
      </div>
      <div style={{ background:tk.surf3, borderRadius:4, height:6, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:6, borderRadius:4, background: color||c, transition:"width .6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  const { tk } = useApp();
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
        background: value ? tk.acc : tk.bdr2, position:"relative",
        transition:"background .2s", flexShrink:0,
      }}
    >
      <span style={{
        position:"absolute", top:3, left: value ? 23 : 3,
        width:18, height:18, borderRadius:"50%", background:"#fff",
        boxShadow:"0 1px 3px rgba(0,0,0,.2)",
        transition:"left .2s cubic-bezier(.34,1.56,.64,1)",
      }} />
    </button>
  );
}

function Divider() {
  const { tk } = useApp();
  return <div style={{ height:1, background:tk.bdr, margin:"12px 0" }} />;
}

function Empty({ icon: Icon, text }) {
  const { tk } = useApp();
  return (
    <div style={{ textAlign:"center", padding:"32px 16px", color:tk.tx3 }}>
      <Icon size={36} style={{ marginBottom:10, opacity:.3 }} />
      <p style={{ fontSize:13 }}>{text}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   BOTTOM SHEET MODAL
════════════════════════════════════════════════════ */
function Sheet({ open, onClose, title, icon: TitleIcon, children, footer }) {
  const { tk } = useApp();
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
        zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center",
        animation:"fadeUp .2s ease",
        padding: window.innerWidth >= 600 ? 16 : 0,
      }}
    >
      <div style={{
        background:tk.surf, width:"100%", maxWidth:520,
        maxHeight:"92vh", overflow:"hidden",
        display:"flex", flexDirection:"column",
        borderRadius: window.innerWidth >= 600 ? 16 : "16px 16px 0 0",
        boxShadow:"0 -4px 32px rgba(0,0,0,.15)",
        animation: window.innerWidth < 600 ? "slideUp .3s cubic-bezier(.4,0,.2,1)" : "scaleIn .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {window.innerWidth < 600 && (
          <div style={{ width:36, height:4, borderRadius:2, background:tk.bdr2, margin:"10px auto 0", flexShrink:0 }} />
        )}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px 12px", borderBottom:`1px solid ${tk.bdr}`, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
            {TitleIcon && <TitleIcon size={17} color={tk.acc} />}
            {title}
          </div>
          <Btn variant="ghost" small onClick={onClose} style={{ width:30, height:30, padding:0, borderRadius:8 }}>✕</Btn>
        </div>
        <div style={{ overflowY:"auto", padding:"16px 18px", flex:1 }}>{children}</div>
        {footer && (
          <div style={{ padding:"12px 18px 20px", borderTop:`1px solid ${tk.bdr}`, display:"flex", gap:8, flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ICONS (lucide via CDN — inline SVG wrappers)
════════════════════════════════════════════════════ */
const I = (name) => ({ size=16, color="currentColor", style={} } = {}) => {
  const paths = {
    "hard-hat":       <><path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/><path d="M10 10V5a1 1 0 011-1h2a1 1 0 011 1v5"/><path d="M4 15v-3a8 8 0 0116 0v3"/></>,
    "layout-dash":    <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    "clipboard":      <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>,
    "package":        <><path d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4A2 2 0 012 16.77V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z"/><polyline points="2.32 6.16 12 11 21.68 6.16"/><line x1="12" y1="22.76" x2="12" y2="11"/></>,
    "users":          <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    "check-square":   <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    "receipt":        <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="6" x2="12" y2="6"/></>,
    "file-text":      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    "building":       <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M14 7h1"/><path d="M14 11h1"/></>,
    "pie-chart":      <><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></>,
    "cpu":            <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    "settings":       <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    "menu":           <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    "x":              <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    "plus":           <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    "save":           <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    "trash":          <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>,
    "download":       <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    "log-out":        <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    "moon":           <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    "sun":            <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    "alert-tri":      <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    "activity":       <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    "trending-up":    <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    "indian-rupee":   <><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l8.5 8"/><path d="M6 13h3a4 4 0 000-8H6v8z"/></>,
    "check-circle":   <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    "x-circle":       <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    "clock":          <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "inbox":          <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>,
    "user-plus":      <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    "user-check":     <><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></>,
    "tag":            <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    "file-plus":      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
    "file-spread":    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    "edit":           <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    "arrows":         <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></>,
    "database":       <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    "check":          <><polyline points="20 6 9 17 4 12"/></>,
    "pkg-x":          <><path d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4A2 2 0 012 16.77V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z"/><line x1="9.5" y1="12.5" x2="14.5" y2="12.5"/></>,
    "list-checks":    <><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></>,
    "hard-hat2":      <><path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/><path d="M10 10V5a1 1 0 011-1h2a1 1 0 011 1v5"/><path d="M4 15v-3a8 8 0 0116 0v3"/></>,
  };
  const d = paths[name] || paths["check"];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d}
    </svg>
  );
};

// Named icon components
const Icons = {};
["hard-hat","layout-dash","clipboard","package","users","check-square","receipt","file-text",
 "building","pie-chart","cpu","settings","menu","x","plus","save","trash","download","log-out",
 "moon","sun","alert-tri","activity","trending-up","indian-rupee","check-circle","x-circle",
 "clock","inbox","user-plus","user-check","tag","file-plus","file-spread","edit","arrows",
 "database","check","pkg-x","list-checks","hard-hat2"].forEach(n => {
  Icons[n] = ({ size=16, color="currentColor", style={} }) => I(n)({ size, color, style });
});

/* ════════════════════════════════════════════════════
   ICON ALIASES — required for JSX usage
════════════════════════════════════════════════════ */
const IMenu       = Icons["menu"];
const IHardHat    = Icons["hard-hat2"];
const ILayoutDash = Icons["layout-dash"];
const IClipboard  = Icons["clipboard"];
const IPackage    = Icons["package"];
const IUsers      = Icons["users"];
const ICheckSq    = Icons["check-square"];
const IReceipt    = Icons["receipt"];
const IFileText   = Icons["file-text"];
const IBuilding   = Icons["building"];
const IPieChart   = Icons["pie-chart"];
const ICpu        = Icons["cpu"];
const ISettings   = Icons["settings"];
const IX          = Icons["x"];
const IPlus       = Icons["plus"];
const ISave       = Icons["save"];
const ITrash      = Icons["trash"];
const IDownload   = Icons["download"];
const ILogOut     = Icons["log-out"];
const IMoon       = Icons["moon"];
const ISun        = Icons["sun"];
const IAlertTri   = Icons["alert-tri"];
const IActivity   = Icons["activity"];
const ITrending   = Icons["trending-up"];
const IRupee      = Icons["indian-rupee"];
const ICheckCirc  = Icons["check-circle"];
const IXCircle    = Icons["x-circle"];
const IClock      = Icons["clock"];
const IInbox      = Icons["inbox"];
const IUserPlus   = Icons["user-plus"];
const IUserCheck  = Icons["user-check"];
const ITag        = Icons["tag"];
const IFilePlus   = Icons["file-plus"];
const IFileSpread = Icons["file-spread"];
const IEdit       = Icons["edit"];
const IArrows     = Icons["arrows"];
const IDatabase   = Icons["database"];
const ICheck      = Icons["check"];
const IPkgX       = Icons["pkg-x"];
const IListChecks = Icons["list-checks"];

/* ════════════════════════════════════════════════════
   NAV CONFIG
════════════════════════════════════════════════════ */
const NAV_SECTIONS = [
  { section:"Overview",    items:[{ id:"dashboard",  label:"Dashboard",         Icon:ILayoutDash },
                                   { id:"workflow",   label:"Daily Workflow",    Icon:IClipboard   }] },
  { section:"Operations",  items:[{ id:"materials",  label:"Materials",          Icon:IPackage     },
                                   { id:"attendance", label:"Labour & Attendance",Icon:IUsers       },
                                   { id:"tasks",      label:"Task Tracker",      Icon:ICheckSq}] },
  { section:"Finance",     items:[{ id:"expenses",   label:"Expenses",           Icon:IReceipt     },
                                   { id:"invoices",   label:"Invoices & Payables",Icon:IFileText  },
                                   { id:"vendors",    label:"Vendors",            Icon:IBuilding   }] },
  { section:"Intelligence",items:[{ id:"reports",    label:"Reports",            Icon:IPieChart   },
                                   { id:"ai",         label:"AI Analysis",       Icon:ICpu         }] },
  { section:"Account",     items:[{ id:"settings",   label:"Settings",           Icon:ISettings    }] },
];
const BOTTOM_NAV = [
  { id:"dashboard",  Icon:ILayoutDash,  label:"Home"    },
  { id:"materials",  Icon:IPackage,       label:"Stock"   },
  { id:"attendance", Icon:IUsers,         label:"Labour"  },
  { id:"expenses",   Icon:IReceipt,       label:"Expenses"},
  { id:"settings",   Icon:ISettings,      label:"Settings"},
];

/* ════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════ */
function Sidebar({ open, onClose }) {
  const { tk, page, setPage, mats, inv } = useApp();
  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pi = inv.filter(i => i.status === "Unpaid").length;

  const navigate = (id) => { setPage(id); onClose(); };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200, animation:"fadeUp .2s ease" }}
        />
      )}
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:260,
        background:tk.surf, borderRight:`1px solid ${tk.bdr}`,
        zIndex:201, display:"flex", flexDirection:"column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition:"transform .28s cubic-bezier(.4,0,.2,1)",
        boxShadow: open ? tk.shLg : "none",
      }}>
        <div style={{ height:56, display:"flex", alignItems:"center", padding:"0 16px", borderBottom:`1px solid ${tk.bdr}`, flexShrink:0, gap:10 }}>
          <IHardHat size={20} color={tk.acc} />
          <span style={{ fontSize:16, fontWeight:700, letterSpacing:"-.3px" }}>Site<span style={{ color:tk.acc }}>Ledger</span></span>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:tk.tx3, padding:4 }}>
            <IX size={18} color={tk.tx3} />
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.section}>
              <div style={{ fontSize:9, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".12em", padding:"10px 16px 4px" }}>
                {sec.section}
              </div>
              {sec.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", margin:"0 8px", borderRadius:10,
                    border:"none", background: page === item.id ? tk.accL : "transparent",
                    color: page === item.id ? tk.acc : tk.tx2,
                    fontWeight: page === item.id ? 600 : 500,
                    fontSize:13, cursor:"pointer", width:"calc(100% - 16px)",
                    textAlign:"left", transition:"all .15s",
                    position:"relative",
                  }}
                >
                  <item.Icon size={15} color={page === item.id ? tk.acc : tk.tx3} />
                  {item.label}
                  {item.id === "materials" && lsc > 0 && (
                    <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, background:tk.red, color:"#fff", padding:"2px 6px", borderRadius:20, animation:"badgePop .3s" }}>{lsc}</span>
                  )}
                  {item.id === "invoices" && pi > 0 && (
                    <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, background:tk.red, color:"#fff", padding:"2px 6px", borderRadius:20, animation:"badgePop .3s" }}>{pi}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   TOPBAR
════════════════════════════════════════════════════ */
function Topbar({ onMenuClick }) {
  const { tk, user } = useApp();
  return (
    <div style={{
      height:56, background:tk.surf, borderBottom:`1px solid ${tk.bdr}`,
      display:"flex", alignItems:"center", padding:"0 14px", gap:10,
      flexShrink:0, zIndex:100,
      boxShadow:`0 1px 0 ${tk.bdr}, 0 2px 8px rgba(0,0,0,.04)`,
    }}>
      <button onClick={onMenuClick} style={{ background:"none", border:"none", cursor:"pointer", color:tk.tx, padding:4, display:"flex", alignItems:"center" }}>
        <IMenu size={22} color={tk.tx} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:16, fontWeight:700, letterSpacing:"-.3px" }}>
        <IHardHat size={18} color={tk.acc} />
        <span>Site<span style={{ color:tk.acc }}>Ledger</span></span>
      </div>
      <span style={{ fontSize:11, color:tk.tx3, display:"none", "@media(min-width:600px)":{display:"block"} }} className="hide-mobile">
        Palakkad Residential Complex
      </span>
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:tk.acc, color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {user.ini}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   BOTTOM NAV
════════════════════════════════════════════════════ */
function BottomNav() {
  const { tk, page, setPage, mats } = useApp();
  const lsc = mats.filter(m => m.stock <= m.min).length;
  return (
    <nav style={{ display:"flex", background:tk.surf, borderTop:`1px solid ${tk.bdr}`, flexShrink:0, width:"100%", overflow:"hidden" }}>
      {BOTTOM_NAV.map(n => {
        const active = page === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              flex:1, minWidth:0, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:2, padding:"6px 2px 8px",
              fontSize:9, fontWeight:600,
              color: active ? tk.acc : tk.tx3,
              background:"none", border:"none", cursor:"pointer",
              transition:"color .15s", position:"relative",
              fontFamily:"'DM Sans',sans-serif", overflow:"hidden",
            }}
          >
            {n.id === "materials" && lsc > 0 && (
              <span style={{ position:"absolute", top:4, right:"calc(50% - 14px)", width:7, height:7, borderRadius:"50%", background:tk.red, border:`2px solid ${tk.surf}`, animation:"badgePop .3s" }} />
            )}
            <n.Icon size={18} color={active ? tk.acc : tk.tx3} style={{ transition:"transform .25s cubic-bezier(.34,1.56,.64,1)", transform: active ? "scale(1.15)" : "scale(1)" }} />
            <span>{n.label}</span>
            {active && <span style={{ position:"absolute", top:3, left:"50%", transform:"translateX(-50%)", width:24, height:3, background:tk.acc, borderRadius:"0 0 3px 3px", animation:"scaleIn .2s" }} />}
          </button>
        );
      })}
    </nav>
  );
}

/* ════════════════════════════════════════════════════
   PAGES
════════════════════════════════════════════════════ */

/* ── DASHBOARD ── */
function Dashboard() {
  const { tk, mats, att, exp, tasks } = useApp();
  const ta = att.filter(a => a.date === today());
  const te = exp.filter(e => e.date === today());
  const lc = ta.reduce((s, a) => s + a.total, 0);
  const ec = te.reduce((s, e) => s + e.amount, 0);
  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pt = tasks.filter(t => t.status !== "Completed").length;
  const totL = att.reduce((s, a) => s + a.total, 0);
  const totE = exp.reduce((s, e) => s + e.amount, 0);
  const act = [
    ...att.slice(0,2).map(a => ({...a,_k:"a"})),
    ...exp.slice(0,2).map(e => ({...e,_k:"e"})),
    ...att.slice(0,1).map(l => ({...l,_k:"m"})),
  ].slice(0,5);

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Dashboard</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric"})}</div>
      </div>

      {lsc > 0 && (
        <Alert type="warn"><IAlertTri size={14} /><span><strong>{lsc} material{lsc>1?"s":""}</strong> below minimum stock — reorder required</span></Alert>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <StatCard icon={IRupee} value={Rs(lc+ec)} label="Spent Today" color="acc" delay={.04} />
        <StatCard icon={IUsers} value={ta.length} label="Workers Today" color="grn" delay={.08} />
        <StatCard icon={IListChecks} value={pt} label="Pending Tasks" color="amb" delay={.12} />
        <StatCard icon={IPkgX} value={lsc} label="Low Stock" color="red" delay={.16} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>
        <Card delay={.1}>
          <CardTitle icon={ITrending}>Overall Spend</CardTitle>
          {[
            {l:"Labour",  v:Rs(totL)},
            {l:"Materials",v:Rs(exp.filter(e=>e.category==="Materials").reduce((s,e)=>s+e.amount,0))},
            {l:"Equipment",v:Rs(exp.filter(e=>e.category==="Equipment Rental").reduce((s,e)=>s+e.amount,0))},
            {l:"Other",   v:Rs(exp.filter(e=>!["Materials","Equipment Rental"].includes(e.category)).reduce((s,e)=>s+e.amount,0))},
          ].map(r => <SummaryRow key={r.l} label={r.l} value={r.v} />)}
          <SummaryRow label="Total" value={Rs(totL+totE)} bold />
        </Card>

        <Card delay={.14}>
          <CardTitle icon={IPackage}>Stock Levels</CardTitle>
          {mats.map(m => (
            <ProgressBar key={m.id} label={m.name} value={m.stock} max={m.min*3} />
          ))}
        </Card>
      </div>

      <Card delay={.18}>
        <CardTitle icon={IActivity}>Recent Activity</CardTitle>
        {att.length === 0 && exp.length === 0
          ? <Empty icon={IInbox} text="No activity yet. Start entering data." />
          : [...att.slice(0,2).map(a=>({...a,_k:"a"})),...exp.slice(0,3).map(e=>({...e,_k:"e"}))].slice(0,5).map((x, i) => {
            const isA = x._k === "a";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom: i < 4 ? `1px solid ${tk.bdr}` : "none" }}>
                <div style={{ width:32, height:32, borderRadius:8, background: isA ? tk.grnL : tk.ambL, color: isA ? tk.grn : tk.amb, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {isA ? <IUserCheck size={14} /> : <IReceipt size={14} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {isA ? `${x.name} — ${x.role} · ${x.hours}h` : `${x.category} — ${x.desc}`}
                  </div>
                  <div style={{ fontSize:11, color:tk.tx3, marginTop:1 }}>{x.date} · {x.by}</div>
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13, color: isA ? tk.tx : tk.acc }}>
                  {isA ? Rs(x.total) : Rs(x.amount)}
                </span>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

/* ── MATERIALS ── */
function Materials() {
  const { tk, mats, setMats, matLogs, setMatLogs, user } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [matId, setMatId] = useState(mats[0]?.id || 1);
  const [type, setType] = useState("out");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [nm, setNm] = useState({ name:"", unit:"", cost:"", stock:"", min:"" });

  const submit = async () => {
    const m = mats.find(x => x.id === matId);
    const q = parseFloat(qty);
    if (!q || q <= 0) return setMsg({ t:"err", s:"Enter a valid quantity." });
    if (type === "out" && q > m.stock) return setMsg({ t:"err", s:`Only ${m.stock} ${m.unit} available.` });
    try {
      await API.recordMatMovement({ material_id: matId, type, quantity: q, note, supplier: note });
      setMats(prev => prev.map(x => x.id === matId ? { ...x, stock: type === "in" ? x.stock + q : x.stock - q } : x));
      setMatLogs(prev => [{ id:Date.now(), date:today(), material:m.name, unit:m.unit, type, qty:q, note, by:user.name }, ...prev]);
      setMsg({ t:"ok", s:"Stock updated successfully." });
      setQty(""); setNote("");
      setTimeout(() => setMsg(null), 2500);
    } catch(e) { setMsg({ t:"err", s: e.message }); }
  };

  const addMat = async () => {
    if (!nm.name.trim()) return;
    try {
      const res = await API.addMaterial({ name:nm.name, unit:nm.unit||"units", stock:parseFloat(nm.stock)||0, min_stock:parseFloat(nm.min)||10, unit_cost:parseFloat(nm.cost)||0 });
      setMats(prev => [...prev, { ...res, min: res.min_stock||10, cost: res.unit_cost||0 }]);
      setAddOpen(false); setNm({ name:"", unit:"", cost:"", stock:"", min:"" });
    } catch(e) { alert(e.message); }
  };

  const lsc = mats.filter(m => m.stock <= m.min).length;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Materials</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Stock tracking and usage</div></div>
        <Btn variant="secondary" small onClick={() => setAddOpen(true)}><IPlus size={13} />Add Material</Btn>
      </div>

      {lsc > 0 && <Alert type="warn"><IAlertTri size={14} /><span><strong>{lsc} item{lsc>1?"s":""}</strong> at or below minimum stock level.</span></Alert>}

      <Card delay={.05}>
        <CardTitle icon={IArrows}>Record Movement</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <Field label="Material">
          <Select value={matId} onChange={e => setMatId(parseInt(e.target.value))}>
            {mats.map(m => <option key={m.id} value={m.id}>{m.name} — {Nf(m.stock)} {m.unit}</option>)}
          </Select>
        </Field>
        <FormGrid>
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="out">Issue (Used)</option>
              <option value="in">Receive (In)</option>
            </Select>
          </Field>
          <Field label="Quantity">
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </Field>
        </FormGrid>
        <Field label="Note / Supplier">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </Field>
        <Btn onClick={submit}><ISave size={14} />Record</Btn>
      </Card>

      <Card delay={.1}>
        <CardTitle icon={IPackage}>Current Stock</CardTitle>
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
            <thead>
              <tr>{["Material","Stock","Unit","Status",""].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2, whiteSpace:"nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {mats.map(m => {
                const s = m.stock <= m.min ? "Low" : m.stock <= m.min * 1.5 ? "Caution" : "Good";
                return (
                  <tr key={m.id} style={{ transition:"background .1s" }}>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontWeight:600 }}>{m.name}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{Nf(m.stock)}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{m.unit}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>
                      <Badge color={s==="Low"?"red":s==="Caution"?"amber":"green"}>{s}</Badge>
                    </td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>
                      <Btn variant="ghost" small onClick={async()=>{ try{ await API.deleteMaterial(m.id); setMats(prev=>prev.filter(x=>x.id!==m.id)); }catch(e){alert(e.message);} }} style={{ padding:"4px 8px" }}>
                        <ITrash size={12} />
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {matLogs.length > 0 && (
        <Card delay={.15}>
          <CardTitle icon={IFileText}>Transaction Log</CardTitle>
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
              <thead><tr>{["Date","Material","Type","Qty","Note"].map(h => <th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>
                {matLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{l.date}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{l.material}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={l.type==="in"?"green":"blue"}>{l.type==="in"?"Received":"Issued"}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{Nf(l.qty)} {l.unit}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, color:tk.tx2 }}>{l.note||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Material" icon={IPlus}
        footer={<><Btn onClick={addMat}><ISave size={14}/>Add Material</Btn><Btn variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Btn></>}>
        <Field label="Material Name"><Input value={nm.name} onChange={e => setNm(p=>({...p,name:e.target.value}))} placeholder="e.g. PVC Pipe" autoComplete="off"/></Field>
        <FormGrid>
          <Field label="Unit"><Input value={nm.unit} onChange={e => setNm(p=>({...p,unit:e.target.value}))} placeholder="e.g. metres"/></Field>
          <Field label="Unit Cost (₹)"><Input type="number" value={nm.cost} onChange={e => setNm(p=>({...p,cost:e.target.value}))} placeholder="0"/></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Opening Stock"><Input type="number" value={nm.stock} onChange={e => setNm(p=>({...p,stock:e.target.value}))} placeholder="0"/></Field>
          <Field label="Min Alert Level"><Input type="number" value={nm.min} onChange={e => setNm(p=>({...p,min:e.target.value}))} placeholder="0"/></Field>
        </FormGrid>
      </Sheet>
    </div>
  );
}

/* ── ATTENDANCE ── */
function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [wId, setWId] = useState(workers[0]?.id||1);
  const [date, setDate] = useState(today());
  const [present, setPresent] = useState("1");
  const [hours, setHours] = useState("8");
  const [ot, setOt] = useState("0");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [nw, setNw] = useState({ name:"", role:"Mason", rate:"", phone:"" });

  const submit = async () => {
    const w = workers.find(x => x.id === wId);
    const h = parseFloat(hours)||0, o = parseFloat(ot)||0;
    const otR = Math.round(w.rate/8*1.5);
    const base = present==="half" ? w.rate/2 : present==="1" ? w.rate : 0;
    const total = base + o * otR;
    try {
      await API.recordAttendance({ worker_id: wId, date, status: present==="1"?"present": present==="half"?"half":"absent", hours:h, ot_hours:o, note });
      setAtt(prev => [{ id:Date.now(), workerId:w.id, name:w.name, role:w.role, date, present, hours:h, ot:o, otR, total, note, by:user.name }, ...prev]);
      setMsg({ t:"ok", s:`Recorded. Wage: ${Rs(total)}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 2500);
    } catch(e) { setMsg({ t:"err", s: e.message }); }
  };

  const addWorker = async () => {
    if (!nw.name.trim()) return;
    try {
      const res = await API.addWorker({ name:nw.name, role:nw.role, daily_rate:parseFloat(nw.rate)||500, phone:nw.phone });
      setWorkers(prev => [...prev, { ...res, rate: res.daily_rate||500 }]);
      setAddOpen(false); setNw({ name:"", role:"Mason", rate:"", phone:"" });
    } catch(e) { alert(e.message); }
  };

  const totLab = att.reduce((s, a) => s + a.total, 0);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Labour & Attendance</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Daily wages and attendance register</div></div>
        <Btn variant="secondary" small onClick={() => setAddOpen(true)}><IUserPlus size={13}/>Add Worker</Btn>
      </div>

      <Card delay={.05}>
        <CardTitle icon={IClipboard}>Mark Attendance</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <Field label="Worker">
          <Select value={wId} onChange={e => setWId(parseInt(e.target.value))}>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name} — {w.role}</option>)}
          </Select>
        </Field>
        <FormGrid>
          <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></Field>
          <Field label="Status">
            <Select value={present} onChange={e => setPresent(e.target.value)}>
              <option value="1">Present</option>
              <option value="0">Absent</option>
              <option value="half">Half Day</option>
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Regular Hours"><Input type="number" value={hours} onChange={e => setHours(e.target.value)}/></Field>
          <Field label="Overtime Hours"><Input type="number" value={ot} onChange={e => setOt(e.target.value)}/></Field>
        </FormGrid>
        <Field label="Notes (optional)"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Remarks"/></Field>
        <Btn onClick={submit}><ISave size={14}/>Record</Btn>
      </Card>

      <Card delay={.1}>
        <CardTitle icon={IUsers}>Worker Roster</CardTitle>
        {workers.map(w => {
          const recs = att.filter(a => a.workerId === w.id);
          return (
            <div key={w.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${tk.bdr}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{w.name}</div>
                <div style={{ fontSize:11, color:tk.tx3 }}>{w.role} · ₹{w.rate}/day · {recs.length} days</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13 }}>{Rs(recs.reduce((s,a)=>s+a.total,0))}</div>
                <Btn variant="ghost" small style={{ marginTop:3 }} onClick={async()=>{ try{ await API.deleteWorker(w.id); setWorkers(prev=>prev.filter(x=>x.id!==w.id)); }catch(e){alert(e.message);} }}>Remove</Btn>
              </div>
            </div>
          );
        })}
      </Card>

      {att.length > 0 && (
        <Card delay={.15}>
          <CardTitle icon={IFileText} action={<span style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{Rs(totLab)}</span>}>Attendance Register</CardTitle>
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:460 }}>
              <thead><tr>{["Date","Name","Role","Status","Hrs","Total"].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>
                {att.map(a=>(
                  <tr key={a.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{a.date}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontWeight:600 }}>{a.name}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge>{a.role}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={a.present==="1"?"green":a.present==="half"?"amber":"red"}>{a.present==="1"?"Present":a.present==="half"?"Half Day":"Absent"}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{a.hours}h</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      <Sheet open={addOpen} onClose={()=>setAddOpen(false)} title="Add Worker" icon={IUserPlus}
        footer={<><Btn onClick={addWorker}><ISave size={14}/>Add Worker</Btn><Btn variant="secondary" onClick={()=>setAddOpen(false)}>Cancel</Btn></>}>
        <Field label="Full Name"><Input value={nw.name} onChange={e=>setNw(p=>({...p,name:e.target.value}))} placeholder="Worker's full name" autoComplete="off"/></Field>
        <FormGrid>
          <Field label="Role"><Select value={nw.role} onChange={e=>setNw(p=>({...p,role:e.target.value}))}>{roles.map(r=><option key={r}>{r}</option>)}</Select></Field>
          <Field label="Daily Rate (₹)"><Input type="number" value={nw.rate} onChange={e=>setNw(p=>({...p,rate:e.target.value}))} placeholder="0"/></Field>
        </FormGrid>
        <Field label="Phone"><Input type="tel" value={nw.phone} onChange={e=>setNw(p=>({...p,phone:e.target.value}))} placeholder="Mobile number"/></Field>
      </Sheet>
    </div>
  );
}

/* ── EXPENSES ── */
function Expenses() {
  const { tk, exp, setExp, expCats, setExpCats, vendors, user } = useApp();
  const [expCatsRaw, setExpCatsRaw] = useState([]);
  useEffect(() => { API.getExpCats().then(r => setExpCatsRaw(r)).catch(()=>{}); }, []);
  const [tab, setTab] = useState("add");
  const [catOpen, setCatOpen] = useState(false);
  const [cat, setCat] = useState(expCats[0]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [vendor, setVendor] = useState("");
  const [pay, setPay] = useState("Cash");
  const [date, setDate] = useState(today());
  const [msg, setMsg] = useState(null);
  const [newCat, setNewCat] = useState("");

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) return setMsg({t:"err",s:"Enter a valid amount."});
    if (!desc) return setMsg({t:"err",s:"Description is required."});
    try {
      const catObj = expCatsRaw.find(c => c.name === cat);
      const vendorObj = vendors.find(v => v.name === vendor);
      await API.addExpense({ category_id: catObj?.id, amount:parseFloat(amount), description:desc, vendor_id: vendorObj?.id||null, payment_mode:pay, date });
      setExp(prev => [{ id:Date.now(), category:cat, amount:parseFloat(amount), desc, vendor, paymentMode:pay, date, by:user.name }, ...prev]);
      setMsg({t:"ok",s:"Expense recorded."});
      setAmount(""); setDesc(""); setVendor("");
      setTimeout(()=>setMsg(null), 2000);
    } catch(e) { setMsg({t:"err", s:e.message}); }
  };

  const totE = exp.reduce((s,e)=>s+e.amount,0);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Expenses</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Log and categorise expenditures</div></div>
        <Btn variant="secondary" small onClick={()=>setCatOpen(true)}><ITag size={13}/>Categories</Btn>
      </div>

      <div style={{ display:"flex", gap:2, background:tk.surf2, border:`1px solid ${tk.bdr}`, borderRadius:10, padding:3, marginBottom:14 }}>
        {["add","list"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"7px 10px", borderRadius:8, border:"none", background:tab===t?tk.surf:"transparent", color:tab===t?tk.tx:tk.tx3, fontWeight:600, fontSize:12, cursor:"pointer", boxShadow:tab===t?tk.sh:"none", transition:"all .15s", fontFamily:"'DM Sans',sans-serif" }}>
            {t==="add"?"Add Expense":"All Expenses"}
          </button>
        ))}
      </div>

      {tab==="add" ? (
        <Card delay={.05}>
          <CardTitle icon={IPlus}>New Expense</CardTitle>
          {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
          <FormGrid>
            <Field label="Category"><Select value={cat} onChange={e=>setCat(e.target.value)}>{expCats.map(c=><option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (₹)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
          </FormGrid>
          <Field label="Description"><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What was this expense for?"/></Field>
          <FormGrid>
            <Field label="Vendor">
              <Select value={vendor} onChange={e=>setVendor(e.target.value)}>
                <option value="">— Optional —</option>
                {vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Payment">
              <Select value={pay} onChange={e=>setPay(e.target.value)}>
                {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(p=><option key={p}>{p}</option>)}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <Btn onClick={submit}><ISave size={14}/>Add Expense</Btn>
        </Card>
      ) : (
        <Card delay={.05}>
          <CardTitle icon={IReceipt} action={<span style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{Rs(totE)}</span>}>All Expenses</CardTitle>
          {exp.length===0 ? <Empty icon={IReceipt} text="No expenses yet."/> : (
            <TableWrap>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
                <thead><tr>{["Date","Category","Description","Amount"].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
                <tbody>{exp.map(e=>(
                  <tr key={e.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{e.date}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color="blue">{e.category}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{e.desc}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(e.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      <Card delay={.1}>
        <CardTitle icon={IPieChart}>By Category</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:9 }}>
          {expCats.map(c=>{
            const t=exp.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0);
            if(!t) return null;
            return <div key={c} style={{ background:tk.surf2, border:`1px solid ${tk.bdr}`, borderRadius:10, padding:11 }}><div style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{Rs(t)}</div><div style={{ fontSize:11, color:tk.tx3 }}>{c}</div></div>;
          })}
        </div>
      </Card>

      <Sheet open={catOpen} onClose={()=>setCatOpen(false)} title="Expense Categories" icon={ITag}
        footer={<><Btn onClick={()=>{if(newCat.trim()&&!expCats.includes(newCat)){setExpCats(p=>[...p,newCat]);setNewCat("")}}}><IPlus size={14}/>Add</Btn><Btn variant="secondary" onClick={()=>setCatOpen(false)}>Done</Btn></>}>
        <div style={{ marginBottom:14 }}>
          {expCats.map((c,i)=>(
            <div key={c} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${tk.bdr}` }}>
              <span style={{ fontSize:13 }}>{c}</span>
              {i>4 ? <Btn variant="ghost" small onClick={()=>setExpCats(p=>p.filter(x=>x!==c))}>Remove</Btn> : <span style={{ fontSize:10, color:tk.tx3 }}>Default</span>}
            </div>
          ))}
        </div>
        <Field label="New Category Name"><Input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="e.g. Legal Fees"/></Field>
      </Sheet>
    </div>
  );
}

/* ── TASKS ── */
function Tasks() {
  const { tk, tasks, setTasks, workers } = useApp();
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState("");
  const [pri, setPri] = useState("Medium");
  const [msg, setMsg] = useState(null);

  const filtered = filter==="All" ? tasks : tasks.filter(t=>t.status===filter);

  const addTask = async () => {
    if (!title.trim()) return setMsg({t:"err",s:"Task title required."});
    try {
      const workerObj = workers.find(w => w.name === assigned);
      const res = await API.addTask({ title, assigned_to: workerObj?.id||null, due_date:due||null, priority:pri });
      setTasks(prev => [{ ...res, assigned, pri, status:"Pending" }, ...prev]);
      setMsg({t:"ok",s:"Task added."});
      setTitle(""); setAssigned(""); setDue("");
      setTimeout(()=>setMsg(null),1500);
    } catch(e) { setMsg({t:"err",s:e.message}); }
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Task Tracker</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Site work orders and assignments</div>
      </div>
      <Card delay={.05}>
        <CardTitle icon={IPlus}>New Task</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <FormGrid>
          <Field label="Task Title"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Describe the task"/></Field>
          <Field label="Assigned To">
            <Select value={assigned} onChange={e=>setAssigned(e.target.value)}>
              <option value="">— Unassigned —</option>
              {workers.map(w=><option key={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Due Date"><Input type="date" value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Priority"><Select value={pri} onChange={e=>setPri(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></Select></Field>
        </FormGrid>
        <Btn onClick={addTask}><IPlus size={14}/>Add Task</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={ICheckSq} action={
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {["All","Pending","In Progress","Completed"].map(f=>(
              <Btn key={f} variant={filter===f?"primary":"secondary"} small onClick={()=>setFilter(f)}>{f}</Btn>
            ))}
          </div>
        }>Tasks</CardTitle>
        {filtered.length===0 ? <Empty icon={ICheckSq} text="No tasks found."/> : (
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
              <thead><tr>{["Task","Assigned","Priority","Status",""].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontWeight:600 }}>{t.title}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, color:tk.tx2 }}>{t.assigned||"—"}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={t.pri==="High"?"red":t.pri==="Medium"?"amber":"gray"}>{t.pri}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={t.status==="Completed"?"green":t.status==="In Progress"?"blue":"gray"}>{t.status}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>
                      <div style={{ display:"flex", gap:4 }}>
                        {t.status!=="Completed" && <Btn variant="secondary" small onClick={async()=>{ try{ await API.updateTask(t.id,{status:"Completed"}); setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:"Completed"}:x)); }catch(e){alert(e.message);} }}>Done</Btn>}
                        {t.status==="Pending" && <Btn variant="ghost" small onClick={async()=>{ try{ await API.updateTask(t.id,{status:"In Progress"}); setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:"In Progress"}:x)); }catch(e){alert(e.message);} }}>Start</Btn>}
                        <Btn variant="ghost" small onClick={async()=>{ try{ await API.deleteTask(t.id); setTasks(prev=>prev.filter(x=>x.id!==t.id)); }catch(e){alert(e.message);} }} style={{ padding:"5px 8px" }}><ITrash size={12}/></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

/* ── INVOICES ── */
function Invoices() {
  const { tk, inv, setInv, vendors } = useApp();
  const [vId, setVId] = useState(null);
  useEffect(()=>{ if(vendors.length && !vId) setVId(vendors[0].id); },[vendors]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [msg, setMsg] = useState(null);

  const unpaid = inv.filter(i=>i.status==="Unpaid").reduce((s,i)=>s+i.amount,0);

  const submit = async () => {
    const v = vendors.find(x=>x.id===vId);
    if (!amount || !desc) return setMsg({t:"err",s:"Amount and description required."});
    try {
      await API.addInvoice({ vendor_id: vId, description:desc, amount:parseFloat(amount), due_date:due||null, status });
      setInv(prev=>[{ id:Date.now(), vendor:v?.name||"", desc, amount:parseFloat(amount), due, status }, ...prev]);
      setMsg({t:"ok",s:"Invoice added."}); setAmount(""); setDesc(""); setDue("");
      setTimeout(()=>setMsg(null),2000);
    } catch(e) { setMsg({t:"err",s:e.message}); }
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Invoices & Payables</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Supplier invoices and outstanding payments</div>
      </div>
      {unpaid>0 && <Alert type="warn"><IClock size={14}/><span>Outstanding: <strong>{Rs(unpaid)}</strong> across {inv.filter(i=>i.status==="Unpaid").length} invoices</span></Alert>}
      <Card delay={.05}>
        <CardTitle icon={IFilePlus}>Add Invoice</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <FormGrid>
          <Field label="Vendor"><Select value={vId} onChange={e=>setVId(parseInt(e.target.value))}>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
          <Field label="Amount (₹)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
        </FormGrid>
        <Field label="Description"><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Work or supply covered"/></Field>
        <FormGrid>
          <Field label="Due Date"><Input type="date" value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Status"><Select value={status} onChange={e=>setStatus(e.target.value)}><option>Unpaid</option><option>Paid</option><option>Partially Paid</option></Select></Field>
        </FormGrid>
        <Btn onClick={submit}><ISave size={14}/>Add Invoice</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={IFileText}>Invoice Register</CardTitle>
        {inv.length===0 ? <Empty icon={IFileText} text="No invoices yet."/> : (
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
              <thead><tr>{["Vendor","Description","Amount","Status",""].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>{inv.map(i=>(
                <tr key={i.id}>
                  <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontWeight:600 }}>{i.vendor}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, color:tk.tx2 }}>{i.desc}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(i.amount)}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={i.status==="Paid"?"green":i.status==="Unpaid"?"red":"amber"}>{i.status}</Badge></td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>
                    {i.status!=="Paid" && <Btn variant="secondary" small onClick={async()=>{ try{ await API.updateInvoice(i.id,{status:"Paid"}); setInv(prev=>prev.map(x=>x.id===i.id?{...x,status:"Paid"}:x)); }catch(e){alert(e.message);} }}>Mark Paid</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

/* ── VENDORS ── */
function Vendors() {
  const { tk, vendors, setVendors } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [nv, setNv] = useState({ name:"", cat:"Materials", ph:"", bal:"" });

  const add = async () => {
    if (!nv.name.trim()) return;
    try {
      const res = await API.addVendor({ name:nv.name, category:nv.cat, phone:nv.ph, balance:parseFloat(nv.bal)||0 });
      setVendors(prev=>[...prev,{ ...res, cat:res.category||nv.cat, ph:res.phone||nv.ph, bal:res.balance||0 }]);
      setAddOpen(false); setNv({ name:"", cat:"Materials", ph:"", bal:"" });
    } catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Vendors</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Suppliers and outstanding balances</div></div>
        <Btn variant="secondary" small onClick={()=>setAddOpen(true)}><IPlus size={13}/>Add Vendor</Btn>
      </div>
      <Card delay={.05}>
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:360 }}>
            <thead><tr>{["Vendor","Category","Outstanding",""].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
            <tbody>{vendors.map(v=>(
              <tr key={v.id}>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><div style={{ fontWeight:600 }}>{v.name}</div><div style={{ fontSize:11, color:tk.tx3 }}>{v.ph}</div></td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge>{v.cat}</Badge></td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700, color:v.bal>0?tk.red:tk.grn }}>{v.bal>0?Rs(v.bal):"Nil"}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Btn variant="ghost" small onClick={async()=>{ try{ await API.deleteVendor(v.id); setVendors(prev=>prev.filter(x=>x.id!==v.id)); }catch(e){alert(e.message);} }} style={{ padding:"4px 8px" }}><ITrash size={12}/></Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </TableWrap>
      </Card>
      <Sheet open={addOpen} onClose={()=>setAddOpen(false)} title="Add Vendor" icon={IBuilding}
        footer={<><Btn onClick={add}><ISave size={14}/>Add Vendor</Btn><Btn variant="secondary" onClick={()=>setAddOpen(false)}>Cancel</Btn></>}>
        <Field label="Vendor Name"><Input value={nv.name} onChange={e=>setNv(p=>({...p,name:e.target.value}))} placeholder="Company or person" autoComplete="off"/></Field>
        <FormGrid>
          <Field label="Category"><Select value={nv.cat} onChange={e=>setNv(p=>({...p,cat:e.target.value}))}>{["Materials","Equipment","Transport","Subcontractor","Other"].map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Phone"><Input type="tel" value={nv.ph} onChange={e=>setNv(p=>({...p,ph:e.target.value}))} placeholder="Number"/></Field>
        </FormGrid>
        <Field label="Opening Balance (₹)"><Input type="number" value={nv.bal} onChange={e=>setNv(p=>({...p,bal:e.target.value}))} placeholder="0"/></Field>
      </Sheet>
    </div>
  );
}

/* ── CHART COLOURS ── */
const CHART_COLORS = ["#1a56db","#0d7a4e","#b45309","#c0392b","#8e44ad","#16a085","#e67e22","#2980b9"];

/* ── REPORTS ── */
function Reports() {
  const { tk, att, exp, mats, matLogs, roles, expCats } = useApp();
  const tL = att.reduce((s,a)=>s+a.total,0), tE = exp.reduce((s,e)=>s+e.amount,0);

  // Expense pie data
  const expPieData = expCats.map(cat=>({
    name:cat, value:exp.filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0)
  })).filter(x=>x.value>0);

  // Labour by role bar data
  const labourBarData = roles.map(role=>({
    role, wages: att.filter(a=>a.role===role).reduce((s,a)=>s+a.total,0),
    days: att.filter(a=>a.role===role).length
  })).filter(x=>x.wages>0);

  // Stock bar data
  const stockData = mats.map(m=>({ name:m.name, stock:m.stock, min:m.min }));

  // Daily spend trend (last 7 days)
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      labour: att.filter(a=>a.date===ds).reduce((s,a)=>s+a.total,0),
      expenses: exp.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0),
    };
  }).reverse();

  const CustomTooltip = ({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{background:tk.surf,border:`1px solid ${tk.bdr}`,borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:tk.shLg}}>
      <div style={{fontWeight:700,marginBottom:4,color:tk.tx}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color}}>₹{Number(p.value).toLocaleString("en-IN")}</div>)}
    </div>;
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Reports</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Financial and operational summaries</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <StatCard icon={IRupee} value={Rs(tL+tE)} label="Total Spend" color="acc" delay={.04}/>
        <StatCard icon={IUsers} value={att.length} label="Attendance Records" color="grn" delay={.08}/>
        <StatCard icon={IPackage} value={matLogs.length} label="Mat. Transactions" color="amb" delay={.12}/>
        <StatCard icon={IReceipt} value={exp.length} label="Expense Entries" color="red" delay={.16}/>
      </div>

      {/* Daily Spend Trend */}
      <Card delay={.1}>
        <CardTitle icon={ITrending}>7-Day Spend Trend</CardTitle>
        {last7.some(d=>d.labour>0||d.expenses>0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:11,fill:tk.tx3}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:tk.tx3}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Bar dataKey="labour" name="Labour" fill={tk.grn} radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill={tk.acc} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty icon={ITrending} text="No spend data yet. Start logging expenses and attendance."/>}
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
        {/* Expense Pie */}
        <Card delay={.14}>
          <CardTitle icon={IPieChart}>Expenses by Category</CardTitle>
          {expPieData.length>0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {expPieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>[Rs(v),"Amount"]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px",justifyContent:"center",marginTop:8}}>
                {expPieData.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>
                    <span style={{color:tk.tx2}}>{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty icon={IReceipt} text="No expense data yet."/>}
        </Card>

        {/* Labour by Role */}
        <Card delay={.18}>
          <CardTitle icon={IUsers}>Labour Cost by Role</CardTitle>
          {labourBarData.length>0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={labourBarData} layout="vertical" margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <YAxis type="category" dataKey="role" tick={{fontSize:11,fill:tk.tx2}} axisLine={false} tickLine={false} width={70}/>
                <Tooltip formatter={(v)=>[Rs(v),"Total Wages"]}/>
                <Bar dataKey="wages" fill={tk.grn} radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty icon={IUsers} text="No labour data yet."/>}
        </Card>
      </div>

      {/* Stock Levels Bar */}
      <Card delay={.22}>
        <CardTitle icon={IPackage}>Stock Levels vs Minimum</CardTitle>
        {stockData.length>0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockData} margin={{top:4,right:4,left:0,bottom:40}}>
              <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} vertical={false}/>
              <XAxis dataKey="name" tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
              <YAxis tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Legend wrapperStyle={{fontSize:11,paddingTop:36}}/>
              <Bar dataKey="stock" name="Current Stock" fill={tk.acc} radius={[4,4,0,0]}/>
              <Bar dataKey="min" name="Min Required" fill={tk.red} radius={[4,4,0,0]} opacity={0.6}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty icon={IPackage} text="No stock data yet."/>}
      </Card>

      {/* Stock Valuation Table */}
      <Card delay={.26}>
        <CardTitle icon={IPackage}>Stock Valuation</CardTitle>
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
            <thead><tr>{["Material","Stock","Unit","Unit Cost","Value","Status"].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom:`1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
            <tbody>{mats.map(m=>(
              <tr key={m.id}>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontWeight:600 }}>{m.name}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace" }}>{Nf(m.stock)}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}>{m.unit}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace" }}>{Rs(m.cost)}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(m.stock*m.cost)}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom:`1px solid ${tk.bdr}` }}><Badge color={m.stock<=m.min?"red":m.stock<=m.min*1.5?"amber":"green"}>{m.stock<=m.min?"Low":m.stock<=m.min*1.5?"Caution":"Good"}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ── AI ── */
function AI() {
  const { tk, att, exp, mats, tasks, inv, workers, expCats } = useApp();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const ta = att.filter(a=>a.date===today());
  const te = exp.filter(e=>e.date===today());
  const low = mats.filter(m=>m.stock<=m.min);
  const tL = att.reduce((s,a)=>s+a.total,0), tE = exp.reduce((s,e)=>s+e.amount,0);

  // Build rich context for AI
  const buildContext = () => {
    const expByCat = expCats.map(c=>({cat:c, total:exp.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)})).filter(x=>x.total>0);
    const labourByRole = ["Mason","Carpenter","Electrician","Plumber","Helper","Supervisor","Driver","Other"].map(r=>({role:r, total:att.filter(a=>a.role===r).reduce((s,a)=>s+a.total,0), days:att.filter(a=>a.role===r).length})).filter(x=>x.days>0);
    const absentToday = workers.filter(w=>!att.find(a=>a.workerId===w.id&&a.date===today()));
    const overtimeWorkers = att.filter(a=>a.ot>0);
    const last7days = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().split("T")[0];return{date:ds,spend:att.filter(a=>a.date===ds).reduce((s,a)=>s+a.total,0)+exp.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0)};}).reverse();
    const avgDailySpend = last7days.reduce((s,d)=>s+d.spend,0)/7;
    const todaySpend = (ta.reduce((s,a)=>s+a.total,0)+te.reduce((s,e)=>s+e.amount,0));
    return `
PROJECT: Palakkad Residential Complex — Phase 1
DATE: ${today()}

TODAY:
- Workers present: ${ta.length}/${workers.length} (${absentToday.length} absent)
- Labour cost today: ₹${ta.reduce((s,a)=>s+a.total,0).toLocaleString("en-IN")}
- Other expenses today: ₹${te.reduce((s,e)=>s+e.amount,0).toLocaleString("en-IN")}
- Total spend today: ₹${todaySpend.toLocaleString("en-IN")}
- 7-day average daily spend: ₹${Math.round(avgDailySpend).toLocaleString("en-IN")}
- Today vs average: ${todaySpend > avgDailySpend ? "+" : ""}${Math.round(((todaySpend-avgDailySpend)/Math.max(avgDailySpend,1))*100)}%

OVERALL PROJECT:
- Total labour cost: ₹${tL.toLocaleString("en-IN")}
- Total expenses: ₹${tE.toLocaleString("en-IN")}
- Grand total: ₹${(tL+tE).toLocaleString("en-IN")}

LABOUR BY ROLE: ${labourByRole.map(r=>`${r.role}: ₹${r.total.toLocaleString("en-IN")} (${r.days} days)`).join(", ")||"No data"}
OVERTIME WORKERS TODAY: ${overtimeWorkers.filter(a=>a.date===today()).map(a=>`${a.name} (${a.ot}h OT)`).join(", ")||"None"}

EXPENSES BY CATEGORY: ${expByCat.map(x=>`${x.cat}: ₹${x.total.toLocaleString("en-IN")}`).join(", ")||"No data"}

STOCK ALERTS: ${low.length>0?low.map(m=>`${m.name} (${m.stock} ${m.unit} left, min: ${m.min})`).join(", "):"All stock levels OK"}

TASKS: ${tasks.filter(t=>t.status!=="Completed").length} pending, ${tasks.filter(t=>t.status==="Completed").length} completed, ${tasks.filter(t=>t.status==="In Progress").length} in progress
INVOICES: ${inv.filter(i=>i.status==="Unpaid").length} unpaid (₹${inv.filter(i=>i.status==="Unpaid").reduce((s,i)=>s+i.amount,0).toLocaleString("en-IN")} outstanding)

LAST 7 DAYS SPEND: ${last7days.map(d=>`${d.date}: ₹${d.spend.toLocaleString("en-IN")}`).join(", ")}
    `.trim();
  };

  const runAnalysis = async () => {
    setLoading(true); setResults(null);
    const ctx = buildContext();
    const prompt = `You are SiteLedger AI, a senior quantity surveyor for a construction project.

SITE DATA:
${ctx}

Return a JSON array with exactly 5 objects. Each object has "title" and "content" keys.
Titles must be exactly: "FINANCIAL HEALTH", "IMMEDIATE ALERTS", "LABOUR INSIGHTS", "STOCK & MATERIALS", "RECOMMENDATION"

Rules:
- Use real numbers from the data above
- IMMEDIATE ALERTS: each alert on new line starting with "- ". If nothing urgent: "No critical alerts."
- RECOMMENDATION: one specific actionable sentence for tomorrow
- Max 80 words per section, plain text only, no markdown
- Return ONLY the raw JSON array, nothing else before or after it`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            contents:[{ parts:[{ text: prompt }] }],
            generationConfig:{ temperature:0.3, maxOutputTokens:2048, responseMimeType:"application/json" }
          }) }
      );
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("No response received.");
      text = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      try {
        setResults(JSON.parse(text));
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          try { setResults(JSON.parse(match[0])); }
          catch { setResults([{ title:"ANALYSIS", content: text.replace(/[\[\]{}*#]/g,"").trim() }]); }
        } else {
          setResults([{ title:"ANALYSIS", content: text }]);
        }
      }
    } catch(e) {
      setResults([{ title:"ERROR", content: e.message || "AI unavailable. Check your API key and internet connection." }]);
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if(!question.trim()) return;
    const q = question; setQuestion(""); setChatLoading(true);
    setChatHistory(prev=>[...prev, { role:"user", text: q }]);
    const ctx = buildContext();
    const prompt = `You are SiteLedger AI, a construction site assistant. Answer this question using the site data below.

SITE DATA:
${ctx}

QUESTION: ${q}

Give a direct, specific answer using the actual numbers from the data. Keep it under 100 words.`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_KEY}`,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ temperature:0.3, maxOutputTokens:300 } }) }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      setChatHistory(prev=>[...prev, { role:"ai", text }]);
    } catch { setChatHistory(prev=>[...prev, { role:"ai", text:"Could not connect to AI." }]); }
    setChatLoading(false);
  };

  const sectionIcons = { "FINANCIAL HEALTH":"💰", "IMMEDIATE ALERTS":"🚨", "LABOUR INSIGHTS":"👷", "STOCK & MATERIALS":"📦", "RECOMMENDATION":"✅", "ANALYSIS":"🤖", "ERROR":"❌" };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>AI Analysis</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Powered by Google Gemini — Free</div>
      </div>

      {/* Snapshot */}
      <Card delay={.05}>
        <CardTitle icon={IDatabase}>Live Data Snapshot</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:9 }}>
          {[
            {l:"Workers today",  v:ta.length,   c:tk.acc},
            {l:"Labour today",   v:Rs(ta.reduce((s,a)=>s+a.total,0)), c:tk.grn},
            {l:"Expenses today", v:Rs(te.reduce((s,e)=>s+e.amount,0)), c:tk.amb},
            {l:"Total spend",    v:Rs(tL+tE),   c:tk.tx},
            {l:"Low stock",      v:low.length,  c:low.length>0?tk.red:tk.grn},
            {l:"Unpaid invoices",v:inv.filter(i=>i.status==="Unpaid").length, c:inv.filter(i=>i.status==="Unpaid").length>0?tk.red:tk.grn},
          ].map(x=>(
            <div key={x.l} style={{ background:tk.surf2, border:`1px solid ${tk.bdr}`, borderRadius:10, padding:11 }}>
              <div style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", color:x.c, marginBottom:2 }}>{x.v}</div>
              <div style={{ fontSize:11, color:tk.tx3 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Generate Button */}
      <Btn fullWidth onClick={runAnalysis} disabled={loading} style={{ marginBottom:14 }}>
        {loading
          ? <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spinnerRing 1s linear infinite", display:"inline-block" }}/> Analysing your site data...</>
          : <><ICpu size={14}/>Generate Full AI Analysis</>}
      </Btn>

      {/* Analysis Results */}
      {results && results.map((s,i)=>(
        <div key={i} style={{ background:tk.accL, border:`1px solid ${tk.acc}33`, borderRadius:14, padding:18, marginBottom:12, animation:`fadeUp .3s ease ${i*.08}s both` }}>
          <div style={{ fontSize:12, fontWeight:700, color:tk.acc, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <span>{sectionIcons[s.title]||"📊"}</span>
            <span style={{ textTransform:"uppercase", letterSpacing:".08em" }}>{s.title}</span>
          </div>
          <div style={{ fontSize:13, lineHeight:1.8, color:tk.tx, whiteSpace:"pre-wrap" }}>
            {s.content.replace(/\*\*(.*?)\*\*/g,"$1")}
          </div>
        </div>
      ))}

      {/* Chat Interface */}
      <Card delay={.1} style={{ marginTop:8 }}>
        <CardTitle icon={ICpu}>Ask Anything About Your Site</CardTitle>
        <div style={{ fontSize:12, color:tk.tx2, marginBottom:14 }}>
          Ask questions like "Which worker is most productive?", "When will cement run out?", "What should I buy this week?"
        </div>

        {/* Suggested questions */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
          {["Which worker has most attendance?","When will cement run out?","What should I order this week?","Am I overspending on labour?","Which tasks are overdue?"].map(q=>(
            <button key={q} onClick={()=>setQuestion(q)} style={{ background:tk.surf2, border:`1px solid ${tk.bdr}`, borderRadius:20, padding:"5px 12px", fontSize:11, cursor:"pointer", color:tk.tx2, fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}>{q}</button>
          ))}
        </div>

        {/* Chat history */}
        {chatHistory.length>0 && (
          <div style={{ marginBottom:14, maxHeight:300, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
            {chatHistory.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius: m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background: m.role==="user"?tk.acc:tk.surf2, color: m.role==="user"?"#fff":tk.tx, fontSize:13, lineHeight:1.6 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:"flex", justifyContent:"flex-start" }}>
                <div style={{ padding:"10px 14px", borderRadius:"14px 14px 14px 4px", background:tk.surf2, display:"flex", gap:4, alignItems:"center" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:tk.acc, display:"inline-block", animation:"pulse 1.2s infinite" }}/>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:tk.acc, display:"inline-block", animation:"pulse 1.2s .2s infinite" }}/>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:tk.acc, display:"inline-block", animation:"pulse 1.2s .4s infinite" }}/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ display:"flex", gap:8 }}>
          <input
            value={question}
            onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&askQuestion()}
            placeholder="Ask a question about your site..."
            style={{ flex:1, border:`1.5px solid ${tk.bdr}`, borderRadius:10, padding:"10px 12px", fontSize:13, color:tk.tx, background:tk.surf2, outline:"none", fontFamily:"'DM Sans',sans-serif" }}
          />
          <Btn onClick={askQuestion} disabled={chatLoading||!question.trim()}>Ask</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ── WORKFLOW ── */
function Workflow() {
  const { tk, tasks, setTasks } = useApp();
  const [log, setLog] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [safety, setSafety] = useState("All Clear");
  const [saved, setSaved] = useState(false);

  // Load today's existing log from backend on mount
  useEffect(() => {
    API.getDailyLogs()
      .then(logs => {
        const todayLog = logs.find(l => l.date === today());
        if (todayLog) {
          setLog(todayLog.notes || "");
          setWeather(todayLog.weather || "Clear");
          setSafety(todayLog.safety || "All Clear");
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      await API.saveDailyLog({ date: today(), notes: log, weather, safety });
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e) { console.error(e.message); setSaved(true); setTimeout(()=>setSaved(false),2500); }
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Daily Workflow</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Site progress for {today()}</div>
      </div>
      {saved && <Alert type="ok"><ICheckCirc size={14}/>Log saved successfully.</Alert>}
      <Card delay={.05}>
        <CardTitle icon={IEdit}>Progress Notes</CardTitle>
        <Field label="Observations / Summary">
          <Textarea value={log} onChange={e=>setLog(e.target.value)} placeholder="Work completed, issues encountered, equipment status..."/>
        </Field>
        <FormGrid>
          <Field label="Weather"><Select value={weather} onChange={e=>setWeather(e.target.value)}>{["Clear","Partly Cloudy","Overcast","Light Rain","Heavy Rain"].map(w=><option key={w}>{w}</option>)}</Select></Field>
          <Field label="Safety Status"><Select value={safety} onChange={e=>setSafety(e.target.value)}>{["All Clear","Minor Concerns","Work Stopped"].map(s=><option key={s}>{s}</option>)}</Select></Field>
        </FormGrid>
        <Btn onClick={save}><ISave size={14}/>Save Log</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={ICheckSq}>Task Checklist</CardTitle>
        {tasks.map(t=>(
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${tk.bdr}` }}>
            <input type="checkbox" checked={t.status==="Completed"} onChange={async e=>{
              const newStatus = e.target.checked ? "Completed" : "Pending";
              try { await API.updateTask(t.id, { status: newStatus }); } catch {}
              setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:newStatus}:x));
            }} style={{ width:17, height:17, accentColor:tk.acc, cursor:"pointer", flexShrink:0 }}/>
            <label style={{ fontSize:13, flex:1, cursor:"pointer", textDecoration:t.status==="Completed"?"line-through":"none", color:t.status==="Completed"?tk.tx3:tk.tx }}>{t.title}</label>
            <Badge color={t.pri==="High"?"red":t.pri==="Medium"?"amber":"gray"} style={{ flexShrink:0 }}>{t.pri}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ── SETTINGS ── */
function Settings() {
  const { tk, theme, setTheme, user, setUser, att, exp, mats, matLogs, workers, inv, expCats } = useApp();
  const isDark = theme === "dark";

  const exportXL = (type) => {
    const wb = XLSX.utils.book_new();
    const sh = (name, hdrs, rows) => {
      const ws = XLSX.utils.aoa_to_sheet([hdrs,...rows]);
      ws["!cols"] = hdrs.map(h=>({wch:Math.max(String(h).length+4,14)}));
      XLSX.utils.book_append_sheet(wb,ws,name);
    };
    if(type==="all"||type==="materials"){ sh("Stock",["Material","Unit","Stock","Min","Unit Cost","Value"],mats.map(m=>[m.name,m.unit,m.stock,m.min,m.cost,m.stock*m.cost])); sh("Mat.Transactions",["Date","Material","Type","Qty","Unit","Note","By"],matLogs.map(l=>[l.date,l.material,l.type==="in"?"Received":"Issued",l.qty,l.unit,l.note||"",l.by])); }
    if(type==="all"||type==="attendance"){ sh("Attendance",["Date","Name","Role","Status","Hours","OT","Total","By"],att.map(a=>[a.date,a.name,a.role,a.present==="1"?"Present":a.present==="half"?"Half":"Absent",a.hours,a.ot||0,a.total,a.by])); sh("Workers",["Name","Role","Phone","Days","Total Wages"],workers.map(w=>{const r=att.filter(a=>a.workerId===w.id);return[w.name,w.role,w.phone,r.length,r.reduce((s,a)=>s+a.total,0)]})); }
    if(type==="all"||type==="expenses"){ sh("Expenses",["Date","Category","Description","Vendor","Payment","Amount","By"],exp.map(e=>[e.date,e.category,e.desc,e.vendor||"",e.paymentMode||"",e.amount,e.by])); }
    if(type==="all"||type==="invoices"){ sh("Invoices",["Vendor","Description","Amount","Due","Status"],inv.map(i=>[i.vendor,i.desc,i.amount,i.due||"",i.status])); }
    if(type==="all"){ sh("Summary",["Item","Value"],[["Project","Palakkad Residential Complex"],["Date",today()],["Total Labour",att.reduce((s,a)=>s+a.total,0)],["Total Expenses",exp.reduce((s,e)=>s+e.amount,0)],["Grand Total",att.reduce((s,a)=>s+a.total,0)+exp.reduce((s,e)=>s+e.amount,0)],["Workers",workers.length],["Low Stock",mats.filter(m=>m.stock<=m.min).length]]); }
    XLSX.writeFile(wb, `SiteLedger_${type==="all"?"FullReport":type}_${today()}.xlsx`);
  };

  const SettingRow = ({ icon:Icon, iconBg, iconColor, label, sub, right }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:`1px solid ${tk.bdr}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={17} color={iconColor} />
        </div>
        <div><div style={{ fontSize:14, fontWeight:600 }}>{label}</div><div style={{ fontSize:12, color:tk.tx3, marginTop:1 }}>{sub}</div></div>
      </div>
      {right}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Settings</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>App preferences and account</div>
      </div>

      <Card delay={.05}>
        <CardTitle icon={ISettings}>Appearance</CardTitle>
        <SettingRow icon={isDark?IMoon:ISun} iconBg={tk.accL} iconColor={tk.acc} label="Dark Mode" sub="Switch between light and dark theme"
          right={<Toggle value={isDark} onChange={v=>setTheme(v?"dark":"light")}/>}/>
      </Card>

      <Card delay={.1}>
        <CardTitle icon={IDownload}>Export Data</CardTitle>
        {[
          {k:"all",        ic:IFileSpread, l:"Full Report",        sub:"All sheets in one Excel file"},
          {k:"materials",  ic:IPackage,     l:"Materials Log",      sub:"Stock levels and transactions"},
          {k:"attendance", ic:IUsers,       l:"Attendance Register",sub:"Labour records and wages"},
          {k:"expenses",   ic:IReceipt,     l:"Expense Ledger",     sub:"All categorised expenses"},
          {k:"invoices",   ic:IFileText,   l:"Invoices",           sub:"Payables and status"},
        ].map(x=>(
          <SettingRow key={x.k} icon={x.ic} iconBg={tk.accL} iconColor={tk.acc} label={x.l} sub={x.sub}
            right={<Btn variant="secondary" small onClick={()=>exportXL(x.k)}><IDownload size={13}/>Export</Btn>}/>
        ))}
      </Card>

      <Card delay={.15}>
        <CardTitle icon={IUsers}>Account</CardTitle>
        <SettingRow
          icon={()=><span style={{ fontSize:14, fontWeight:700 }}>{user.ini}</span>}
          iconBg={tk.acc} iconColor="#fff"
          label={user.name} sub={`${user.role} · @${user.username}`}
          right={null}
        />
        <SettingRow icon={ILogOut} iconBg={tk.redL} iconColor={tk.red} label="Sign Out" sub="Return to login screen"
          right={<Btn variant="danger" small onClick={()=>setUser()}><ILogOut size={13}/>Sign Out</Btn>}/>
      </Card>

      <Card delay={.2} style={{ textAlign:"center", padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>SiteLedger v2.0 — React</div>
        <div style={{ fontSize:12, color:tk.tx3 }}>Construction Site Management & Accounting</div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════ */
function Login({ onLogin }) {
  const { tk } = useApp();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!u || !p) return setErr("Please enter username and password.");
    setLoading(true); setErr("");
    try {
      const res = await API.login(u, p);
      API.setToken(res.token);
      onLogin(res.user);
    } catch (e) {
      setErr(e.message || "Invalid username or password.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0f1623 0%,#1a2740 100%)", padding:16 }}>
      <div style={{ background:tk.surf, borderRadius:20, padding:"36px 28px", width:"100%", maxWidth:380, boxShadow:"0 24px 64px rgba(0,0,0,.35)", animation:"scaleIn .4s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
          <IHardHat size={26} color={tk.acc} />
          <span style={{ fontSize:21, fontWeight:700, letterSpacing:"-.3px" }}>Site<span style={{ color:tk.acc }}>Ledger</span></span>
        </div>
        <div style={{ fontSize:12, color:tk.tx3, marginBottom:24 }}>Construction Site Management & Accounting</div>
        <div style={{ fontSize:19, fontWeight:700, marginBottom:3 }}>Sign in</div>
        <div style={{ fontSize:13, color:tk.tx2, marginBottom:20 }}>Enter your credentials to continue</div>
        {err && <Alert type="err"><IXCircle size={14}/>{err}</Alert>}
        <Field label="Username"><Input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" autoComplete="username"/></Field>
        <div style={{ marginBottom:18 }}>
          <Field label="Password"><Input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password" autoComplete="current-password"/></Field>
        </div>
        <Btn fullWidth onClick={submit} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Btn>
        <div style={{ marginTop:16, padding:"10px 12px", background:tk.surf2, borderRadius:10, border:`1px solid ${tk.bdr}`, fontSize:12, color:tk.tx3, textAlign:"center" }}>
          Default login: <strong style={{color:tk.tx}}>admin</strong> / <strong style={{color:tk.tx}}>admin123</strong>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════ */
export default function App() {
  const [theme, _setTheme] = useState(() => localStorage.getItem("sl_theme") || "light");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(true); // check token on boot

  // Data state — starts empty, loaded from API after login
  const [mats, setMats] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [matLogs, setMatLogs] = useState([]);
  const [att, setAtt] = useState([]);
  const [exp, setExp] = useState([]);
  const [inv, setInv] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expCats, setExpCats] = useState([]);
  const roles = DEF_ROLES;

  const setTheme = useCallback(t => { _setTheme(t); localStorage.setItem("sl_theme", t); }, []);
  const tk = theme === "dark" ? DARK : LIGHT;

  // ── Check for saved token on app boot ──────────────────
  useEffect(() => {
    const token = API.getToken();
    if (!token) { setAppLoading(false); return; }
    API.getMe()
      .then(res => { setUser(res.user); })
      .catch(() => { API.clearToken(); })
      .finally(() => setAppLoading(false));
  }, []);

  // ── Load all data once user is set ─────────────────────
  useEffect(() => {
    if (!user) return;
    loadAllData();
  }, [user]);

  async function loadAllData() {
    try {
      const [m, w, ml, a, e, v, i, t, ec] = await Promise.all([
        API.getMaterials(),
        API.getWorkers(),
        API.getMatLogs({}),
        API.getAttendance({}),
        API.getExpenses({}),
        API.getVendors(),
        API.getInvoices(),
        API.getTasks({}),
        API.getExpCats(),
      ]);
      // Normalise field names from backend to frontend shape
      setMats(m.map(x => ({ ...x, min: x.min_stock, cost: x.unit_cost })));
      setWorkers(w.map(x => ({ ...x, rate: x.daily_rate })));
      setMatLogs(ml.map(x => ({ ...x, material: x.material_name, qty: x.quantity, by: x.logged_by_name })));
      setAtt(a.map(x => ({ ...x, name: x.worker_name, role: x.worker_role, total: x.total_wage, ot: x.ot_hours, by: x.logged_by_name })));
      setExp(e.map(x => ({ ...x, category: x.category_name, desc: x.description, vendor: x.vendor_name || "", by: x.logged_by_name })));
      setVendors(v.map(x => ({ ...x, cat: x.category, ph: x.phone, bal: x.balance })));
      setInv(i.map(x => ({ ...x, vendor: x.vendor_name })));
      setTasks(t.map(x => ({ ...x, assigned: x.assigned_name || "", pri: x.priority })));
      setExpCats(ec.map(x => x.name));
    } catch (err) {
      console.error("Failed to load data:", err.message);
    }
  }

  // ── Logout ─────────────────────────────────────────────
  function handleLogout() {
    API.clearToken();
    setUser(null);
    setMats([]); setWorkers([]); setMatLogs([]); setAtt([]);
    setExp([]); setVendors([]); setInv([]); setTasks([]); setExpCats([]);
  }

  // ── Close sidebar on nav ───────────────────────────────
  useEffect(() => { setSideOpen(false); }, [page]);

  const ctx = { tk, theme, setTheme, user, setUser: handleLogout, page, setPage,
    mats, setMats, workers, setWorkers, matLogs, setMatLogs,
    att, setAtt, exp, setExp, inv, setInv, vendors, setVendors,
    tasks, setTasks, expCats, setExpCats, roles, loadAllData };

  const PAGES = { dashboard:<Dashboard/>, workflow:<Workflow/>, materials:<Materials/>, attendance:<Attendance/>, tasks:<Tasks/>, expenses:<Expenses/>, invoices:<Invoices/>, vendors:<Vendors/>, reports:<Reports/>, ai:<AI/>, settings:<Settings/> };

  // Splash while checking token
  if (appLoading) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background: theme==="dark"?"#0d0f18":"#f0f2f5" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:8, color: theme==="dark"?"#e8eaf0":"#0f1623" }}>SiteLedger</div>
        <div style={{ width:32, height:32, border:"3px solid #e2e5eb", borderTopColor:"#1a56db", borderRadius:"50%", animation:"spinnerRing 1s linear infinite", margin:"0 auto" }}/>
      </div>
    </div>
  );

  if (!user) return (
    <AppCtx.Provider value={ctx}>
      <GlobalStyles tk={tk}/>
      <Login onLogin={u => { setUser(u); setPage("dashboard"); }}/>
    </AppCtx.Provider>
  );

  return (
    <AppCtx.Provider value={ctx}>
      <GlobalStyles tk={tk}/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"/>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"/>

      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:tk.bg, color:tk.tx, fontFamily:"'DM Sans',sans-serif" }}>
        <Topbar onMenuClick={() => setSideOpen(s => !s)}/>
        <Sidebar open={sideOpen} onClose={() => setSideOpen(false)}/>

        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {/* Desktop sidebar layout */}
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
            {/* Desktop permanent sidebar */}
            <div style={{ display:"none", width:240, background:tk.surf, borderRight:`1px solid ${tk.bdr}`, flexShrink:0, overflowY:"auto" }} className="desktop-sidebar">
              <style>{`@media(min-width:768px){.desktop-sidebar{display:block !important}}`}</style>
              <div style={{ padding:"10px 0" }}>
                {NAV_SECTIONS.map(sec => (
                  <div key={sec.section}>
                    <div style={{ fontSize:9, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".12em", padding:"10px 16px 4px" }}>{sec.section}</div>
                    {sec.items.map(item => (
                      <button key={item.id} onClick={() => setPage(item.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", margin:"0 8px", borderRadius:10, border:"none", background: page===item.id ? tk.accL : "transparent", color: page===item.id ? tk.acc : tk.tx2, fontWeight: page===item.id ? 600 : 500, fontSize:13, cursor:"pointer", width:"calc(100% - 16px)", textAlign:"left", transition:"all .15s", fontFamily:"'DM Sans',sans-serif" }}>
                        <item.Icon size={15} color={page===item.id ? tk.acc : tk.tx3}/>
                        {item.label}
                        {item.id==="materials" && mats.filter(m=>m.stock<=m.min).length>0 && <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, background:tk.red, color:"#fff", padding:"2px 6px", borderRadius:20 }}>{mats.filter(m=>m.stock<=m.min).length}</span>}
                        {item.id==="invoices" && inv.filter(i=>i.status==="Unpaid").length>0 && <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, background:tk.red, color:"#fff", padding:"2px 6px", borderRadius:20 }}>{inv.filter(i=>i.status==="Unpaid").length}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Page content */}
            <div key={page} style={{ flex:1, overflowY:"auto", padding:16, WebkitOverflowScrolling:"touch" }}>
              <style>{`@media(min-width:768px){.page-wrap{padding:24px 28px !important}}`}</style>
              <div className="page-wrap" style={{ maxWidth:1000, margin:"0 auto", paddingBottom:80 }}>
                {PAGES[page] || <Dashboard/>}
              </div>
            </div>
          </div>

          {/* Mobile bottom nav */}
          <div className="mobile-bnav" style={{ display:"flex" }}>
            <style>{`@media(min-width:768px){.mobile-bnav{display:none !important}}`}</style>
            <BottomNav/>
          </div>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
