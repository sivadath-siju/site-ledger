import React, { useState, useMemo } from "react";
import "./CalendarPage.css";

// ─────────────────────────────────────────────
// MOCK DATA — replace fetchDayData() with your
// real API call. Return null if no data for day.
// ─────────────────────────────────────────────
const PEOPLE_POOL = [
  { id: 1, name: "Arjun Menon",  role: "Manager",  initials: "AM", color: "blue"   },
  { id: 2, name: "Priya Nair",   role: "Cashier",  initials: "PN", color: "teal"   },
  { id: 3, name: "Rahul Dev",    role: "Staff",    initials: "RD", color: "amber"  },
  { id: 4, name: "Sunita Raj",   role: "Cook",     initials: "SR", color: "coral"  },
  { id: 5, name: "Deepak KS",    role: "Delivery", initials: "DK", color: "purple" },
  { id: 6, name: "Meera PV",     role: "Accounts", initials: "MP", color: "blue"   },
  { id: 7, name: "Vishnu TR",    role: "Helper",   initials: "VT", color: "teal"   },
];

const EXP_CATS = [
  "Groceries","Utilities","Wages","Supplies",
  "Maintenance","Transport","Miscellaneous",
];

function seededRand(seed) {
  let x = seed * 0.7182818 + 13;
  return () => { x = Math.sin(x) * 10000; return x - Math.floor(x); };
}

function fetchDayData(year, month, day) {
  // REPLACE THIS with: const res = await fetch(`/api/log?date=${year}-${month+1}-${day}`)
  // Return null for days with no data, or an object matching this shape:
  // { attendees: [{id,name,role,initials,color}], expenses: [{cat,amt}], logs: [{time,note}] }

  const r = seededRand(year * 10000 + month * 100 + day);
  if (day % 5 === 0 || r() < 0.15) return null;

  const attCount = Math.floor(r() * 5) + 2;
  const attendees = [];
  const used = new Set();
  for (let i = 0; i < attCount; i++) {
    let idx;
    do { idx = Math.floor(r() * PEOPLE_POOL.length); }
    while (used.has(idx) && used.size < PEOPLE_POOL.length);
    used.add(idx);
    attendees.push(PEOPLE_POOL[idx]);
  }

  const numExp = Math.floor(r() * 4) + 2;
  const expenses = [];
  const usedCats = new Set();
  for (let i = 0; i < numExp; i++) {
    let cat;
    do { cat = EXP_CATS[Math.floor(r() * EXP_CATS.length)]; }
    while (usedCats.has(cat));
    usedCats.add(cat);
    expenses.push({ cat, amt: Math.round((r() * 4000 + 500) / 50) * 50 });
  }

  const logOptions = [
    { time: "09:15 AM", note: "Morning briefing completed. Inventory checked." },
    { time: "12:30 PM", note: `${attendees[0]?.name} handled peak hour service.` },
    { time: "06:00 PM", note: "Day wrap-up. Accounts reconciled." },
  ];

  return {
    attendees,
    expenses,
    logs: logOptions.slice(0, Math.floor(r() * 2) + 1),
  };
}

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

function buildMonthData(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  const data = {};
  for (let d = 1; d <= days; d++) {
    const raw = fetchDayData(year, month, d);
    if (raw) {
      const total = raw.expenses.reduce((s, e) => s + e.amt, 0);
      data[d] = { ...raw, total };
    }
  }
  return data;
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
        {data.attendees.map((p) => (
          <div className="attendee-row" key={p.id}>
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
        <div className="detail-section__title">Daily log</div>
        {data.logs.map((l, i) => (
          <div className="log-entry" key={i}>
            <div className="log-entry__time">{l.time}</div>
            <div className="log-entry__note">{l.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const monthData = useMemo(() => buildMonthData(year, month), [year, month]);

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

  const maxSpend = useMemo(
    () => Math.max(...Object.values(monthData).filter(Boolean).map((d) => d.total), 1),
    [monthData]
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setSelected(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelected(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="cal-page">

      {/* Header */}
      <div className="cal-page__header">
        <h2 className="cal-page__title">Calendar Log</h2>
        <div className="cal-nav">
          <button className="cal-nav__btn" onClick={prevMonth}>&#8592;</button>
          <span className="cal-nav__label">{MONTHS[month]} {year}</span>
          <button className="cal-nav__btn" onClick={nextMonth}>&#8594;</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="cal-metrics">
        <MetricCard
          label="Total spend"
          value={fmt(metrics.totalSpend)}
          sub={MONTHS[month]}
        />
        <MetricCard
          label="Avg daily spend"
          value={fmt(metrics.avgSpend)}
          sub={`Over ${metrics.activeDays} active days`}
        />
        <MetricCard
          label="Total attendance"
          value={metrics.totalPresence}
          sub="Person-days this month"
        />
        <MetricCard
          label="Busiest day"
          value={metrics.busyDay ? `${MONTHS[month].slice(0,3)} ${metrics.busyDay}` : "—"}
          sub={metrics.busyDay ? `${metrics.busyCount} people present` : ""}
        />
      </div>

      {/* Calendar + Panel */}
      <div className="cal-body">
        <div className="cal-grid-wrap">
          {/* Day headers */}
          <div className="cal-dow-row">
            {DAYS.map(d => <div key={d} className="cal-dow">{d}</div>)}
          </div>

          {/* Grid */}
          <div className="cal-grid">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="day-cell day-cell--blank" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === d;
              return (
                <DayCell
                  key={d}
                  day={d}
                  data={monthData[d]}
                  isToday={isToday}
                  isSelected={selected === d}
                  maxSpend={maxSpend}
                  onClick={() => setSelected(d === selected ? null : d)}
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
