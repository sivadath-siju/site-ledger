import React from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, StatCard, TableWrap, Badge, Empty } from "../components/Primitives";
import { IRupee, IUsers, IPackage, IReceipt, ITrending, IPieChart } from "../icons/Icons";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");
const Nf = n => Number(n||0).toLocaleString("en-IN");
const CHART_COLORS = ["#1a56db","#0d7a4e","#b45309","#c0392b","#8e44ad","#16a085","#e67e22","#2980b9"];

export default function Reports() {
  const { tk, att, exp, mats, matLogs, roles, expCats } = useApp();
  const tL = att.reduce((s,a)=>s+a.total,0), tE = exp.reduce((s,e)=>s+e.amount,0);

  const expPieData = expCats.map(cat=>({
    name:cat, value:exp.filter(e=>e.category===cat).reduce((s,e)=>s+e.amount,0)
  })).filter(x=>x.value>0);

  const labourBarData = roles.map(role=>({
    role, wages: att.filter(a=>a.role===role).reduce((s,a)=>s+a.total,0),
    days: att.filter(a=>a.role===role).length
  })).filter(x=>x.wages>0);

  const stockData = mats.map(m=>({ name:m.name, stock:m.stock, min:m.min }));

  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      labour: att.filter(a=>a.date===ds).reduce((s,a)=>s+a.total,0),
      expenses: exp.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0),
    };
  }).reverse();

  const CustomTooltip = ({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{background:tk.surf,border: `1px solid ${tk.bdr}`,borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:tk.shLg}}>
      <div style={{fontWeight:700,marginBottom:4,color:tk.tx}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color}}>₹{Number(p.value).toLocaleString("en-IN")}</div>)}
    </div>;
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Reports</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Financial and operational summaries</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <StatCard icon={IRupee} value={Rs(tL+tE)} label="Total Spend" color="acc" delay={.04}/>
        <StatCard icon={IUsers} value={att.length} label="Attendance Records" color="grn" delay={.08}/>
        <StatCard icon={IPackage} value={matLogs.length} label="Mat. Transactions" color="amb" delay={.12}/>
        <StatCard icon={IReceipt} value={exp.length} label="Expense Entries" color="red" delay={.16}/>
      </div>

      <Card delay={.1}>
        <CardTitle icon={ITrending}>7-Day Spend Trend</CardTitle>
        {last7.some(d=>d.labour>0||d.expenses>0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:11,fill:tk.tx3}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:tk.tx3}} axisLine={false} tickLine={false} tickFormatter={v=> `₹${(v/1000).toFixed(0)}k` }/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Bar dataKey="labour" name="Labour" fill={tk.grn} radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill={tk.acc} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty icon={ITrending} text="No spend data yet. Start logging expenses and attendance."/>}
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
        <Card delay={.14}>
          <CardTitle icon={IPieChart}>Expenses by Category</CardTitle>
          {expPieData.length>0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {expPieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>[Rs(v),"Amount"]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px",justifyContent:"center",marginTop:8}}>
                {expPieData.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>
                    <span style={{color:tk.tx2}}>{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty icon={IReceipt} text="No expense data yet."/>}
        </Card>

        <Card delay={.18}>
          <CardTitle icon={IUsers}>Labour Cost by Role</CardTitle>
          {labourBarData.length>0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={labourBarData} layout="vertical" margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false} tickFormatter={v=> `₹${(v/1000).toFixed(0)}k` }/>
                <YAxis type="category" dataKey="role" tick={{fontSize:11,fill:tk.tx2}} axisLine={false} tickLine={false} width={70}/>
                <Tooltip formatter={(v)=>[Rs(v),"Total Wages"]}/>
                <Bar dataKey="wages" fill={tk.grn} radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty icon={IUsers} text="No labour data yet."/>}
        </Card>
      </div>

      <Card delay={.22}>
        <CardTitle icon={IPackage}>Stock Levels vs Minimum</CardTitle>
        {stockData.length>0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockData} margin={{top:4,right:4,left:0,bottom:40}}>
              <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} vertical={false}/>
              <XAxis dataKey="name" tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
              <YAxis tick={{fontSize:10,fill:tk.tx3}} axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Legend wrapperStyle={{fontSize:11,paddingTop:36}}/>
              <Bar dataKey="stock" name="Current Stock" fill={tk.acc} radius={[4,4,0,0]}/>
              <Bar dataKey="min" name="Min Required" fill={tk.red} radius={[4,4,0,0]} opacity={0.6}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty icon={IPackage} text="No stock data yet."/>}
      </Card>
    </div>
  );
}
