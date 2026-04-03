import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Textarea,
  FormGrid, Select, Badge, Empty,
} from "../components/Primitives";
import { IEdit, ISave, ICheckCirc, IXCircle, ICheckSq, IClock } from "../icons/Icons";

const todayStr   = () => new Date().toISOString().split("T")[0];
const fmtDate    = d  => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long",  day: "numeric", month: "short", year: "numeric" });
const fmtDateSh  = d  => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const fmtTime    = d  => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null;

const WEATHER_EMOJI = { "Clear": "☀️", "Partly Cloudy": "⛅", "Overcast": "☁️", "Light Rain": "🌧️", "Heavy Rain": "⛈️", "Extreme Heat": "🌡️" };
const SAFETY_COLOR  = { "All Clear": "green", "Minor Concerns": "amber", "Work Stopped": "red" };

// Chevron icon
const IChevron = ({ down, size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform .2s", transform: down ? "rotate(180deg)" : "rotate(0deg)" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Calendar icon
const ICalendar = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default function Workflow() {
  const { tk, tasks, setTasks } = useApp();

  // ── Today's log state ──────────────────────────
  const [log,      setLog]      = useState("");
  const [weather,  setWeather]  = useState("Clear");
  const [safety,   setSafety]   = useState("All Clear");
  const [workers,  setWorkers]  = useState("");
  const [msg,      setMsg]      = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [existing, setExisting] = useState(false);

  // ── History state ─────────────────────────────
  const [history,      setHistory]      = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [expandedDate, setExpandedDate] = useState(null);   // which past log is open

  // ── Load today's log + history on mount ────────
  useEffect(() => {
    // Load today
    API.getDailyLog(todayStr())
      .then(data => {
        if (data && data.id) {
          setLog(data.notes || "");
          setWeather(data.weather || "Clear");
          setSafety(data.safety || "All Clear");
          setWorkers(data.workers_count != null ? String(data.workers_count) : "");
          setExisting(true);
        }
      })
      .catch(() => {});  // no log yet today — fine

    // Load history
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistLoading(true);
    API.getAllDailyLogs()
      .then(data => {
        // Filter out today from history list (today is shown in the form above)
        const past = (Array.isArray(data) ? data : []).filter(l => l.date !== todayStr());
        setHistory(past);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistLoading(false));
  };

  // ── Save / upsert today's log ──────────────────
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await API.saveDailyLog({
        date:          todayStr(),
        notes:         log,
        weather,
        safety,
        workers_count: workers !== "" ? parseInt(workers) : null,
        saved_at:      new Date().toISOString(),
      });
      setMsg({ t: "ok", s: existing ? "Log updated for today." : "Log saved for today." });
      setExisting(true);
      // Refresh history so today's new entry shows if user scrolls down
      loadHistory();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ t: "err", s: e.message });
    } finally {
      setSaving(false);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== "Completed");
  const doneTasks    = tasks.filter(t => t.status === "Completed");

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Daily Workflow</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
          {fmtDate(todayStr())}
          {existing && (
            <span style={{ background: tk.grnL, color: tk.grn, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      {msg && (
        <Alert type={msg.t}>
          {msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}
          {msg.s}
        </Alert>
      )}

      {/* ── Today's log form ── */}
      <Card delay={.05}>
        <CardTitle icon={IEdit}>
          {existing ? "Today's Site Log" : "New Daily Log"}
        </CardTitle>

        <Field label="Site Observations / Summary">
          <Textarea
            value={log}
            onChange={e => setLog(e.target.value)}
            placeholder="Work completed, issues encountered, materials used, progress notes..."
            rows={5}
          />
        </Field>
        <FormGrid>
          <Field label="Weather">
            <Select value={weather} onChange={e => setWeather(e.target.value)}>
              {["Clear", "Partly Cloudy", "Overcast", "Light Rain", "Heavy Rain", "Extreme Heat"].map(w => (
                <option key={w}>{w}</option>
              ))}
            </Select>
          </Field>
          <Field label="Safety Status">
            <Select value={safety} onChange={e => setSafety(e.target.value)}>
              {["All Clear", "Minor Concerns", "Work Stopped"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Workers on Site">
            <input
              type="number" value={workers}
              onChange={e => setWorkers(e.target.value)}
              placeholder="Count" min="0"
              style={{
                width: "100%", border: `1.5px solid ${tk.bdr}`,
                borderRadius: 10, padding: "10px 12px",
                fontSize: 14, color: tk.tx, background: tk.surf2,
                outline: "none", WebkitAppearance: "none",
                fontFamily: "'DM Sans',sans-serif",
              }}
            />
          </Field>
        </FormGrid>

        <Btn onClick={save} disabled={saving} fullWidth>
          <ISave size={14} />
          {saving ? "Saving..." : existing ? "Update Log" : "Save Log"}
        </Btn>
        <div style={{ fontSize: 11, color: tk.tx3, marginTop: 8, textAlign: "center" }}>
          One log per day — saving again updates today's entry. Timestamp recorded automatically.
        </div>
      </Card>

      {/* ── Task checklist ── */}
      <Card delay={.1}>
        <CardTitle icon={ICheckSq}>
          Task Checklist
          <span style={{ fontSize: 11, fontWeight: 500, color: tk.tx3, marginLeft: 8 }}>
            {doneTasks.length}/{tasks.length} done
          </span>
        </CardTitle>

        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: tk.tx3, fontSize: 13 }}>
            No tasks yet — add them in Task Tracker.
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, marginBottom: 4 }}>
                  Pending ({pendingTasks.length})
                </div>
                {pendingTasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                    <input type="checkbox" checked={false}
                      onChange={async () => {
                        try { await API.updateTask(t.id, { status: "Completed" }); } catch {}
                        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "Completed" } : x));
                      }}
                      style={{ width: 17, height: 17, accentColor: tk.acc, cursor: "pointer", flexShrink: 0 }}
                    />
                    <label style={{ fontSize: 13, flex: 1, cursor: "pointer" }}>{t.title}</label>
                    <Badge color={t.pri === "High" ? "red" : t.pri === "Medium" ? "amber" : "gray"}>{t.pri}</Badge>
                  </div>
                ))}
              </div>
            )}
            {doneTasks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.grn, marginBottom: 4 }}>
                  Completed ({doneTasks.length})
                </div>
                {doneTasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${tk.bdr}`, opacity: .6 }}>
                    <input type="checkbox" checked={true}
                      onChange={async () => {
                        try { await API.updateTask(t.id, { status: "Pending" }); } catch {}
                        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "Pending" } : x));
                      }}
                      style={{ width: 17, height: 17, accentColor: tk.acc, cursor: "pointer", flexShrink: 0 }}
                    />
                    <label style={{ fontSize: 13, flex: 1, textDecoration: "line-through", color: tk.tx3 }}>{t.title}</label>
                    <Badge color="green">Done</Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ══════════════════════════════════════════════
          LOG HISTORY — past daily logs, newest first
      ══════════════════════════════════════════════ */}
      <Card delay={.15}>
        <CardTitle icon={ICalendar}>
          Log History
          {history.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: tk.tx3, marginLeft: 8 }}>
              {history.length} past {history.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </CardTitle>

        {histLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: tk.tx3, fontSize: 13 }}>
            Loading logs...
          </div>
        ) : history.length === 0 ? (
          <Empty icon={ICalendar} text="No past logs yet. Logs will appear here after you save them." />
        ) : (
          history.map((entry, idx) => {
            const isOpen    = expandedDate === entry.date;
            const savedTime = fmtTime(entry.saved_at || entry.updated_at);
            const safetyColor = SAFETY_COLOR[entry.safety] || "gray";
            const weatherEmoji = WEATHER_EMOJI[entry.weather] || "🌤️";

            return (
              <div
                key={entry.date}
                style={{
                  borderBottom: idx < history.length - 1 ? `1px solid ${tk.bdr}` : "none",
                  animation: `fadeUp .3s ease ${idx * 0.03}s both`,
                }}
              >
                {/* ── Collapsed row (always visible) ── */}
                <button
                  onClick={() => setExpandedDate(isOpen ? null : entry.date)}
                  style={{
                    width: "100%", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left", padding: "12px 0",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  {/* Date badge */}
                  <div style={{
                    minWidth: 46, textAlign: "center", flexShrink: 0,
                    background: isOpen ? tk.accL : tk.surf2,
                    borderRadius: 10, padding: "6px 8px",
                    border: `1px solid ${isOpen ? tk.acc + "44" : tk.bdr}`,
                    transition: "background .15s",
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: isOpen ? tk.acc : tk.tx }}>
                      {new Date(entry.date + "T00:00:00").getDate()}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: isOpen ? tk.acc : tk.tx3, textTransform: "uppercase" }}>
                      {new Date(entry.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: tk.tx }}>
                        {fmtDateSh(entry.date)}
                      </span>
                      <span style={{ fontSize: 12 }}>{weatherEmoji}</span>
                      <Badge color={safetyColor}>{entry.safety || "All Clear"}</Badge>
                      {entry.workers_count != null && (
                        <span style={{ fontSize: 11, color: tk.tx3 }}>
                          👷 {entry.workers_count}
                        </span>
                      )}
                    </div>
                    {/* Notes preview when collapsed */}
                    {!isOpen && entry.notes && (
                      <div style={{
                        fontSize: 12, color: tk.tx2, marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", maxWidth: "100%",
                      }}>
                        {entry.notes}
                      </div>
                    )}
                    {!isOpen && !entry.notes && (
                      <div style={{ fontSize: 12, color: tk.tx3, marginTop: 2, fontStyle: "italic" }}>
                        No notes recorded
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <IChevron down={isOpen} size={16} color={tk.tx3} />
                </button>

                {/* ── Expanded content ── */}
                {isOpen && (
                  <div style={{
                    padding: "0 0 16px 56px",   // indent to align with text
                    animation: "fadeUp .2s ease",
                  }}>
                    {/* Meta row */}
                    <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Weather</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{weatherEmoji} {entry.weather || "Not recorded"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Safety</div>
                        <div style={{ fontSize: 13 }}><Badge color={safetyColor}>{entry.safety || "All Clear"}</Badge></div>
                      </div>
                      {entry.workers_count != null && (
                        <div>
                          <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Workers</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>👷 {entry.workers_count} on site</div>
                        </div>
                      )}
                      {savedTime && (
                        <div>
                          <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Saved at</div>
                          <div style={{ fontSize: 13, color: tk.tx2 }}>{savedTime}</div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {entry.notes ? (
                      <div style={{
                        background: tk.surf2, borderRadius: 10,
                        padding: "12px 14px", fontSize: 13, color: tk.tx,
                        border: `1px solid ${tk.bdr}`,
                        lineHeight: 1.65, whiteSpace: "pre-wrap",
                      }}>
                        {entry.notes}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: tk.tx3, fontStyle: "italic" }}>
                        No observations recorded for this day.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
