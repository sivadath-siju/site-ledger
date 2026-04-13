import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Sheet } from "../components/Primitives";
import { IPlus, IArrows, ICheckCirc, IXCircle, IPackage, ITrash, IFileText, IAlertTri, ISave } from "../icons/Icons";

const todayFn = () => new Date().toISOString().split("T")[0];
const Nf      = n  => Number(n || 0).toLocaleString("en-IN");

export default function Materials() {
  const { tk, mats, setMats, matLogs, setMatLogs, user } = useApp();

  const [addOpen, setAddOpen] = useState(false);
  const [matId,   setMatId]   = useState(mats[0]?.id || 1);
  const [type,    setType]    = useState("out");
  const [qty,     setQty]     = useState("");
  const [note,    setNote]    = useState("");
  const [date,    setDate]    = useState(todayFn());   // ← editable date
  const [msg,     setMsg]     = useState(null);
  const [nm, setNm] = useState({ name: "", unit: "", cost: "", stock: "", min: "" });

  // Log filter
  const [logMat, setLogMat] = useState("all");

  const submit = async () => {
    const m = mats.find(x => x.id === matId);
    if (!m) return;
    const q = parseFloat(qty);
    if (!q || q <= 0) return setMsg({ t: "err", s: "Enter a valid quantity." });
    if (type === "out" && q > m.stock) return setMsg({ t: "err", s: `Only ${m.stock} ${m.unit} available.` });
    try {
      await API.recordMatMovement({ material_id: matId, type, quantity: q, note, supplier: note, date });
      setMats(prev => prev.map(x => x.id === matId ? { ...x, stock: type === "in" ? x.stock + q : x.stock - q } : x));
      setMatLogs(prev => [{ id: Date.now(), date, material: m.name, material_id: matId, unit: m.unit, type, qty: q, note, by: user.name }, ...prev]);
      setMsg({ t: "ok", s: `Stock ${type === "in" ? "received" : "issued"} — ${Nf(q)} ${m.unit} on ${date}.` });
      setQty(""); setNote("");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  const addMat = async () => {
    if (!nm.name.trim()) return;
    try {
      const res = await API.addMaterial({ name: nm.name, unit: nm.unit || "units", stock: parseFloat(nm.stock) || 0, min_stock: parseFloat(nm.min) || 10, unit_cost: parseFloat(nm.cost) || 0 });
      setMats(prev => [...prev, { ...res, min: res.min_stock || 10, cost: res.unit_cost || 0 }]);
      setAddOpen(false); setNm({ name: "", unit: "", cost: "", stock: "", min: "" });
    } catch (e) { alert(e.message); }
  };

  const lsc         = mats.filter(m => m.stock <= m.min).length;
  const filteredLogs = logMat === "all" ? matLogs : matLogs.filter(l => String(l.material_id || l.material) === logMat || l.material === logMat);

  // Group logs by date for visual separation
  const logsByDate = {};
  filteredLogs.forEach(l => { if (!logsByDate[l.date]) logsByDate[l.date] = []; logsByDate[l.date].push(l); });
  const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Materials</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Stock tracking and usage log</div>
        </div>
        <Btn variant="secondary" small onClick={() => setAddOpen(true)}><IPlus size={13} />Add Material</Btn>
      </div>

      {lsc > 0 && <Alert type="warn"><IAlertTri size={14} /><span><strong>{lsc} item{lsc > 1 ? "s" : ""}</strong> at or below minimum stock level.</span></Alert>}

      {/* Record movement */}
      <Card delay={.05}>
        <CardTitle icon={IArrows}>Record Movement</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <Field label="Material">
          <Select value={matId} onChange={e => setMatId(parseInt(e.target.value))}>
            {mats.map(m => <option key={m.id} value={m.id}>{m.name} — {Nf(m.stock)} {m.unit}</option>)}
          </Select>
        </Field>
        <FormGrid>
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="out">Issue (Used)</option>
              <option value="in">Receive (In)</option>
            </Select>
          </Field>
          <Field label="Quantity">
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </Field>
        </FormGrid>
        {/* Editable date — defaults to today but can be changed for back-dating */}
        <Field label="Date">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Note / Supplier">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </Field>
        <Btn onClick={submit}><ISave size={14} />Record</Btn>
      </Card>

      {/* Current stock table */}
      <Card delay={.1}>
        <CardTitle icon={IPackage}>Current Stock</CardTitle>
        <TableWrap>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr>{["Material", "Stock", "Unit", "Min", "Status", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2, whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {mats.map(m => {
                const s = m.stock <= m.min ? "Low" : m.stock <= m.min * 1.5 ? "Caution" : "Good";
                return (
                  <tr key={m.id}>
                    <td style={{ padding: "11px 10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: "11px 10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{Nf(m.stock)}</td>
                    <td style={{ padding: "11px 10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}>{m.unit}</td>
                    <td style={{ padding: "11px 10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx3 }}>{Nf(m.min)}</td>
                    <td style={{ padding: "11px 10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge color={s === "Low" ? "red" : s === "Caution" ? "amber" : "green"}>{s}</Badge>
                    </td>
                    <td style={{ padding: "11px 10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Btn variant="ghost" small onClick={async () => {
                        if (!window.confirm(`Remove ${m.name}?`)) return;
                        try { await API.deleteMaterial(m.id); setMats(prev => prev.filter(x => x.id !== m.id)); }
                        catch (e) { alert(e.message); }
                      }}>Remove</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {/* Material movement log — grouped by date */}
      {matLogs.length > 0 && (
        <Card delay={.15}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <CardTitle icon={IFileText}>Material Log</CardTitle>
            <Select value={logMat} onChange={e => setLogMat(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 12, border: `1.5px solid ${tk.bdr}`, borderRadius: 8, background: tk.surf2, color: tk.tx, maxWidth: 180 }}>
              <option value="all">All Materials</option>
              {mats.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
            </Select>
          </div>

          {sortedDates.length === 0 ? (
            <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>No movements recorded yet.</div>
          ) : (
            sortedDates.map(d => (
              <div key={d}>
                {/* Date divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, marginTop: 14 }}>
                  <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".1em", whiteSpace: "nowrap" }}>
                    {new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
                </div>

                {logsByDate[d].map((l, i) => (
                  <div key={l.id || i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                    borderRadius: 8, marginBottom: 4,
                    background: l.type === "in" ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${l.type === "in" ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {/* Direction indicator */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: l.type === "in" ? "#15803d" : "#b91c1c",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {l.type === "in" ? "↓" : "↑"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                        {l.material}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280", marginLeft: 6 }}>
                          {l.type === "in" ? "received" : "issued"}
                        </span>
                      </div>
                      {l.note && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{l.note}</div>}
                      {l.by && <div style={{ fontSize: 10, color: "#9ca3af" }}>by {l.by}</div>}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 14,
                        color: l.type === "in" ? "#15803d" : "#b91c1c",
                      }}>
                        {l.type === "in" ? "+" : "−"}{Nf(l.qty)} {l.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </Card>
      )}

      {/* Add material sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Material" icon={IPackage}
        footer={<><Btn variant="secondary" onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="primary" onClick={addMat} style={{ flex: 2 }}><ISave size={14} />Add Material</Btn></>}
      >
        <Field label="Material Name"><Input value={nm.name} onChange={e => setNm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cement" autoFocus /></Field>
        <FormGrid>
          <Field label="Unit"><Input value={nm.unit} onChange={e => setNm(p => ({ ...p, unit: e.target.value }))} placeholder="bags, cu.ft, kg…" /></Field>
          <Field label="Unit Cost (₹)"><Input type="number" value={nm.cost} onChange={e => setNm(p => ({ ...p, cost: e.target.value }))} placeholder="0" /></Field>
        </FormGrid>
        <FormGrid>
          <Field label="Opening Stock"><Input type="number" value={nm.stock} onChange={e => setNm(p => ({ ...p, stock: e.target.value }))} placeholder="0" /></Field>
          <Field label="Min Stock Alert"><Input type="number" value={nm.min} onChange={e => setNm(p => ({ ...p, min: e.target.value }))} placeholder="10" /></Field>
        </FormGrid>
      </Sheet>
    </div>
  );
}
