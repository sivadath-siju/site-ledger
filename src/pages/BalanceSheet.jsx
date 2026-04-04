import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, StatCard, Btn, Alert, Field, Select, Input,
  FormGrid, Sheet, Badge, Empty,
} from "../components/Primitives";
import { IFileText, IRupee, ICheckCirc, IXCircle, IBuilding, IClock, ITrash, IUsers, IReceipt } from "../icons/Icons";

const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD  = d  => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = d  => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];
const ORANGE = "#c75a00";

const IBalance = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l4.5 4.5L12 9"/><path d="M12 9l4.5 4.5L21 9"/>
    <line x1="3" y1="21" x2="21" y2="21"/><line x1="1.5" y1="9" x2="10.5" y2="9"/><line x1="13.5" y1="9" x2="22.5" y2="9"/>
  </svg>
);
const ICreditCard = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IDownload = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

function exportCSV(rows, filename) {
  const csv  = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Tab button
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
      cursor: "pointer", transition: "all .15s",
      background: active ? ORANGE : "transparent",
      color: active ? "#fff" : "#a04800",
      boxShadow: active ? `0 2px 8px ${ORANGE}44` : "none",
    }}>{children}</button>
  );
}

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv, exp, att, isDesktop } = useApp();

  // Main tabs
  const [tab, setTab] = useState("vendors"); // vendors | expenses | labour

  // Vendor tab state
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  // Labour ledger
  const [labourLedger, setLabourLedger] = useState([]);
  const [labourLoading, setLabourLoading] = useState(false);

  // Payment sheet
  const [paySheet,  setPaySheet]  = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode,   setPayMode]   = useState("Cash");
  const [payRef,    setPayRef]    = useState("");
  const [payNotes,  setPayNotes]  = useState("");
  const [payDate,   setPayDate]   = useState(() => new Date().toISOString().split("T")[0]);
  const [payMsg,    setPayMsg]    = useState(null);
  const [paying,    setPaying]    = useState(false);

  // History sheet
  const [histSheet,   setHistSheet]   = useState(false);
  const [histInvoice, setHistInvoice] = useState(null);
  const [payments,    setPayments]    = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // Load labour ledger when tab is active
  useEffect(() => {
    if (tab !== "labour") return;
    setLabourLoading(true);
    API.getLabourLedger({ from: fromDate || undefined, to: toDate || undefined })
      .then(d => setLabourLedger(d.entries || []))
      .catch(() => setLabourLedger([]))
      .finally(() => setLabourLoading(false));
  }, [tab, fromDate, toDate]);

  // Derived vendor data
  const vendorInvoices = selectedVendor === "all"
    ? inv
    : inv.filter(i => { const v = vendors.find(v => String(v.id) === String(selectedVendor)); return v && i.vendor === v.name; });

  const totalInvoiced = vendorInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = vendorInvoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalDue      = totalInvoiced - totalPaid;

  // Expense totals
  const totalExpenses     = exp.reduce((s, e) => s + e.amount, 0);
  const vendorExpenses    = selectedVendor === "all" ? exp : exp.filter(e => {
    const v = vendors.find(v => String(v.id) === String(selectedVendor));
    return v && e.vendor === v.name;
  });
  const vendorExpTotal    = vendorExpenses.reduce((s, e) => s + e.amount, 0);

  // Direct labour total
  const directLabourTotal = att.filter(a => !a.isSubcontract).reduce((s, a) => s + (a.total || 0), 0);

  // Pay handlers
  const openPaySheet = (invoice) => {
    setPayInvoice(invoice);
    setPayAmount((invoice.amount - (invoice.paid || 0)).toFixed(2));
    setPayMode("Cash"); setPayRef(""); setPayNotes("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMsg(null); setPaySheet(true);
  };

  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return setPayMsg({ t: "err", s: "Enter a valid amount." });
    const remaining = payInvoice.amount - (payInvoice.paid || 0);
    if (amt > remaining + 0.01) return setPayMsg({ t: "err", s: `Max payable: ${Rs(remaining)}` });
    setPaying(true);
    try {
      await API.addPayment(payInvoice.id, { amount: amt, payment_mode: payMode, reference: payRef, notes: payNotes, paid_at: `${payDate}T${new Date().toTimeString().slice(0, 8)}` });
      const newPaid   = (payInvoice.paid || 0) + amt;
      const newStatus = Math.abs(newPaid - payInvoice.amount) < 0.01 ? "Paid" : "Partially Paid";
      setInv(prev => prev.map(x => x.id === payInvoice.id ? { ...x, paid: newPaid, status: newStatus } : x));
      setPayMsg({ t: "ok", s: `${Rs(amt)} recorded!` });
      setTimeout(() => { setPaySheet(false); setPayMsg(null); }, 1200);
    } catch (e) { setPayMsg({ t: "err", s: e.message }); }
    finally { setPaying(false); }
  };

  const openHistory = async (invoice) => {
    setHistInvoice(invoice); setHistSheet(true); setHistLoading(true);
    try { setPayments(await API.getPayments(invoice.id)); }
    catch { setPayments([]); }
    finally { setHistLoading(false); }
  };

  const deletePaymentEntry = async (pid) => {
    if (!window.confirm("Delete this payment?")) return;
    try { await API.deletePayment(histInvoice.id, pid); setPayments(prev => prev.filter(p => p.id !== pid)); }
    catch (e) { alert(e.message); }
  };

  const statusBadge = (inv) => {
    if (inv.status === "Paid" || Math.abs((inv.paid || 0) - inv.amount) < 0.01) return <Badge color="green">Paid</Badge>;
    if ((inv.paid || 0) > 0) return <Badge color="amber">Partial</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  // CSV export
  const exportVendorCSV = () => {
    const rows = [
      ["Ref", "Vendor", "Type", "Description", "Debit (Dr)", "Credit (Cr)", "Status", "Date"],
      ...vendorInvoices.map(i => [`INV-${String(i.id).padStart(4,"0")}`, i.vendor, "Invoice", i.desc||"", i.amount.toFixed(2), (i.paid||0).toFixed(2), i.status, fmtD(i.created_at)]),
      ...vendorExpenses.map(e => [`EXP-${String(e.id).padStart(4,"0")}`, e.vendor||"—", "Expense", e.desc||"", e.amount.toFixed(2), "0.00", "Paid", fmtD(e.date)]),
      [], ["", "", "", "TOTAL DEBIT", (totalInvoiced + vendorExpTotal).toFixed(2), totalPaid.toFixed(2), "", ""],
    ];
    exportCSV(rows, `ciel-homes-ledger-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const exportLabourCSV = () => {
    const rows = [
      ["Date", "Particulars", "Debit (Dr)", "Running Balance"],
      ...labourLedger.map(e => [e.date, e.particulars, e.amount.toFixed(2), e.running_balance.toFixed(2)]),
    ];
    exportCSV(rows, `ciel-homes-labour-ledger-${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ── Summary stat cards (3-col, no overflow on mobile) ──
  const summaryStats = [
    { label: "Inv. Payable", value: Rs(totalDue),          color: totalDue > 0.01 ? tk.red : tk.grn },
    { label: "Expenses",     value: Rs(totalExpenses),     color: tk.amb },
    { label: "Labour Cost",  value: Rs(directLabourTotal), color: tk.acc },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px", color: ORANGE }}>Balance Sheet</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Vendor ledger · Expenses · Labour payments</div>
        </div>
        <Btn variant="secondary" small onClick={tab === "labour" ? exportLabourCSV : exportVendorCSV}>
          <IDownload size={13} />Export CSV
        </Btn>
      </div>

      {/* Summary mini cards — 3-col, minmax(0) prevents overflow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: isDesktop ? 12 : 7, marginBottom: 14 }}>
        {summaryStats.map(s => (
          <div key={s.label} style={{
            background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 12,
            padding: isDesktop ? "14px 16px" : "10px 9px", boxShadow: tk.sh, minWidth: 0,
          }}>
            <div style={{ fontSize: isDesktop ? 17 : 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: s.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 3 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Date filters */}
      <Card delay={.08}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, background: `${ORANGE}14`, padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
            <TabBtn active={tab === "vendors"}  onClick={() => setTab("vendors")}>🏢 Vendor Ledger</TabBtn>
            <TabBtn active={tab === "expenses"} onClick={() => setTab("expenses")}>🧾 All Expenses</TabBtn>
            <TabBtn active={tab === "labour"}   onClick={() => setTab("labour")}>👷 Labour Payments</TabBtn>
          </div>
        </div>
        <FormGrid cols={isDesktop ? "2fr 1fr 1fr" : "1fr 1fr"}>
          {tab === "vendors" && (
            <Field label="Vendor">
              <Select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                <option value="all">All Vendors</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="From"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
          <Field label="To">  <Input type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   /></Field>
        </FormGrid>
        <Btn variant="ghost" small onClick={() => { setFromDate(""); setToDate(""); setSelectedVendor("all"); }}>Clear</Btn>
      </Card>

      {/* ══════════════════════════════════════
          TAB: VENDOR LEDGER
      ══════════════════════════════════════ */}
      {tab === "vendors" && (
        <>
          {/* All-vendor summary */}
          {selectedVendor === "all" && (
            <Card delay={.12}>
              <CardTitle icon={IBuilding}>Vendor-wise Summary</CardTitle>
              {vendors.length === 0 ? <Empty icon={IBuilding} text="No vendors found." /> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                    <thead><tr>
                      {["Vendor","Invoices","Payable","Expenses","Balance"].map((h, i) => (
                        <th key={h} style={{ textAlign: i > 1 ? "right" : i === 1 ? "center" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {vendors.map(v => {
                        const vInv  = inv.filter(i => i.vendor === v.name);
                        const vExp  = exp.filter(e => e.vendor === v.name);
                        const inv_  = vInv.reduce((s, i) => s + i.amount, 0);
                        const paid_ = vInv.reduce((s, i) => s + (i.paid || 0), 0);
                        const exp_  = vExp.reduce((s, e) => s + e.amount, 0);
                        const bal   = inv_ + exp_ - paid_;
                        return (
                          <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => setSelectedVendor(String(v.id))}>
                            <td style={{ padding: "11px 10px", borderBottom: `1px solid ${tk.bdr}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${ORANGE}1a`, color: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{v.name.charAt(0)}</div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                                  {v.cat && <div style={{ fontSize: 10, color: tk.tx3 }}>{v.cat}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "11px 10px", textAlign: "center", borderBottom: `1px solid ${tk.bdr}` }}>
                              <span style={{ background: tk.accL, color: tk.acc, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{vInv.length}</span>
                            </td>
                            <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600, borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(inv_)}</td>
                            <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: tk.amb, fontWeight: 600, borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(exp_)}</td>
                            <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: `1px solid ${tk.bdr}`, color: bal > 0.01 ? tk.red : tk.grn, whiteSpace: "nowrap" }}>{Rs(bal)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: tk.surf2 }}>
                        <td colSpan={2} style={{ padding: "11px 10px", fontWeight: 700, borderTop: `2px solid ${tk.bdr}` }}>Grand Total</td>
                        <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalInvoiced)}</td>
                        <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.amb, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalExpenses)}</td>
                        <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: totalDue > 0.01 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalDue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Single vendor Dr/Cr ledger */}
          {selectedVendor !== "all" && (() => {
            const v = vendors.find(v => String(v.id) === String(selectedVendor));
            let running = 0;
            // Combine invoices + vendor expenses into ledger, payments as credit
            const allEntries = [
              ...vendorInvoices.map(i => ({ _type: "invoice", date: i.created_at || new Date().toISOString(), ...i })),
              ...vendorExpenses.map(e => ({ _type: "expense", date: e.date + "T00:00:00", ...e })),
            ].sort((a, b) => new Date(a.date) - new Date(b.date));

            const grandDebit = totalInvoiced + vendorExpTotal;
            return (
              <Card delay={.12}>
                <CardTitle icon={IFileText} action={
                  <button onClick={() => setSelectedVendor("all")} style={{ background: "none", border: "none", cursor: "pointer", color: ORANGE, fontSize: 12, fontWeight: 600 }}>← All Vendors</button>
                }>
                  {v?.name || "Vendor"} — Account Ledger
                </CardTitle>
                {v && (
                  <div style={{ display: "flex", gap: 16, marginBottom: 14, padding: "10px 14px", background: `${ORANGE}0d`, borderRadius: 10, border: `1px solid ${ORANGE}33`, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Vendor</div><div style={{ fontWeight: 700 }}>{v.name}</div></div>
                    {v.ph && <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Phone</div><div>{v.ph}</div></div>}
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Net Balance Due</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 18, color: (grandDebit - totalPaid) > 0.01 ? tk.red : tk.grn }}>{Rs(grandDebit - totalPaid)}</div>
                    </div>
                  </div>
                )}
                {allEntries.length === 0 ? <Empty icon={IFileText} text="No transactions for this vendor." /> : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                      <thead><tr>
                        {["Date","Particulars","Ref #","Debit (Dr)","Credit (Cr)","Balance","",""].map((h, i) => (
                          <th key={i} style={{ textAlign: i > 2 ? "right" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap", minWidth: i > 2 && i < 6 ? 110 : undefined }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        <tr><td colSpan={8} style={{ padding: "7px 10px", fontSize: 11, color: tk.tx3, fontStyle: "italic", background: tk.surf2, borderBottom: `1px solid ${tk.bdr}` }}>Opening Balance — ₹0.00</td></tr>
                        {allEntries.map((entry, idx) => {
                          if (entry._type === "invoice") {
                            running += entry.amount;
                            const isPaid = entry.status === "Paid" || Math.abs((entry.paid || 0) - entry.amount) < 0.01;
                            const rows = [
                              <tr key={`inv-${entry.id}`} style={{ background: `${tk.redL}18` }}>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, whiteSpace: "nowrap" }}>{fmtD(entry.date)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.desc || "Invoice"}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx2, whiteSpace: "nowrap" }}>INV-{String(entry.id).padStart(4,"0")}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>{Rs(entry.amount)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>{Rs(running)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "center" }}>{statusBadge(entry)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {!isPaid && <Btn variant="primary" small onClick={() => openPaySheet(entry)}><ICreditCard size={11} /> Pay</Btn>}
                                    {(entry.paid || 0) > 0 && <Btn variant="ghost" small onClick={() => openHistory(entry)}>Hist</Btn>}
                                  </div>
                                </td>
                              </tr>,
                            ];
                            if ((entry.paid || 0) > 0) {
                              running -= entry.paid;
                              rows.push(
                                <tr key={`pmt-${entry.id}`} style={{ background: `${tk.grnL}18` }}>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2 }}>{fmtD(entry.last_payment_at)}</td>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, fontStyle: "italic" }}>Payment — {entry.desc}</td>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx3 }}>PMT-{String(entry.id).padStart(4,"0")}</td>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, whiteSpace: "nowrap" }}>{Rs(entry.paid)}</td>
                                  <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: running > 0.01 ? tk.amb : tk.grn, whiteSpace: "nowrap" }}>{Rs(Math.max(0, running))}</td>
                                  <td colSpan={2} style={{ borderBottom: `1px solid ${tk.bdr}` }} />
                                </tr>
                              );
                            }
                            return rows;
                          } else {
                            // Expense row
                            running += entry.amount;
                            return (
                              <tr key={`exp-${entry.id}`} style={{ background: `${tk.ambL}18` }}>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, whiteSpace: "nowrap" }}>{fmtD(entry.date)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontWeight: 500, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {entry.description || entry.desc} <span style={{ fontSize: 10, color: tk.amb, background: tk.ambL, padding: "1px 6px", borderRadius: 8, marginLeft: 4 }}>Expense</span>
                                </td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx2 }}>EXP-{String(entry.id).padStart(4,"0")}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.amb, whiteSpace: "nowrap" }}>{Rs(entry.amount)}</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                                <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>{Rs(running)}</td>
                                <td colSpan={2} style={{ borderBottom: `1px solid ${tk.bdr}` }} />
                              </tr>
                            );
                          }
                        })}
                        {/* Closing */}
                        <tr style={{ background: tk.surf2 }}>
                          <td colSpan={3} style={{ padding: "11px 10px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>Closing Balance</td>
                          <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandDebit)}</td>
                          <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalPaid)}</td>
                          <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: (grandDebit - totalPaid) > 0.01 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandDebit - totalPaid)}</td>
                          <td colSpan={2} style={{ borderTop: `2px solid ${tk.bdr}` }} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Outstanding quick list */}
          {(() => {
            const unpaid = vendorInvoices.filter(i => i.status !== "Paid" && Math.abs((i.paid || 0) - i.amount) > 0.01);
            if (!unpaid.length) return null;
            return (
              <Card delay={.16}>
                <CardTitle icon={IClock}>Outstanding ({unpaid.length})</CardTitle>
                {unpaid.map(invoice => (
                  <div key={invoice.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.vendor}</div>
                      <div style={{ fontSize: 11, color: tk.tx2 }}>{invoice.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, fontSize: 14, whiteSpace: "nowrap" }}>{Rs(invoice.amount - (invoice.paid || 0))}</div>
                      <div style={{ fontSize: 10, color: tk.tx3 }}>of {Rs(invoice.amount)}</div>
                    </div>
                    {statusBadge(invoice)}
                    <Btn variant="primary" small onClick={() => openPaySheet(invoice)}><ICreditCard size={11} /> Pay</Btn>
                  </div>
                ))}
              </Card>
            );
          })()}
        </>
      )}

      {/* ══════════════════════════════════════
          TAB: ALL EXPENSES
      ══════════════════════════════════════ */}
      {tab === "expenses" && (
        <Card delay={.12}>
          <CardTitle icon={IReceipt}>
            All Expenses
            <span style={{ fontSize: 12, color: tk.amb, fontFamily: "'DM Mono',monospace", marginLeft: 8 }}>{Rs(totalExpenses)}</span>
          </CardTitle>
          {exp.length === 0 ? <Empty icon={IReceipt} text="No expenses recorded yet." /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                <thead><tr>
                  {["Date","Category","Description","Vendor","Amount"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {exp
                    .filter(e => !fromDate || e.date >= fromDate)
                    .filter(e => !toDate   || e.date <= toDate)
                    .map(e => (
                      <tr key={e.id}>
                        <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx2, whiteSpace: "nowrap" }}>{e.date}</td>
                        <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}` }}><Badge color="blue">{e.category}</Badge></td>
                        <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc}</td>
                        <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx2 }}>{e.vendor || "—"}</td>
                        <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.amb, whiteSpace: "nowrap" }}>{Rs(e.amount)}</td>
                      </tr>
                    ))}
                  <tr style={{ background: tk.surf2 }}>
                    <td colSpan={4} style={{ padding: "11px 10px", fontWeight: 700, borderTop: `2px solid ${tk.bdr}` }}>Total Expenses</td>
                    <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.amb, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════
          TAB: LABOUR PAYMENTS
      ══════════════════════════════════════ */}
      {tab === "labour" && (
        <Card delay={.12}>
          <CardTitle icon={IUsers}>
            Direct Labour Payments (Day-wise)
            <span style={{ fontSize: 12, color: tk.acc, fontFamily: "'DM Mono',monospace", marginLeft: 8 }}>{Rs(directLabourTotal)}</span>
          </CardTitle>
          <div style={{ marginBottom: 10, fontSize: 12, color: tk.tx3 }}>
            Each date shows the total wages paid to direct (non-subcontract) workers — treated as cash outflow.
          </div>
          {labourLoading ? (
            <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading…</div>
          ) : labourLedger.length === 0 ? (
            <Empty icon={IUsers} text="No direct labour attendance recorded yet." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                <thead><tr>
                  {["Date","Workers","Debit (Dr)","Running Total"].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 1 ? "right" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3, background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {labourLedger.map((entry, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : tk.surf2 }}>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, whiteSpace: "nowrap" }}>{entry.date}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12 }}>
                        <div style={{ fontSize: 13 }}>{entry.particulars}</div>
                        {entry.workers?.length > 0 && (
                          <div style={{ fontSize: 10, color: tk.tx3, marginTop: 2 }}>{entry.workers.slice(0, 3).join(" · ")}{entry.workers.length > 3 ? ` +${entry.workers.length - 3} more` : ""}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.acc, whiteSpace: "nowrap" }}>{Rs(entry.amount)}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600, color: tk.tx2, whiteSpace: "nowrap" }}>{Rs(entry.running_balance)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: tk.surf2 }}>
                    <td colSpan={2} style={{ padding: "11px 10px", fontWeight: 700, borderTop: `2px solid ${tk.bdr}` }}>Total Labour Paid</td>
                    <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.acc, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(directLabourTotal)}</td>
                    <td style={{ padding: "11px 10px", borderTop: `2px solid ${tk.bdr}` }} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Payment Sheet */}
      <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Record Payment" icon={ICreditCard}
        footer={<><Btn variant="secondary" onClick={() => setPaySheet(false)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="primary" onClick={submitPayment} disabled={paying} style={{ flex: 2 }}>{paying ? "Saving…" : "Confirm Payment"}</Btn></>}
      >
        {payInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 10 }}>{payInvoice.desc}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[{l:"Total",v:Rs(payInvoice.amount),c:tk.tx},{l:"Paid",v:Rs(payInvoice.paid||0),c:tk.grn},{l:"Remaining",v:Rs(payInvoice.amount-(payInvoice.paid||0)),c:tk.red}].map(s=>(
                  <div key={s.l}><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>{s.l}</div><div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: s.c, whiteSpace: "nowrap" }}>{s.v}</div></div>
                ))}
              </div>
            </div>
            {payMsg && <Alert type={payMsg.t}>{payMsg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{payMsg.s}</Alert>}
            <Field label="Payment Amount (₹)"><Input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Enter amount" step="0.01" min="0.01"/></Field>
            <FormGrid>
              <Field label="Date"><Input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/></Field>
              <Field label="Mode"><Select value={payMode} onChange={e=>setPayMode(e.target.value)}>{PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}</Select></Field>
            </FormGrid>
            <Field label="Reference / UTR"><Input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Optional"/></Field>
            <Field label="Notes"><Input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder="Optional"/></Field>
          </>
        )}
      </Sheet>

      {/* History Sheet */}
      <Sheet open={histSheet} onClose={() => setHistSheet(false)} title="Payment History" icon={IFileText}>
        {histInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInvoice.vendor} — {histInvoice.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginTop: 4 }}>Total: {Rs(histInvoice.amount)} · Paid: {Rs(histInvoice.paid||0)} · <span style={{ color: tk.red }}>Due: {Rs(histInvoice.amount-(histInvoice.paid||0))}</span></div>
            </div>
            {histLoading ? <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading…</div>
              : payments.length === 0 ? <Empty icon={IFileText} text="No payments yet." />
              : payments.map(p => (
                <div key={p.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.grnL, color: tk.grn, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>₹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>{p.payment_mode}{p.reference?` · ${p.reference}`:""}</div>
                    <div style={{ fontSize: 11, color: tk.tx3 }}>{fmtDT(p.paid_at)}</div>
                    {p.notes && <div style={{ fontSize: 11, color: tk.tx2 }}>{p.notes}</div>}
                  </div>
                  <button onClick={() => deletePaymentEntry(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: tk.tx3, padding: 4, borderRadius: 6, flexShrink: 0 }}>
                    <ITrash size={13} />
                  </button>
                </div>
              ))
            }
          </>
        )}
      </Sheet>
    </div>
  );
}
