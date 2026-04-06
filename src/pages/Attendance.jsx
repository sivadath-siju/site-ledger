import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Sheet, Empty, Divider,
} from "../components/Primitives";
import { IUserPlus, IClipboard, ICheckCirc, IXCircle, IUsers, IFileText, ISave, ITag, IPlus, ITrash } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

// ── Subcontractor type colours ──────────────────────────────
const TYPE_COLORS = [
  { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", dot: "#3b82f6" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15653a", dot: "#22c55e" },
  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", dot: "#f97316" },
  { bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e", dot: "#0ea5e9" },
];
const typeColor = (typeName, all) => {
  const idx = all.indexOf(typeName);
  return TYPE_COLORS[idx % TYPE_COLORS.length] || TYPE_COLORS[0];
};

export default function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles, labourCategories } = useApp();

  // Subcontractors state
  const [subcontractors, setSubcontractors]   = useState([]);
  const [subTypes, setSubTypes]               = useState(["General"]);
  const [subSheet, setSubSheet]               = useState(false);   // manage subcontractors sheet
  const [newSub, setNewSub]                   = useState({ name: "", type: "General", newType: "", contact_name: "", phone: "", notes: "" });
  const [subMsg, setSubMsg]                   = useState(null);
  const [subTotals, setSubTotals]             = useState({ bySub: [], byType: [] });

  // Attendance form
  const [addOpen,  setAddOpen]  = useState(false);
  const [wId,      setWId]      = useState("");
  const [date,     setDate]     = useState(today());
  const [present,  setPresent]  = useState("1");
  const [hours,    setHours]    = useState("8");
  const [ot,       setOt]       = useState("0");
  const [note,     setNote]     = useState("");
  const [msg,      setMsg]      = useState(null);

  // Register filters
  const [filterCat, setFilterCat] = useState("All");
  const [showSub,   setShowSub]   = useState(true);

  // New worker sheet
  const [nw, setNw] = useState({ name: "", role: "Mason", labour_category: "Masonry", is_subcontract: false, subcontractor_id: "", rate: "500", phone: "" });

  // Load subcontractors
  const loadSubs = () => {
    API.getSubcontractors().then(data => {
      setSubcontractors(data);
      const types = [...new Set(["General", ...data.map(s => s.type)])];
      setSubTypes(types);
    }).catch(() => {});
    API.getSubcontractorTotals?.().then(setSubTotals).catch(() => {});
  };

  useEffect(() => { loadSubs(); }, []);
  useEffect(() => { if (workers.length > 0 && !wId) { const first = workers.find(w => !w.is_subcontract); if (first) setWId(String(first.id)); } }, [workers]);

  // Mark attendance
  const submit = async () => {
    const w = workers.find(x => x.id === parseInt(wId));
    if (!w) return setMsg({ t: "err", s: "Select a worker." });
    const h    = parseFloat(hours) || 0;
    const o    = parseFloat(ot)    || 0;
    const otR  = Math.round(w.rate / 8 * 1.5);
    const base = present === "half" ? w.rate / 2 : present === "1" ? w.rate : 0;
    const total = base + o * otR;
    const sub   = subcontractors.find(s => s.id === w.subcontractor_id);
    try {
      await API.recordAttendance({ worker_id: parseInt(wId), date, status: present === "1" ? "present" : present === "half" ? "half" : "absent", hours: h, ot_hours: o, note });
      setAtt(prev => [{
        id: Date.now(), workerId: w.id, name: w.name, role: w.role,
        labour_category: w.labour_category, isSubcontract: !!w.is_subcontract,
        subcontractor_id: w.subcontractor_id, subcontractor: sub?.name || w.subcontractor,
        date, present, hours: h, ot: o, otR, total, note, by: user?.name || "",
      }, ...prev]);
      setMsg({ t: "ok", s: w.is_subcontract ? `Recorded — ₹${total} (subcontract reference)` : `Recorded. Wage: ${Rs(total)}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 3000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  // Add worker
  const addWorker = async () => {
    if (!nw.name.trim()) return alert("Worker name is required.");
    // ── Require subcontractor selection for subcontract workers ──
    if (nw.is_subcontract && !nw.subcontractor_id) {
      return alert("Please select a subcontractor for this subcontract worker.\nClick 'Manage Subcontractors' to add one first if needed.");
    }
    try {
      const res = await API.addWorker({ name: nw.name, role: nw.role, labour_category: nw.labour_category, is_subcontract: nw.is_subcontract ? 1 : 0, subcontractor_id: nw.subcontractor_id ? parseInt(nw.subcontractor_id) : null, daily_rate: parseFloat(nw.rate) || 500, phone: nw.phone });
      setWorkers(prev => [...prev, { ...res, rate: res.daily_rate || 500, is_subcontract: res.is_subcontract || 0, labour_category: res.labour_category || nw.labour_category }]);
      setAddOpen(false);
      setNw({ name: "", role: "Mason", labour_category: "Masonry", is_subcontract: false, subcontractor_id: "", rate: "500", phone: "" });
    } catch (e) { alert(e.message); }
  };

  // Add subcontractor
  const addSubcontractor = async () => {
    if (!newSub.name.trim()) return setSubMsg({ t: "err", s: "Name required." });
    const finalType = newSub.newType.trim() || newSub.type;
    if (!finalType) return setSubMsg({ t: "err", s: "Type required." });
    try {
      await API.addSubcontractor({ name: newSub.name, type: finalType, contact_name: newSub.contact_name || null, phone: newSub.phone || null, notes: newSub.notes || null });
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
  const subAtt    = att.filter(a => a.isSubcontract);
  const totLab    = directAtt.reduce((s, a) => s + (a.total || 0), 0);
  const totSub    = subAtt.reduce((s, a) => s + (a.total || 0), 0);

  const filteredAtt = att.filter(a => {
    if (!showSub && a.isSubcontract) return false;
    if (filterCat !== "All" && a.labour_category !== filterCat) return false;
    return true;
  });

  const catTotals = {};
  directAtt.forEach(a => { const c = a.labour_category || a.role || "General"; catTotals[c] = (catTotals[c] || 0) + (a.total || 0); });
  const allCats = [...new Set(att.map(a => a.labour_category || a.role).filter(Boolean))];

  // Subcontract totals by type (for reference panel)
  const subByType = {};
  subTotals.byType?.forEach(t => { subByType[t.type] = t; });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Labour & Attendance</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Daily wages and attendance register</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" small onClick={() => setSubSheet(true)}><IUsers size={13} />Manage Subcontractors</Btn>
          <Btn variant="primary" small onClick={() => setAddOpen(true)}><IUserPlus size={13} />Add Worker</Btn>
        </div>
      </div>

      {/* Mark attendance */}
      <Card delay={.05}>
        <CardTitle icon={IClipboard}>Mark Attendance</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <Field label="Worker">
          <Select value={wId} onChange={e => setWId(e.target.value)}>
            {workers.length === 0 && <option value="">— Add workers first —</option>}
            {workers.filter(w => !w.is_subcontract).length > 0 && (
              <optgroup label="Direct Workers">
                {workers.filter(w => !w.is_subcontract).map(w => <option key={w.id} value={w.id}>{w.name} — {w.role}</option>)}
              </optgroup>
            )}
            {workers.filter(w => w.is_subcontract).length > 0 && (
              <optgroup label="Subcontract Workers">
                {workers.filter(w => w.is_subcontract).map(w => {
                  const sub = subcontractors.find(s => s.id === w.subcontractor_id);
                  return <option key={w.id} value={w.id}>{w.name} — {w.role} [{sub?.name || "Sub"}]</option>;
                })}
              </optgroup>
            )}
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
          <Field label="Overtime Hrs"><Input type="number" value={ot} onChange={e => setOt(e.target.value)} min="0" /></Field>
        </FormGrid>
        <Field label="Notes (optional)"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Remarks" /></Field>
        <Btn onClick={submit} disabled={workers.length === 0}><ISave size={14} />Record Attendance</Btn>
      </Card>

      {/* Worker roster */}
      <Card delay={.1}>
        <CardTitle icon={IUsers}>
          Worker Roster
          <span style={{ fontSize: 11, fontWeight: 400, color: tk.tx3, marginLeft: 6 }}>{workers.filter(w => !w.is_subcontract).length} direct · {workers.filter(w => w.is_subcontract).length} subcontract</span>
        </CardTitle>
        {workers.length === 0 ? <Empty icon={IUsers} text="No workers added. Click 'Add Worker' to begin." /> : workers.map(w => {
          const recs  = att.filter(a => a.workerId === w.id);
          const total = recs.reduce((s, a) => s + (a.total || 0), 0);
          const sub   = subcontractors.find(s => s.id === w.subcontractor_id);
          return (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {w.name}
                  {w.is_subcontract ? <Badge color="amber">Sub</Badge> : <Badge color="blue">{w.labour_category || w.role}</Badge>}
                </div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>
                  {w.role} · ₹{w.rate}/day · {recs.length} day{recs.length !== 1 ? "s" : ""}
                  {sub ? ` · via ${sub.name} (${sub.type})` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13, color: w.is_subcontract ? "#92400e" : tk.tx }}>
                  {Rs(total)}{w.is_subcontract && <span style={{ fontSize: 9, color: "#9ca3af", display: "block" }}>ref</span>}
                </div>
                <Btn variant="ghost" small style={{ marginTop: 3 }} onClick={async () => { try { await API.deleteWorker(w.id); setWorkers(prev => prev.filter(x => x.id !== w.id)); } catch (e) { alert(e.message); } }}>Remove</Btn>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Attendance register */}
      {att.length > 0 && (
        <Card delay={.15}>
          <CardTitle icon={IFileText} action={<span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: tk.grn }}>{Rs(totLab)} direct</span>}>
            Attendance Register
          </CardTitle>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 160, padding: "6px 10px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx }}>
              <option value="All">All Categories</option>
              {allCats.map(c => <option key={c}>{c}</option>)}
            </Select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: tk.tx2, cursor: "pointer" }}>
              <input type="checkbox" checked={showSub} onChange={e => setShowSub(e.target.checked)} style={{ accentColor: tk.acc }} />
              Show subcontract
            </label>
          </div>
          <TableWrap>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr>
                  {["Date","Name","Category","Status","Hrs","Wage","Note"].map(h => (
                    <th key={h} style={{ textAlign: h === "Wage" ? "right" : "left", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAtt.map(a => (
                  <tr key={a.id} style={{ background: a.isSubcontract ? "#fffbeb" : "transparent" }}>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.date}</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>
                      {a.name}{a.isSubcontract && <span style={{ fontSize: 9, color: "#92400e", marginLeft: 4 }}>sub</span>}
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}><Badge>{a.labour_category || a.role}</Badge></td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge color={a.present === "1" || a.status === "present" ? "green" : a.present === "half" || a.status === "half" ? "amber" : "red"}>
                        {a.present === "1" || a.status === "present" ? "Present" : a.present === "half" || a.status === "half" ? "Half" : "Absent"}
                      </Badge>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.hours}h{a.ot > 0 ? `+${a.ot}` : ""}</td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13, color: a.isSubcontract ? "#92400e" : tk.tx }}>{Rs(a.total || 0)}</div>
                      {a.isSubcontract && <div style={{ fontSize: 9, color: "#9ca3af" }}>ref only</div>}
                    </td>
                    <td style={{ padding: "10px", fontSize: 11, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx3, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {/* Labour by category */}
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

      {/* ═══════════════════════════════════════════════════════
          SUBCONTRACTOR TOTAL WAGE REFERENCE PANEL
          Shown at bottom — grouped by type, total at the end
      ═══════════════════════════════════════════════════════ */}
      {(subAtt.length > 0 || subcontractors.length > 0) && (
        <Card delay={.2}>
          <CardTitle icon={IUsers}>
            Subcontractor Labour — Total Reference
            <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>not included in your costs</span>
          </CardTitle>

          {/* By type breakdown */}
          {subTotals.byType?.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
              {subTotals.byType.map((t, i) => {
                const c = TYPE_COLORS[i % TYPE_COLORS.length];
                return (
                  <div key={t.type} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: ".04em" }}>{t.type}</span>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color: c.text }}>{Rs(t.total_cost)}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                      {t.contractor_count} firm{t.contractor_count !== 1 ? "s" : ""} · {t.worker_count} worker{t.worker_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Per-subcontractor breakdown */}
          {subTotals.bySub?.filter(s => s.total_cost > 0).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {subTotals.bySub.filter(s => s.total_cost > 0).map(s => {
                const typeIdx = subTypes.indexOf(s.type);
                const c = TYPE_COLORS[typeIdx % TYPE_COLORS.length] || TYPE_COLORS[0];
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "#6b7280" }}>{s.type} · {s.worker_count} worker{s.worker_count !== 1 ? "s" : ""} · {s.attendance_records} record{s.attendance_records !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14, color: "#92400e", textAlign: "right" }}>
                      {Rs(s.total_cost)}
                      <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 400 }}>ref only</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grand total highlight */}
          <div style={{ background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Total Subcontract Labour (Reference)</div>
              <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>For verification against subcontractor bills only</div>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 800, color: "#78350f" }}>{Rs(totSub)}</div>
          </div>

          {subAtt.length === 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
              No subcontract attendance marked yet.
            </div>
          )}
        </Card>
      )}

      {/* ═════════════════════════════════════════════
          ADD WORKER SHEET
      ═════════════════════════════════════════════ */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Worker" icon={IUserPlus}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn
              variant="primary"
              onClick={addWorker}
              disabled={nw.is_subcontract && !nw.subcontractor_id}
              style={{ flex: 2 }}
            >
              <ISave size={14} />Add Worker
            </Btn>
          </>
        }
      >
        <Field label="Full Name"><Input value={nw.name} onChange={e => setNw(p => ({ ...p, name: e.target.value }))} placeholder="Worker's full name" autoComplete="off" /></Field>
        <FormGrid>
          <Field label="Role"><Select value={nw.role} onChange={e => setNw(p => ({ ...p, role: e.target.value }))}>{roles.map(r => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Labour Category"><Select value={nw.labour_category} onChange={e => setNw(p => ({ ...p, labour_category: e.target.value }))}>{(labourCategories || []).map(c => <option key={c}>{c}</option>)}</Select></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Daily Rate (₹)"><Input type="number" value={nw.rate} onChange={e => setNw(p => ({ ...p, rate: e.target.value }))} placeholder="500" min="0" /></Field>
          <Field label="Phone"><Input type="tel" value={nw.phone} onChange={e => setNw(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile" /></Field>
        </FormGrid>
        <Divider />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Subcontract Worker</div>
            <div style={{ fontSize: 11, color: tk.tx3 }}>Wage tracked for reference only</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={nw.is_subcontract}
              onChange={e => setNw(p => ({ ...p, is_subcontract: e.target.checked, subcontractor_id: "" }))}
              style={{ width: 18, height: 18, accentColor: "#92400e", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, color: tk.tx2 }}>Mark as subcontract</span>
          </label>
        </div>
        {nw.is_subcontract && (
          <Field label="Subcontractor *">
            <Select
              value={nw.subcontractor_id}
              onChange={e => setNw(p => ({ ...p, subcontractor_id: e.target.value }))}
              style={{ borderColor: !nw.subcontractor_id ? "#b91c1c" : undefined, outline: !nw.subcontractor_id ? "2px solid #fecaca" : undefined }}
            >
              <option value="">— Select a subcontractor (required) —</option>
              {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
            </Select>
            {!nw.subcontractor_id && (
              <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 5, fontWeight: 600 }}>
                ⚠ Subcontractor selection is required for subcontract workers.
              </div>
            )}
            {!nw.subcontractor_id && subcontractors.length === 0 && (
              <div style={{ fontSize: 11, color: "#92400e", marginTop: 4, padding: "6px 10px", background: "#fffbeb", borderRadius: 7, border: "1px solid #fde68a" }}>
                No subcontractors yet. Close this and click "Manage Subcontractors" to add one first.
              </div>
            )}
          </Field>
        )}
      </Sheet>

      {/* ═════════════════════════════════════════════
          MANAGE SUBCONTRACTORS SHEET
      ═════════════════════════════════════════════ */}
      <Sheet open={subSheet} onClose={() => setSubSheet(false)} title="Manage Subcontractors" icon={IUsers}>
        {/* Add new subcontractor */}
        <div style={{ background: tk.surf2, borderRadius: 12, padding: "14px", marginBottom: 16, border: `1px solid ${tk.bdr}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add New Subcontractor</div>
          {subMsg && <Alert type={subMsg.t}>{subMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{subMsg.s}</Alert>}

          <Field label="Firm / Person Name">
            <Input value={newSub.name} onChange={e => setNewSub(p => ({ ...p, name: e.target.value }))} placeholder="e.g. ABC Painters Co." autoComplete="off" />
          </Field>

          <Field label="Type / Category">
            <Select value={newSub.type} onChange={e => setNewSub(p => ({ ...p, type: e.target.value, newType: "" }))}>
              {subTypes.map(t => <option key={t}>{t}</option>)}
              <option value="__new__">+ Create new type…</option>
            </Select>
          </Field>

          {newSub.type === "__new__" && (
            <Field label="New Type Name">
              <Input value={newSub.newType} onChange={e => setNewSub(p => ({ ...p, newType: e.target.value }))} placeholder="e.g. Painters Subcontractor" autoComplete="off" />
            </Field>
          )}

          <FormGrid>
            <Field label="Contact Name"><Input value={newSub.contact_name} onChange={e => setNewSub(p => ({ ...p, contact_name: e.target.value }))} placeholder="Person name" /></Field>
            <Field label="Phone"><Input type="tel" value={newSub.phone} onChange={e => setNewSub(p => ({ ...p, phone: e.target.value }))} placeholder="Number" /></Field>
          </FormGrid>

          <Btn variant="primary" onClick={addSubcontractor} style={{ width: "100%" }}>
            <IPlus size={14} />Add Subcontractor
          </Btn>
        </div>

        {/* Existing subcontractors grouped by type */}
        <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
          Existing Subcontractors ({subcontractors.length})
        </div>

        {subcontractors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: tk.tx3, fontSize: 13 }}>No subcontractors added yet.</div>
        ) : (
          // Group by type
          [...new Set(subcontractors.map(s => s.type))].map((type, ti) => {
            const c = TYPE_COLORS[ti % TYPE_COLORS.length];
            const group = subcontractors.filter(s => s.type === type);
            return (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: ".06em" }}>{type}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>({group.length})</span>
                </div>
                {group.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {s.contact_name || "—"}{s.phone ? ` · ${s.phone}` : ""} · {s.worker_count || 0} workers · {Rs(s.total_cost || 0)}
                      </div>
                    </div>
                    <button onClick={() => deleteSubcontractor(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6, flexShrink: 0 }}>
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
