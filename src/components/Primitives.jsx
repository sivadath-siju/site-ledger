import React, { useState } from "react";
import { useApp } from "../context/AppCtx";

export function Card({ children, style, delay = 0 }) {
  const { tk } = useApp();
  return (
    <div style={{
      background: tk.surf, border: `1px solid ${tk.bdr}`,
      borderRadius: 14, padding: 16, marginBottom: 14,
      boxShadow: tk.sh,
      animation: `fadeUp .3s ease ${delay}s both`,
      ...style,
    }}>{children}</div>
  );
}

export function CardTitle({ icon: Icon, children, action }) {
  const { tk } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: tk.tx }}>
        {Icon && <Icon size={14} color={tk.acc} />}
        {children}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, value, label, color, delay = 0 }) {
  const { tk } = useApp();
  const colors = {
    acc: [tk.acc, tk.accL],
    grn: [tk.grn, tk.grnL],
    red: [tk.red, tk.redL],
    amb: [tk.amb, tk.ambL],
  };
  const [fg, bg] = colors[color] || colors.acc;
  return (
    <div style={{
      background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 14,
      padding: "14px 16px", boxShadow: tk.sh, position: "relative", overflow: "hidden",
      animation: `fadeUp .3s ease ${delay}s both`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "14px 14px 0 0", background: fg }} />
      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Icon size={15} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.5px", fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: tk.tx2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export function Btn({ children, variant = "primary", onClick, disabled, fullWidth, small, style }) {
  const { tk } = useApp();
  const [pressed, setPressed] = useState(false);

  const variants = {
    primary: {
      background: tk.acc,
      color: "#fff",
      border: "none",
      boxShadow: `0 2px 8px ${tk.acc}44, 0 1px 3px rgba(0,0,0,.15)`,
    },
    secondary: {
      background: tk.surf2,
      color: tk.tx,
      border: `1.5px solid ${tk.bdr2}`,
      boxShadow: "none",
    },
    danger: {
      background: "#e11d48",
      color: "#fff",
      border: "none",
      boxShadow: "0 2px 8px rgba(225,29,72,.35)",
    },
    ghost: {
      background: "transparent",
      color: tk.tx2,
      border: `1.5px solid ${tk.bdr}`,
      boxShadow: "none",
    },
    success: {
      background: tk.grn,
      color: "#fff",
      border: "none",
      boxShadow: `0 2px 8px ${tk.grn}44`,
    },
  };

  const v = variants[variant] || variants.primary;

  return (
    <button
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: small ? "7px 14px" : "11px 22px",
        borderRadius: small ? 8 : 11,
        fontSize: small ? 12 : 13.5,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .45 : 1,
        width: fullWidth ? "100%" : "auto",
        transition: "all .18s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: pressed ? "scale(.96)" : "scale(1)",
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
        ...v, ...style,
      }}
    >{children}</button>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5, opacity: .65 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, type = "text", placeholder, autoComplete, min, max, step }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoComplete={autoComplete} min={min} max={max} step={step}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        border: `1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius: 10, padding: "10px 12px",
        fontSize: 14, color: tk.tx,
        background: tk.surf2, outline: "none",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition: "border-color .15s, box-shadow .15s",
        WebkitAppearance: "none",
      }}
    />
  );
}

export function Select({ value, onChange, children }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value} onChange={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        border: `1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius: 10, padding: "10px 12px",
        fontSize: 14, color: tk.tx,
        background: tk.surf2, outline: "none",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition: "border-color .15s, box-shadow .15s",
        WebkitAppearance: "none", cursor: "pointer",
      }}
    >{children}</select>
  );
}

export function Textarea({ value, onChange, rows = 4, placeholder }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        border: `1.5px solid ${focused ? tk.acc : tk.bdr}`,
        borderRadius: 10, padding: "10px 12px",
        fontSize: 14, color: tk.tx,
        background: tk.surf2, outline: "none", resize: "vertical",
        boxShadow: focused ? `0 0 0 3px ${tk.accL}` : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
    />
  );
}

