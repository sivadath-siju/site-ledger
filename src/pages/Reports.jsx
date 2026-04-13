import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Empty } from "../components/Primitives";
import { IRupee, IUsers, IPackage, IReceipt, ITrending, IPieChart, ITag, IActivity } from "../icons/Icons";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";

const Rs  = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const Nf  = n => Number(n || 0).toLocaleString("en-IN");
const Pct = (n, t) => t > 0 ? ((n / t) * 100).toFixed(1) + "%" : "0%";

// Palette — semantic, consistent
const P = {
  labour:  "#1d4ed8",  // blue
  expense: "#7c3aed",  // violet
  invoice: "#b91c1c",  // red
  sub:     "#92400e",  // amber-dark (subcontract reference)
  green:   "#15803d",
  gray:    "#6b7280",
};
const CHART_COLORS = ["#1d4ed8","#15803d","#7c3aed","#b91c1c","#0891b2","#92400e","#be123c","#0f766e","#a16207","#4338ca"];

// Custom recharts tooltip
function ChartTip({ active, payload, label, prefix = "₹" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: "#6b7280" }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{prefix === "₹" ? Rs(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Small stat tile
function Tile({ label, value, sub, color, delay = 0 }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", animation: `fadeUp .3s ease ${delay}s both` }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: color || "#111827", letterSpacing: "-.3px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Horizontal progress bar
function HBar({ label, value, max, color, total, right }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "#374151", fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: color }}>{right || Rs(value)}</span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 8, borderRadius: 6, background: color, transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      {total != null && (
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "right" }}>{Pct(value, total)} of total</div>
      )}
    </div>
  );
}

