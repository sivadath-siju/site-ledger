import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { IXCircle } from "../icons/Icons";
import { Alert, Field, Input, Btn } from "../components/Primitives";

const IHome = ({ size = 28, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const ROLES_INFO = [
  { role: "Administrator", desc: "Full access — users, data, reports" },
  { role: "Site Manager",  desc: "Operations, attendance, materials" },
  { role: "Data Entry",    desc: "Log expenses, attendance, tasks" },
  { role: "Accountant",    desc: "Finance, invoices, balance sheet" },
];

export default function Login({ onLogin }) {
  const { tk } = useApp();
  const [u, setU]           = useState("");
  const [p, setP]           = useState("");
  const [err, setErr]       = useState("");
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

  const handleKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://cielhomes.in/Images/garden_lush.jpg') center/cover no-repeat",
      padding: 16,
    }}>
      {/* Background pattern */}
      <div style={{ position: "fixed", inset: 0, opacity: .04, backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Card */}
        <div style={{
          background: tk.surf, borderRadius: 22,
          padding: "40px 32px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          animation: "scaleIn .4s cubic-bezier(.34,1.56,.64,1)",
          border: `1px solid ${tk.bdr}`,
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${tk.acc}55` }}>
              <IHome size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.3px", lineHeight: 1 }}>
                Ciel Homes
              </div>
              <div style={{ fontSize: 11, color: tk.tx3, fontWeight: 500, letterSpacing: ".04em" }}>
                SITE MANAGEMENT SYSTEM
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: tk.tx3, marginBottom: 28, marginTop: 4 }}>
            Construction accounting &amp; site operations
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: tk.tx2, marginBottom: 20 }}>Enter your credentials to continue</div>

          {err && <Alert type="err"><IXCircle size={14} />{err}</Alert>}

          <Field label="Username">
            <Input value={u} onChange={e => setU(e.target.value)} placeholder="your.username" autoComplete="username" onKeyDown={handleKey} />
          </Field>
          <div style={{ marginBottom: 22 }}>
            <Field label="Password">
              <Input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={handleKey} />
            </Field>
          </div>

          <Btn fullWidth onClick={submit} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Btn>

          {/* Default credentials hint */}
          <div style={{ marginTop: 20, padding: "12px 14px", background: tk.surf2, borderRadius: 12, border: `1px solid ${tk.bdr}`, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: tk.tx, marginBottom: 6 }}>Default credentials</div>
            {[
              { user: "admin",   pass: "admin123",   role: "Administrator" },
              { user: "manager", pass: "manager123", role: "Site Manager" },
              { user: "staff",   pass: "staff123",   role: "Data Entry" },
            ].map(c => (
              <div key={c.user} style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                <code style={{ background: tk.surf3, padding: "1px 6px", borderRadius: 4, fontSize: 11, color: tk.acc, fontWeight: 600 }}>{c.user}</code>
                <span style={{ color: tk.tx3 }}>/</span>
                <code style={{ background: tk.surf3, padding: "1px 6px", borderRadius: 4, fontSize: 11, color: tk.tx }}>{c.pass}</code>
                <span style={{ color: tk.tx3, fontSize: 11, marginLeft: 2 }}>({c.role})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "rgba(255,255,255,.35)" }}>
          Software made by <span style={{ color: "rgba(255,255,255,.6)", fontWeight: 600 }}>Sivadath Siju</span>
        </div>
      </div>
    </div>
  );
}
