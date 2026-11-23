import React, { useEffect, useId, useState } from "react";
import { useApp } from "../context/AppCtx";

const MONO = "'DM Mono', ui-monospace, monospace";

export function Card({ children, style, delay = 0, ...rest }) {
  const { tk } = useApp();
  return (
    <div {...rest} style={{
      background: tk.surf, border: `1px solid ${tk.bdr}`,
      borderRadius: 14, padding: 16, marginBottom: 14,
      boxShadow: tk.sh,
      animation: `fadeUp .25s ease ${delay}s both`,
      ...style,
    }}>{children}</div>
  );
}

export function CardTitle({ icon: Icon, children, action }) {
  const { tk } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: tk.tx, margin: 0 }}>
        {Icon && <Icon size={16} color={tk.acc} aria-hidden="true" />}
        {children}
      </h2>
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
      animation: `fadeUp .25s ease ${delay}s both`, minWidth: 0,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        {Icon && <Icon size={16} aria-hidden="true" />}
      </div>
      <div style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 700, letterSpacing: "-.4px", fontFamily: MONO, fontVariantNumeric: "tabular-nums", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: 12, color: tk.tx2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export function Btn({ children, variant = "primary", onClick, disabled, fullWidth, small, style, type = "button", ...rest }) {
  const { tk } = useApp();
  const [pressed, setPressed] = useState(false);

  const variants = {
    primary:   { background: tk.acc, color: tk.onAcc, border: "none", boxShadow: tk.sh },
    secondary: { background: tk.surf2, color: tk.tx, border: `1px solid ${tk.bdr2}`, boxShadow: "none" },
    danger:    { background: "#DC2626", color: "#fff", border: "none", boxShadow: tk.sh },
    ghost:     { background: "transparent", color: tk.tx2, border: `1px solid ${tk.bdr}`, boxShadow: "none" },
    success:   { background: tk.grn, color: tk.bg === "#12100D" ? "#06200F" : "#fff", border: "none", boxShadow: tk.sh },
  };
  const v = variants[variant] || variants.primary;
  const release = () => setPressed(false);

  return (
    <button
      type={type}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        minHeight: small ? 36 : 44,
        padding: small ? "6px 14px" : "10px 20px",
        borderRadius: small ? 9 : 11,
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,
        width: fullWidth ? "100%" : "auto",
        transition: "transform .12s ease, filter .15s ease, background .15s ease",
        transform: pressed && !disabled ? "scale(.97)" : "none",
        whiteSpace: "nowrap",
        ...v, ...style,
      }}
    >{children}</button>
  );
}

/**
 * Label + control. The <label> wraps the control so tapping the label focuses
 * the input (bigger effective touch target, and screen readers announce it).
 */
export function Field({ label, hint, error, children, labelStyle }) {
  const { tk } = useApp();
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: ".02em", marginBottom: 6, color: tk.tx2, ...labelStyle }}>
        {label}
      </span>
      {children}
      {hint && !error && <span style={{ display: "block", fontSize: 12, color: tk.tx3, marginTop: 5 }}>{hint}</span>}
      {error && <span role="alert" style={{ display: "block", fontSize: 12, color: tk.red, marginTop: 5, fontWeight: 600 }}>{error}</span>}
    </label>
  );
}

const useControlStyle = (focused, extra) => {
  const { tk } = useApp();
  return {
    width: "100%", minHeight: 44,
    border: `1px solid ${focused ? tk.acc : tk.bdr2}`,
    borderRadius: 10, padding: "10px 12px",
    fontSize: 15, color: tk.tx,
    background: tk.surf, outline: "none",
    boxShadow: focused ? `0 0 0 3px ${tk.ring}` : "none",
    transition: "border-color .15s, box-shadow .15s",
    WebkitAppearance: "none",
    ...extra,
  };
};

export function Input({ value, onChange, type = "text", placeholder, autoComplete, min, max, step, style, inputMode, ...rest }) {
  const [focused, setFocused] = useState(false);
  const css = useControlStyle(focused, style);
  // Number fields: show the numeric keypad on phones.
  const mode = inputMode || (type === "number" ? "decimal" : type === "tel" ? "tel" : undefined);
  return (
    <input
      type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder}
      autoComplete={autoComplete} min={min} max={max} step={step} inputMode={mode}
      {...rest}
      onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
      style={css}
    />
  );
}

export function Select({ value, onChange, children, style, ...rest }) {
  const { tk } = useApp();
  const [focused, setFocused] = useState(false);
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(tk.tx2)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;
  const css = useControlStyle(focused, {
    cursor: "pointer", paddingRight: 34,
    backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    ...style,
  });
  return (
    <select
      value={value} onChange={onChange} {...rest}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={css}
    >{children}</select>
  );
}

export function Textarea({ value, onChange, rows = 4, placeholder, style, ...rest }) {
  const [focused, setFocused] = useState(false);
  const css = useControlStyle(focused, { resize: "vertical", minHeight: 88, lineHeight: 1.5, ...style });
  return (
    <textarea
      value={value ?? ""} onChange={onChange} rows={rows} placeholder={placeholder} {...rest}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={css}
    />
  );
}

export function FormGrid({ children, cols }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols || "repeat(auto-fit, minmax(150px, 1fr))", columnGap: 12 }}>
      {children}
    </div>
  );
}

