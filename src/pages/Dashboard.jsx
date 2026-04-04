import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, StatCard, SummaryRow, ProgressBar, Alert, Badge, Empty } from "../components/Primitives";
import { IUsers, IListChecks, IPkgX, IAlertTri, IClipboard, IPackage, ICheckCirc } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

const WEATHER_EMOJI = { "Clear": "☀️", "Partly Cloudy": "⛅", "Overcast": "☁️", "Light Rain": "🌧️", "Heavy Rain": "⛈️", "Extreme Heat": "🌡️" };
const SAFETY_COLOR  = { "All Clear": "green", "Minor Concerns": "amber", "Work Stopped": "red" };

export default function Dashboard() {
  const { tk, mats, att, tasks, workers } = useApp();

  const [todayLog, setTodayLog]           = useState(null);
  const [todayWorkers, setTodayWorkers]   = useState([]);
  const [logLoading, setLogLoading]       = useState(true);

  const todayStr = today();

  // Active workers and today's log
  useEffect(() => {
    setLogLoading(true);
    Promise.allSettled([
      API.getDailyLog(todayStr),
      API.getAttendance({ date: todayStr }),
    ]).then(([logRes, attRes]) => {
      if (logRes.status === "fulfilled") setTodayLog(logRes.value);
      if (attRes.status === "fulfilled") setTodayWorkers(Array.isArray(attRes.value) ? attRes.value : []);
    }).finally(() => setLogLoading(false));
  }, [todayStr]);

  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pt  = tasks.filter(t => t.status !== "Completed").length;
  const presentToday   = todayWorkers.filter(w => w.status === "present").length;
  const halfToday      = todayWorkers.filter(w => w.status === "half").length;
  const todayWageTotal = todayWorkers
    .filter(w => !w.is_subcontract)
    .reduce((s, w) => s + (w.total_wage || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Dashboard</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {lsc > 0 && (
        <Alert type="warn">
          <IAlertTri size={14} />
          <span><strong>{lsc} material{lsc > 1 ? "s" : ""}</strong> below minimum stock — reorder required</span>
        </Alert>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <StatCard icon={IUsers}     value={presentToday + halfToday} label="On Site Today" color="grn" delay={.04} />
        <StatCard icon={IListChecks} value={pt}           label="Pending Tasks"  color="amb" delay={.08} />
        <StatCard icon={IPkgX}      value={lsc}           label="Low Stock"      color="red" delay={.12} />
        <StatCard icon={IUsers}     value={workers.filter(w => !w.is_subcontract).length} label="Direct Workers" color="acc" delay={.16} />
      </div>

      {/* Active Workers Today */}
      <Card delay={.1}>
        <CardTitle icon={IUsers}>
          Workers on Site — {todayStr}
          {todayWageTotal > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: tk.grn, marginLeft: 8 }}>
              {Rs(todayWageTotal)} wages
            </span>
          )}
        </CardTitle>

        {logLoading ? (
          <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13 }}>Loading…</div>
        ) : todayWorkers.length === 0 ? (
          <Empty icon={IUsers} text="No attendance marked today. Go to Labour & Attendance to mark workers." />
        ) : (
          <div>
            {todayWorkers.map(w => {
              const status = w.status === "present" ? "present" : w.status === "half" ? "half" : "absent";
              return (
                <div key={w.id || w.worker_id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0", borderBottom: `1px solid ${tk.bdr}`,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: w.is_subcontract ? tk.ambL : tk.accL,
                    color: w.is_subcontract ? tk.amb : tk.acc,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {(w.worker_name || w.name || "?").charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      {w.worker_name || w.name}
                      {w.is_subcontract ? (
                        <Badge color="amber">Sub</Badge>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: tk.tx3 }}>
                      {w.worker_role || w.role} · {w.hours || 8}h
                      {w.ot_hours > 0 ? ` + ${w.ot_hours}h OT` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Badge color={status === "present" ? "green" : status === "half" ? "amber" : "red"}>
                      {status === "present" ? "Present" : status === "half" ? "Half" : "Absent"}
                    </Badge>
                    {!w.is_subcontract && w.total_wage > 0 && (
                      <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.tx, marginTop: 2 }}>
                        {Rs(w.total_wage)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Today's Site Log */}
      <Card delay={.14}>
        <CardTitle icon={IClipboard}>
          Today's Site Log
          {todayLog && (
            <span style={{ marginLeft: 8, background: tk.grnL, color: tk.grn, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
              ✓ Recorded
            </span>
          )}
        </CardTitle>

        {logLoading ? (
          <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13 }}>Loading…</div>
        ) : !todayLog ? (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: tk.tx3, marginBottom: 12 }}>
              No site log recorded for today.
            </div>
            <div style={{ fontSize: 12, color: tk.tx3 }}>
              Go to <strong style={{ color: tk.acc }}>Daily Workflow</strong> to add today's progress notes.
            </div>
          </div>
        ) : (
          <div>
            {/* Meta row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Weather</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {WEATHER_EMOJI[todayLog.weather] || "🌤️"} {todayLog.weather || "Not recorded"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Safety</div>
                <Badge color={SAFETY_COLOR[todayLog.safety] || "gray"}>{todayLog.safety || "All Clear"}</Badge>
              </div>
              {todayLog.workers_count != null && (
                <div>
                  <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Workers Logged</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>👷 {todayLog.workers_count}</div>
                </div>
              )}
            </div>

            {todayLog.notes ? (
              <div style={{
                background: tk.surf2, borderRadius: 10, padding: "11px 14px",
                fontSize: 13, color: tk.tx, lineHeight: 1.65,
                border: `1px solid ${tk.bdr}`, whiteSpace: "pre-wrap",
              }}>
                {todayLog.notes}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: tk.tx3, fontStyle: "italic" }}>
                No observations recorded.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Stock levels */}
      <Card delay={.18}>
        <CardTitle icon={IPackage}>Stock Levels</CardTitle>
        {mats.length === 0 ? (
          <Empty icon={IPackage} text="No materials added yet." />
        ) : (
          mats.map(m => <ProgressBar key={m.id} label={m.name} value={m.stock} max={m.min * 3} />)
        )}
      </Card>
    </div>
  );
}