export function FormGrid({ children, cols }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols || "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {children}
    </div>
  );
}

export function Alert({ type = "ok", children }) {
  const { tk } = useApp();
  const cfg = {
    ok:   { bg: tk.grnL, color: tk.grn, border: `1px solid ${tk.grn}44` },
    err:  { bg: tk.redL, color: tk.red, border: `1px solid ${tk.red}44` },
    warn: { bg: tk.ambL, color: tk.amb, border: `1px solid ${tk.amb}44` },
  };
  const c = cfg[type] || cfg.ok;
  return (
    <div style={{ ...c, borderRadius: 10, padding: "9px 12px", fontSize: 13, marginBottom: 12, animation: "fadeUp .2s ease", display: "flex", alignItems: "flex-start", gap: 8 }}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "gray" }) {
  const { tk } = useApp();
  const cfg = {
    green: { bg: tk.grnL, color: tk.grn },
    red:   { bg: tk.redL, color: tk.red },
    amber: { bg: tk.ambL, color: tk.amb },
    blue:  { bg: tk.accL, color: tk.acc },
    gray:  { bg: tk.surf2, color: tk.tx2 },
  };
  const c = cfg[color] || cfg.gray;
  return (
    <span style={{ ...c, display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function SummaryRow({ label, value, bold }) {
  const { tk } = useApp();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${tk.bdr}`, fontSize: 13 }}>
      <span style={{ color: bold ? tk.tx : tk.tx2, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", color: bold ? tk.acc : tk.tx }}>{value}</span>
    </div>
  );
}

export function TableWrap({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 8 }}>{children}</div>;
}

export function ProgressBar({ label, value, max, color }) {
  const { tk } = useApp();
  const Nf = n => Number(n || 0).toLocaleString("en-IN");
  const pct = Math.min(100, (value / Math.max(value, max)) * 100);
  const c = value <= max * .33 ? tk.red : value <= max * .6 ? tk.amb : tk.grn;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <strong style={{ color: tk.tx }}>{label}</strong>
        <span style={{ color: tk.tx2 }}>{Nf(value)}</span>
      </div>
      <div style={{ background: tk.surf3, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 6, borderRadius: 4, background: color || c, transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

export function Toggle({ value, onChange }) {
  const { tk } = useApp();
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? tk.acc : tk.bdr2, position: "relative",
        transition: "background .2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        transition: "left .2s cubic-bezier(.34,1.56,.64,1)",
      }} />
    </button>
  );
}

export function Divider() {
  const { tk } = useApp();
  return <div style={{ height: 1, background: tk.bdr, margin: "12px 0" }} />;
}

export function Empty({ icon: Icon, text }) {
  const { tk } = useApp();
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: tk.tx3 }}>
      <Icon size={38} style={{ marginBottom: 12, opacity: .25 }} />
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

export function Sheet({ open, onClose, title, icon: TitleIcon, children, footer }) {
  const { tk } = useApp();
  if (!open) return null;
  const wide = window.innerWidth >= 600;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
        zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "fadeUp .2s ease",
        padding: wide ? 16 : 0,
      }}
    >
      <div style={{
        background: tk.surf, width: "100%", maxWidth: 540,
        maxHeight: "92vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        borderRadius: wide ? 18 : "18px 18px 0 0",
        boxShadow: "0 -4px 40px rgba(0,0,0,.18)",
        animation: !wide ? "slideUp .3s cubic-bezier(.4,0,.2,1)" : "scaleIn .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {!wide && (
          <div style={{ width: 36, height: 4, borderRadius: 2, background: tk.bdr2, margin: "10px auto 0", flexShrink: 0 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: `1px solid ${tk.bdr}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {TitleIcon && <TitleIcon size={17} color={tk.acc} />}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: tk.tx2 }}
          >✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 18px", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "12px 18px 20px", borderTop: `1px solid ${tk.bdr}`, display: "flex", gap: 8, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
