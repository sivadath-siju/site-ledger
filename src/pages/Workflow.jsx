import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Textarea, FormGrid, Select, Badge } from "../components/Primitives";
import { IEdit, ISave, ICheckCirc, IXCircle, ICheckSq, IClock } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export default function Workflow() {
  const { tk, tasks, setTasks } = useApp();

  const [log,     setLog]     = useState("");
  const [weather, setWeather] = useState("Clear");
  const [safety,  setSafety]  = useState("All Clear");
  const [workers, setWorkers] = useState("");
  const [msg,     setMsg]     = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [existing, setExisting] = useState(false);  // whether today's log already exists in DB

  // ── Load today's existing log on mount ─────────
  useEffect(() => {
    API.getDailyLog(today())
      .then(data => {
        if (data && data.id) {
          setLog(data.notes || "");
          setWeather(data.weather || "Clear");
          setSafety(data.safety || "All Clear");
          setWorkers(data.workers_count != null ? String(data.workers_count) : "");
          setExisting(true);
        }
      })
      .catch(() => {});   // no log yet for today — that's fine
  }, []);

  // ── Save / update today's log (upsert) ─────────
  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await API.saveDailyLog({
        date:          today(),
        notes:         log,
        weather,
        safety,
        workers_count: workers !== "" ? parseInt(workers) : null,
        saved_at:      new Date().toISOString(),   // full timestamp stored in DB
      });
      setMsg({ t: "ok", s: existing ? "Log updated for today." : "Log saved for today." });
      setExisting(true);
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
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Daily Workflow</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>
          Site log for {fmtDate(today())}
          {existing && (
            <span style={{ marginLeft: 8, background: tk.grnL, color: tk.grn, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
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

      {/* Log form */}
      <Card delay={.05}>
        <CardTitle icon={IEdit}>
          {existing ? "Update Today's Log" : "New Daily Log"}
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
              type="number"
              value={workers}
              onChange={e => setWorkers(e.target.value)}
              placeholder="Count"
              min="0"
              style={{
                width: "100%", border: `1.5px solid ${tk.bdr}`,
                borderRadius: 10, padding: "10px 12px",
                fontSize: 14, color: tk.tx, background: tk.surf2,
                outline: "none", WebkitAppearance: "none",
              }}
            />
          </Field>
        </FormGrid>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn onClick={save} disabled={saving} fullWidth>
            <ISave size={14} />{saving ? "Saving..." : existing ? "Update Log" : "Save Log"}
          </Btn>
        </div>
        <div style={{ fontSize: 11, color: tk.tx3, marginTop: 8, textAlign: "center" }}>
          One log per day — saving again will update today's entry. Date &amp; time are recorded automatically.
        </div>
      </Card>

      {/* Task checklist */}
      <Card delay={.1}>
        <CardTitle icon={ICheckSq}>
          Task Checklist
          <span style={{ fontSize: 11, fontWeight: 500, color: tk.tx3, marginLeft: 8 }}>
            {doneTasks.length}/{tasks.length} done
          </span>
        </CardTitle>

        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: tk.tx3, fontSize: 13 }}>
            No tasks yet — add them in Task Tracker.
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, marginBottom: 6 }}>
                  Pending ({pendingTasks.length})
                </div>
                {pendingTasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        try { await API.updateTask(t.id, { status: "Completed" }); }
                        catch {}
                        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "Completed" } : x));
                      }}
                      style={{ width: 17, height: 17, accentColor: tk.acc, cursor: "pointer", flexShrink: 0 }}
                    />
                    <label style={{ fontSize: 13, flex: 1, cursor: "pointer", color: tk.tx }}>{t.title}</label>
                    <Badge color={t.pri === "High" ? "red" : t.pri === "Medium" ? "amber" : "gray"}>{t.pri}</Badge>
                  </div>
                ))}
              </div>
            )}
            {doneTasks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.grn, marginBottom: 6 }}>
                  Completed ({doneTasks.length})
                </div>
                {doneTasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${tk.bdr}`, opacity: .65 }}>
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={async () => {
                        try { await API.updateTask(t.id, { status: "Pending" }); }
                        catch {}
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
    </div>
  );
}
