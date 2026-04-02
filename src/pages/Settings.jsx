import React from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, Btn, Toggle } from "../components/Primitives";
import { ISettings, IMoon, ISun, IFileSpread, IDownload, IUsers, ILogOut } from "../icons/Icons";
import * as API from "../api";
import * as XLSX from "xlsx";

const today = () => new Date().toISOString().split("T")[0];

export default function Settings() {
  const { tk, theme, setTheme, user, setUser, att, exp, mats, workers, inv } = useApp();
  const isDark = theme === "dark";

  const exportXL = (type) => {
    const wb = XLSX.utils.book_new();
    const sh = (name, hdrs, rows) => {
      const ws = XLSX.utils.aoa_to_sheet([hdrs,...rows]);
      ws["!cols"] = hdrs.map(h=>({wch:Math.max(String(h).length+4,14)}));
      XLSX.utils.book_append_sheet(wb,ws,name);
    };
    if(type==="all"||type==="materials"){ sh("Stock",["Material","Unit","Stock","Min"],mats.map(m=>[m.name,m.unit,m.stock,m.min])); }
    if(type==="all"||type==="attendance"){ sh("Attendance",["Date","Name","Role","Status"],att.map(a=>[a.date,a.name,a.role,a.present])); }
    XLSX.writeFile(wb, `SiteLedger_${type}_${today()}.xlsx`);
  };

  const handleLogout = () => {
    API.clearToken();
    setUser(null);
  };

  const SettingRow = ({ icon:Icon, iconBg, iconColor, label, sub, right }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom: `1px solid ${tk.bdr}` }}>
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
          {k:"all",        ic:IFileSpread, l:"Full Report",        sub:"All data in one Excel file"},
          {k:"materials",  ic:IPackage,     l:"Materials Log",      sub:"Stock levels and transactions"},
          {k:"attendance", ic:IUsers,       l:"Attendance Register",sub:"Labour records and wages"},
        ].map(x=>(
          <SettingRow key={x.k} icon={x.ic} iconBg={tk.accL} iconColor={tk.acc} label={x.l} sub={x.sub}
            right={<Btn variant="secondary" small onClick={()=>exportXL(x.k)}><IDownload size={13}/>Export</Btn>}/>
        ))}
      </Card>

      <Card delay={.15}>
        <CardTitle icon={IUsers}>Account</CardTitle>
        <SettingRow
          icon={()=><span style={{ fontSize:14, fontWeight:700 }}>{user?.ini || "U"}</span>}
          iconBg={tk.acc} iconColor="#fff"
          label={user?.name || "User"} sub={`${user?.role || "Member"} · @${user?.username || "user"}`}
          right={null}
        />
        <SettingRow icon={ILogOut} iconBg={tk.redL} iconColor={tk.red} label="Sign Out" sub="Return to login screen"
          right={<Btn variant="danger" small onClick={handleLogout}><ILogOut size={13}/>Sign Out</Btn>}/>
      </Card>

      <Card delay={.2} style={{ textAlign:"center", padding:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>SiteLedger v2.0 — React</div>
        <div style={{ fontSize:12, color:tk.tx3 }}>Construction Site Management & Accounting</div>
      </Card>
    </div>
  );
}
