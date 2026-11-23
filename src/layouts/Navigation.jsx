import React, { useEffect } from "react";
import { useApp } from "../context/AppCtx";
import { ILayoutDash, IClipboard, IPackage, IUsers, ICheckSq, IReceipt, IFileText, IBuilding, IPieChart, ISettings, IX, IMenu } from "../icons/Icons";

const IBalance = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l4.5 4.5L12 9"/><path d="M12 9l4.5 4.5L21 9"/>
    <line x1="3" y1="21" x2="21" y2="21"/><line x1="1.5" y1="9" x2="10.5" y2="9"/><line x1="13.5" y1="9" x2="22.5" y2="9"/>
  </svg>
);
const ICalendar = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IDatabase = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
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
    { id: "adminmaster",  label: "Master Control",      Icon: IDatabase,  adminOnly: true },
  ]},
];

// Finance roles: bottom nav includes the ledger
const BOTTOM_NAV_FINANCE = [
  { id: "dashboard",    Icon: ILayoutDash, label: "Home"     },
  { id: "attendance",   Icon: IUsers,      label: "Labour"   },
  { id: "calendar",     Icon: ICalendar,   label: "Calendar" },
  { id: "invoices",     Icon: IFileText,   label: "Bills"    },
  { id: "balancesheet", Icon: IBalance,    label: "Ledger"   },
];
// Site staff
const BOTTOM_NAV_ALL = [
  { id: "dashboard",    Icon: ILayoutDash, label: "Home"     },
  { id: "materials",    Icon: IPackage,    label: "Stock"    },
  { id: "attendance",   Icon: IUsers,      label: "Labour"   },
  { id: "calendar",     Icon: ICalendar,   label: "Calendar" },
  { id: "tasks",        Icon: ICheckSq,    label: "Tasks"    },
];

const BRAND_LOGO = "/logo_banner.png";

