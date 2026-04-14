import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as API from "../api";
import { useApp } from "../context/AppCtx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const AVATAR_COLORS = [
  { bg: "#B5D4F4", fg: "#0C447C" }, { bg: "#9FE1CB", fg: "#085041" },
  { bg: "#FAC775", fg: "#633806" }, { bg: "#F5C4B3", fg: "#712B13" },
  { bg: "#CECBF6", fg: "#3C3489" },
];

const Rs = n => "₹" + Number(n || 0).toLocaleString("en-IN");
// Short form for day cells — avoids overflow on mobile
const RsShort = n => {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "k";
  return "₹" + Math.round(n);
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function MetricCard({ label, value, sub, tk }) {
  return (
    <div style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: tk.tx, fontFamily: "'DM Mono',monospace", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: tk.tx3, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function DayCell({ day, data, isToday, isSelected, maxSpend, onClick, tk, compact }) {
  const spend = data?.total ?? 0;
  const ratio = maxSpend > 0 ? spend / maxSpend : 0;
  const bgColor    = ratio > 0.6 ? "#dbeafe" : ratio > 0.25 ? "#eff6ff" : data ? tk.surf : "transparent";
  const borderColor = isSelected
    ? tk.acc : ratio > 0.6 ? "#93c5fd" : ratio > 0.25 ? "#bfdbfe" : data ? tk.bdr : "transparent";

  const totalWorkers = (data?.attendees || []).reduce((s, a) => s + (a.worker_count || 1), 0);

  return (
    <div
      onClick={data || isToday ? onClick : undefined}
      style={{
        border: `${isSelected ? "2px" : "1px"} solid ${borderColor}`,
        borderRadius: compact ? 8 : 10,
        padding: compact ? "5px 4px" : "7px 8px",
        cursor: data ? "pointer" : "default",
        // ── FIX: fixed height prevents overflow, content clips gracefully ──
        height: compact ? 64 : 76,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        background: bgColor,
        transition: "all .15s ease",
        boxShadow: isSelected ? `0 0 0 3px ${tk.acc}22` : "none",
        boxSizing: "border-box",
      }}
    >
      {/* Day number */}
      <div style={{
        fontSize: compact ? 9 : 11,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        ...(isToday ? {
          background: tk.acc, color: "#fff",
          borderRadius: compact ? 4 : 6,
          width: compact ? 16 : 20, height: compact ? 16 : 20,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        } : { color: tk.tx3 })
      }}>
        {day}
      </div>

      {data ? (
        <>
          {/* ── FIX: use RsShort on mobile, full Rs on desktop ── */}
          <div style={{
            fontSize: compact ? 10 : 12,
            fontWeight: 700,
            color: tk.tx,
            lineHeight: 1.1,
            marginTop: 3,
            flexShrink: 0,
            // clip any overflow — no wrapping
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}>
            {compact ? RsShort(spend) : Rs(spend)}
          </div>
          <div style={{
            fontSize: 9,
            color: tk.tx3,
            display: "flex", alignItems: "center", gap: 2,
            marginTop: "auto", flexShrink: 0,
            overflow: "hidden",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#16a34a", display: "inline-block", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {totalWorkers}
            </span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: compact ? 9 : 11, color: tk.bdr2, marginTop: "auto" }}>—</div>
      )}
    </div>
  );
}

function DetailPanel({ year, month, day, data, tk }) {
  const box = {
    border: `1px solid ${tk.bdr}`, borderRadius: 14, background: tk.surf,
    padding: "16px 18px", boxSizing: "border-box", boxShadow: tk.sh,
  };

  if (!day) return <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, color: tk.tx3, fontSize: 13, textAlign: "center" }}>Select a day to see details</div>;

  const dateStr = `${MONTHS[month]} ${day}, ${year}`;
  if (!data) return <div style={box}><div style={{ fontSize: 14, fontWeight: 700, color: tk.tx, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${tk.surf2}` }}>{dateStr}</div><div style={{ color: tk.tx3, fontSize: 13, textAlign: "center", marginTop: 30 }}>No activity logged for this day.</div></div>;

  const totalWorkers = data.attendees.reduce((s, a) => s + (a.worker_count || 1), 0);

  const Sec = ({ title, children }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={box}>
      <div style={{ fontSize: 14, fontWeight: 700, color: tk.tx, marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${tk.surf2}` }}>{dateStr}</div>

      {data.attendees.length > 0 && (
        <Sec title={`Present (${totalWorkers})`}>
          {data.attendees.slice(0, 8).map((p, i) => {
            const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tk.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.worker_count ? `${p.worker_count}× ` : ""}{p.name}
                  </div>
                  <div style={{ fontSize: 10, color: tk.tx3 }}>{p.role}</div>
                </div>
                {!p.isSubcontract && p.total_wage > 0 && (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>{Rs(p.total_wage)}</div>
                )}
              </div>
            );
          })}
          {data.attendees.length > 8 && <div style={{ fontSize: 11, color: tk.tx3 }}>+{data.attendees.length - 8} more entries</div>}
        </Sec>
      )}

      {data.labourTotal > 0 && (
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: "6px 10px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#1e40af", fontWeight: 600 }}>Labour wages</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{Rs(data.labourTotal)}</span>
        </div>
      )}

      {data.expenses.length > 0 && (
        <Sec title="Expenses">
          {data.expenses.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${tk.surf2}`, fontSize: 12 }}>
              <span style={{ color: tk.tx2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{e.cat}</span>
              <span style={{ fontWeight: 700, color: tk.tx, flexShrink: 0 }}>{Rs(e.amt)}</span>
            </div>
          ))}
        </Sec>
      )}

      {/* Day total */}
      <div style={{ background: tk.surf2, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: tk.tx }}>Day Total</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: tk.acc }}>{Rs(data.total)}</span>
      </div>

      {data.logs.length > 0 && (
        <Sec title="Site Log">
          {data.logs.map((l, i) => (
            <div key={i} style={{ padding: "7px 0", borderBottom: i < data.logs.length - 1 ? `1px solid ${tk.surf2}` : "none" }}>
              <div style={{ fontSize: 9, color: tk.tx3, fontWeight: 700, marginBottom: 2, textTransform: "uppercase" }}>{l.time}</div>
              <div style={{ fontSize: 12, color: tk.tx2, lineHeight: 1.55 }}>{l.note}</div>
            </div>
          ))}
        </Sec>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { tk, isDesktop } = useApp();
  const today  = new Date();

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

      const [attRaw, expRaw, logsRaw, subLogsRaw] = await Promise.all([
        API.getAttendance({ from, to }),
        API.getExpenses({ from, to }),
        API.getAllDailyLogs(),
        API.getSubDailyAll({ from, to }),
      ]);

      const data = {};
      const daysInMonth = lastDay.getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const dayAtt = (attRaw || []).filter(a => a.date === ds).map(a => ({
          name:          a.worker_name  || "Worker",
          role:          a.worker_role  || "",
          total_wage:    a.total_wage   || 0,
          isSubcontract: !!a.is_subcontract,
        }));

        const daySubLogs = (subLogsRaw || []).filter(l => l.date === ds).map(l => ({
          name:          l.subcontractor_name || "Subcontractor",
          role:          l.category || "Labour",
          total_wage:    l.total_cost || 0,
          isSubcontract: true,
          worker_count:  l.worker_count || 0,
        }));

        const dayExp = (expRaw || []).filter(e => e.date === ds).map(e => ({
          cat: e.category_name || e.category || "Other",
          amt: e.amount || 0,
        }));

        const dayLogs = (logsRaw || []).filter(l => l.date === ds && l.notes).map(l => ({
          time: l.saved_at
            ? new Date(l.saved_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "Site Log",
          note: l.notes,
        }));

        const labourTotal  = dayAtt.filter(a => !a.isSubcontract).reduce((s, a) => s + a.total_wage, 0);
        const expenseTotal = dayExp.reduce((s, e) => s + e.amt, 0);

        if (dayAtt.length > 0 || dayExp.length > 0 || dayLogs.length > 0 || daySubLogs.length > 0) {
          data[d] = {
            attendees: [...dayAtt, ...daySubLogs],
            expenses: dayExp,
            logs: dayLogs,
            labourTotal,
            expenseTotal,
            total: labourTotal + expenseTotal,
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

  useEffect(() => { loadMonthData(year, month); setSelected(null); }, [year, month, loadMonthData]);

  const metrics = useMemo(() => {
    let totalSpend = 0, totalPresence = 0, busyDay = null, busyCount = 0, activeDays = 0;
    Object.entries(monthData).forEach(([d, dd]) => {
      activeDays++; totalSpend += dd.total; 
      const dayPresence = dd.attendees.reduce((s, a) => s + (a.worker_count || 1), 0);
      totalPresence += dayPresence;
      if (dayPresence > busyCount) { busyCount = dayPresence; busyDay = Number(d); }
    });
    return { totalSpend, avgSpend: activeDays ? Math.round(totalSpend / activeDays) : 0, busyDay, busyCount, activeDays, totalPresence };
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 14, color: tk.tx, fontWeight: 700 }}>‹</button>
          <div style={{ fontSize: 14, fontWeight: 700, color: tk.tx, minWidth: 140, textAlign: "center" }}>{MONTHS[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 14, color: tk.tx, fontWeight: 700 }}>›</button>
        </div>
      </div>

      {/* Metrics — 2 col on mobile, 4 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        <MetricCard tk={tk} label="Total Spend"     value={Rs(metrics.totalSpend)}    sub={`${metrics.activeDays} active day${metrics.activeDays !== 1 ? "s" : ""}`} />
        <MetricCard tk={tk} label="Daily Average"   value={Rs(metrics.avgSpend)}      sub="Labour + expenses" />
        <MetricCard tk={tk} label="Peak Attendance" value={`${metrics.busyCount}`}    sub={metrics.busyDay ? `${MONTHS[month].slice(0,3)} ${metrics.busyDay}` : "—"} />
        <MetricCard tk={tk} label="Man-days"        value={metrics.totalPresence}     sub="This month" />
      </div>

      {/* Calendar + detail */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexDirection: isDesktop ? "row" : "column" }}>

        {/* Grid */}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
          {/* Day headers — single letter on mobile */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: isDesktop ? 5 : 4, marginBottom: isDesktop ? 5 : 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: tk.tx3, padding: "3px 0", textTransform: "uppercase", letterSpacing: ".08em" }}>
                {isDesktop ? d : d.slice(0, 1)}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: isDesktop ? 5 : 3, opacity: loading ? .5 : 1, transition: "opacity .2s" }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`b-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
              return (
                <DayCell key={d} tk={tk} day={d} data={monthData[d]}
                  isToday={isToday} isSelected={selected === d}
                  maxSpend={maxSpend}
                  compact={!isDesktop}
                  onClick={() => setSelected(selected === d ? null : d)}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { bg: tk.surf, border: tk.bdr, label: "No data" },
              { bg: "#eff6ff", border: "#bfdbfe", label: "Low spend" },
              { bg: "#dbeafe", border: "#93c5fd", label: "High spend" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: tk.tx3 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.border}`, display: "inline-block" }} />
                {l.label}
              </div>
            ))}
            {loading && <span style={{ fontSize: 11, color: tk.tx3, marginLeft: "auto" }}>Loading…</span>}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ width: isDesktop ? 300 : "100%", flexShrink: 0 }}>
          <DetailPanel tk={tk} year={year} month={month} day={selected} data={selected ? monthData[selected] : null} />
        </div>
      </div>
    </div>
  );
}
