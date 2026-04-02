import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Empty } from "../components/Primitives";
import { IFilePlus, ICheckCirc, IXCircle, IClock, IFileText, ISave } from "../icons/Icons";

const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function Invoices() {
  const { tk, inv, setInv, vendors } = useApp();
  const [vId, setVId] = useState(null);
  useEffect(()=>{ if(vendors.length && !vId) setVId(vendors[0].id); },[vendors]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [msg, setMsg] = useState(null);

  const unpaid = inv.filter(i=>i.status==="Unpaid").reduce((s,i)=>s+i.amount,0);

  const submit = async () => {
    const v = vendors.find(x=>x.id===vId);
    if (!amount || !desc) return setMsg({t:"err",s:"Amount and description required."});
    try {
      await API.addInvoice({ vendor_id: vId, description:desc, amount:parseFloat(amount), due_date:due||null, status });
      setInv(prev=>[{ id:Date.now(), vendor:v?.name||"", desc, amount:parseFloat(amount), due, status }, ...prev]);
      setMsg({t:"ok",s:"Invoice added."}); setAmount(""); setDesc(""); setDue("");
      setTimeout(()=>setMsg(null),2000);
    } catch(e) { setMsg({t:"err",s:e.message}); }
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Invoices & Payables</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Supplier invoices and outstanding payments</div>
      </div>
      {unpaid>0 && <Alert type="warn"><IClock size={14}/><span>Outstanding: <strong>{Rs(unpaid)}</strong> across {inv.filter(i=>i.status==="Unpaid").length} invoices</span></Alert>}
      <Card delay={.05}>
        <CardTitle icon={IFilePlus}>Add Invoice</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
        <FormGrid>
          <Field label="Vendor"><Select value={vId} onChange={e=>setVId(parseInt(e.target.value))}>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
          <Field label="Amount (₹)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
        </FormGrid>
        <Field label="Description"><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Work or supply covered"/></Field>
        <FormGrid>
          <Field label="Due Date"><Input type="date" value={due} onChange={e=>setDue(e.target.value)}/></Field>
          <Field label="Status"><Select value={status} onChange={e=>setStatus(e.target.value)}><option>Unpaid</option><option>Paid</option><option>Partially Paid</option></Select></Field>
        </FormGrid>
        <Btn onClick={submit}><ISave size={14}/>Add Invoice</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={IFileText}>Invoice Register</CardTitle>
        {inv.length===0 ? <Empty icon={IFileText} text="No invoices yet."/> : (
          <TableWrap>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
              <thead><tr>{["Vendor","Description","Amount","Status",""].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom: `1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>{inv.map(i=>(
                <tr key={i.id}>
                  <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontWeight:600 }}>{i.vendor}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, color:tk.tx2 }}>{i.desc}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(i.amount)}</td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Badge color={i.status==="Paid"?"green":i.status==="Unpaid"?"red":"amber"}>{i.status}</Badge></td>
                  <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>
                    {i.status!=="Paid" && <Btn variant="secondary" small onClick={async()=>{ try{ await API.updateInvoice(i.id,{status:"Paid"}); setInv(prev=>prev.map(x=>x.id===i.id?{...x,status:"Paid"}:x)); }catch(e){alert(e.message);} }}>Mark Paid</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
