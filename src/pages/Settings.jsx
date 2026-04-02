import React from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, Btn, Toggle } from "../components/Primitives";
import { ISettings, IMoon, ISun, IUsers, ILogOut } from "../icons/Icons";

export default function Settings() {
  const { tk, theme, setTheme, user, setUser } = useApp();
  const isDark = theme === "dark";

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight: 700, letterSpacing: "-.4px" }}>Settings</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>App preferences and account</div>
      </div>
      <Card delay={.05}>
        <CardTitle icon={ISettings}>Appearance</CardTitle>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom: `1px solid ${tk.bdr}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:tk.accL, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {isDark ? <IMoon size={17} color={tk.acc} /> : <ISun size={17} color={tk.acc} />}
            </div>
            <div><div style={{ fontSize:14, fontWeight:600 }}>Dark Mode</div><div style={{ fontSize:12, color:tk.tx3, marginTop:1 }}>Switch theme</div></div>
          </div>
          <Toggle value={isDark} onChange={v=>setTheme(v?"dark":"light")}/>
        </div>
      </Card>
      <Card delay={.15}>
        <CardTitle icon={IUsers}>Account</CardTitle>
        <div style={{ padding:"13px 0", borderBottom: `1px solid ${tk.bdr}` }}>
          <Btn variant="danger" fullWidth onClick={()=>setUser(null)}><ILogOut size={13}/>Sign Out</Btn>
        </div>
      </Card>
    </div>
  );
}
