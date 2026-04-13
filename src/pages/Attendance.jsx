import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Sheet, Empty, Divider,
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

export default function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles, labourCategories } = useApp();

  // Subcontractors
  const [subcontractors, setSubcontractors] = useState([]);
  const [subTypes, setSubTypes]             = useState(["General"]);
  const [subSheet, setSubSheet]             = useState(false);
  const [newSub,   setNewSub]               = useState({ name: "", type: "General", newType: "", contact_name: "", phone: "", notes: "" });
  const [subMsg,   setSubMsg]               = useState(null);

  // Subcontractor DAILY COUNT state
  const [subLogs,     setSubLogs]     = useState([]);   // all sub daily logs
  const [subLogDate,  setSubLogDate]  = useState(today());
  const [subLogSheet, setSubLogSheet] = useState(false);
  const [subLogSub,   setSubLogSub]   = useState("");   // selected subcontractor id
  const [subLogCount, setSubLogCount] = useState("1");
  const [subLogRate,  setSubLogRate]  = useState("500");
  const [subLogNote,  setSubLogNote]  = useState("");
  const [subLogMsg,   setSubLogMsg]   = useState(null);
  const [subLogSaving,setSubLogSaving]= useState(false);

  // Direct attendance form
  const [wId,     setWId]     = useState("");
  const [date,    setDate]    = useState(today());
  const [present, setPresent] = useState("1");
  const [hours,   setHours]   = useState("8");
  const [ot,      setOt]      = useState("0");
  const [note,    setNote]    = useState("");
  const [msg,     setMsg]     = useState(null);

  // Register filters
  const [filterCat,   setFilterCat]   = useState("All");
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [showFilter,  setShowFilter]  = useState(false);
  const [filterDate,  setFilterDate]  = useState(today()); // for subcontractor log view

  // Add worker sheet
  const [addOpen, setAddOpen] = useState(false);
  const [nw, setNw] = useState({ name: "", role: "Mason", labour_category: "Masonry", rate: "500", phone: "" });

  const loadSubs = () => {
    API.getSubcontractors().then(data => {
      setSubcontractors(data);
      const types = [...new Set(["General", ...data.map(s => s.type)])];
      setSubTypes(types);
    }).catch(() => {});
  };

  const loadSubLogs = (d) => {
    API.getSubDailyAll({ date: d })
      .then(data => setSubLogs(Array.isArray(data) ? data : []))
      .catch(() => setSubLogs([]));
  };

  useEffect(() => { loadSubs(); }, []);
  useEffect(() => { loadSubLogs(filterDate); }, [filterDate]);
  useEffect(() => {
    if (workers.length > 0 && !wId) {
      const first = workers[0];
      if (first) setWId(String(first.id));
    }
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
        worker_id: parseInt(wId), date,
        status: present === "1" ? "present" : present === "half" ? "half" : "absent",
        hours: h, ot_hours: o, note,
      });
      setAtt(prev => [{
        id: res.id || Date.now(), workerId: w.id, name: w.name, role: w.role,
        labour_category: w.labour_category, isSubcontract: false,
        date, present, hours: h, ot: o, otR, total, note, by: user?.name || "",
      }, ...prev]);
      setMsg({ t: "ok", s: `Recorded. Wage: ${Rs(total)}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 3000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  // Delete direct attendance
  const deleteAtt = async (id) => {
    if (!window.confirm("Remove this attendance record?")) return;
    try {
      await API.deleteAttendance(id);
      setAtt(prev => prev.filter(a => a.id !== id));
    } catch (e) { alert(e.message); }
  };

  // Record subcontractor daily count
  const submitSubLog = async () => {
    if (!subLogSub)              return setSubLogMsg({ t: "err", s: "Select a subcontractor." });
    if (!subLogCount || parseInt(subLogCount) < 1) return setSubLogMsg({ t: "err", s: "Worker count must be at least 1." });
    if (!subLogRate || parseFloat(subLogRate) <= 0)  return setSubLogMsg({ t: "err", s: "Enter a daily rate per worker." });
    setSubLogSaving(true);
    try {
      const res = await API.recordSubDaily(subLogSub, {
        date: subLogDate,
        worker_count: parseInt(subLogCount),
        rate_per_worker: parseFloat(subLogRate),
        note: subLogNote || null,
      });
      setSubLogMsg({ t: "ok", s: `Recorded: ${subLogCount} workers × ${Rs(parseFloat(subLogRate))} = ${Rs(res.total_cost)}` });
      loadSubLogs(filterDate);
      setSubLogCount("1"); setSubLogNote("");
      setTimeout(() => setSubLogMsg(null), 3000);
    } catch (e) { setSubLogMsg({ t: "err", s: e.message }); }
    finally { setSubLogSaving(false); }
  };

  const deleteSubLog = async (logId) => {
    if (!window.confirm("Remove this subcontractor log?")) return;
    try {
      await API.deleteSubDaily(logId);
      setSubLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) { alert(e.message); }
  };

  // Add worker
  const addWorker = async () => {
    if (!nw.name.trim()) return alert("Worker name is required.");
    try {
      const res = await API.addWorker({
        name: nw.name, role: nw.role, labour_category: nw.labour_category,
        is_subcontract: 0, daily_rate: parseFloat(nw.rate) || 500, phone: nw.phone,
      });
      setWorkers(prev => [...prev, { ...res, rate: res.daily_rate || 500, is_subcontract: 0, labour_category: res.labour_category || nw.labour_category }]);
      setAddOpen(false);
      setNw({ name: "", role: "Mason", labour_category: "Masonry", rate: "500", phone: "" });
    } catch (e) { alert(e.message); }
  };

  // Add subcontractor
  const addSubcontractor = async () => {
    if (!newSub.name.trim()) return setSubMsg({ t: "err", s: "Name required." });
    const finalType = newSub.type === "__new__" ? (newSub.newType.trim() || "General") : newSub.type;
    try {
      await API.addSubcontractor({ name: newSub.name, type: finalType, contact_name: newSub.contact_name || null, phone: newSub.phone || null });
      setSubMsg({ t: "ok", s: `${newSub.name} added.` });
      setNewSub({ name: "", type: "General", newType: "", contact_name: "", phone: "", notes: "" });
      loadSubs();
      setTimeout(() => setSubMsg(null), 2000);
    } catch (e) { setSubMsg({ t: "err", s: e.message }); }
  };

  const deleteSubcontractor = async (id) => {
    if (!window.confirm("Remove this subcontractor?")) return;
    try { await API.deleteSubcontractor(id); loadSubs(); } catch (e) { alert(e.message); }
  };

  // Derived
  const directAtt = att.filter(a => !a.isSubcontract);
  const totLab    = directAtt.reduce((s, a) => s + (a.total || 0), 0);

  const filteredAtt = att.filter(a => {
    if (a.isSubcontract) return false; // subcontract no longer in this table
    if (filterCat !== "All" && a.labour_category !== filterCat) return false;
    if (from && a.date < from) return false;
    if (to   && a.date > to)   return false;
    return true;
  });

  const catTotals = {};
  directAtt.forEach(a => { const c = a.labour_category || a.role || "General"; catTotals[c] = (catTotals[c] || 0) + (a.total || 0); });
  const allCats = [...new Set(att.map(a => a.labour_category || a.role).filter(Boolean))];

  // Sub logs totals
  const subLogTotal = subLogs.filter(l => l.date === filterDate).reduce((s, l) => s + l.total_cost, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Labour & Attendance</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Daily wages · Subcontractor counts</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" small onClick={() => setSubSheet(true)}><IUsers size={13} />Manage Subcontractors</Btn>
          <Btn variant="primary" small onClick={() => setAddOpen(true)}><IUserPlus size={13} />Add Worker</Btn>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — DIRECT WORKER ATTENDANCE
      ══════════════════════════════════════════════════════ */}
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
          <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
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
          <Field label="Overtime Hours"><Input type="number" value={ot} onChange={e => setOt(e.target.value)} min="0" /></Field>
        </FormGrid>
        <Field label="Notes (optional)"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Remarks" /></Field>
        <Btn onClick={submit} disabled={workers.length === 0}><ISave size={14} />Record Attendance</Btn>
      </Card>

      {/* Worker roster */}
      <Card delay={.1}>
        <CardTitle icon={IUsers}>
          Worker Roster
          <span style={{ fontSize: 11, fontWeight: 400, color: tk.tx3, marginLeft: 6 }}>{workers.length} workers</span>
        </CardTitle>
        {workers.length === 0
          ? <Empty icon={IUsers} text="No workers added. Click 'Add Worker' to begin." />
          : workers.map(w => {
            const recs  = att.filter(a => a.workerId === w.id);
            const total = recs.reduce((s, a) => s + (a.total || 0), 0);
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    {w.name}
                    <Badge color="blue">{w.labour_category || w.role}</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: tk.tx3 }}>{w.role} · ₹{w.rate}/day · {recs.length} day{recs.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13 }}>{Rs(total)}</div>
                  <Btn variant="ghost" small style={{ marginTop: 3 }} onClick={async () => {
                    if (!window.confirm(`Remove ${w.name}?`)) return;
                    try { await API.deleteWorker(w.id); setWorkers(prev => prev.filter(x => x.id !== w.id)); }
                    catch (e) { alert(e.message); }
                  }}>Remove</Btn>
                </div>
              </div>
            );
          })
        }
      </Card>

      {/* Attendance register */}
      {att.length > 0 && (
        <Card delay={.15}>
          <CardTitle icon={IFileText} action={<span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: tk.grn }}>{Rs(totLab)}</span>}>
            Attendance Register
          </CardTitle>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Btn variant={showFilter ? "primary" : "secondary"} small onClick={() => setShowFilter(f => !f)}>
              <IFilter size={12} /> Filter
            </Btn>
            {showFilter && (
              <>
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 140, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }} placeholder="From" />
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 140, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }} placeholder="To" />
                <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 160, padding: "6px 10px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }}>
                  <option value="All">All Categories</option>
                  {allCats.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Btn variant="ghost" small onClick={() => { setFrom(""); setTo(""); setFilterCat("All"); }}>Clear</Btn>
              </>
            )}
          </div>

          <TableWrap>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr>
                  {["Date","Name","Category","Status","Hrs","Wage","Note",""].map(h => (
                    <th key={h} style={{ textAlign: h === "Wage" ? "right" : "left", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAtt.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "20px", textAlign: "center", color: tk.tx3, fontSize: 13 }}>No records match the current filter.</td></tr>
                ) : filteredAtt.map(a => (
                  <tr key={a.id}>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.date}</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}><Badge>{a.labour_category || a.role}</Badge></td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge color={a.present === "1" || a.status === "present" ? "green" : a.present === "half" || a.status === "half" ? "amber" : "red"}>
                        {a.present === "1" || a.status === "present" ? "Present" : a.present === "half" || a.status === "half" ? "Half" : "Absent"}
                      </Badge>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.hours}h{a.ot > 0 ? `+${a.ot}` : ""}</td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13 }}>{Rs(a.total || 0)}</div>
                    </td>
                    <td style={{ padding: "10px", fontSize: 11, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx3, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note || "—"}</td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}` }}>
                      <button
                        onClick={() => deleteAtt(a.id)}
                        title="Delete this record"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#b91c1c"}
                        onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}
                      >
                        <ITrash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — SUBCONTRACTOR DAILY COUNT
      ══════════════════════════════════════════════════════ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 24, marginBottom: 8 }}>
        Subcontractor Labour (Reference)
      </div>

      {/* Record subcontractor count */}
      <Card delay={.05}>
        <CardTitle icon={IUsers}>Record Subcontractor Labour</CardTitle>
        <div style={{ fontSize: 12, color: tk.tx3, marginBottom: 14, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
          Enter how many workers a subcontractor sent today and their rate. No individual names needed.
        </div>
        {subLogMsg && <Alert type={subLogMsg.t}>{subLogMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{subLogMsg.s}</Alert>}

        <FormGrid>
          <Field label="Subcontractor">
            <Select value={subLogSub} onChange={e => {
              setSubLogSub(e.target.value);
              // Auto-fill rate from existing records if available
              const sub = subcontractors.find(s => String(s.id) === e.target.value);
              if (sub?.last_rate) setSubLogRate(String(sub.last_rate));
            }}>
              <option value="">— Select subcontractor —</option>
              {[...new Set(subcontractors.map(s => s.type))].map(type => (
                <optgroup key={type} label={type}>
                  {subcontractors.filter(s => s.type === type).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={subLogDate} onChange={e => setSubLogDate(e.target.value)} /></Field>
        </FormGrid>

        <FormGrid>
          <Field label="Number of Workers">
            <Input type="number" value={subLogCount} onChange={e => setSubLogCount(e.target.value)} min="1" max="500" placeholder="e.g. 8" />
          </Field>
          <Field label="Rate per Worker (₹/day)">
            <Input type="number" value={subLogRate} onChange={e => setSubLogRate(e.target.value)} min="0" placeholder="e.g. 600" />
          </Field>
        </FormGrid>

        {/* Live total preview */}
        {subLogCount && subLogRate && parseInt(subLogCount) > 0 && parseFloat(subLogRate) > 0 && (
          <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 9, border: "1px solid #fde68a", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#92400e" }}>{subLogCount} workers × {Rs(parseFloat(subLogRate))}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: "#78350f" }}>
              {Rs(parseInt(subLogCount) * parseFloat(subLogRate))}
            </span>
          </div>
        )}

        <Field label="Notes (optional)"><Input value={subLogNote} onChange={e => setSubLogNote(e.target.value)} placeholder="e.g. Worked on Block A plastering" /></Field>
        <Btn onClick={submitSubLog} disabled={subLogSaving || !subLogSub}>
          <ISave size={14} />{subLogSaving ? "Saving…" : "Record Subcontractor Labour"}
        </Btn>
      </Card>

      {/* Subcontractor daily log view */}
      <Card delay={.12}>
        <CardTitle icon={IFileText}>
          Subcontractor Log
          {subLogTotal > 0 && (
            <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#92400e", fontWeight: 700, marginLeft: 8 }}>
              {Rs(subLogTotal)} ref
            </span>
          )}
        </CardTitle>

        {/* Date selector for log view */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: tk.tx3 }}>View date:</span>
          <Input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); }}
            style={{ maxWidth: 150, padding: "5px 8px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }}
          />
          <Btn variant="ghost" small onClick={() => setFilterDate(today())}>Today</Btn>
        </div>

        {subLogs.filter(l => l.date === filterDate).length === 0 ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: tk.tx3, fontSize: 13 }}>
            No subcontractor labour recorded for {filterDate}.
          </div>
        ) : (
          <div>
            {subLogs.filter(l => l.date === filterDate).map(log => {
              const typeIdx = subTypes.indexOf(log.subcontractor_type || "General");
              const c = TYPE_COLORS[Math.max(0, typeIdx) % TYPE_COLORS.length];
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{log.subcontractor_name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {log.worker_count} worker{log.worker_count !== 1 ? "s" : ""} × {Rs(log.rate_per_worker)}/day
                      {log.note ? ` · ${log.note}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 15, color: c.text }}>{Rs(log.total_cost)}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>reference only</div>
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

            {/* Daily total */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Total subcontract cost for {filterDate}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: "#78350f" }}>{Rs(subLogTotal)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Labour by category (direct only) */}
      {Object.keys(catTotals).length > 0 && (
        <Card delay={.18}>
          <CardTitle icon={ITag}>Labour by Category (Direct Only)</CardTitle>
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

      {/* ── Add Worker Sheet ── */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Direct Worker" icon={IUserPlus}
        footer={<><Btn variant="secondary" onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="primary" onClick={addWorker} style={{ flex: 2 }}><ISave size={14} />Add Worker</Btn></>}
      >
        <div style={{ fontSize: 12, color: tk.tx3, marginBottom: 12, padding: "8px 12px", background: tk.surf2, borderRadius: 8 }}>
          For subcontractor workers — use the "Record Subcontractor Labour" section instead. This form is for your direct (named) workers only.
        </div>
        <Field label="Full Name"><Input value={nw.name} onChange={e => setNw(p => ({ ...p, name: e.target.value }))} placeholder="Worker's full name" autoComplete="off" /></Field>
        <FormGrid>
          <Field label="Role"><Select value={nw.role} onChange={e => setNw(p => ({ ...p, role: e.target.value }))}>{roles.map(r => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Labour Category"><Select value={nw.labour_category} onChange={e => setNw(p => ({ ...p, labour_category: e.target.value }))}>{(labourCategories || []).map(c => <option key={c}>{c}</option>)}</Select></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Daily Rate (₹)"><Input type="number" value={nw.rate} onChange={e => setNw(p => ({ ...p, rate: e.target.value }))} placeholder="500" min="0" /></Field>
          <Field label="Phone"><Input type="tel" value={nw.phone} onChange={e => setNw(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile" /></Field>
        </FormGrid>
      </Sheet>

      {/* ── Manage Subcontractors Sheet ── */}
      <Sheet open={subSheet} onClose={() => setSubSheet(false)} title="Manage Subcontractors" icon={IUsers}>
        <div style={{ background: tk.surf2, borderRadius: 12, padding: "14px", marginBottom: 16, border: `1px solid ${tk.bdr}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add New Subcontractor</div>
          {subMsg && <Alert type={subMsg.t}>{subMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{subMsg.s}</Alert>}
          <Field label="Firm / Name"><Input value={newSub.name} onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))} placeholder="e.g. ABC Painters Co." autoComplete="off" /></Field>
          <Field label="Type">
            <Select value={newSub.type} onChange={e => setNewSub(p => ({ ...p, type: e.target.value, newType: "" }))}>
              {subTypes.map(t => <option key={t}>{t}</option>)}
              <option value="__new__">+ Create new type…</option>
            </Select>
          </Field>
          {newSub.type === "__new__" && (
            <Field label="New Type Name"><Input value={newSub.newType} onChange={e => setNewSub(p => ({ ...p, newType: e.target.value }))} placeholder="e.g. Painters Subcontractor" /></Field>
          )}
          <FormGrid>
            <Field label="Contact Name"><Input value={newSub.contact_name} onChange={e => setNewSub(p => ({ ...p, contact_name: e.target.value }))} placeholder="Person name" /></Field>
            <Field label="Phone"><Input type="tel" value={newSub.phone} onChange={e => setNewSub(p => ({ ...p, phone: e.target.value }))} placeholder="Number" /></Field>
          </FormGrid>
          <Btn variant="primary" onClick={addSubcontractor} style={{ width: "100%" }}><IPlus size={14} />Add Subcontractor</Btn>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
          Existing ({subcontractors.length})
        </div>
        {subcontractors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: tk.tx3, fontSize: 13 }}>No subcontractors added yet.</div>
        ) : (
          [...new Set(subcontractors.map(s => s.type))].map((type, ti) => {
            const c     = TYPE_COLORS[ti % TYPE_COLORS.length];
            const group = subcontractors.filter(s => s.type === type);
            return (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: ".06em" }}>{type}</span>
                </div>
                {group.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {s.contact_name || "—"}{s.phone ? ` · ${s.phone}` : ""}
                        {s.total_cost > 0 ? ` · ${Rs(s.total_cost)} total` : ""}
                      </div>
                    </div>
                    <button onClick={() => deleteSubcontractor(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6 }}>
                      <ITrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </Sheet>
    </div>
  );
}
