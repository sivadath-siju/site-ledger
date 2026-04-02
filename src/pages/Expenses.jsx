import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Sheet, Empty } from "../components/Primitives";
import { ITag, IPlus, ICheckCirc, IXCircle, IReceipt, ISave } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function Expenses() {
  const { tk, exp, setExp, expCats, setExpCats, vendors, user } = useApp();
  const [expCatsRaw, setExpCatsRaw] = useState([]);
  useEffect(() => { API.getExpCats().then(r => setExpCatsRaw(r)).catch(()=>{}); }, []);
  const [tab, setTab] = useState("add");
  const [catOpen, setCatOpen] = useState(false);
  const [cat, setCat] = useState(expCats[0]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [vendor, setVendor] = useState("");
  const [pay, setPay] = useState("Cash");
  const [date, setDate] = useState(today());
  const [msg, setMsg] = useState(null);
  const [newCat, setNewCat] = useState("");

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) return setMsg({t:"err",s:"Enter a valid amount."});
    if (!desc) return setMsg({t:"err",s:"Description is required."});
    try {
      const catObj = expCatsRaw.find(c => c.name === cat);
      const vendorObj = vendors.find(v => v.name === vendor);
      await API.addExpense({ category_id: catObj?.id, amount:parseFloat(amount), description:desc, vendor_id: vendorObj?.id||null, payment_mode:pay, date });
      setExp(prev => [{ id:Date.now(), category:cat, amount:parseFloat(amount), desc, vendor, paymentMode:pay, date, by:user.name }, ...prev]);
      setMsg({t:"ok",s:"Expense recorded."});
      setAmount(""); setDesc(""); setVendor("");
      setTimeout(()=>setMsg(null), 2000);
    } catch(e) { setMsg({t:"err", s:e.message}); }
  };

  const totE = exp.reduce((s,e)=>s+e.amount,0);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Expenses</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Log and categorise expenditures</div></div>
        <Btn variant="secondary" small onClick={()=>setCatOpen(true)}><ITag size={13}/>Categories</Btn>
      </div>

      <div style={{ display:"flex", gap:8, padding:4, marginBottom:14 }}>
        <Btn 
          variant={tab === "add" ? "primary" : "secondary"} 
          small 
          onClick={() => setTab("add")}
          style={{ flex: 1 }}
        >
          Add Expense
        </Btn>
        <Btn 
          variant={tab === "list" ? "primary" : "secondary"} 
          small 
          onClick={() => setTab("list")}
          style={{ flex: 1 }}
        >
          All Expenses
        </Btn>
      </div>

      {tab==="add" ? (
        <Card delay={.05}>
          <CardTitle icon={IPlus}>New Expense</CardTitle>
          {msg && <Alert type={msg.t}>{msg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{msg.s}</Alert>}
          <FormGrid>
            <Field label="Category"><Select value={cat} onChange={e=>setCat(e.target.value)}>{expCats.map(c=><option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (₹)"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
          </FormGrid>
          <Field label="Description"><Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What was this expense for?"/></Field>
          <FormGrid>
            <Field label="Vendor">
              <Select value={vendor} onChange={e=>setVendor(e.target.value)}>
                <option value="">— Optional —</option>
                {vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Payment">
              <Select value={pay} onChange={e=>setPay(e.target.value)}>
                {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(p=><option key={p}>{p}</option>)}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Date"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <Btn fullWidth onClick={submit}><ISave size={14}/>Add Expense</Btn>
        </Card>
      ) : (
        <Card delay={.05}>
          <CardTitle icon={IReceipt} action={<span style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{Rs(totE)}</span>}>All Expenses</CardTitle>
          {exp.length===0 ? <Empty icon={IReceipt} text="No expenses yet."/> : (
            <TableWrap>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
                <thead><tr>{["Date","Category","Description","Amount"].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom: `1px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
                <tbody>{exp.map(e=>(
                  <tr key={e.id}>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>{e.date}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Badge color="blue">{e.category}</Badge></td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}>{e.desc}</td>
                    <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{Rs(e.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      <Card delay={.1}>
        <CardTitle icon={ITag}>By Category</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:9 }}>
          {expCats.map(c=>{
            const t=exp.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0);
            if(!t) return null;
            return <div key={c} style={{ background:tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius:10, padding:11 }}><div style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{Rs(t)}</div><div style={{ fontSize:11, color:tk.tx3 }}>{c}</div></div>;
          })}
        </div>
      </Card>

      <Sheet open={catOpen} onClose={()=>setCatOpen(false)} title="Expense Categories" icon={ITag}
        footer={<><Btn onClick={()=>{if(newCat.trim()&&!expCats.includes(newCat)){setExpCats(p=>[...p,newCat]);setNewCat("")}}}><IPlus size={14}/>Add</Btn><Btn variant="secondary" onClick={()=>setCatOpen(false)}>Done</Btn></>}>
        <div style={{ marginBottom:14 }}>
          {expCats.map((c,i)=>(
            <div key={c} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: `1px solid ${tk.bdr}` }}>
              <span style={{ fontSize:13 }}>{c}</span>
              {i>4 ? <Btn variant="ghost" small onClick={()=>setExpCats(p=>p.filter(x=>x!==c))}>Remove</Btn> : <span style={{ fontSize:10, color:tk.tx3 }}>Default</span>}
            </div>
          ))}
        </div>
        <Field label="New Category Name"><Input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="e.g. Legal Fees"/></Field>
      </Sheet>
    </div>
  );
}
