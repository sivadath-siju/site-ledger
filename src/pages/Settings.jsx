import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, Btn, Toggle, Sheet, Field, Input, Alert } from "../components/Primitives";
import { ISettings, IMoon, ISun, IFileSpread, IDownload, IUsers, ILogOut, IPackage, IReceipt, IFileText } from "../icons/Icons";
import * as API from "../api";
import { toLocalISO } from "../utils/dates";

const today = () => toLocalISO();

const ILock = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function SettingRow({ tk, icon: Icon, iconBg, iconColor, label, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 200px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 12, color: tk.tx3, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      {right}
    </div>
  );
}

function ChangePasswordSheet({ open, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setMsg(null); };
  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e?.preventDefault();
    if (next.length < 8) return setMsg({ type: "err", text: "New password must be at least 8 characters." });
    if (next !== confirm) return setMsg({ type: "err", text: "New passwords do not match." });
    setBusy(true);
    try {
      await API.changeMyPassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      setMsg({ type: "ok", text: "Password changed. Use the new password next time you sign in." });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Change password" icon={ILock}
      footer={<>
        <Btn variant="secondary" onClick={close} style={{ flex: 1 }}>Close</Btn>
        <Btn onClick={submit} disabled={busy || !current || !next || !confirm} style={{ flex: 1 }}>{busy ? "Saving…" : "Update password"}</Btn>
      </>}
    >
      <form onSubmit={submit}>
        {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        <Field label="Current password">
          <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="New password" hint="At least 8 characters. A short phrase is easier to remember.">
          <Input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
        </Field>
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Sheet>
  );
}

export default function Settings() {
  const { tk, theme, setTheme, user, setUser, att, exp, mats, inv } = useApp();
  const isDark = theme === "dark";
  const [pwOpen, setPwOpen] = useState(false);
  const [exporting, setExporting] = useState(null);

  // xlsx is ~100 KB gzipped — load it only when someone actually exports.
  const exportXL = async (type) => {
    setExporting(type);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const sh = (name, hdrs, rows) => {
        const ws = XLSX.utils.aoa_to_sheet([hdrs, ...rows]);
        ws["!cols"] = hdrs.map(h => ({ wch: Math.max(String(h).length + 4, 14) }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      if (type === "all" || type === "materials")  sh("Stock", ["Material", "Unit", "Stock", "Min"], mats.map(m => [m.name, m.unit, m.stock, m.min]));
      if (type === "all" || type === "attendance") sh("Attendance", ["Date", "Name", "Role", "Status"], att.map(a => [a.date, a.name, a.role, a.status]));
      if (type === "all" || type === "expenses")   sh("Expenses", ["Date", "Category", "Description", "Amount"], exp.map(e => [e.date, e.category, e.desc, e.amount]));
      if (type === "all" || type === "invoices")   sh("Invoices", ["Vendor", "Description", "Amount", "Status"], inv.map(i => [i.vendor, i.desc, i.amount, i.status]));
      XLSX.writeFile(wb, `SiteLedger_${type}_${today()}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const handleLogout = () => {
    API.clearToken();
    API.clearFileCache();
    setUser(null);
  };

  const Initials = () => <span style={{ fontSize: 14, fontWeight: 700 }}>{user?.ini || "U"}</span>;

  return (
    <div>
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.4px" }}>Settings</div>
        <div style={{ fontSize: 13, color: tk.tx2, marginTop: 2 }}>App preferences and account</div>
      </div>

      <Card delay={.05}>
        <CardTitle icon={IUsers}>Account</CardTitle>
        <SettingRow tk={tk} icon={Initials} iconBg={tk.accL} iconColor={tk.acc}
          label={user?.name || "User"} sub={`${user?.role || "Member"} · @${user?.username || "user"}`} right={null} />
        <SettingRow tk={tk} icon={ILock} iconBg={tk.accL} iconColor={tk.acc} label="Password" sub="Change the password you sign in with"
          right={<Btn variant="secondary" small onClick={() => setPwOpen(true)}>Change</Btn>} />
        <SettingRow tk={tk} icon={ILogOut} iconBg={tk.redL} iconColor={tk.red} label="Sign out" sub="Return to the login screen"
          right={<Btn variant="danger" small onClick={handleLogout}><ILogOut size={14} />Sign out</Btn>} />
      </Card>

      <Card delay={.1}>
        <CardTitle icon={ISettings}>Appearance</CardTitle>
        <SettingRow tk={tk} icon={isDark ? IMoon : ISun} iconBg={tk.accL} iconColor={tk.acc} label="Dark mode" sub="Easier on the eyes at night"
          right={<Toggle value={isDark} onChange={v => setTheme(v ? "dark" : "light")} label="Dark mode" />} />
      </Card>

      <Card delay={.15}>
        <CardTitle icon={IDownload}>Export data</CardTitle>
        {[
          { k: "all",        ic: IFileSpread, l: "Full report",         sub: "All data in one Excel file" },
          { k: "materials",  ic: IPackage,    l: "Materials",           sub: "Stock levels" },
          { k: "attendance", ic: IUsers,      l: "Attendance register", sub: "Labour records and status" },
          { k: "expenses",   ic: IReceipt,    l: "Expense ledger",      sub: "All categorised expenses" },
          { k: "invoices",   ic: IFileText,   l: "Invoices",            sub: "Payables and status" },
        ].map(x => (
          <SettingRow key={x.k} tk={tk} icon={x.ic} iconBg={tk.surf2} iconColor={tk.tx2} label={x.l} sub={x.sub}
            right={<Btn variant="secondary" small disabled={!!exporting} onClick={() => exportXL(x.k)}><IDownload size={14} />{exporting === x.k ? "Preparing…" : "Export"}</Btn>} />
        ))}
      </Card>

      <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 12, color: tk.tx3 }}>
        Ciel Homes · SiteLedger — Construction site management & accounting
      </div>

      <ChangePasswordSheet open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
