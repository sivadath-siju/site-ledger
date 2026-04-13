import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, Badge, Sheet, Empty, Divider,
} from "../components/Primitives";
import { IUserPlus, IClipboard, ICheckCirc, IXCircle, IUsers, IFileText, ISave, ITag, IPlus, ITrash, IFilter } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

const TYPE_COLORS = [
  { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", dot: "#3b82f6" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15653a", dot: "#22c55e" },
  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", dot: "#f97316" },
  { bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e", dot: "#0ea5e9" },
];

// Grouped attendance by date with day dividers
function AttRegister({ records, onDelete, hasFinance, tk }) {
  if (records.length === 0) return null;

  // Group by date
  const byDate = {};
  records.forEach(a => { if (!byDate[a.date]) byDate[a.date] = []; byDate[a.date].push(a); });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const statusBadge = a => {
    const s = a.status || a.present;
    const isPresent = s === "present" || s === "1";
    const isHalf    = s === "half";
    return <Badge color={isPresent ? "green" : isHalf ? "amber" : "red"}>{isPresent ? "Present" : isHalf ? "Half" : "Absent"}</Badge>;
  };

  return (
    <div>
      {sortedDates.map(date => {
        const dayRecs  = byDate[date];
        const dayTotal = dayRecs.reduce((s, a) => s + (a.total || 0), 0);
        return (
          <div key={date}>
            {/* Day header divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px" }}>
              <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".1em", whiteSpace: "nowrap" }}>
                  {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                {dayTotal > 0 && (
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#15803d", background: "#f0fdf4", padding: "1px 7px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                    {Rs(dayTotal)}
                  </span>
                )}
              </div>
              <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
            </div>

            {/* Records for this date */}
            {dayRecs.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", marginBottom: 4,
                borderRadius: 9, border: `1px solid ${tk.bdr}`, background: tk.surf,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {a.name || a.worker_name}
                    <Badge>{a.labour_category || a.role}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: tk.tx3, marginTop: 2 }}>
                    {a.hours || 8}h{(a.ot || a.ot_hours || 0) > 0 ? ` + ${a.ot || a.ot_hours}h OT` : ""}
                    {a.note ? ` · ${a.note}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {statusBadge(a)}
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13, color: tk.tx }}>
                    {Rs(a.total || 0)}
                  </div>
                  {/* Delete — only admin/owner */}
                  {hasFinance && (
                    <button
                      onClick={() => onDelete(a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#b91c1c"}
                      onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}
                      title="Delete record (admin only)"
                    >
                      <ITrash size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles, labourCategories, hasFinance } = useApp();

  // Subcontractors
  const [subcontractors, setSubcontractors] = useState([]);
  const [subTypes,       setSubTypes]       = useState(["General"]);
  const [subSheet,       setSubSheet]       = useState(false);
  const [newSub,  setNewSub]  = useState({ name: "", type: "General", newType: "", contact_name: "", phone: "" });
  const [subMsg,  setSubMsg]  = useState(null);

  // Subcontractor daily count
  const [subLogs,      setSubLogs]      = useState([]);
  const [subLogDate,   setSubLogDate]   = useState(today());
  const [subLogSub,    setSubLogSub]    = useState("");
  const [subLogCat,    setSubLogCat]    = useState("Mason");   // ← category for sub workers
  const [subLogCount,  setSubLogCount]  = useState("1");
  const [subLogRate,   setSubLogRate]   = useState("500");
  const [subLogNote,   setSubLogNote]   = useState("");
  const [subLogMsg,    setSubLogMsg]    = useState(null);
  const [subLogSaving, setSubLogSaving] = useState(false);
  const [filterSubDate,setFilterSubDate]= useState(today());

  // Direct attendance form
  const [wId,     setWId]     = useState("");
  const [attDate, setAttDate] = useState(today());
  const [present, setPresent] = useState("1");
  const [hours,   setHours]   = useState("8");
  const [ot,      setOt]      = useState("0");
  const [note,    setNote]    = useState("");
  const [msg,     setMsg]     = useState(null);

  // Filters for log
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCat,  setFilterCat]  = useState("All");

  // Add worker sheet
  const [addOpen, setAddOpen] = useState(false);
  const [nw, setNw] = useState({ name: "", role: "Mason", labour_category: "Masonry", rate: "500", phone: "" });

  const loadSubs = () => {
    API.getSubcontractors().then(data => {
      setSubcontractors(data);
      setSubTypes([...new Set(["General", ...data.map(s => s.type)])]);
    }).catch(() => {});
  };

  const loadSubLogs = d => {
    API.getSubDailyAll({ date: d }).then(data => setSubLogs(Array.isArray(data) ? data : [])).catch(() => setSubLogs([]));
  };

  useEffect(() => { loadSubs(); }, []);
  useEffect(() => { loadSubLogs(filterSubDate); }, [filterSubDate]);
  useEffect(() => {
    if (workers.length > 0 && !wId) { const first = workers[0]; if (first) setWId(String(first.id)); }
  }, [workers]);

  // Mark direct worker attendance
  const submit = async () => {
    const w = workers.find(x => x.id === parseInt(wId));
    if (!w) return setMsg({ t: "err", s: "Select a worker." });
    const h   = parseFloat(hours) || 0;
    const o   = parseFloat(ot) || 0;
    const otR = Math.round(w.rate / 8 * 1.5);
    const base  = present === "half" ? w.rate / 2 : present === "1" ? w.rate : 0;
    const total = base + o * otR;
    try {
      const res = await API.recordAttendance({
        worker_id: parseInt(wId), date: attDate,
        status: present === "1" ? "present" : present === "half" ? "half" : "absent",
        hours: h, ot_hours: o, note,
      });
      setAtt(prev => [{
        id: res.id || Date.now(), workerId: w.id, name: w.name, role: w.role,
        labour_category: w.labour_category, isSubcontract: false,
        date: attDate, present, hours: h, ot: o, otR, total, note, by: user?.name || "",
      }, ...prev]);
      setMsg({ t: "ok", s: `Recorded. Wage: ${Rs(total)}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 3000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  // Delete direct attendance (admin only — enforced by UI, also by backend)
  const deleteAtt = async id => {
    if (!window.confirm("Remove this attendance record?")) return;
    try { await API.deleteAttendance(id); setAtt(prev => prev.filter(a => a.id !== id)); }
    catch (e) { alert(e.message); }
  };

  // Record subcontractor daily count with category
  const submitSubLog = async () => {
    if (!subLogSub)                                return setSubLogMsg({ t: "err", s: "Select a subcontractor." });
    if (!subLogCount || parseInt(subLogCount) < 1) return setSubLogMsg({ t: "err", s: "Worker count must be at least 1." });
    if (!subLogRate || parseFloat(subLogRate) <= 0)  return setSubLogMsg({ t: "err", s: "Enter a daily rate per worker." });
    setSubLogSaving(true);
    try {
      const res = await API.recordSubDaily(subLogSub, {
        date: subLogDate,
        category: subLogCat || "General",
        worker_count: parseInt(subLogCount),
        rate_per_worker: parseFloat(subLogRate),
        note: subLogNote || null,
      });
      setSubLogMsg({ t: "ok", s: `${subLogCount} ${subLogCat}${parseInt(subLogCount) !== 1 ? "s" : ""} × ${Rs(parseFloat(subLogRate))} = ${Rs(res.total_cost)}` });
      loadSubLogs(filterSubDate);
      setSubLogCount("1"); setSubLogNote("");
      setTimeout(() => setSubLogMsg(null), 3000);
    } catch (e) { setSubLogMsg({ t: "err", s: e.message }); }
    finally { setSubLogSaving(false); }
  };

  const deleteSubLog = async logId => {
    if (!window.confirm("Remove this subcontractor log?")) return;
    try { await API.deleteSubDaily(logId); setSubLogs(prev => prev.filter(l => l.id !== logId)); }
    catch (e) { alert(e.message); }
  };

  const addWorker = async () => {
    if (!nw.name.trim()) return alert("Worker name required.");
    try {
      const res = await API.addWorker({ name: nw.name, role: nw.role, labour_category: nw.labour_category, is_subcontract: 0, daily_rate: parseFloat(nw.rate) || 500, phone: nw.phone });
      setWorkers(prev => [...prev, { ...res, rate: res.daily_rate || 500, is_subcontract: 0, labour_category: res.labour_category || nw.labour_category }]);
      setAddOpen(false);
      setNw({ name: "", role: "Mason", labour_category: "Masonry", rate: "500", phone: "" });
    } catch (e) { alert(e.message); }
  };

  const addSubcontractor = async () => {
    if (!newSub.name.trim()) return setSubMsg({ t: "err", s: "Name required." });
    const finalType = newSub.type === "__new__" ? (newSub.newType.trim() || "General") : newSub.type;
    try {
      await API.addSubcontractor({ name: newSub.name, type: finalType, contact_name: newSub.contact_name || null, phone: newSub.phone || null });
      setSubMsg({ t: "ok", s: `${newSub.name} added.` });
      setNewSub({ name: "", type: "General", newType: "", contact_name: "", phone: "" });
      loadSubs();
      setTimeout(() => setSubMsg(null), 2000);
    } catch (e) { setSubMsg({ t: "err", s: e.message }); }
  };

  const deleteSubcontractor = async id => {
    if (!window.confirm("Remove this subcontractor?")) return;
    try { await API.deleteSubcontractor(id); loadSubs(); } catch (e) { alert(e.message); }
  };

  // Derived
  const directAtt = att.filter(a => !a.isSubcontract);
  const totLab    = directAtt.reduce((s, a) => s + (a.total || 0), 0);
  const subLogTotal = subLogs.filter(l => l.date === filterSubDate).reduce((s, l) => s + l.total_cost, 0);

  const filteredAtt = directAtt.filter(a => {
    if (filterCat !== "All" && a.labour_category !== filterCat) return false;
    if (from && a.date < from) return false;
    if (to   && a.date > to)   return false;
    return true;
  });

  const catTotals = {};
  directAtt.forEach(a => { const c = a.labour_category || a.role || "General"; catTotals[c] = (catTotals[c] || 0) + (a.total || 0); });
  const allCats = [...new Set(directAtt.map(a => a.labour_category || a.role).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Labour & Attendance</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Direct wages · Subcontractor counts</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" small onClick={() => setSubSheet(true)}><IUsers size={13} />Subcontractors</Btn>
          <Btn variant="primary" small onClick={() => setAddOpen(true)}><IUserPlus size={13} />Add Worker</Btn>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 1 — DIRECT WORKER ATTENDANCE
      ═══════════════════════════════════════════ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
        Direct Workers
      </div>

      <Card delay={.05}>
        <CardTitle icon={IClipboard}>Mark Attendance</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <Field label="Worker">
          <Select value={wId} onChange={e => setWId(e.target.value)}>
            {workers.length === 0
              ? <option value="">— Add workers first —</option>
              : workers.map(w => <option key={w.id} value={w.id}>{w.name} — {w.role} (₹{w.rate}/day)</option>)
            }
          </Select>
        </Field>
        <FormGrid>
          <Field label="Date"><Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={present} onChange={e => setPresent(e.target.value)}>
              <option value="1">Present</option>
              <option value="0">Absent</option>
              <option value="half">Half Day</option>
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Regular Hours"><Input type="number" value={hours} onChange={e => setHours(e.target.value)} min="0" max="12" /></Field>
          <Field label="Overtime Hrs"><Input type="number" value={ot} onChange={e => setOt(e.target.value)} min="0" /></Field>
        </FormGrid>
        <Field label="Notes"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        <Btn onClick={submit} disabled={workers.length === 0}><ISave size={14} />Record Attendance</Btn>
      </Card>

      {/* ═══════════════════════════════════════════
          SECTION 2 — SUBCONTRACTOR ATTENDANCE
      ═══════════════════════════════════════════ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 24, marginBottom: 8 }}>
        Subcontractor Labour (Reference Only)
      </div>

      <Card delay={.05}>
        <CardTitle icon={IUsers}>Record Subcontractor Labour</CardTitle>
        <div style={{ fontSize: 12, color: tk.tx3, marginBottom: 14, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
          Record how many workers of each category a subcontractor sent. No individual names needed.
        </div>
        {subLogMsg && <Alert type={subLogMsg.t}>{subLogMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{subLogMsg.s}</Alert>}

        <FormGrid>
          <Field label="Subcontractor">
            <Select value={subLogSub} onChange={e => setSubLogSub(e.target.value)}>
              <option value="">— Select —</option>
              {[...new Set(subcontractors.map(s => s.type))].map(type => (
                <optgroup key={type} label={type}>
                  {subcontractors.filter(s => s.type === type).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={subLogDate} onChange={e => setSubLogDate(e.target.value)} /></Field>
        </FormGrid>

        {/* Category selection — this is the new key field */}
        <Field label="Worker Category">
          <Select value={subLogCat} onChange={e => setSubLogCat(e.target.value)}>
            {(labourCategories || ["Mason","Helper","Carpenter","Painter","Electrician","Plumber","Welder","Driver","General"]).map(c => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>

        <FormGrid>
          <Field label="Number of Workers">
            <Input type="number" value={subLogCount} onChange={e => setSubLogCount(e.target.value)} min="1" max="500" placeholder="e.g. 8" />
          </Field>
          <Field label="Rate / Worker / Day (₹)">
            <Input type="number" value={subLogRate} onChange={e => setSubLogRate(e.target.value)} min="0" placeholder="e.g. 600" />
          </Field>
        </FormGrid>

        {/* Live total preview */}
        {subLogCount && subLogRate && parseInt(subLogCount) > 0 && parseFloat(subLogRate) > 0 && (
          <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 9, border: "1px solid #fde68a", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#92400e" }}>{subLogCount} {subLogCat}{parseInt(subLogCount) !== 1 ? "s" : ""} × {Rs(parseFloat(subLogRate))}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: "#78350f" }}>{Rs(parseInt(subLogCount) * parseFloat(subLogRate))}</span>
          </div>
        )}

        <Field label="Notes (optional)"><Input value={subLogNote} onChange={e => setSubLogNote(e.target.value)} placeholder="e.g. Block A plastering" /></Field>
        <Btn onClick={submitSubLog} disabled={subLogSaving || !subLogSub}>
          <ISave size={14} />{subLogSaving ? "Saving…" : "Record Labour"}
        </Btn>
      </Card>

      {/* Subcontractor log view */}
      <Card delay={.1}>
        <CardTitle icon={IFileText}>
          Subcontractor Log
          {subLogTotal > 0 && (
            <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#92400e", fontWeight: 700, marginLeft: 8 }}>{Rs(subLogTotal)}</span>
          )}
        </CardTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: tk.tx3 }}>View date:</span>
          <Input type="date" value={filterSubDate} onChange={e => setFilterSubDate(e.target.value)}
            style={{ maxWidth: 150, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }} />
          <Btn variant="ghost" small onClick={() => setFilterSubDate(today())}>Today</Btn>
        </div>

        {subLogs.filter(l => l.date === filterSubDate).length === 0 ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: tk.tx3, fontSize: 13 }}>No subcontractor labour for {filterSubDate}.</div>
        ) : (
          <div>
            {subLogs.filter(l => l.date === filterSubDate).map(log => {
              const typeIdx = subTypes.indexOf(log.subcontractor_type || "General");
              const c = TYPE_COLORS[Math.max(0, typeIdx) % TYPE_COLORS.length];
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
                      {log.subcontractor_name}
                      {/* Category badge */}
                      <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, background: c.dot + "33", color: c.text, padding: "1px 7px", borderRadius: 20, border: `1px solid ${c.dot}66` }}>
                        {log.category}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {log.worker_count} worker{log.worker_count !== 1 ? "s" : ""} × {Rs(log.rate_per_worker)}/day
                      {log.note ? ` · ${log.note}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 15, color: c.text }}>{Rs(log.total_cost)}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>ref only</div>
                  </div>
                  <button onClick={() => deleteSubLog(log.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#b91c1c"}
                    onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}>
                    <ITrash size={14} />
                  </button>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Total for {filterSubDate}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: "#78350f" }}>{Rs(subLogTotal)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════
          SECTION 3 — WORKER ROSTER
      ═══════════════════════════════════════════ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 24, marginBottom: 8 }}>
        Worker Roster
      </div>

      <Card delay={.15}>
        <CardTitle icon={IUsers}>
          Direct Workers
          <span style={{ fontSize: 11, fontWeight: 400, color: tk.tx3, marginLeft: 6 }}>{workers.length} registered</span>
        </CardTitle>
        {workers.length === 0 ? <Empty icon={IUsers} text="No workers. Click 'Add Worker'." /> : workers.map(w => {
          const recs  = att.filter(a => a.workerId === w.id);
          const total = recs.reduce((s, a) => s + (a.total || 0), 0);
          return (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {w.name}<Badge color="blue">{w.labour_category || w.role}</Badge>
                </div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>{w.role} · ₹{w.rate}/day · {recs.length} day{recs.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13 }}>{Rs(total)}</div>
                {hasFinance && (
                  <Btn variant="ghost" small style={{ marginTop: 3 }} onClick={async () => {
                    if (!window.confirm(`Remove ${w.name}?`)) return;
                    try { await API.deleteWorker(w.id); setWorkers(prev => prev.filter(x => x.id !== w.id)); }
                    catch (e) { alert(e.message); }
                  }}>Remove</Btn>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Labour by category */}
      {Object.keys(catTotals).length > 0 && (
        <Card delay={.18}>
          <CardTitle icon={ITag}>By Category (Direct Only)</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 9 }}>
            {Object.entries(catTotals).filter(([, v]) => v > 0).map(([cat, total]) => (
              <div key={cat} style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{Rs(total)}</div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>{cat}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 4 — ATTENDANCE LOG (with day dividers + admin delete)
      ═══════════════════════════════════════════ */}
      {directAtt.length > 0 && (
        <Card delay={.22}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <CardTitle icon={IFileText} action={<span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: tk.grn }}>{Rs(totLab)}</span>}>
              Attendance Log
            </CardTitle>
            <Btn variant={showFilter ? "primary" : "secondary"} small onClick={() => setShowFilter(f => !f)}>
              <IFilter size={12} />Filter
            </Btn>
          </div>

          {showFilter && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 140, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }} />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 140, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }} />
              <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 160, padding: "6px 10px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }}>
                <option value="All">All Categories</option>
                {allCats.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Btn variant="ghost" small onClick={() => { setFrom(""); setTo(""); setFilterCat("All"); }}>Clear</Btn>
            </div>
          )}

          {!hasFinance && (
            <div style={{ fontSize: 11, color: tk.tx3, marginBottom: 10, padding: "6px 10px", background: tk.surf2, borderRadius: 7 }}>
              Attendance deletion is restricted to Administrators and Site Owners.
            </div>
          )}

          <AttRegister records={filteredAtt} onDelete={deleteAtt} hasFinance={hasFinance} tk={tk} />
        </Card>
      )}

      {/* ── Add Worker Sheet ── */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Direct Worker" icon={IUserPlus}
        footer={<><Btn variant="secondary" onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="primary" onClick={addWorker} style={{ flex: 2 }}><ISave size={14} />Add</Btn></>}
      >
        <div style={{ fontSize: 12, color: tk.tx3, marginBottom: 12, padding: "8px 12px", background: tk.surf2, borderRadius: 8 }}>
          For subcontractor workers, use the "Record Subcontractor Labour" section. This is for named direct workers only.
        </div>
        <Field label="Full Name"><Input value={nw.name} onChange={e => setNw(p => ({ ...p, name: e.target.value }))} placeholder="Worker's full name" autoComplete="off" /></Field>
        <FormGrid>
          <Field label="Role"><Select value={nw.role} onChange={e => setNw(p => ({ ...p, role: e.target.value }))}>{roles.map(r => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Category"><Select value={nw.labour_category} onChange={e => setNw(p => ({ ...p, labour_category: e.target.value }))}>{(labourCategories || []).map(c => <option key={c}>{c}</option>)}</Select></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Daily Rate (₹)"><Input type="number" value={nw.rate} onChange={e => setNw(p => ({ ...p, rate: e.target.value }))} placeholder="500" /></Field>
          <Field label="Phone"><Input type="tel" value={nw.phone} onChange={e => setNw(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile" /></Field>
        </FormGrid>
      </Sheet>

      {/* ── Manage Subcontractors Sheet ── */}
      <Sheet open={subSheet} onClose={() => setSubSheet(false)} title="Manage Subcontractors" icon={IUsers}>
        <div style={{ background: tk.surf2, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${tk.bdr}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add Subcontractor</div>
          {subMsg && <Alert type={subMsg.t}>{subMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{subMsg.s}</Alert>}
          <Field label="Firm Name"><Input value={newSub.name} onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))} placeholder="e.g. ABC Painters Co." /></Field>
          <Field label="Type">
            <Select value={newSub.type} onChange={e => setNewSub(p => ({ ...p, type: e.target.value, newType: "" }))}>
              {subTypes.map(t => <option key={t}>{t}</option>)}
              <option value="__new__">+ Create new type…</option>
            </Select>
          </Field>
          {newSub.type === "__new__" && (
            <Field label="New Type Name"><Input value={newSub.newType} onChange={e => setNewSub(p => ({ ...p, newType: e.target.value }))} placeholder="e.g. Painters" /></Field>
          )}
          <FormGrid>
            <Field label="Contact"><Input value={newSub.contact_name} onChange={e => setNewSub(p => ({ ...p, contact_name: e.target.value }))} placeholder="Name" /></Field>
            <Field label="Phone"><Input type="tel" value={newSub.phone} onChange={e => setNewSub(p => ({ ...p, phone: e.target.value }))} placeholder="Number" /></Field>
          </FormGrid>
          <Btn variant="primary" onClick={addSubcontractor} style={{ width: "100%" }}><IPlus size={14} />Add</Btn>
        </div>

        {[...new Set(subcontractors.map(s => s.type))].map((type, ti) => {
          const c = TYPE_COLORS[ti % TYPE_COLORS.length];
          return (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }} />{type}
              </div>
              {subcontractors.filter(s => s.type === type).map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{s.contact_name || "—"}{s.phone ? ` · ${s.phone}` : ""}{s.total_cost > 0 ? ` · ${Rs(s.total_cost)} total` : ""}</div>
                  </div>
                  <button onClick={() => deleteSubcontractor(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4 }}>
                    <ITrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </Sheet>
    </div>
  );
}
