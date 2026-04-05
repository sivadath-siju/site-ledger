import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as API from "../api";
import { useApp } from "../context/AppCtx";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const AVATAR_COLORS = [
  { bg: "#B5D4F4", fg: "#0C447C" },
  { bg: "#9FE1CB", fg: "#085041" },
  { bg: "#FAC775", fg: "#633806" },
  { bg: "#F5C4B3", fg: "#712B13" },
  { bg: "#CECBF6", fg: "#3C3489" },
];

const Rs = n => "₹" + Number(n || 0).toLocaleString("en-IN");

function initials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function MetricCard({ label, value, sub, tk }) {
  return (
    <div style={{
      background: tk.surf2, border: `1px solid ${tk.bdr}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: tk.tx, fontFamily: "'DM Mono',monospace", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: tk.tx3, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function DayCell({ day, data, isToday, isSelected, maxSpend, onClick, tk }) {
  const spend = data?.total ?? 0;
  const ratio = maxSpend > 0 ? spend / maxSpend : 0;

  // Heat colours for spend intensity — neutral blues, no orange
  const bgColor =
    ratio > 0.6 ? "#dbeafe" :
    ratio > 0.25 ? "#eff6ff" :
    data ? tk.surf : "transparent";

  const borderColor = isSelected
    ? tk.acc
    : ratio > 0.6 ? "#93c5fd"
    : ratio > 0.25 ? "#bfdbfe"
    : data ? tk.bdr : "transparent";

  return (
    <div
      onClick={data || isToday ? onClick : undefined}
      style={{
        border: `${isSelected ? "2px" : "1px"} solid ${borderColor}`,
        borderRadius: 10,
        padding: "7px 8px",
        cursor: data ? "pointer" : "default",
        minHeight: 72,
        display: "flex", flexDirection: "column", gap: 3,
        background: bgColor,
        transition: "all .15s ease",
        boxShadow: isSelected ? `0 0 0 3px ${tk.acc}22` : "none",
      }}
    >
      {/* Day number */}
      <div style={{
        fontSize: 11, fontWeight: 700,
        ...(isToday ? {
          background: tk.acc, color: "#fff",
          borderRadius: 6, width: 20, height: 20,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        } : {
          color: tk.tx3,
        })
      }}>
        {day}
      </div>

      {data ? (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: tk.tx, lineHeight: 1 }}>{Rs(spend)}</div>
          <div style={{ fontSize: 10, color: tk.tx3, display: "flex", alignItems: "center", gap: 3, marginTop: "auto", fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block", flexShrink: 0 }} />
            {data.attendees.length}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: tk.bdr2, marginTop: "auto" }}>—</div>
      )}
    </div>
  );
}

function DetailPanel({ year, month, day, data, tk }) {
  const containerStyle = {
    border: `1px solid ${tk.bdr}`,
    borderRadius: 14,
    background: tk.surf,
    padding: "16px 18px",
    minHeight: 420,
    boxSizing: "border-box",
    boxShadow: tk.sh,
  };

  if (!day) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: tk.tx3, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
          Select a day<br />to see details
        </div>
      </div>
    );
  }

  const dateStr = `${MONTHS[month]} ${day}, ${year}`;

  if (!data) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 15, fontWeight: 700, color: tk.tx, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${tk.surf2}` }}>{dateStr}</div>
        <div style={{ color: tk.tx3, fontSize: 13, textAlign: "center", marginTop: 40 }}>No activity logged for this day.</div>
      </div>
    );
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: tk.tx, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${tk.surf2}` }}>{dateStr}</div>

      {/* Workers */}
      {data.attendees.length > 0 && (
        <Section title={`Present (${data.attendees.length})`}>
          {data.attendees.map((p, i) => {
            const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: tk.tx3 }}>{p.role}{p.isSubcontract ? " · Sub" : ""}</div>
                </div>
                {!p.isSubcontract && p.total_wage > 0 && (
                  <div style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>{Rs(p.total_wage)}</div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* Labour total */}
      {data.labourTotal > 0 && (
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: "6px 10px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#1e40af", fontWeight: 600 }}>Labour wages</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{Rs(data.labourTotal)}</span>
        </div>
      )}

      {/* Expenses */}
      {data.expenses.length > 0 && (
        <Section title="Expenses">
          {data.expenses.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${tk.surf2}`, fontSize: 13 }}>
              <span style={{ color: tk.tx2, fontWeight: 500 }}>{e.cat}</span>
              <span style={{ fontWeight: 700, color: tk.tx }}>{Rs(e.amt)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: 14, fontWeight: 800, color: tk.tx, borderTop: `2px solid ${tk.bdr}`, marginTop: 4 }}>
            <span>Expenses Total</span>
            <span>{Rs(data.expenseTotal)}</span>
          </div>
        </Section>
      )}

      {/* Day total */}
      <div style={{ background: tk.surf2, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: tk.tx }}>Day Total</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: tk.acc }}>{Rs(data.total)}</span>
      </div>

      {/* Daily log notes */}
      {data.logs.length > 0 && (
        <Section title="Site Log" >
          {data.logs.map((l, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < data.logs.length - 1 ? `1px solid ${tk.surf2}` : "none" }}>
              <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 700, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>{l.time}</div>
              <div style={{ fontSize: 12, color: tk.tx2, lineHeight: 1.55 }}>{l.note}</div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main CalendarPage
// ─────────────────────────────────────────────
export default function CalendarPage() {
  const { tk, isDesktop } = useApp();
  const today = new Date();

  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth());
  const [selected, setSelected]   = useState(null);
  const [monthData, setMonthData] = useState({});
  const [loading, setLoading]     = useState(false);

  const loadMonthData = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const firstDay = new Date(y, m, 1);
      const lastDay  = new Date(y, m + 1, 0);
      const from = firstDay.toISOString().split("T")[0];
      const to   = lastDay.toISOString().split("T")[0];

      // ── FIX 1: correct param names (from/to, not start/end) ──
      const [attRaw, expRaw, logsRaw] = await Promise.all([
        API.getAttendance({ from, to }),
        API.getExpenses({ from, to }),
        API.getAllDailyLogs(),
      ]);

      const data = {};
      const daysInMonth = lastDay.getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        // ── FIX 2: null-safe worker name handling ──
        const dayAtt = attRaw
          .filter(a => a.date === ds)
          .map(a => ({
            name:          a.worker_name || "Worker",
            role:          a.worker_role || "",
            total_wage:    a.total_wage  || 0,
            is_subcontract: !!a.is_subcontract,
          }));

        // ── FIX 3: use category_name not category (raw API field) ──
        const dayExp = expRaw
          .filter(e => e.date === ds)
          .map(e => ({
            cat: e.category_name || e.category || "Other",
            amt: e.amount || 0,
          }));

        // ── FIX 4: use notes not content ──
        const dayLogs = logsRaw
          .filter(l => l.date === ds && l.notes)
          .map(l => ({
            time: l.saved_at
              ? new Date(l.saved_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "Site Log",
            note: l.notes,
          }));

        // ── FIX 5: total = labour wages + expenses (not just expenses) ──
        const labourTotal  = dayAtt.filter(a => !a.is_subcontract).reduce((s, a) => s + a.total_wage, 0);
        const expenseTotal = dayExp.reduce((s, e) => s + e.amt, 0);

        if (dayAtt.length > 0 || dayExp.length > 0 || dayLogs.length > 0) {
          data[d] = {
            attendees:    dayAtt,
            expenses:     dayExp,
            logs:         dayLogs,
            labourTotal,
            expenseTotal,
            total:        labourTotal + expenseTotal,  // ← combined spend
          };
        }
      }

      setMonthData(data);
    } catch (err) {
      console.error("Calendar load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonthData(year, month);
    setSelected(null);
  }, [year, month, loadMonthData]);

  const metrics = useMemo(() => {
    let totalSpend = 0, totalLabour = 0, totalExpenses = 0;
    let totalPresence = 0, busyDay = null, busyCount = 0, activeDays = 0;

    Object.entries(monthData).forEach(([d, dd]) => {
      activeDays++;
      totalSpend    += dd.total;
      totalLabour   += dd.labourTotal;
      totalExpenses += dd.expenseTotal;
      totalPresence += dd.attendees.length;
      if (dd.attendees.length > busyCount) {
        busyCount = dd.attendees.length;
        busyDay   = Number(d);
      }
    });

    return { totalSpend, totalLabour, totalExpenses,
      avgSpend: activeDays ? Math.round(totalSpend / activeDays) : 0,
      busyDay, busyCount, activeDays, totalPresence };
  }, [monthData]);

  const maxSpend = useMemo(() => {
    const vals = Object.values(monthData).map(d => d.total);
    return vals.length ? Math.max(...vals, 1) : 1;
  }, [monthData]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: tk.tx }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Calendar Log</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Daily spend and attendance history</div>
        </div>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 14, color: tk.tx, fontWeight: 700 }}>‹</button>
          <div style={{ fontSize: 14, fontWeight: 700, color: tk.tx, minWidth: 140, textAlign: "center" }}>{MONTHS[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 14, color: tk.tx, fontWeight: 700 }}>›</button>
        </div>
      </div>

      {/* Metrics — 2 cols on mobile, 4 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        <MetricCard tk={tk} label="Total Spend"    value={Rs(metrics.totalSpend)}    sub={`${metrics.activeDays} active day${metrics.activeDays !== 1 ? "s" : ""}`} />
        <MetricCard tk={tk} label="Daily Average"  value={Rs(metrics.avgSpend)}      sub="Labour + expenses" />
        <MetricCard tk={tk} label="Peak Attendance" value={`${metrics.busyCount} workers`} sub={metrics.busyDay ? `${MONTHS[month].slice(0,3)} ${metrics.busyDay}` : "—"} />
        <MetricCard tk={tk} label="Man-days"       value={metrics.totalPresence}     sub="This month" />
      </div>

      {/* Calendar + Detail panel */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexDirection: isDesktop ? "row" : "column" }}>

        {/* Calendar grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 5, marginBottom: 5 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: tk.tx3, padding: "3px 0", textTransform: "uppercase", letterSpacing: ".08em" }}>
                {isDesktop ? d : d.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 5, opacity: loading ? .5 : 1, transition: "opacity .2s" }}>
            {/* Blank leading cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
              return (
                <DayCell key={d} tk={tk} day={d} data={monthData[d]}
                  isToday={isToday} isSelected={selected === d}
                  maxSpend={maxSpend}
                  onClick={() => setSelected(selected === d ? null : d)}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { bg: tk.surf, border: tk.bdr, label: "No data" },
              { bg: "#eff6ff", border: "#bfdbfe", label: "Low spend" },
              { bg: "#dbeafe", border: "#93c5fd", label: "High spend" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: tk.tx3 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.border}`, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
            {loading && <span style={{ fontSize: 11, color: tk.tx3, marginLeft: "auto" }}>Loading…</span>}
          </div>
        </div>

        {/* Detail panel — full width on mobile, fixed on desktop */}
        <div style={{ width: isDesktop ? 300 : "100%", flexShrink: 0 }}>
          <DetailPanel tk={tk} year={year} month={month} day={selected} data={selected ? monthData[selected] : null} />
        </div>
      </div>
    </div>
  );
}