export default function Reports() {
  const { tk, att, exp, mats, matLogs, expCats, workers, inv, tasks } = useApp();

  const [subTotals, setSubTotals] = useState({ bySub: [], byType: [] });
  const [grandTotals, setGrandTotals] = useState(null);

  useEffect(() => {
    API.getSubcontractorTotals?.().then(setSubTotals).catch(() => {});
    API.getGrandTotals?.().then(setGrandTotals).catch(() => {});
  }, [att, exp]);

  /* ── Derived data ───────────────────────────────────────── */

  const directAtt   = att.filter(a => !a.isSubcontract);
  const subAtt      = att.filter(a => a.isSubcontract);
  const tL          = directAtt.reduce((s, a) => s + (a.total || 0), 0);  // direct labour
  const tSub        = subAtt.reduce((s, a) => s + (a.total || 0), 0);     // sub labour (ref)
  const tE          = exp.reduce((s, e) => s + e.amount, 0);
  const tInv        = inv.reduce((s, i) => s + i.amount, 0);
  const tPaid       = inv.reduce((s, i) => s + (i.paid || 0), 0);
  const tOutstanding = tInv - tPaid;
  const grandTotal  = grandTotals?.grandTotal ?? (tL + tE);

  // 7-day daily spend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    return {
      date:     d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      labour:   directAtt.filter(a => a.date === ds).reduce((s, a) => s + (a.total || 0), 0),
      expenses: exp.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0),
    };
  }).reverse();

  // 30-day daily spend for line chart (kept for reference but replaced in UI)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d  = new Date(); d.setDate(d.getDate() - (29 - i));
    const ds = d.toISOString().split("T")[0];
    const labour   = directAtt.filter(a => a.date === ds).reduce((s, a) => s + (a.total || 0), 0);
    const expenses = exp.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
    return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), labour, expenses, total: labour + expenses };
  });

  // 30-day STOCK USAGE line chart — one line per material, "out" movements only
  const matUsageColors = ["#1d4ed8","#15803d","#7c3aed","#b91c1c","#0891b2","#92400e","#be123c","#0f766e"];
  const last30Dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return { ds: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) };
  });
  const stockUsageData = last30Dates.map(({ ds, label }) => {
    const row = { date: label };
    mats.forEach(m => {
      const dayOut = matLogs
        .filter(l => (l.material_id === m.id || l.material === m.name) && l.type === "out" && l.date === ds)
        .reduce((s, l) => s + (l.qty || l.quantity || 0), 0);
      row[m.name] = dayOut;
    });
    return row;
  });
  const activeMats = mats.filter(m =>
    matLogs.some(l => (l.material_id === m.id || l.material === m.name) && l.type === "out")
  ).slice(0, 6); // max 6 lines for readability

  // Spend breakdown pie
  const spendPie = [
    { name: "Direct Labour",   value: tL, color: P.labour  },
    { name: "Expenses",        value: tE, color: P.expense  },
  ].filter(x => x.value > 0);

  // Expense by category
  const expByCat = expCats.map(cat => ({
    name:  cat,
    value: exp.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

  // Labour by category (direct only)
  const labByCat = {};
  directAtt.forEach(a => {
    const cat = a.labour_category || a.role || "General";
    labByCat[cat] = (labByCat[cat] || 0) + (a.total || 0);
  });
  const labCatData = Object.entries(labByCat)
    .map(([name, value]) => ({ name, value }))
    .filter(x => x.value > 0).sort((a, b) => b.value - a.value);

  // Stock health
  const lowStock    = mats.filter(m => m.stock <= m.min);
  const cautionStock = mats.filter(m => m.stock > m.min && m.stock <= m.min * 1.5);
  const healthyStock = mats.filter(m => m.stock > m.min * 1.5);

  // Worker stats (direct)
  const directWorkers = workers.filter(w => !w.is_subcontract);
  const topWorkers = directWorkers.map(w => ({
    name:   w.name,
    role:   w.role,
    days:   att.filter(a => a.workerId === w.id && !a.isSubcontract).length,
    total:  att.filter(a => a.workerId === w.id && !a.isSubcontract).reduce((s, a) => s + (a.total || 0), 0),
  })).filter(w => w.days > 0).sort((a, b) => b.days - a.days).slice(0, 8);

  // Tasks breakdown
  const tasksDone    = tasks.filter(t => t.status === "Completed").length;
  const tasksPending = tasks.filter(t => t.status === "Pending").length;
  const tasksInProg  = tasks.filter(t => t.status === "In Progress").length;

  // Recent expenses (last 5)
  const recentExp = [...exp].sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 5);

  const hasData = att.length > 0 || exp.length > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Reports & Analytics</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>
          Ciel Homes — complete project overview · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* ── Top KPI tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Tile label="Total Spend"     value={Rs(grandTotal)}      sub="Labour + Expenses"       color={P.labour}  delay={.02} />
        <Tile label="Outstanding"     value={Rs(tOutstanding)}    sub="Unpaid invoices"         color={tOutstanding > 0 ? P.invoice : P.green} delay={.05} />
        <Tile label="Direct Workers"  value={directWorkers.length} sub={`${directAtt.length} records`} color={P.labour} delay={.08} />
        <Tile label="Low Stock Items" value={lowStock.length}     sub={`${mats.length} total materials`} color={lowStock.length > 0 ? P.invoice : P.green} delay={.11} />
        <Tile label="Pending Tasks"   value={tasksPending + tasksInProg} sub={`${tasksDone} completed`} color={P.expense} delay={.14} />
        <Tile label="Expense Entries" value={exp.length}          sub={Rs(tE) + " total"}       color={P.expense} delay={.17} />
      </div>

      {!hasData && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <IPieChart size={48} style={{ marginBottom: 16, opacity: .3 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>No data to display yet</div>
          <div style={{ fontSize: 13 }}>Start adding attendance, expenses and materials to see reports.</div>
        </div>
      )}

      {hasData && (
        <>
          {/* ══════════════════════════════════════════════════
              ROW 1: Spend breakdown + 7-day trend
          ══════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>

            {/* Spend breakdown donut */}
            <Card>
              <CardTitle icon={IPieChart}>Total Spend Breakdown</CardTitle>
              {spendPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={spendPie} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                        {spendPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={v => [Rs(v), "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {spendPie.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: "inline-block", flexShrink: 0 }} />
                          <span style={{ color: "#374151" }}>{d.name}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: d.color }}>{Rs(d.value)}</span>
                          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6 }}>{Pct(d.value, tL + tE)}</span>
                        </div>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Grand Total</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#111827" }}>{Rs(tL + tE)}</span>
                    </div>
                  </div>
                </>
              ) : <Empty icon={IPieChart} text="No spend data yet." />}
            </Card>

            {/* 7-day bar trend */}
            <Card>
              <CardTitle icon={ITrending}>7-Day Daily Spend</CardTitle>
              {last7.some(d => d.labour > 0 || d.expenses > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={last7} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
                    <Tooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="labour"   name="Labour"   fill={P.labour}  radius={[3,3,0,0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={P.expense} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty icon={ITrending} text="No spend data in last 7 days." />}
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════
              ROW 2: 30-day STOCK USAGE line chart
          ══════════════════════════════════════════════════ */}
          {activeMats.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <CardTitle icon={IPackage}>30-Day Material Usage (Quantities Issued)</CardTitle>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Daily quantity used per material — "out" movements only</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stockUsageData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip prefix="" />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {activeMats.map((m, i) => (
                    <Line
                      key={m.id}
                      type="monotone"
                      dataKey={m.name}
                      stroke={matUsageColors[i % matUsageColors.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {/* Material legend with unit */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {activeMats.map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#374151" }}>
                    <span style={{ width: 16, height: 3, borderRadius: 2, background: matUsageColors[i % matUsageColors.length], display: "inline-block" }} />
                    {m.name} ({m.unit})
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ══════════════════════════════════════════════════
              ROW 3: Labour by category + Expense by category
          ══════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>

            {/* Labour by category */}
            <Card>
              <CardTitle icon={ITag}>Labour by Category</CardTitle>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>Direct workers only</div>
              {labCatData.length === 0 ? <Empty icon={IUsers} text="No categorised labour data." /> : (
                <>
                  {labCatData.map((c, i) => (
                    <HBar key={c.name} label={c.name} value={c.value} max={labCatData[0].value} color={CHART_COLORS[i % CHART_COLORS.length]} total={tL} />
                  ))}
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>Total Direct Labour</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color: P.labour }}>{Rs(tL)}</span>
                  </div>
                </>
              )}
            </Card>

            {/* Expense by category */}
            <Card>
              <CardTitle icon={IReceipt}>Expenses by Category</CardTitle>
              {expByCat.length === 0 ? <Empty icon={IReceipt} text="No expense data yet." /> : (
                <>
                  {expByCat.slice(0, 7).map((c, i) => (
                    <HBar key={c.name} label={c.name} value={c.value} max={expByCat[0].value} color={CHART_COLORS[i % CHART_COLORS.length]} total={tE} />
                  ))}
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>Total Expenses</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color: P.expense }}>{Rs(tE)}</span>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════
              ROW 4: Subcontractor breakdown (reference)
          ══════════════════════════════════════════════════ */}
          {(subTotals.byType?.length > 0 || tSub > 0) && (
            <Card style={{ marginBottom: 14 }}>
              <CardTitle icon={IUsers}>
                Subcontractor Labour Summary
                <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>reference only — not in your totals</span>
              </CardTitle>

              {/* By type */}
              {subTotals.byType?.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {subTotals.byType.map((t, i) => (
                    <div key={t.type} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>{t.type}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color: "#78350f" }}>{Rs(t.total_cost)}</div>
                      <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>
                        {t.contractor_count} contractor{t.contractor_count !== 1 ? "s" : ""} · {t.worker_count} worker{t.worker_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                  <div style={{ background: "#fef3c7", border: "2px solid #f59e0b", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Grand Total (Ref)</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 800, color: "#78350f" }}>{Rs(tSub)}</div>
                  </div>
                </div>
              )}

              {/* Per subcontractor bar */}
              {subTotals.bySub?.length > 0 && (
                <ResponsiveContainer width="100%" height={Math.max(120, subTotals.bySub.length * 38)}>
                  <BarChart data={subTotals.bySub} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={v => [Rs(v), "Total Wages"]} />
                    <Bar dataKey="total_cost" name="Wages" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          )}

          {/* ══════════════════════════════════════════════════
              ROW 5: Worker productivity + Stock health
          ══════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>

            {/* Worker productivity */}
            <Card>
              <CardTitle icon={IUsers}>Worker Productivity (Direct)</CardTitle>
              {topWorkers.length === 0 ? <Empty icon={IUsers} text="No attendance data." /> : (
                topWorkers.map((w, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eff6ff", color: P.labour, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                      <div style={{ fontSize: 10, color: "#6b7280" }}>{w.role} · {w.days} day{w.days !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: P.labour, whiteSpace: "nowrap" }}>{Rs(w.total)}</div>
                  </div>
                ))
              )}
            </Card>

            {/* Stock health */}
            <Card>
              <CardTitle icon={IPackage}>Materials Stock Health</CardTitle>

              {/* Summary pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { label: "Healthy",  count: healthyStock.length, color: "#15803d", bg: "#f0fdf4" },
                  { label: "Caution",  count: cautionStock.length, color: "#92400e", bg: "#fffbeb" },
                  { label: "Low",      count: lowStock.length,     color: "#b91c1c", bg: "#fef2f2" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 8, padding: "6px 12px", textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {mats.length === 0 ? <Empty icon={IPackage} text="No materials added." /> : mats.map(m => {
                const pct  = Math.min(100, (m.stock / Math.max(m.min * 3, m.stock, 1)) * 100);
                const color = m.stock <= m.min ? "#b91c1c" : m.stock <= m.min * 1.5 ? "#92400e" : "#15803d";
                const statusLabel = m.stock <= m.min ? "LOW" : m.stock <= m.min * 1.5 ? "WATCH" : "OK";
                return (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 500, color: "#374151" }}>{m.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#6b7280" }}>{Nf(m.stock)} {m.unit}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: color + "18", color, padding: "1px 5px", borderRadius: 4, border: `1px solid ${color}33` }}>{statusLabel}</span>
                      </div>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 6, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: 6, borderRadius: 6, background: color, transition: "width .6s" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>Min: {Nf(m.min)} {m.unit}</div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════
              ROW 6: Tasks overview + Recent expenses
          ══════════════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>

            {/* Task status */}
            <Card>
              <CardTitle icon={IActivity}>Task Overview</CardTitle>
              {tasks.length === 0 ? <Empty icon={IActivity} text="No tasks created yet." /> : (
                <>
                  {/* Donut */}
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Completed",  value: tasksDone,    color: "#15803d" },
                          { name: "In Progress",value: tasksInProg,  color: "#1d4ed8" },
                          { name: "Pending",    value: tasksPending, color: "#9ca3af" },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={2} dataKey="value"
                      >
                        {[
                          { name: "Completed",  color: "#15803d" },
                          { name: "In Progress",color: "#1d4ed8" },
                          { name: "Pending",    color: "#9ca3af" },
                        ].map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
                    {[
                      { l: "Completed",   v: tasksDone,    c: "#15803d" },
                      { l: "In Progress", v: tasksInProg,  c: "#1d4ed8" },
                      { l: "Pending",     v: tasksPending, c: "#9ca3af" },
                    ].map(t => (
                      <div key={t.l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: t.c }}>{t.v}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{t.l}</div>
                      </div>
                    ))}
                  </div>
                  {tasks.length > 0 && (
                    <div style={{ marginTop: 10, background: "#f9fafb", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#374151" }}>
                      <span style={{ fontWeight: 700 }}>{Pct(tasksDone, tasks.length)}</span> of tasks completed
                      <div style={{ marginTop: 4, background: "#e5e7eb", borderRadius: 4, height: 6 }}>
                        <div style={{ width: Pct(tasksDone, tasks.length), height: 6, borderRadius: 4, background: "#15803d" }} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Recent expenses */}
            <Card>
              <CardTitle icon={IReceipt}>Recent Expenses</CardTitle>
              {recentExp.length === 0 ? <Empty icon={IReceipt} text="No expenses recorded yet." /> : (
                recentExp.map((e, i) => (
                  <div key={e.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < recentExp.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f3ff", color: P.expense, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700 }}>
                      {(e.category || "?").charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc}</div>
                      <div style={{ fontSize: 10, color: "#6b7280" }}>{e.category} · {e.date}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: P.expense, whiteSpace: "nowrap" }}>{Rs(e.amount)}</div>
                  </div>
                ))
              )}
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════
              ROW 7: Invoice status summary
          ══════════════════════════════════════════════════ */}
          {inv.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <CardTitle icon={IRupee}>Invoice & Payment Status</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { l: "Total Invoiced", v: Rs(tInv),        c: "#111827", bg: "#f8fafc" },
                  { l: "Paid",           v: Rs(tPaid),        c: P.green,   bg: "#f0fdf4" },
                  { l: "Outstanding",    v: Rs(tOutstanding), c: tOutstanding > 0 ? P.invoice : P.green, bg: tOutstanding > 0 ? "#fef2f2" : "#f0fdf4" },
                  { l: "Invoices",       v: inv.length,       c: "#1d4ed8", bg: "#eff6ff" },
                ].map(s => (
                  <div key={s.l} style={{ background: s.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: typeof s.v === "string" ? "'DM Mono',monospace" : undefined, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Invoice status bar chart */}
              {(() => {
                const byStatus = [
                  { name: "Paid",           count: inv.filter(i => i.status === "Paid").length,            color: P.green  },
                  { name: "Partially Paid", count: inv.filter(i => i.status === "Partially Paid").length,  color: "#f59e0b" },
                  { name: "Unpaid",         count: inv.filter(i => i.status === "Unpaid").length,           color: P.invoice },
                ].filter(x => x.count > 0);

                return (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {byStatus.map(s => (
                      <div key={s.name} style={{ flex: s.count, minWidth: 20, background: s.color, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{s.count}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>invoices</div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                {[
                  { c: P.green,   l: "Paid" },
                  { c: "#f59e0b", l: "Partially Paid" },
                  { c: P.invoice, l: "Unpaid" },
                ].map(s => (
                  <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c, display: "inline-block" }} />
                    {s.l}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
