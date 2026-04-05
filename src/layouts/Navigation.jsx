import React from "react";
import { useApp } from "../context/AppCtx";
import { ILayoutDash, IClipboard, IPackage, IUsers, ICheckSq, IReceipt, IFileText, IBuilding, IPieChart, ISettings, IX, IMenu } from "../icons/Icons";

const ORANGE   = "#c75a00";
const ORANGE_L = "#fff0e6";

const IHome = ({ size = 18, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IBalance = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l4.5 4.5L12 9"/><path d="M12 9l4.5 4.5L21 9"/>
    <line x1="3" y1="21" x2="21" y2="21"/><line x1="1.5" y1="9" x2="10.5" y2="9"/><line x1="13.5" y1="9" x2="22.5" y2="9"/>
  </svg>
);
const ICalendar = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const NAV_SECTIONS = [
  { section: "Overview", items: [
    { id: "dashboard",    label: "Dashboard",          Icon: ILayoutDash },
    { id: "workflow",     label: "Daily Workflow",      Icon: IClipboard  },
    { id: "calendar",     label: "Calendar Log",        Icon: ICalendar   },
  ]},
  { section: "Operations", items: [
    { id: "materials",    label: "Materials",           Icon: IPackage    },
    { id: "attendance",   label: "Labour & Attendance", Icon: IUsers      },
    { id: "tasks",        label: "Task Tracker",        Icon: ICheckSq    },
  ]},
  { section: "Finance", items: [
    { id: "expenses",     label: "Expenses",            Icon: IReceipt    },
    { id: "invoices",     label: "Invoices & Payables", Icon: IFileText   },
    { id: "vendors",      label: "Vendors",             Icon: IBuilding   },
    { id: "balancesheet", label: "Balance Sheet",       Icon: IBalance,   financeOnly: true },
  ]},
  { section: "Analytics", items: [
    { id: "reports",      label: "Reports",             Icon: IPieChart   },
  ]},
  { section: "Account", items: [
    { id: "settings",     label: "Settings",            Icon: ISettings   },
  ]},
];

// Finance role bottom nav (has Ledger)
const BOTTOM_NAV_FINANCE = [
  { id: "dashboard",    Icon: ILayoutDash, label: "Home"   },
  { id: "attendance",   Icon: IUsers,      label: "Labour" },
  { id: "calendar",     Icon: ICalendar,   label: "Cal"    },
  { id: "invoices",     Icon: IFileText,   label: "Bills"  },
  { id: "balancesheet", Icon: IBalance,    label: "Ledger", ledger: true },
];
// Non-finance (Site Engineer) bottom nav
const BOTTOM_NAV_ALL = [
  { id: "dashboard",    Icon: ILayoutDash, label: "Home"   },
  { id: "materials",    Icon: IPackage,    label: "Stock"  },
  { id: "attendance",   Icon: IUsers,      label: "Labour" },
  { id: "calendar",     Icon: ICalendar,   label: "Cal"    },
  { id: "tasks",        Icon: ICheckSq,    label: "Tasks"  },
];

export function Sidebar({ open, onClose, desktop = false }) {
  const { tk, page, setPage, mats, inv, hasFinance } = useApp();
  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pi  = inv.filter(i => i.status !== "Paid").length;
  const navigate = id => { setPage(id); if (!desktop) onClose(); };

  const content = (
    <div style={{ width: 260, height: "100%", background: tk.surf, borderRight: `1px solid ${tk.bdr}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 18px", borderBottom: `1px solid ${tk.bdr}`, flexShrink: 0, gap: 9 }}>
        <IHome size={20} color={tk.acc} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.3px", lineHeight: 1.1 }}>Ciel<span style={{ color: tk.acc }}> Homes</span></div>
          <div style={{ fontSize: 9, color: tk.tx3, fontWeight: 500, letterSpacing: ".05em" }}>SITE MANAGEMENT</div>
        </div>
        {!desktop && <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8 }}><IX size={18} color={tk.tx3} /></button>}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {NAV_SECTIONS.map(sec => (
          <div key={sec.section}>
            <div style={{ fontSize: 9, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".12em", padding: "12px 18px 4px" }}>{sec.section}</div>
            {sec.items.map(item => {
              if (item.financeOnly && !hasFinance) return null;
              const active   = page === item.id;
              const isLedger = item.financeOnly;
              const ac = isLedger ? ORANGE   : tk.acc;
              const bg = isLedger ? ORANGE_L : tk.accL;

              return (
                <button key={item.id} onClick={() => navigate(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", margin: "1px 8px", borderRadius: 10,
                  border: "none", background: active ? bg : "transparent",
                  color: active ? ac : tk.tx2, fontWeight: active ? 700 : 500,
                  fontSize: 13, cursor: "pointer", width: "calc(100% - 16px)",
                  textAlign: "left", transition: "background .15s, color .15s",
                }}>
                  <item.Icon size={15} color={active ? ac : isLedger ? "#a04800" : tk.tx3} />
                  <span style={isLedger && !active ? { color: "#a04800", fontWeight: 600 } : undefined}>{item.label}</span>
                  {item.id === "materials" && lsc > 0 && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, background: tk.red, color: "#fff", padding: "2px 6px", borderRadius: 20 }}>{lsc}</span>}
                  {item.id === "invoices" && pi > 0  && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, background: tk.amb, color: "#fff", padding: "2px 6px", borderRadius: 20 }}>{pi}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 18px 14px", borderTop: `1px solid ${tk.bdr}` }}>
        <div style={{ fontSize: 11, color: tk.tx3 }}>
          <span style={{ fontWeight: 600, color: tk.tx2 }}>Ciel Homes</span>
        </div>
        <div style={{ fontSize: 10, color: tk.tx3 }}>Software made by Sivadath Siju</div>
      </div>
    </div>
  );

  if (desktop) return content;
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 201, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .28s cubic-bezier(.4,0,.2,1)", boxShadow: open ? "4px 0 32px rgba(0,0,0,.18)" : "none" }}>
        {content}
      </div>
    </>
  );
}

export function Topbar({ onMenuClick }) {
  const { tk, user } = useApp();
  return (
    <div style={{ height: 54, background: tk.surf, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(0,0,0,.07), 0 2px 8px rgba(0,0,0,.04)" }}>
      <button onClick={onMenuClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8 }}><IMenu size={22} color={tk.tx} /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 800, letterSpacing: "-.3px" }}>
        <IHome size={18} color={tk.acc} />Ciel<span style={{ color: tk.acc }}> Homes</span>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: tk.acc, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {user?.ini || "U"}
        </div>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { tk, page, setPage, mats, hasFinance } = useApp();
  const lsc  = mats.filter(m => m.stock <= m.min).length;
  const BNAV = hasFinance ? BOTTOM_NAV_FINANCE : BOTTOM_NAV_ALL;

  return (
    <nav style={{ display: "flex", background: tk.surf, borderTop: `1px solid ${tk.bdr}`, width: "100%", boxShadow: "0 -2px 12px rgba(0,0,0,.06)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {BNAV.map(n => {
        const active    = page === n.id;
        const isLedger  = !!n.ledger;
        const ac        = isLedger ? ORANGE : tk.acc;
        const ic        = isLedger ? "#a04800" : tk.tx3;
        return (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "7px 2px 8px",
            fontSize: 9, fontWeight: active ? 700 : 600,
            color: active ? ac : ic, background: "none", border: "none", cursor: "pointer",
            position: "relative", fontFamily: "'DM Sans',sans-serif", transition: "color .15s",
          }}>
            {n.id === "materials" && lsc > 0 && <span style={{ position: "absolute", top: 5, right: "calc(50% - 16px)", width: 7, height: 7, borderRadius: "50%", background: tk.red, border: `2px solid ${tk.surf}` }} />}
            <n.Icon size={20} color={active ? ac : ic} />
            <span>{n.label}</span>
            {active && <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, background: ac, borderRadius: "0 0 4px 4px" }} />}
          </button>
        );
      })}
    </nav>
  );
}
