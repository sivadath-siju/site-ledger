import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { IHardHat, IXCircle } from "../icons/Icons";
import { Alert, Field, Input, Btn } from "../components/Primitives";

export default function Login({ onLogin }) {
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
        <div style={{ marginTop:16, padding:"10px 12px", background:tk.surf2, borderRadius:10, border:`1px solid `, fontSize:12, color:tk.tx3, textAlign:"center" }}>
          Default login: <strong style={{color:tk.tx}}>admin</strong> / <strong style={{color:tk.tx}}>admin123</strong>
        </div>
      </div>
    </div>
  );
}
