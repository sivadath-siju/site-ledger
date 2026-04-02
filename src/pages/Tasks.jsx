import React, { useState } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, TableWrap, Badge, Empty } from "../components/Primitives";
import { IPlus, ICheckCirc, IXCircle, ICheckSq, ITrash } from "../icons/Icons";

export default function Tasks() {
  const { tk, tasks, setTasks, workers } = useApp();
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState("");
  const [pri, setPri] = useState("Medium");
  const [msg, setMsg] = useState(null);

  const filtered = filter === "All" ? tasks : tasks.filter(t => t.status === filter);

  const addTask = async () => {
    if (!title.trim()) return setMsg({ t: "err", s: "Task title required." });
    try {
      const workerObj = workers.find(w => w.name === assigned);
      const res = await API.addTask({ title, assigned_to: workerObj?.id || null, due_date: due || null, priority: pri });
      setTasks(prev => [{ ...res, assigned, pri, status: "Pending" }, ...prev]);
      setMsg({ t: "ok", s: "Task added." });
      setTitle(""); setAssigned(""); setDue("");
      setTimeout(() => setMsg(null), 1500);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  return (
    <div>
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Task Tracker</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Site work orders and assignments</div>
      </div>
      <Card delay={.05}>
        <CardTitle icon={IPlus}>New Task</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <FormGrid>
          <Field label="Task Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe the task" /></Field>
          <Field label="Assigned To">
            <Select value={assigned} onChange={e => setAssigned(e.target.value)}>
              <option value="">— Unassigned —</option>
              {workers.map(w => <option key={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Due Date"><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
          <Field label="Priority"><Select value={pri} onChange={e => setPri(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></Select></Field>
        </FormGrid>
        <Btn onClick={addTask}><IPlus size={14} />Add Task</Btn>
      </Card>
      <Card delay={.1}>
        <CardTitle icon={ICheckSq} action={
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["All", "Pending", "In Progress", "Completed"].map(f => (
              <Btn key={f} variant={filter === f ? "primary" : "secondary"} small onClick={() => setFilter(f)}>{f}</Btn>
            ))}
          </div>
        }>Tasks</CardTitle>
        {filtered.length === 0 ? <Empty icon={ICheckSq} text="No tasks found." /> : (
          <TableWrap>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
              <thead><tr>{["Task", "Assigned", "Priority", "Status", ""].map(h => <th key={h} style={{ textAlign: "left", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2 }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>{t.title}</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx2 }}>{t.assigned || "—"}</td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}><Badge color={t.pri === "High" ? "red" : t.pri === "Medium" ? "amber" : "gray"}>{t.pri}</Badge></td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}><Badge color={t.status === "Completed" ? "green" : t.status === "In Progress" ? "blue" : "gray"}>{t.status}</Badge></td>
                    <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {t.status !== "Completed" && <Btn variant="secondary" small onClick={async () => { try { await API.updateTask(t.id, { status: "Completed" }); setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "Completed" } : x)); } catch (e) { alert(e.message); } }}>Done</Btn>}
                        {t.status === "Pending" && <Btn variant="ghost" small onClick={async () => { try { await API.updateTask(t.id, { status: "In Progress" }); setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: "In Progress" } : x)); } catch (e) { alert(e.message); } }}>Start</Btn>}
                        <Btn variant="ghost" small onClick={async () => { try { await API.deleteTask(t.id); setTasks(prev => prev.filter(x => x.id !== t.id)); } catch (e) { alert(e.message); } }} style={{ padding: "5px 8px" }}><ITrash size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
