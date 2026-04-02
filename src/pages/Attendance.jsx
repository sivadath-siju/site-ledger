import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Sheet } from "../components/Primitives";
import { IUserPlus, IClipboard, ICheckCirc, IXCircle, IUsers, IFileText, ISave } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function Attendance() {
  const { tk, workers, setWorkers, att, setAtt, user, roles } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [wId, setWId] = useState(workers[0]?.id||1);
  const [date, setDate] = useState(today());
  const [present, setPresent] = useState("1");
  const [hours, setHours] = useState("8");
  const [ot, setOt] = useState("0");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [nw, setNw] = useState({ name:"", role:"Mason", rate:"", phone:"" });

  const submit = async () => {
    const w = workers.find(x => x.id === wId);
    if(!w) return;
    const h = parseFloat(hours)||0, o = parseFloat(ot)||0;
    const otR = Math.round(w.rate/8*1.5);
    const base = present==="half" ? w.rate/2 : present==="1" ? w.rate : 0;
    const total = base + o * otR;
    try {
      await API.recordAttendance({ worker_id: wId, date, status: present==="1"?"present": present==="half"?"half":"absent", hours:h, ot_hours:o, note });
      setAtt(prev => [{ id:Date.now(), workerId:w.id, name:w.name, role:w.role, date, present, hours:h, ot:o, otR, total, note, by:user.name }, ...prev]);
      setMsg({ t:"ok", s: `Recorded. Wage: ${Rs(total)}` });
      setNote(""); setOt("0");
      setTimeout(() => setMsg(null), 2500);
    } catch(e) { setMsg({ t:"err", s: e.message }); }
  };

  const addWorker = async () => {
    if (!nw.name.trim()) return;
    try {
      const res = await API.addWorker({ name:nw.name, role:nw.role, daily_rate:parseFloat(nw.rate)||500, phone:nw.phone });
      setWorkers(prev => [...prev, { ...res, rate: res.daily_rate||500 }]);
      setAddOpen(false); setNw({ name:"", role:"Mason", rate:"", phone:"" });
    } catch(e) { alert(e.message); }
  };

  const totLab = att.reduce((s, a) => s + a.total, 0);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Labour & Attendance</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Daily wages and attendance register</div></div>
        <Btn variant="secondary" small onClick={() => setAddOpen(true)}><IUserPlus size={13}/>Add Worker</Btn>
      </div>

      <Card delay={.05}>
        <CardTitle icon={IClipboard}>Mark Attendance</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <Field label="Worker">
          <Select value={wId} onChange={e => setWId(parseInt(e.target.value))}>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name} — {w.role}</option>)}
          </Select>
        </Field>
        <FormGrid>
          <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></Field>
          <Field label="Status">
            <Select value={present} onChange={e => setPresent(e.target.value)}>
              <option value="1">Present</option>
              <option value="0">Absent</option>
              <option value="half">Half Day</option>
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Regular Hours"><Input type="number" value={hours} onChange={e => setHours(e.target.value)}/></Field>
          <Field label="Overtime Hours"><Input type="number" value={ot} onChange={e => setOt(e.target.value)}/></Field>
        </FormGrid>
        <Field label="Notes (optional)"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Remarks"/></Field>
        <Btn onClick={submit}><ISave size={14}/>Record</Btn>
      </Card>

      <Card delay={.1}>
        <CardTitle icon={IUsers}>Worker Roster</CardTitle>
        {workers.map(w => {
          const recs = att.filter(a => a.workerId === w.id);
          return (
            <div key={w.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{w.name}</div>
                <div style={{ fontSize:11, color:tk.tx3 }}>{w.role} · ₹{w.rate}/day · {recs.length} days</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13 }}>{Rs(recs.reduce((s,a)=>s+a.total,0))}</div>
                <Btn variant="ghost" small style={{ marginTop:3 }} onClick={async()=>{ try{ await API.deleteWorker(w.id); setWorkers(prev=>prev.filter(x=>x.id!==w.id)); }catch(e){alert(e.message);} }}>Remove</Btn>
              </div>
            </div>
          );
        })}
      </Card>

      {att.length > 0 && (
        <Card delay={.15}>
          <CardTitle icon={IFileText} action={<span style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{Rs(totLab)}</span>}>Attendance Register</CardTitle>
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:460 }}>
              <thead><tr>{["Date","Name","Role","Status","Hrs","Total"].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom: `1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>
                {att.map(a=>(
                  <tr key={a.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>{a.date}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontWeight:600 }}>{a.name}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Badge>{a.role}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Badge color={a.present==="1"?"green":a.present==="half"?"amber":"red"}>{a.present==="1"?"Present":a.present==="half"?"Half Day":"Absent"}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>{a.hours}h</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}

      <Sheet open={addOpen} onClose={()=>setAddOpen(false)} title="Add Worker" icon={IUserPlus}
        footer={<><Btn onClick={addWorker}><ISave size={14}/>Add Worker</Btn><Btn variant="secondary" onClick={()=>setAddOpen(false)}>Cancel</Btn></>}>
        <Field label="Full Name"><Input value={nw.name} onChange={e=>setNw(p=>({...p,name:e.target.value}))} placeholder="Worker's full name" autoComplete="off"/></Field>
        <FormGrid>
          <Field label="Role"><Select value={nw.role} onChange={e=>setNw(p=>({...p,role:e.target.value}))}>{roles.map(r=><option key={r}>{r}</option>)}</Select></Field>
          <Field label="Daily Rate (₹)"><Input type="number" value={nw.rate} onChange={e=>setNw(p=>({...p,rate:e.target.value}))} placeholder="0"/></Field>
        </FormGrid>
        <Field label="Phone"><Input type="tel" value={nw.phone} onChange={e=>setNw(p=>({...p,phone:e.target.value}))} placeholder="Mobile number"/></Field>
      </Sheet>
    </div>
  );
}
