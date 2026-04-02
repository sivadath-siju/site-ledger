import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import { Card, CardTitle, Btn } from "../components/Primitives";
import { ICpu, IDatabase } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs = n => "₹" + Number(n||0).toLocaleString("en-IN");
const GEMINI_KEY = "AIzaSyDzfECs8BGkHyt6FJtfOxezGFTDPqvDZGg";

export default function AI() {
  const { tk, att, exp, mats, tasks, inv, workers, expCats } = useApp();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const ta = att.filter(a=>a.date===today());
  const te = exp.filter(e=>e.date===today());
  const low = mats.filter(m=>m.stock<=m.min);
  const tL = att.reduce((s,a)=>s+a.total,0), tE = exp.reduce((s,e)=>s+e.amount,0);

  const buildContext = () => {
    return `SITE DATA Snapshot: Workers ${ta.length}, Labour ${Rs(ta.reduce((s,a)=>s+a.total,0))}, Exp ${Rs(te.reduce((s,e)=>s+e.amount,0))}`;
  };

  const runAnalysis = async () => {
    setLoading(true); setResults([{title:"ANALYSIS", content:"AI integration initialized. Ask a specific question below for real-time site insights."}]);
    setLoading(false);
  };

  const askQuestion = async () => {
    if(!question.trim()) return;
    const q = question; setQuestion(""); setChatLoading(true);
    setChatHistory(prev=>[...prev, { role:"user", text: q }]);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ contents:[{ parts:[{ text: q + " (Context: " + buildContext() + ")" }] }] })
      });
      const data = await res.json();
      setChatHistory(prev=>[...prev, { role:"ai", text: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response." }]);
    } catch { setChatHistory(prev=>[...prev, { role:"ai", text:"Could not connect to AI." }]); }
    setChatLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom:18, animation:"fadeUp .25s ease" }}>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-.4px" }}>AI Analysis</div>
        <div style={{ fontSize:12, color:tk.tx2, marginTop:2 }}>Powered by Google Gemini — Free</div>
      </div>
      <Card delay={.05}>
        <CardTitle icon={IDatabase}>Live Data Snapshot</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:9 }}>
          {[
            {l:"Workers today",  v:ta.length,   c:tk.acc},
            {l:"Labour today",   v:Rs(ta.reduce((s,a)=>s+a.total,0)), c:tk.grn},
            {l:"Expenses today", v:Rs(te.reduce((s,e)=>s+e.amount,0)), c:tk.amb},
            {l:"Total spend",    v:Rs(tL+tE),   c:tk.tx},
          ].map(x=>(
            <div key={x.l} style={{ background:tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius:10, padding:11 }}>
              <div style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", color:x.c, marginBottom:2 }}>{x.v}</div>
              <div style={{ fontSize:11, color:tk.tx3 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </Card>
      <Btn fullWidth onClick={runAnalysis} disabled={loading} style={{ marginBottom:14 }}>
        <ICpu size={14}/>Generate AI Summary
      </Btn>
      {results && results.map((s,i)=>(
        <div key={i} style={{ background:tk.accL, border: `1px solid ${tk.acc}33`, borderRadius:14, padding:18, marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:tk.acc, marginBottom:10, textTransform:"uppercase" }}>{s.title}</div>
          <div style={{ fontSize:13, lineHeight:1.8, color:tk.tx }}>{s.content}</div>
        </div>
      ))}
      <Card delay={.1} style={{ marginTop:8 }}>
        <CardTitle icon={ICpu}>Ask Anything About Your Site</CardTitle>
        <div style={{ marginBottom:14, maxHeight:300, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
          {chatHistory.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius: m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background: m.role==="user"?tk.acc:tk.surf2, color: m.role==="user"?"#fff":tk.tx, fontSize:13 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askQuestion()} placeholder="Ask a question..." style={{ flex:1, border: `1.5px solid ${tk.bdr}`, borderRadius:10, padding:"10px 12px", background:tk.surf2, color:tk.tx, outline:"none" }} />
          <Btn onClick={askQuestion} disabled={chatLoading||!question.trim()}>Ask</Btn>
        </div>
      </Card>
    </div>
  );
}
