import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import { 
  ILayoutDash, IClipboard, IPackage, IUsers, ICheckSq, 
  IReceipt, IFileText, IBuilding, IPieChart, ICpu, 
  ISettings, IHardHat, IX, IPlus, IMenu, IMoon, ISun, IUserPlus, IUserCheck
} from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];

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

export function Sidebar({ open, onClose }) {
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
        background:tk.surf, borderRight: `1px solid ${tk.bdr}`,
        zIndex:201, display:"flex", flexDirection:"column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition:"transform .28s cubic-bezier(.4,0,.2,1)",
        boxShadow: open ? tk.shLg : "none",
      }}>
        <div style={{ height:56, display:"flex", alignItems:"center", padding:"0 16px", borderBottom: `1px solid ${tk.bdr}`, flexShrink:0, gap:10 }}>
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

export function Topbar({ onMenuClick }) {
  const { tk, user } = useApp();
  return (
    <div style={{
      height:56, background:tk.surf, borderBottom: "none",
      display:"flex", alignItems:"center", padding:"0 14px", gap:10,
      flexShrink:0, zIndex:100,
      boxShadow: `0 2px 8px rgba(0,0,0,.04)`,
    }}>
      <button onClick={onMenuClick} style={{ background:"none", border:"none", cursor:"pointer", color:tk.tx, padding:4, display:"flex", alignItems:"center" }}>
        <IMenu size={22} color={tk.tx} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:16, fontWeight:700, letterSpacing:"-.3px" }}>
        <IHardHat size={18} color={tk.acc} />
        <span>Site<span style={{ color:tk.acc }}>Ledger</span></span>
      </div>
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:tk.acc, color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {user?.ini || "U"}
        </div>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { tk, page, setPage, mats } = useApp();
  const lsc = mats.filter(m => m.stock <= m.min).length;
  return (
    <nav style={{ display:"flex", background:tk.surf, borderTop: "none", flexShrink:0, width:"100%", overflow:"hidden", boxShadow: `0 -2px 8px rgba(0,0,0,.04)` }}>
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
              <span style={{ position:"absolute", top:4, right:"calc(50% - 14px)", width:7, height:7, borderRadius:"50%", background:tk.red, border: `2px solid ${tk.surf}`, animation:"badgePop .3s" }} />
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
