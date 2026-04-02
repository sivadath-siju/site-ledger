import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Sheet } from "../components/Primitives";
import { IPlus, IArrows, ICheckCirc, IXCircle, IPackage, ITrash, IFileText, IAlertTri, ISave } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Nf = n => Number(n||0).toLocaleString("en-IN");

export default function Materials() {
  const { tk, mats, setMats, matLogs, setMatLogs, user } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [matId, setMatId] = useState(mats[0]?.id || 1);
  const [type, setType] = useState("out");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [nm, setNm] = useState({ name:"", unit:"", cost:"", stock:"", min:"" });

  const submit = async () => {
    const m = mats.find(x => x.id === matId);
    if(!m) return;
    const q = parseFloat(qty);
    if (!q || q <= 0) return setMsg({ t:"err", s:"Enter a valid quantity." });
    if (type === "out" && q > m.stock) return setMsg({ t:"err", s: `Only ${m.stock} ${m.unit} available.` });
    try {
      await API.recordMatMovement({ material_id: matId, type, quantity: q, note, supplier: note });
      setMats(prev => prev.map(x => x.id === matId ? { ...x, stock: type === "in" ? x.stock + q : x.stock - q } : x));
      setMatLogs(prev => [{ id:Date.now(), date:today(), material:m.name, unit:m.unit, type, qty:q, note, by:user.name }, ...prev]);
      setMsg({ t:"ok", s:"Stock updated successfully." });
      setQty(""); setNote("");
      setTimeout(() => setMsg(null), 2500);
    } catch(e) { setMsg({ t:"err", s: e.message }); }
  };

  const addMat = async () => {
    if (!nm.name.trim()) return;
    try {
      const res = await API.addMaterial({ name:nm.name, unit:nm.unit||"units", stock:parseFloat(nm.stock)||0, min_stock:parseFloat(nm.min)||10, unit_cost:parseFloat(nm.cost)||0 });
      setMats(prev => [...prev, { ...res, min: res.min_stock||10, cost: res.unit_cost||0 }]);
      setAddOpen(false); setNm({ name:"", unit:"", cost:"", stock:"", min:"" });
    } catch(e) { alert(e.message); }
  };

  const lsc = mats.filter(m => m.stock <= m.min).length;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Materials</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Stock tracking and usage</div></div>
        <Btn variant="secondary" small onClick={() => setAddOpen(true)}><IPlus size={13} />Add Material</Btn>
      </div>

      {lsc > 0 && <Alert type="warn"><IAlertTri size={14} /><span><strong>{lsc} item{lsc>1?"s":""}</strong> at or below minimum stock level.</span></Alert>}

      <Card delay={.05}>
        <CardTitle icon={IArrows}>Record Movement</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
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
        <Field label="Note / Supplier">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
        </Field>
        <Btn onClick={submit}><ISave size={14} />Record</Btn>
      </Card>

      <Card delay={.1}>
        <CardTitle icon={IPackage}>Current Stock</CardTitle>
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
            <thead>
              <tr>{["Material","Stock","Unit","Status",""].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom: `1.5px solid ${tk.bdr}`, background:tk.surf2, whiteSpace:"nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {mats.map(m => {
                const s = m.stock <= m.min ? "Low" : m.stock <= m.min * 1.5 ? "Caution" : "Good";
                return (
                  <tr key={m.id} style={{ transition:"background .1s" }}>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontWeight:600 }}>{m.name}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{Nf(m.stock)}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>{m.unit}</td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Badge color={s==="Low"?"red":s==="Caution"?"amber":"green"}>{s}</Badge>
                    </td>
                    <td style={{ padding:"11px 10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>
                      <Btn variant="ghost" small onClick={async()=>{ try{ await API.deleteMaterial(m.id); setMats(prev=>prev.filter(x=>x.id!==m.id)); }catch(e){alert(e.message);} }}>Remove</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
