import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, StatCard, TableWrap, Badge, Empty, SummaryRow } from "../components/Primitives";
import { IRupee, IUsers, IPackage, IReceipt, ITrending, IPieChart, ITag } from "../icons/Icons";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

const Rs   = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const Nf   = n => Number(n || 0).toLocaleString("en-IN");
const COLORS = ["#1a56db","#0d7a4e","#b45309","#c0392b","#8e44ad","#16a085","#e67e22","#2980b9","#e74c3c","#27ae60"];

export default function Reports() {
  const { tk, att, exp, mats, matLogs, expCats } = useApp();
  const [catTotals, setCatTotals] = useState([]);

  // Fetch category totals from backend
  useEffect(() => {
    API.getWorkerCategoryTotals?.().then(data => setCatTotals(data || [])).catch(() => {});
  }, [att]);

  // Direct (non-subcontract) labour only
  const directAtt = att.filter(a => !a.isSubcontract);
  const tL = directAtt.reduce((s, a) => s + (a.total || 0), 0);
  const tE = exp.reduce((s, e) => s + e.amount, 0);

  // Labour category breakdown from local state
  const localCatTotals = {};
  directAtt.forEach(a => {
    const cat = a.labour_category || a.role || "General";
    localCatTotals[cat] = (localCatTotals[cat] || 0) + (a.total || 0);
  });
  const catData = Object.entries(localCatTotals)
    .map(([name, value]) => ({ name, value }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const expPieData = expCats.map(cat => ({
    name: cat, value: exp.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.value > 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    return {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      labour:   directAtt.filter(a => a.date === ds).reduce((s, a) => s + (a.total || 0), 0),
      expenses: exp.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0),
    };
  }).reverse();

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: tk.shLg }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: tk.tx }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>₹{Number(p.value).toLocaleString("en-IN")}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Reports</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Financial and operational summaries — Ciel Homes</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <StatCard icon={IRupee}   value={Rs(tL + tE)} label="Total Spend"          color="acc" delay={.04} />
        <StatCard icon={IUsers}   value={directAtt.length} label="Attendance Records (Direct)" color="grn" delay={.08} />
        <StatCard icon={IPackage} value={matLogs.length} label="Mat. Transactions"  color="amb" delay={.12} />
        <StatCard icon={IReceipt} value={exp.length}    label="Expense Entries"     color="red" delay={.16} />
      </div>

      {/* 7-day trend */}
      <Card delay={.1}>
        <CardTitle icon={ITrending}>7-Day Spend Trend</CardTitle>
        {last7.some(d => d.labour > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tk.bdr} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: tk.tx3 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: tk.tx3 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="labour"   name="Labour (Direct)" fill={tk.grn} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses"        fill={tk.acc} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty icon={ITrending} text="No spend data yet." />}
      </Card>

      {/* ── CATEGORY-WISE LABOUR EXPENDITURE ── */}
      <Card delay={.13}>
        <CardTitle icon={ITag}>Labour by Category (Direct Workers Only)</CardTitle>
        {catData.length === 0 ? (
          <Empty icon={IUsers} text="No attendance data with categories yet." />
        ) : (
          <>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <TableWrap>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 340 }}>
                  <thead>
                    <tr>
                      {["Category", "Amount", "% of Labour"].map(h => (
                        <th key={h} style={{
                          textAlign: h === "Category" ? "left" : "right",
                          padding: "9px 12px", fontSize: 10, fontWeight: 700,
                          color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em",
                          borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catData.map((c, i) => (
                      <tr key={c.name}>
                        <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                          {Rs(c.value)}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx2 }}>
                          {tL > 0 ? `${((c.value / tL) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: "10px 12px", fontWeight: 700, borderTop: `2px solid ${tk.bdr}` }}>Total Direct Labour</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right", fontFamily: "'DM Mono',monospace", color: tk.acc, borderTop: `2px solid ${tk.bdr}` }}>{Rs(tL)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right", borderTop: `2px solid ${tk.bdr}` }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </TableWrap>
            </div>

            {/* Bar chart for categories */}
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: tk.tx3 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tk.tx2 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={v => [Rs(v), "Amount"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      {/* Expenses by category */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <Card delay={.16}>
          <CardTitle icon={IPieChart}>Expenses by Category</CardTitle>
          {expPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {expPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [Rs(v), "Amount"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", justifyContent: "center", marginTop: 8 }}>
                {expPieData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: tk.tx2 }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty icon={IReceipt} text="No expense data yet." />}
        </Card>

        {/* Overall summary */}
        <Card delay={.18}>
          <CardTitle icon={ITrending}>Project Summary</CardTitle>
          {[
            { l: "Direct Labour",   v: Rs(tL) },
            { l: "Expenses",        v: Rs(tE) },
            { l: "Grand Total",     v: Rs(tL + tE), bold: true },
          ].map(r => <SummaryRow key={r.l} label={r.l} value={r.v} bold={r.bold} />)}

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: tk.tx3, marginBottom: 8 }}>
              Stock Levels
            </div>
            {mats.map(m => {
              const pct = Math.min(100, (m.stock / Math.max(m.min * 3, m.stock, 1)) * 100);
              const c   = m.stock <= m.min ? tk.red : m.stock <= m.min * 1.5 ? tk.amb : tk.grn;
              return (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span>{m.name}</span>
                    <span style={{ color: tk.tx2 }}>{Nf(m.stock)} {m.unit}</span>
                  </div>
                  <div style={{ background: tk.surf3, borderRadius: 4, height: 5, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: 5, borderRadius: 4, background: c, transition: "width .5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
