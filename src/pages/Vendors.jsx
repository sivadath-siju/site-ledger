import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Field, Select, Input, FormGrid, TableWrap, Badge, Sheet } from "../components/Primitives";
import { IPlus, ITrash, IBuilding, ISave } from "../icons/Icons";

const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function Vendors() {
  const { tk, vendors, setVendors } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [nv, setNv] = useState({ name:"", cat:"Materials", ph:"", bal:"" });

  const add = async () => {
    if (!nv.name.trim()) return;
    try {
      const res = await API.addVendor({ name:nv.name, category:nv.cat, phone:nv.ph, balance:parseFloat(nv.bal)||0 });
      setVendors(prev=>[...prev,{ ...res, cat:res.category||nv.cat, ph:res.phone||nv.ph, bal:res.balance||0 }]);
      setAddOpen(false); setNv({ name:"", cat:"Materials", ph:"", bal:"" });
    } catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10, animation:"fadeUp .25s ease" }}>
        <div><div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Vendors</div><div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Suppliers and outstanding balances</div></div>
        <Btn variant="secondary" small onClick={()=>setAddOpen(true)}><IPlus size={13}/>Add Vendor</Btn>
      </div>
      <Card delay={.05}>
        <TableWrap>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:360 }}>
            <thead><tr>{["Vendor","Category","Outstanding",""].map(h=><th key={h} style={{ textAlign:"left", padding:"9px 10px", fontSize:10, fontWeight:700, color:tk.tx3, textTransform:"uppercase", letterSpacing:".08em", borderBottom: `1.5px solid ${tk.bdr}`, background:tk.surf2 }}>{h}</th>)}</tr></thead>
            <tbody>{vendors.map(v=>(
              <tr key={v.id}>
                <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><div style={{ fontWeight:600 }}>{v.name}</div><div style={{ fontSize:11, color:tk.tx3 }}>{v.ph}</div></td>
                <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Badge>{v.cat}</Badge></td>
                <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}`, fontFamily:"'DM Mono',monospace", fontWeight:700, color:v.bal>0?tk.red:tk.grn }}>{v.bal>0?Rs(v.bal):"Nil"}</td>
                <td style={{ padding:"10px", fontSize:13, borderBottom: `1px solid ${tk.bdr}` }}><Btn variant="ghost" small onClick={async()=>{ try{ await API.deleteVendor(v.id); setVendors(prev=>prev.filter(x=>x.id!==v.id)); }catch(e){alert(e.message);} }} style={{ padding:"4px 8px" }}><ITrash size={12}/></Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </TableWrap>
      </Card>
      <Sheet open={addOpen} onClose={()=>setAddOpen(false)} title="Add Vendor" icon={IBuilding}
        footer={<><Btn onClick={add}><ISave size={14}/>Add Vendor</Btn><Btn variant="secondary" onClick={()=>setAddOpen(false)}>Cancel</Btn></>}>
        <Field label="Vendor Name"><Input value={nv.name} onChange={e=>setNv(p=>({...p,name:e.target.value}))} placeholder="Company or person" autoComplete="off"/></Field>
        <FormGrid>
          <Field label="Category"><Select value={nv.cat} onChange={e=>setNv(p=>({...p,cat:e.target.value}))}>{["Materials","Equipment","Transport","Subcontractor","Other"].map(c=><option key={c}>{c}</option>)}</Select></Field>
          <Field label="Phone"><Input type="tel" value={nv.ph} onChange={e=>setNv(p=>({...p,ph:e.target.value}))} placeholder="Number"/></Field>
        </FormGrid>
        <Field label="Opening Balance (₹)"><Input type="number" value={nv.bal} onChange={e=>setNv(p=>({...p,bal:e.target.value}))} placeholder="0"/></Field>
      </Sheet>
    </div>
  );
}
