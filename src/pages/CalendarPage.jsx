import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./CalendarPage.css";
import * as API from "../api";
import { useApp } from "../context/AppCtx";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function Avatar({ person }) {
  return (
    <div className={`cal-avatar cal-avatar--${person.color}`}>
      {person.initials}
    </div>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="cal-metric">
      <div className="cal-metric__label">{label}</div>
      <div className="cal-metric__value">{value}</div>
      {sub && <div className="cal-metric__sub">{sub}</div>}
    </div>
  );
}

function DayCell({ day, data, isToday, isSelected, maxSpend, onClick }) {
  const spend = data?.total ?? 0;
  const ratio = maxSpend > 0 ? spend / maxSpend : 0;
  const heatClass = ratio > 0.6 ? "day-cell--high" : ratio > 0.25 ? "day-cell--mid" : "";

  return (
    <div
      className={[
        "day-cell",
        heatClass,
        isToday    ? "day-cell--today"    : "",
        isSelected ? "day-cell--selected" : "",
        !data      ? "day-cell--empty-data" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <span className={`day-cell__num${isToday ? " day-cell__num--today" : ""}`}>
        {day}
      </span>
      {data ? (
        <>
          <span className="day-cell__spend">{fmt(spend)}</span>
          <span className="day-cell__att">
            <span className="day-cell__dot" />
            {data.attendees.length} present
          </span>
        </>
      ) : (
        <span className="day-cell__none">—</span>
      )}
    </div>
  );
}

function DetailPanel({ year, month, day, data }) {
  if (!day) {
    return (
      <div className="detail-panel">
        <div className="detail-panel__empty">
          Select a day to see the daily log
        </div>
      </div>
    );
  }

  const dateStr = `${MONTHS[month]} ${day}, ${year}`;

  if (!data) {
    return (
      <div className="detail-panel">
        <div className="detail-panel__date">{dateStr}</div>
        <div className="detail-panel__empty">No activity logged for this day.</div>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel__date">{dateStr}</div>

      <div className="detail-section">
        <div className="detail-section__title">
          Present ({data.attendees.length})
        </div>
        {data.attendees.map((p, idx) => (
          <div className="attendee-row" key={idx}>
            <Avatar person={p} />
            <div>
              <div className="attendee-row__name">{p.name}</div>
              <div className="attendee-row__role">{p.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Expenses</div>
        {data.expenses.map((e, i) => (
          <div className="expense-row" key={i}>
            <span className="expense-row__cat">{e.cat}</span>
            <span className="expense-row__amt">{fmt(e.amt)}</span>
          </div>
        ))}
        <div className="expense-total">
          <span>Total</span>
          <span>{fmt(data.total)}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__title">Daily Log</div>
        {data.logs.length > 0 ? data.logs.map((l, i) => (
          <div className="log-entry" key={i}>
            <div className="log-entry__time">{l.time}</div>
            <div className="log-entry__note">{l.note}</div>
          </div>
        )) : (
          <div style={{ fontSize: 12, color: "#aaa" }}>No workflow logs for this day.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CalendarPage() {
  const { tk } = useApp();
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [monthData, setMonthData] = useState({});
  const [loading, setLoading] = useState(false);

  const loadMonthData = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const firstDay = new Date(y, m, 1);
      const lastDay  = new Date(y, m + 1, 0);
      
      const fStr = firstDay.toISOString().split("T")[0];
      const lStr = lastDay.toISOString().split("T")[0];

      const [att, exp, logs] = await Promise.all([
        API.getAttendance({ start: fStr, end: lStr }),
        API.getExpenses({ start: fStr, end: lStr }),
        API.getAllDailyLogs(),
      ]);

      const data = {};
      const daysInMonth = lastDay.getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        
        const dayAtt = att.filter(a => a.date === dateStr).map(a => ({
          name: a.worker_name,
          role: a.worker_role,
          initials: a.worker_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
          color: ["blue", "teal", "amber", "coral", "purple"][a.worker_id % 5]
        }));

        const dayExp = exp.filter(e => e.date === dateStr).map(e => ({
          cat: e.category_name,
          amt: e.amount
        }));

        const dayLog = logs.filter(l => l.date === dateStr).map(l => ({
          time: "LOG",
          note: l.content
        }));

        if (dayAtt.length > 0 || dayExp.length > 0 || dayLog.length > 0) {
          data[d] = {
            attendees: dayAtt,
            expenses: dayExp,
            logs: dayLog,
            total: dayExp.reduce((sum, e) => sum + e.amt, 0)
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
    let totalSpend = 0, totalPresence = 0, busyDay = null, busyCount = 0, activeDays = 0;
    Object.entries(monthData).forEach(([d, dd]) => {
      if (!dd) return;
      activeDays++;
      totalSpend += dd.total;
      totalPresence += dd.attendees.length;
      if (dd.attendees.length > busyCount) {
        busyCount = dd.attendees.length;
        busyDay = Number(d);
      }
    });
    return {
      totalSpend,
      avgSpend: activeDays ? Math.round(totalSpend / activeDays) : 0,
      busyDay,
      busyCount,
      activeDays,
      totalPresence,
    };
  }, [monthData]);

  const maxSpend = useMemo(() => {
    const spends = Object.values(monthData).map((d) => d.total);
    return spends.length ? Math.max(...spends) : 0;
  }, [monthData]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const calendarDays    = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++)    calendarDays.push(i);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const isDark = tk.bg === "#0d0f18"; // Simple check for dark theme
  const calStyle = {
    "--cal-bg": tk.bg,
    "--cal-surf": tk.surf,
    "--cal-tx": tk.tx,
    "--cal-tx2": tk.tx2,
    "--cal-tx3": tk.tx3,
    "--cal-bdr": tk.bdr,
    "--cal-acc": tk.acc,
    "--cal-acc-alpha": `${tk.acc}18`,
    "--cal-grn": tk.grn,
    // Dynamic Heatmap colors
    "--cal-heat-mid": isDark ? "rgba(77, 128, 238, 0.1)" : "#f0f7ff",
    "--cal-heat-mid-bdr": isDark ? "rgba(77, 128, 238, 0.2)" : "#c2dfff",
    "--cal-heat-high": isDark ? "rgba(77, 128, 238, 0.25)" : "#e1f0ff",
    "--cal-heat-high-bdr": isDark ? "rgba(77, 128, 238, 0.4)" : "#b3d7ff",
  };

  return (
    <div className="cal-page" style={calStyle}>
      <header className="cal-page__header">
        <h2 className="cal-page__title">Calendar Log</h2>
        <div className="cal-nav">
          <button className="cal-nav__btn" onClick={prevMonth}>&lt;</button>
          <div className="cal-nav__label">{MONTHS[month]} {year}</div>
          <button className="cal-nav__btn" onClick={nextMonth}>&gt;</button>
        </div>
      </header>

      <div className="cal-metrics">
        <MetricCard
          label="Total Spend"
          value={fmt(metrics.totalSpend)}
          sub={`${metrics.activeDays} active days`}
        />
        <MetricCard
          label="Daily Average"
          value={fmt(metrics.avgSpend)}
        />
        <MetricCard
          label="Peak Labour"
          value={metrics.busyCount}
          sub={metrics.busyDay ? `Day ${metrics.busyDay}` : "N/A"}
        />
        <MetricCard
          label="Total Presence"
          value={metrics.totalPresence}
          sub="Man-days this month"
        />
      </div>

      <div className="cal-body">
        <div className="cal-grid-wrap">
          <div className="cal-dow-row">
            {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          </div>
          <div className="cal-grid" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`blank-${idx}`} className="day-cell day-cell--blank" />;
              const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

              return (
                <DayCell
                  key={day}
                  day={day}
                  data={monthData[day]}
                  isToday={isToday}
                  isSelected={selected === day}
                  maxSpend={maxSpend}
                  onClick={() => setSelected(day)}
                />
              );
            })}
          </div>
        </div>

        <DetailPanel
          year={year}
          month={month}
          day={selected}
          data={selected ? monthData[selected] : null}
        />
      </div>
    </div>
  );
}
