/**
 * TodayAttendance.jsx
 * Drop this component into Attendance.jsx right after the Record Attendance card.
 * Shows today's marked workers with edit (status/hours/OT) and delete.
 * After today: shows the records as locked (read-only).
 *
 * Usage inside Attendance.jsx:
 *   import TodayAttendance from "./TodayAttendance";
 *   // inside JSX, after the mark-attendance Card:
 *   <TodayAttendance att={att} setAtt={setAtt} workers={workers} />
 */

import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Badge, Btn, Field, Select, Input, FormGrid, Alert, Sheet } from "../components/Primitives";
import { ICheckCirc, IXCircle, ISave, IEdit, ITrash } from "../icons/Icons";

const todayStr = () => new Date().toISOString().split("T")[0];
const Rs       = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

const ILock = ({ size = 12, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export default function TodayAttendance({ att, setAtt, workers }) {
  const { tk } = useApp();
  const today  = todayStr();

  // All records for today (sorted by name)
  const todayRecords = att
    .filter(a => a.date === today)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Edit sheet state
  const [editRec,    setEditRec]    = useState(null);
  const [editStatus, setEditStatus] = useState("present");
  const [editHours,  setEditHours]  = useState("8");
  const [editOt,     setEditOt]     = useState("0");
  const [editNote,   setEditNote]   = useState("");
  const [editMsg,    setEditMsg]    = useState(null);
  const [saving,     setSaving]     = useState(false);

  if (todayRecords.length === 0) return null;

  const openEdit = (rec) => {
    setEditRec(rec);
    setEditStatus(rec.status || (rec.present === "1" ? "present" : rec.present === "half" ? "half" : "absent"));
    setEditHours(String(rec.hours || 8));
    setEditOt(String(rec.ot || rec.ot_hours || 0));
    setEditNote(rec.note || "");
    setEditMsg(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await API.patchAttendance(editRec.id, {
        status: editStatus,
        hours:    parseFloat(editHours) || 8,
        ot_hours: parseFloat(editOt)    || 0,
        note:     editNote,
      });
      setAtt(prev => prev.map(a => a.id === editRec.id
        ? { ...a, status: res.status, hours: res.hours, ot: res.ot_hours, total: res.total_wage }
        : a
      ));
      setEditMsg({ t: "ok", s: "Updated." });
      setTimeout(() => { setEditRec(null); setEditMsg(null); }, 900);
    } catch (e) {
      setEditMsg({ t: "err", s: e.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (rec) => {
    if (!window.confirm(`Remove attendance for ${rec.name}?`)) return;
    try {
      await API.deleteAttendance(rec.id);
      setAtt(prev => prev.filter(a => a.id !== rec.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const statusColor = s =>
    s === "present" || s === "1" ? "green" : s === "half" ? "amber" : "red";
  const statusLabel = s =>
    s === "present" || s === "1" ? "Present" : s === "half" ? "Half Day" : "Absent";

  return (
    <>
      <div style={{
        background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 14,
        padding: "14px 16px", marginBottom: 14, boxShadow: tk.sh,
        animation: "fadeUp .3s ease .05s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: tk.tx }}>
            Today's Attendance
          </div>
          <span style={{ fontSize: 11, background: tk.accL, color: tk.acc, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
            {todayRecords.length} marked
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: tk.tx3 }}>
            <ILock size={10} color={tk.tx3} /> Locked after midnight
          </div>
        </div>

        {todayRecords.map((rec, i) => {
          const status  = rec.status || (rec.present === "1" ? "present" : rec.present === "half" ? "half" : "absent");
          const wage    = rec.total ?? rec.total_wage ?? 0;
          const isSub   = rec.isSubcontract;

          return (
            <div key={rec.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 0", borderBottom: i < todayRecords.length - 1 ? `1px solid ${tk.bdr}` : "none",
              background: isSub ? "#fffbeb" : "transparent",
            }}>
              {/* Avatar */}
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSub ? "#fde68a" : tk.accL, color: isSub ? "#92400e" : tk.acc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {(rec.name || "?").charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                  {rec.name}
                  {isSub && <span style={{ fontSize: 9, color: "#92400e", fontWeight: 500 }}>sub</span>}
                </div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>
                  {rec.hours || 8}h{(rec.ot || rec.ot_hours || 0) > 0 ? ` + ${rec.ot || rec.ot_hours}h OT` : ""}
                  {rec.note ? ` · ${rec.note}` : ""}
                </div>
              </div>

              <Badge color={statusColor(status)}>{statusLabel(status)}</Badge>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13, color: isSub ? "#92400e" : tk.tx }}>
                  {Rs(wage)}
                </div>
                {isSub && <div style={{ fontSize: 9, color: "#9ca3af" }}>ref</div>}
              </div>

              {/* Edit/Delete — today only */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(rec)} style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 7, padding: "4px 7px", cursor: "pointer", color: tk.tx2, display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                  <IEdit size={11} color={tk.tx2} /> Edit
                </button>
                <button onClick={() => deleteRecord(rec)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 7px", cursor: "pointer", color: "#b91c1c", display: "flex", alignItems: "center" }}>
                  <ITrash size={11} color="#b91c1c" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Today's direct labour total */}
        {(() => {
          const directTotal = todayRecords.filter(r => !r.isSubcontract).reduce((s, r) => s + (r.total ?? r.total_wage ?? 0), 0);
          if (directTotal === 0) return null;
          return (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", padding: "8px 10px", background: tk.surf2, borderRadius: 8, fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: tk.tx }}>Today's direct labour total</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{Rs(directTotal)}</span>
            </div>
          );
        })()}
      </div>

      {/* Edit Sheet */}
      <Sheet
        open={!!editRec}
        onClose={() => setEditRec(null)}
        title={`Edit — ${editRec?.name}`}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setEditRec(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="primary" onClick={saveEdit} disabled={saving} style={{ flex: 2 }}>
              <ISave size={14} />{saving ? "Saving…" : "Save Changes"}
            </Btn>
          </>
        }
      >
        {editMsg && <Alert type={editMsg.t}>{editMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{editMsg.s}</Alert>}
        <div style={{ padding: "8px 12px", background: tk.surf2, borderRadius: 8, marginBottom: 14, fontSize: 12, color: tk.tx3 }}>
          Date: <strong style={{ color: tk.tx }}>{today}</strong> · Changes only allowed today
        </div>
        <Field label="Status">
          <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
            <option value="present">Present</option>
            <option value="half">Half Day</option>
            <option value="absent">Absent</option>
          </Select>
        </Field>
        <FormGrid>
          <Field label="Regular Hours"><Input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} min="0" max="12" /></Field>
          <Field label="Overtime Hours"><Input type="number" value={editOt} onChange={e => setEditOt(e.target.value)} min="0" /></Field>
        </FormGrid>
        <Field label="Notes"><Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Optional remark" /></Field>
      </Sheet>
    </>
  );
}
