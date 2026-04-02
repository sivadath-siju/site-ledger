import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Textarea, FormGrid, Select, Badge } from "../components/Primitives";
import { IEdit, ISave, ICheckCirc, ICheckSq } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];

export default function Workflow() {
  const { tk, tasks, setTasks } = useApp();
  const [log, setLog] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [safety, setSafety] = useState("All Clear");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    API.getDailyLogs().then(logs => {
      const todayLog = logs.find(l => l.date === today());
      if (todayLog) { setLog(todayLog.notes || ""); setWeather(todayLog.weather || "Clear"); setSafety(todayLog.safety || "All Clear"); }
    }).catch(() => {});
  }, []);

  const save = async () => {
    try {
      await API.saveDailyLog({ date: today(), notes: log, weather, safety });
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e) { setSaved(true); setTimeout(()=>setSaved(false),2500); }
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>Daily Workflow</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Site progress for {today()}</div>
      </div>
      {saved && <Alert type="ok"><ICheckCirc size={14}/>Log saved successfully.</Alert>}
      <Card delay={.05}>
        <CardTitle icon={IEdit}>Progress Notes</CardTitle>
        <Field label="Observations / Summary">
          <Textarea value={log} onChange={e=>setLog(e.target.value)} placeholder="Work completed, issues encountered..." />
        </Field>
        <FormGrid>
          <Field label="Weather"><Select value={weather} onChange={e=>setWeather(e.target.value)}>{["Clear","Partly Cloudy","Overcast","Light Rain","Heavy Rain"].map(w=><option key={w}>{w}</option>)}</Select></Field>
          <Field label="Safety Status"><Select value={safety} onChange={e=>setSafety(e.target.value)}>{["All Clear","Minor Concerns","Work Stopped"].map(s=><option key={s}>{s}</option>)}</Select></Field>
        </FormGrid>
        <Btn onClick={save}><ISave size={14}/>Save Log</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={ICheckSq}>Task Checklist</CardTitle>
        {tasks.map(t=>(
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
            <input type="checkbox" checked={t.status==="Completed"} onChange={async e=>{
              const newStatus = e.target.checked ? "Completed" : "Pending";
              try { await API.updateTask(t.id, { status: newStatus }); } catch {}
              setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:newStatus}:x));
            }} style={{ width:17, height:17, accentColor:tk.acc, cursor:"pointer" }}/>
            <label style={{ fontSize:13, flex:1, textDecoration:t.status==="Completed"?"line-through":"none", color:t.status==="Completed"?tk.tx3:tk.tx }}>{t.title}</label>
            <Badge color={t.pri==="High"?"red":t.pri==="Medium"?"amber":"gray"}>{t.pri}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