export function Sidebar({ open, onClose, desktop = false }) {
  const { tk, theme, page, setPage, mats, inv, hasFinance, user } = useApp();
  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pi  = inv.filter(i => i.status !== "Paid").length;
  const navigate = id => { setPage(id); if (!desktop) onClose(); };
  const dark = theme === "dark";

  // Escape closes the mobile drawer
  useEffect(() => {
    if (desktop || !open) return undefined;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktop, open, onClose]);

  const countPill = (n, bg, label) => (
    <span aria-label={label} style={{ marginLeft: "auto", minWidth: 22, textAlign: "center", fontSize: 11, fontWeight: 700, background: bg, color: "#fff", padding: "1px 7px", borderRadius: 20, fontVariantNumeric: "tabular-nums" }}>{n}</span>
  );

  const content = (
    <nav aria-label="Main" style={{ width: 264, height: "100%", background: tk.surf, borderRight: `1px solid ${tk.bdr}`, display: "flex", flexDirection: "column", flexShrink: 0, paddingTop: desktop ? 0 : "env(safe-area-inset-top, 0px)" }}>
      {/* Logo */}
      <div style={{ minHeight: 60, display: "flex", alignItems: "center", padding: "8px 10px 8px 18px", borderBottom: `1px solid ${tk.bdr}`, flexShrink: 0, gap: 9 }}>
        <img src={BRAND_LOGO} alt="Ciel Homes" style={{
          display: "block", height: 34, width: "auto", objectFit: "contain",
          background: dark ? "#fff" : "transparent",
          padding: dark ? "4px 8px" : 0,
          borderRadius: 8,
        }} />
        {!desktop && (
          <button type="button" onClick={onClose} aria-label="Close menu" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IX size={20} color={tk.tx2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 12px" }}>
        {NAV_SECTIONS.map(sec => {
          const items = sec.items.filter(item =>
            !(item.financeOnly && !hasFinance) && !(item.adminOnly && user?.role !== "Administrator"));
          if (!items.length) return null;
          return (
            <div key={sec.section}>
              <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", padding: "14px 20px 6px" }}>{sec.section}</div>
              {items.map(item => {
                const active = page === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    minHeight: 44, padding: "8px 12px", margin: "2px 10px", borderRadius: 10,
                    border: "none", background: active ? tk.accL : "transparent",
                    color: active ? tk.acc : tk.tx2, fontWeight: active ? 700 : 500,
                    fontSize: 14, cursor: "pointer", width: "calc(100% - 20px)",
                    textAlign: "left", transition: "background .15s, color .15s",
                    position: "relative",
                  }}>
                    {active && <span aria-hidden="true" style={{ position: "absolute", left: -10, top: 10, bottom: 10, width: 3, borderRadius: "0 3px 3px 0", background: tk.acc }} />}
                    <item.Icon size={18} color={active ? tk.acc : tk.tx3} />
                    <span>{item.label}</span>
                    {item.id === "materials" && lsc > 0 && countPill(lsc, "#B91C1C", `${lsc} items low on stock`)}
                    {item.id === "invoices" && pi > 0 && countPill(pi, "#B45309", `${pi} unpaid invoices`)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 18px", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${tk.bdr}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: tk.accL, color: tk.acc, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {user?.ini || "U"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: tk.tx3 }}>{user?.role}</div>
        </div>
      </div>
    </nav>
  );

  if (desktop) return content;
  return (
    <>
      {open && <div onClick={onClose} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(15,11,6,.5)", zIndex: 200, animation: "fadeUp .15s ease" }} />}
      <div
        aria-hidden={!open}
        inert={!open ? true : undefined}
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 264, maxWidth: "85vw", zIndex: 201, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s cubic-bezier(.2,.8,.2,1)", boxShadow: open ? tk.shLg : "none" }}
      >
        {content}
      </div>
    </>
  );
}

export function Topbar({ onMenuClick, title }) {
  const { tk, user, theme } = useApp();
  const dark = theme === "dark";
  return (
    <header style={{ background: tk.surf, paddingTop: "env(safe-area-inset-top, 0px)", flexShrink: 0, zIndex: 100, borderBottom: `1px solid ${tk.bdr}` }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 8px", gap: 6 }}>
        <button type="button" onClick={onMenuClick} aria-label="Open menu" style={{ background: "none", border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IMenu size={22} color={tk.tx} />
        </button>
        {/* Pages show their own big heading, so the bar shows the brand; the
            page name is still announced to screen readers. */}
        <img src={BRAND_LOGO} alt="" aria-hidden="true" style={{
          display: "block", height: 30, width: "auto", objectFit: "contain",
          background: dark ? "#fff" : "transparent", padding: dark ? "3px 7px" : 0, borderRadius: 7,
        }} />
        <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
          {title || "Ciel Homes"}
        </h1>
        <div role="img" aria-label={`Signed in as ${user?.name || "user"}`} style={{ marginLeft: "auto", marginRight: 6, width: 34, height: 34, borderRadius: "50%", background: tk.accL, color: tk.acc, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {user?.ini || "U"}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { tk, page, setPage, mats, hasFinance } = useApp();
  const lsc  = mats.filter(m => m.stock <= m.min).length;
  const BNAV = hasFinance ? BOTTOM_NAV_FINANCE : BOTTOM_NAV_ALL;

  return (
    <nav aria-label="Quick navigation" style={{ display: "flex", background: tk.surf, borderTop: `1px solid ${tk.bdr}`, width: "100%", boxShadow: "0 -4px 16px rgba(0,0,0,.05)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {BNAV.map(n => {
        const active = page === n.id;
        const color  = active ? tk.acc : tk.tx2;
        return (
          <button key={n.id} type="button" onClick={() => setPage(n.id)} aria-current={active ? "page" : undefined} style={{
            flex: 1, minWidth: 0, minHeight: 60, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "6px 2px",
            fontSize: 11, fontWeight: active ? 700 : 500,
            color, background: "none", border: "none", cursor: "pointer",
            position: "relative", transition: "color .15s",
          }}>
            <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 30, borderRadius: 15, background: active ? tk.accL : "transparent", transition: "background .15s", position: "relative" }}>
              <n.Icon size={20} color={color} />
              {n.id === "materials" && lsc > 0 && <span style={{ position: "absolute", top: 3, right: 12, width: 8, height: 8, borderRadius: "50%", background: tk.red, border: `2px solid ${tk.surf}` }} />}
            </span>
            <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
