import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Sheet, Empty, Divider,
} from "../components/Primitives";
import { IUserPlus, IClipboard, ICheckCirc, IXCircle, IUsers, IFileText, ISave, ITag } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles, labourCategories } = useApp();

  const [addOpen,   setAddOpen]   = useState(false);
  const [wId,       setWId]       = useState(() => workers[0]?.id || "");
  const [date,      setDate]      = useState(today());
  const [present,   setPresent]   = useState("1");
  const [hours,     setHours]     = useState("8");
  const [ot,        setOt]        = useState("0");
  const [note,      setNote]      = useState("");
  const [msg,       setMsg]       = useState(null);

  // Filter
  const [filterCat, setFilterCat] = useState("All");
  const [showSub,   setShowSub]   = useState(true);

  // New worker form
  const [nw, setNw] = useState({
    name: "", role: "Mason", labour_category: "Masonry",
    is_subcontract: false, subcontractor: "", rate: "500", phone: "",
  });

  const submit = async () => {
    const w = workers.find(x => x.id === parseInt(wId));
    if (!w) return setMsg({ t: "err", s: "Select a worker." });
    const h   = parseFloat(hours) || 0;
    const o   = parseFloat(ot) || 0;
    const otR = Math.round(w.rate / 8 * 1.5);
    const base  = present === "half" ? w.rate / 2 : present === "1" ? w.rate : 0;
    const total = w.is_subcontract ? 0 : base + o * otR; // subcontract doesn't add to our total

    try {
      await API.recordAttendance({
        worker_id: parseInt(wId), date,
        status:    present === "1" ? "present" : present === "half" ? "half" : "absent",
        hours: h, ot_hours: o, note,
      });
      setAtt(prev => [{
        id: Date.now(), workerId: w.id, name: w.name, role: w.role,
        labour_category: w.labour_category,
        isSubcontract: !!w.is_subcontract,
        date, present, hours: h, ot: o, otR, total, note, by: user?.name || "",
      }, ...prev]);
      setMsg({ t: "ok", s: `Recorded. ${w.is_subcontract ? "(Subcontract — not in financial totals)" : `Wage: ${Rs(total)}`}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 3000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  const addWorker = async () => {
    if (!nw.name.trim()) return;
    try {
      const res = await API.addWorker({
        name: nw.name, role: nw.role,
        labour_category: nw.labour_category,
        is_subcontract:  nw.is_subcontract ? 1 : 0,
        subcontractor:   nw.subcontractor || null,
        daily_rate:      parseFloat(nw.rate) || 500,
        phone:           nw.phone,
      });
      setWorkers(prev => [...prev, {
        ...res, rate: res.daily_rate || 500,
        is_subcontract: res.is_subcontract || 0,
        labour_category: res.labour_category || nw.labour_category,
      }]);
      setAddOpen(false);
      setNw({ name: "", role: "Mason", labour_category: "Masonry", is_subcontract: false, subcontractor: "", rate: "500", phone: "" });
    } catch (e) { alert(e.message); }
  };

  // Direct (non-subcontract) labour total
  const directAtt = att.filter(a => !a.isSubcontract);
  const totLab    = directAtt.reduce((s, a) => s + (a.total || 0), 0);

  // Filtered attendance list
  const filteredAtt = att.filter(a => {
    if (!showSub && a.isSubcontract) return false;
    if (filterCat !== "All" && a.labour_category !== filterCat) return false;
    return true;
  });

  // Category totals (direct labour only)
  const catTotals = {};
  directAtt.forEach(a => {
    const cat = a.labour_category || a.role || "General";
    catTotals[cat] = (catTotals[cat] || 0) + (a.total || 0);
  });

  const allCats = [...new Set(att.map(a => a.labour_category || a.role).filter(Boolean))];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Labour & Attendance</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Daily wages and attendance register</div>
        </div>
        <Btn variant="primary" small onClick={() => setAddOpen(true)}><IUserPlus size={13} />Add Worker</Btn>
      </div>

      {/* Mark attendance */}
      <Card delay={.05}>
        <CardTitle icon={IClipboard}>Mark Attendance</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <Field label="Worker">
          <Select value={wId} onChange={e => setWId(e.target.value)}>
            {workers.length === 0 && <option value="">— Add workers first —</option>}
            {workers.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.role}{w.is_subcontract ? " [Sub]" : ""}
              </option>
            ))}
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
          <span style={{ fontSize: 11, fontWeight: 400, color: tk.tx3, marginLeft: 6 }}>
            {workers.filter(w => !w.is_subcontract).length} direct · {workers.filter(w => w.is_subcontract).length} sub
          </span>
        </CardTitle>
        {workers.length === 0 ? (
          <Empty icon={IUsers} text="No workers added. Click 'Add Worker' to get started." />
        ) : (
          workers.map(w => {
            const recs = att.filter(a => a.workerId === w.id);
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    {w.name}
                    {w.is_subcontract ? <Badge color="amber">Subcontract</Badge> : <Badge color="blue">{w.labour_category || w.role}</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: tk.tx3 }}>
                    {w.role} · ₹{w.rate}/day · {recs.length} day{recs.length !== 1 ? "s" : ""}
                    {w.subcontractor ? ` · via ${w.subcontractor}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {!w.is_subcontract && (
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13 }}>
                      {Rs(recs.reduce((s, a) => s + (a.total || 0), 0))}
                    </div>
                  )}
                  <Btn variant="ghost" small style={{ marginTop: 3 }} onClick={async () => {
                    try { await API.deleteWorker(w.id); setWorkers(prev => prev.filter(x => x.id !== w.id)); }
                    catch (e) { alert(e.message); }
                  }}>Remove</Btn>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Attendance register with filters */}
      {att.length > 0 && (
        <Card delay={.15}>
          <CardTitle
            icon={IFileText}
            action={
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: tk.grn }}>
                {Rs(totLab)} (direct)
              </span>
            }
          >
            Attendance Register
          </CardTitle>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 160, padding: "6px 10px", fontSize: 12 }}>
              <option value="All">All Categories</option>
              {allCats.map(c => <option key={c}>{c}</option>)}
            </Select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: tk.tx2, cursor: "pointer" }}>
              <input type="checkbox" checked={showSub} onChange={e => setShowSub(e.target.checked)} style={{ accentColor: tk.acc }} />
              Show subcontract
            </label>
          </div>

          <TableWrap>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr>
                  {["Date", "Name", "Category", "Status", "Hrs", "Wage"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "9px 10px", fontSize: 10, fontWeight: 700,
                      color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em",
                      borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAtt.map(a => (
                  <tr key={a.id} style={{ opacity: a.isSubcontract ? .7 : 1 }}>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.date}</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>
                      {a.name}
                      {a.isSubcontract && <span style={{ fontSize: 9, color: tk.amb, marginLeft: 4, fontWeight: 500 }}>sub</span>}
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge>{a.labour_category || a.role}</Badge>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge color={a.present === "1" || a.status === "present" ? "green" : a.present === "half" || a.status === "half" ? "amber" : "red"}>
                        {a.present === "1" || a.status === "present" ? "Present" : a.present === "half" || a.status === "half" ? "Half" : "Absent"}
                      </Badge>
                    </td>
                    <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}>{a.hours}h</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: a.isSubcontract ? tk.tx3 : tk.tx }}>
                      {a.isSubcontract ? "—" : Rs(a.total || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      {/* Category breakdown */}
      {Object.keys(catTotals).length > 0 && (
        <Card delay={.18}>
          <CardTitle icon={ITag}>Labour by Category (Direct Only)</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 9 }}>
            {Object.entries(catTotals).filter(([,v]) => v > 0).map(([cat, total]) => (
              <div key={cat} style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{Rs(total)}</div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>{cat}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Worker sheet */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Worker"
        icon={IUserPlus}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="primary" onClick={addWorker} style={{ flex: 2 }}>
              <ISave size={14} />Add Worker
            </Btn>
          </>
        }
      >
        <Field label="Full Name">
          <Input value={nw.name} onChange={e => setNw(p => ({ ...p, name: e.target.value }))} placeholder="Worker's full name" autoComplete="off" />
        </Field>
        <FormGrid>
          <Field label="Role">
            <Select value={nw.role} onChange={e => setNw(p => ({ ...p, role: e.target.value }))}>
              {roles.map(r => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Labour Category">
            <Select value={nw.labour_category} onChange={e => setNw(p => ({ ...p, labour_category: e.target.value }))}>
              {(labourCategories || []).map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Daily Rate (₹)">
            <Input type="number" value={nw.rate} onChange={e => setNw(p => ({ ...p, rate: e.target.value }))} placeholder="500" min="0" />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={nw.phone} onChange={e => setNw(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile" />
          </Field>
        </FormGrid>

        <Divider />

        {/* Subcontract toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Subcontract Labour</div>
            <div style={{ fontSize: 11, color: tk.tx3 }}>Wages excluded from financial totals</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={nw.is_subcontract}
              onChange={e => setNw(p => ({ ...p, is_subcontract: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: tk.amb, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, color: tk.tx2 }}>Mark as subcontract</span>
          </label>
        </div>

        {nw.is_subcontract && (
          <Field label="Subcontractor / Company Name">
            <Input value={nw.subcontractor} onChange={e => setNw(p => ({ ...p, subcontractor: e.target.value }))} placeholder="Firm or agency name" />
          </Field>
        )}
      </Sheet>
    </div>
  );
}
