import React from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, StatCard, SummaryRow, ProgressBar, Alert, Empty } from "../components/Primitives";
import { IRupee, IUsers, IListChecks, IPkgX, ITrending, IPackage, IActivity, IInbox, IUserCheck, IReceipt, IAlertTri } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");

export default function Dashboard() {
  const { tk, mats, att, exp, tasks } = useApp();
  const ta = att.filter(a => a.date === today());
  const te = exp.filter(e => e.date === today());
  const lc = ta.reduce((s, a) => s + a.total, 0);
  const ec = te.reduce((s, e) => s + e.amount, 0);
  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pt = tasks.filter(t => t.status !== "Completed").length;
  const totL = att.reduce((s, a) => s + a.total, 0);
  const totE = exp.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Dashboard</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric"})}</div>
      </div>

      {lsc > 0 && (
        <Alert type="warn"><IAlertTri size={14} /><span><strong>{lsc} material{lsc>1?"s":""}</strong> below minimum stock — reorder required</span></Alert>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <StatCard icon={IRupee} value={Rs(lc+ec)} label="Spent Today" color="acc" delay={.04} />
        <StatCard icon={IUsers} value={ta.length} label="Workers Today" color="grn" delay={.08} />
        <StatCard icon={IListChecks} value={pt} label="Pending Tasks" color="amb" delay={.12} />
        <StatCard icon={IPkgX} value={lsc} label="Low Stock" color="red" delay={.16} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>
        <Card delay={.1}>
          <CardTitle icon={ITrending}>Overall Spend</CardTitle>
          {[
            {l:"Labour",  v:Rs(totL)},
            {l:"Materials",v:Rs(exp.filter(e=>e.category==="Materials").reduce((s,e)=>s+e.amount,0))},
            {l:"Equipment",v:Rs(exp.filter(e=>e.category==="Equipment Rental").reduce((s,e)=>s+e.amount,0))},
            {l:"Other",   v:Rs(exp.filter(e=>!["Materials","Equipment Rental"].includes(e.category)).reduce((s,e)=>s+e.amount,0))},
          ].map(r => <SummaryRow key={r.l} label={r.l} value={r.v} />)}
          <SummaryRow label="Total" value={Rs(totL+totE)} bold />
        </Card>

        <Card delay={.14}>
          <CardTitle icon={IPackage}>Stock Levels</CardTitle>
          {mats.map(m => (
            <ProgressBar key={m.id} label={m.name} value={m.stock} max={m.min*3} />
          ))}
        </Card>
      </div>

      <Card delay={.18}>
        <CardTitle icon={IActivity}>Recent Activity</CardTitle>
        {att.length === 0 && exp.length === 0
          ? <Empty icon={IInbox} text="No activity yet. Start entering data." />
          : [...att.slice(0,2).map(a=>({...a,_k:"a"})),...exp.slice(0,3).map(e=>({...e,_k:"e"}))].slice(0,5).map((x, i) => {
            const isA = x._k === "a";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom: i < 4 ? `1px solid ${tk.bdr}` : "none" }}>
                <div style={{ width:32, height:32, borderRadius:8, background: isA ? tk.grnL : tk.ambL, color: isA ? tk.grn : tk.amb, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {isA ? <IUserCheck size={14} /> : <IReceipt size={14} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {isA ? `${x.name} — ${x.role} · ${x.hours}h` : `${x.category} — ${x.desc}`}
                  </div>
                  <div style={{ fontSize:11, color:tk.tx3, marginTop:1 }}>{x.date} · {x.by}</div>
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:13, color: isA ? tk.tx : tk.acc }}>
                  {isA ? Rs(x.total) : Rs(x.amount)}
                </span>
              </div>
            );
          })}
      </Card>
    </div>
  );
}