export function Alert({ type = "ok", children }) {
  const { tk } = useApp();
  const cfg = {
    ok:   { background: tk.grnL, color: tk.grn, border: `1px solid ${tk.grn}55` },
    err:  { background: tk.redL, color: tk.red, border: `1px solid ${tk.red}55` },
    warn: { background: tk.ambL, color: tk.amb, border: `1px solid ${tk.amb}55` },
  };
  const c = cfg[type] || cfg.ok;
  return (
    <div role={type === "err" ? "alert" : "status"} style={{ ...c, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 500, marginBottom: 12, animation: "fadeUp .2s ease", display: "flex", alignItems: "flex-start", gap: 8 }}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "gray" }) {
  const { tk } = useApp();
  const cfg = {
    green: { background: tk.grnL, color: tk.grn },
    red:   { background: tk.redL, color: tk.red },
    amber: { background: tk.ambL, color: tk.amb },
    blue:  { background: tk.accL, color: tk.acc },
    gray:  { background: tk.surf3, color: tk.tx2 },
  };
  const c = cfg[color] || cfg.gray;
  return (
    <span style={{ ...c, display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.4 }}>
      {children}
    </span>
  );
}

export function SummaryRow({ label, value, bold }) {
  const { tk } = useApp();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${tk.bdr}`, fontSize: 13 }}>
      <span style={{ color: bold ? tk.tx : tk.tx2, fontWeight: bold ? 700 : 400, minWidth: 0 }}>{label}</span>
      <span style={{ fontWeight: 700, fontFamily: MONO, fontVariantNumeric: "tabular-nums", color: bold ? tk.acc : tk.tx, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

/** Horizontally scrollable table container with a soft edge hint on mobile. */
export function TableWrap({ children }) {
  const { tk } = useApp();
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Scrollable table"
      style={{
        overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 10,
        border: `1px solid ${tk.bdr}`,
        background: `linear-gradient(to right, ${tk.surf} 30%, transparent), linear-gradient(to left, ${tk.surf} 30%, transparent) 100% 0, radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.12), transparent), radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.12), transparent) 100% 0`,
        backgroundRepeat: "no-repeat", backgroundSize: "40px 100%, 40px 100%, 12px 100%, 12px 100%",
        backgroundAttachment: "local, local, scroll, scroll",
      }}
    >{children}</div>
  );
}

export function ProgressBar({ label, value, max, color }) {
  const { tk } = useApp();
  const Nf = n => Number(n || 0).toLocaleString("en-IN");
  const pct = Math.min(100, (value / Math.max(value, max, 1)) * 100);
  const c = value <= max * .33 ? tk.red : value <= max * .6 ? tk.amb : tk.grn;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5, gap: 8 }}>
        <strong style={{ color: tk.tx, fontWeight: 600 }}>{label}</strong>
        <span style={{ color: tk.tx2, fontVariantNumeric: "tabular-nums" }}>{Nf(value)}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
        style={{ background: tk.surf3, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 6, borderRadius: 4, background: color || c, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

export function Toggle({ value, onChange, label }) {
  const { tk } = useApp();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      aria-label={label}
      onClick={() => onChange(!value)}
      // 44px hit area around a 44x26 visual switch
      style={{ background: "none", border: "none", padding: "9px 0", cursor: "pointer", flexShrink: 0, display: "inline-flex" }}
    >
      <span style={{
        width: 44, height: 26, borderRadius: 13, position: "relative", display: "block",
        background: value ? tk.acc : tk.bdr2, transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .2s ease",
        }} />
      </span>
    </button>
  );
}

export function Divider() {
  const { tk } = useApp();
  return <div role="separator" style={{ height: 1, background: tk.bdr, margin: "12px 0" }} />;
}

export function Empty({ icon: Icon, text, action }) {
  const { tk } = useApp();
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: tk.tx2 }}>
      {Icon && (
        <div style={{ width: 56, height: 56, borderRadius: 16, background: tk.surf2, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Icon size={26} color={tk.tx3} aria-hidden="true" />
        </div>
      )}
      <p style={{ fontSize: 14 }}>{text}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

function useIsWide(min = 600) {
  const [wide, setWide] = useState(() => window.innerWidth >= min);
  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= min);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [min]);
  return wide;
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export function Sheet({ open, onClose, title, icon: TitleIcon, children, footer }) {
  const { tk } = useApp();
  const wide = useIsWide();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,11,6,.55)",
        zIndex: 500, display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center",
        animation: "fadeUp .18s ease",
        padding: wide ? 16 : 0,
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{
          background: tk.surf, width: "100%", maxWidth: 560,
          maxHeight: wide ? "88dvh" : "92dvh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          borderRadius: wide ? 18 : "20px 20px 0 0",
          boxShadow: tk.shLg,
          animation: !wide ? "slideUp .28s cubic-bezier(.2,.8,.2,1)" : "scaleIn .2s ease",
        }}
      >
        {!wide && (
          <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: tk.bdr2, margin: "10px auto 0", flexShrink: 0 }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 12px 10px 18px", borderBottom: `1px solid ${tk.bdr}`, flexShrink: 0 }}>
          <h2 id={titleId} style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0, minWidth: 0 }}>
            {TitleIcon && <TitleIcon size={18} color={tk.acc} aria-hidden="true" />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: tk.tx2, flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ overflowY: "auto", overscrollBehavior: "contain", padding: "16px 18px", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: "12px 18px", paddingBottom: wide ? 16 : "calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${tk.bdr}`, display: "flex", gap: 10, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
