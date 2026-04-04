import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, Sheet, Badge, Empty } from "../components/Primitives";
import { IFileText, ICheckCirc, IXCircle, IBuilding, IClock, ITrash, IUsers, IReceipt } from "../icons/Icons";

/* ── Colour constants — no orange for data ─────────────────────── */
const C = {
  debitInvoice: "#b91c1c",   // red-700 — invoice debit
  debitExpense: "#92400e",   // amber-800 — expense debit
  debitLabour:  "#1d4ed8",   // blue-700 — labour debit
  credit:       "#15803d",   // green-700 — credit/payment
  balance:      "#111827",   // gray-900 — running balance
  balanceDue:   "#b91c1c",   // red when positive
  balanceClear: "#15803d",   // green when zero
  headerBg:     "#f8fafc",
};

const Rs    = n => "₹" + Number(n||0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD  = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];

// Inline icons
const IBalance = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l4.5 4.5L12 9"/><path d="M12 9l4.5 4.5L21 9"/>
    <line x1="3" y1="21" x2="21" y2="21"/><line x1="1.5" y1="9" x2="10.5" y2="9"/><line x1="13.5" y1="9" x2="22.5" y2="9"/>
  </svg>
);
const ICreditCard = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IDownload = ({ size = 13, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

function exportCSV(rows, filename) {
  const csv  = rows.map(r => r.map(c => `"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a    = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

// Colour-coded source badge
function SourceBadge({ source }) {
  const cfg = {
    invoice: { bg: "#fef2f2", color: C.debitInvoice, label: "INV" },
    expense: { bg: "#fffbeb", color: C.debitExpense, label: "EXP" },
    payment: { bg: "#f0fdf4", color: C.credit,       label: "PMT" },
    labour:  { bg: "#eff6ff", color: C.debitLabour,  label: "LAB" },
  };
  const c = cfg[source] || cfg.invoice;
  return <span style={{ background: c.bg, color: c.color, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: `1px solid ${c.color}33`, whiteSpace: "nowrap" }}>{c.label}</span>;
}

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv, exp, att, isDesktop } = useApp();

  // Grand totals from backend
  const [grandTotals, setGrandTotals] = useState({ invoiceTotal: 0, expenseTotal: 0, labourTotal: 0, grandTotal: 0, paidTotal: 0, outstanding: 0 });
  const [totalsLoading, setTotalsLoading] = useState(true);

  // View state
  const [view, setView]                 = useState("summary"); // summary | vendor | labour
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [vendorLedger, setVendorLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [fromDate, setFromDate]         = useState("");
  const [toDate,   setToDate]           = useState("");

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

  // Load grand totals
  const loadGrandTotals = useCallback(() => {
    setTotalsLoading(true);
    API.getGrandTotals()
      .then(d => setGrandTotals(d))
      .catch(() => {})
      .finally(() => setTotalsLoading(false));
  }, []);

  useEffect(() => { loadGrandTotals(); }, [loadGrandTotals]);

  // Load vendor ledger
  useEffect(() => {
    if (view !== "vendor" || selectedVendor === "all") { setVendorLedger(null); return; }
    setLedgerLoading(true);
    API.getVendorLedger(selectedVendor)
      .then(d => setVendorLedger(d))
      .catch(() => setVendorLedger(null))
      .finally(() => setLedgerLoading(false));
  }, [view, selectedVendor]);

  // Load labour ledger
  useEffect(() => {
    if (view !== "labour") return;
    setLabourLoading(true);
    API.getLabourLedger({ from: fromDate || undefined, to: toDate || undefined })
      .then(d => setLabourLedger(d.entries || []))
      .catch(() => setLabourLedger([]))
      .finally(() => setLabourLoading(false));
  }, [view, fromDate, toDate]);

  // Derived
  const totalExpAll = exp.reduce((s, e) => s + e.amount, 0);

  // Vendor summary: invoices + expenses per vendor
  const vendorSummary = vendors.map(v => {
    const vInv = inv.filter(i => i.vendor === v.name);
    const vExp = exp.filter(e => e.vendor === v.name);
    const invTotal = vInv.reduce((s,i) => s + i.amount, 0);
    const expTotal = vExp.reduce((s,e) => s + e.amount, 0);
    const paid     = vInv.reduce((s,i) => s + (i.paid||0), 0);
    return { ...v, invTotal, expTotal, paid, debit: invTotal + expTotal, balance: invTotal + expTotal - paid };
  });

  // Pay handlers
  const openPaySheet = (invoice) => {
    setPayInvoice(invoice);
    setPayAmount((invoice.amount - (invoice.paid||0)).toFixed(2));
    setPayMode("Cash"); setPayRef(""); setPayNotes("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMsg(null); setPaySheet(true);
  };

  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return setPayMsg({ t: "err", s: "Enter a valid amount." });
    const rem = payInvoice.amount - (payInvoice.paid||0);
    if (amt > rem + 0.01) return setPayMsg({ t: "err", s: `Max payable: ${Rs(rem)}` });
    setPaying(true);
    try {
      await API.addPayment(payInvoice.id, { amount: amt, payment_mode: payMode, reference: payRef, notes: payNotes, paid_at: `${payDate}T${new Date().toTimeString().slice(0,8)}` });
      const newPaid   = (payInvoice.paid||0) + amt;
      const newStatus = Math.abs(newPaid - payInvoice.amount) < 0.01 ? "Paid" : "Partially Paid";
      setInv(prev => prev.map(x => x.id === payInvoice.id ? { ...x, paid: newPaid, status: newStatus } : x));
      loadGrandTotals();
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
    try { await API.deletePayment(histInvoice.id, pid); setPayments(prev => prev.filter(p => p.id !== pid)); loadGrandTotals(); }
    catch (e) { alert(e.message); }
  };

  const statusBadge = (inv) => {
    if (inv.status === "Paid" || Math.abs((inv.paid||0) - inv.amount) < 0.01) return <Badge color="green">Paid</Badge>;
    if ((inv.paid||0) > 0) return <Badge color="amber">Partial</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  // CSV
  const exportSummaryCSV = () => {
    const rows = [
      ["Category", "Amount (₹)"],
      ["Total Invoices",    grandTotals.invoiceTotal.toFixed(2)],
      ["Total Expenses",    grandTotals.expenseTotal.toFixed(2)],
      ["Direct Labour",     grandTotals.labourTotal.toFixed(2)],
      ["Grand Total Debit", grandTotals.grandTotal.toFixed(2)],
      ["Total Paid",        grandTotals.paidTotal.toFixed(2)],
      ["Outstanding",       grandTotals.outstanding.toFixed(2)],
    ];
    exportCSV(rows, `ciel-homes-summary-${new Date().toISOString().slice(0,10)}.csv`);
  };

  // Tab button component
  const TabBtn = ({ id, label, icon }) => {
    const active = view === id;
    return (
      <button onClick={() => setView(id)} style={{
        padding: "8px 16px", border: `1.5px solid ${active ? tk.acc : tk.bdr}`,
        borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
        background: active ? tk.acc : "transparent", color: active ? "#fff" : tk.tx2,
        display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
        boxShadow: active ? `0 2px 8px ${tk.acc}44` : "none",
      }}>
        {icon}{label}
      </button>
    );
  };

  /* ── TOP 3 SUMMARY CARDS ─────────────────────────────────────
     Mobile: stacked vertically (1 column)
     Desktop: 3 columns
  ────────────────────────────────────────────────────────────── */
  const summaryCards = [
    {
      label:    "Total Expenditure",
      sublabel: "Invoices + Expenses + Labour",
      value:    Rs(grandTotals.grandTotal),
      color:    "#1e3a5f",  // deep navy — total
      bg:       "#eff6ff",
      border:   "#bfdbfe",
      breakdown: [
        { l: `Invoices`,  v: Rs(grandTotals.invoiceTotal), c: C.debitInvoice },
        { l: `Expenses`,  v: Rs(grandTotals.expenseTotal), c: C.debitExpense },
        { l: `Labour`,    v: Rs(grandTotals.labourTotal),  c: C.debitLabour  },
      ],
    },
    {
      label:    "Amount Paid",
      sublabel: "Payments made to date",
      value:    Rs(grandTotals.paidTotal),
      color:    C.credit,
      bg:       "#f0fdf4",
      border:   "#bbf7d0",
      breakdown: [],
    },
    {
      label:    "Outstanding Balance",
      sublabel: "Remaining to be paid",
      value:    Rs(grandTotals.outstanding),
      color:    grandTotals.outstanding > 0.01 ? C.debitInvoice : C.credit,
      bg:       grandTotals.outstanding > 0.01 ? "#fef2f2" : "#f0fdf4",
      border:   grandTotals.outstanding > 0.01 ? "#fecaca" : "#bbf7d0",
      breakdown: [],
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Balance Sheet</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Financial overview — Ciel Homes</div>
        </div>
        <Btn variant="secondary" small onClick={exportSummaryCSV}><IDownload size={13} />Export CSV</Btn>
      </div>

      {/* ══════════════════════════════════════════════════════
          TOP SUMMARY CARDS
          Mobile: 1-column stack | Desktop: 3-column row
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr",   // KEY: 1-col on mobile
        gap: isDesktop ? 14 : 10,
        marginBottom: 18,
      }}>
        {summaryCards.map((card, i) => (
          <div key={i} style={{
            background: card.bg,
            border: `1.5px solid ${card.border}`,
            borderRadius: 14, padding: isDesktop ? "18px 20px" : "14px 16px",
            animation: `fadeUp .3s ease ${i * 0.06}s both`,
          }}>
            {/* Main value */}
            <div style={{ fontSize: isDesktop ? 26 : 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: card.color, letterSpacing: "-.5px", marginBottom: 4 }}>
              {totalsLoading ? "—" : card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{card.label}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: card.breakdown.length ? 10 : 0 }}>{card.sublabel}</div>

            {/* Breakdown (only on first card) */}
            {card.breakdown.length > 0 && (
              <div style={{ borderTop: `1px solid ${card.border}`, paddingTop: 8 }}>
                {card.breakdown.map(b => (
                  <div key={b.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: b.c, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.c, display: "inline-block" }} />
                      {b.l}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: b.c }}>{b.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          VIEW TABS
      ══════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <TabBtn id="summary" label="Vendor Summary" icon={<IBuilding size={13} />} />
        <TabBtn id="vendor"  label="Vendor Ledger"  icon={<IFileText size={13} />} />
        <TabBtn id="labour"  label="Labour Ledger"  icon={<IUsers size={13} />} />
      </div>

      {/* Date filters (shown for vendor + labour views) */}
      {view !== "summary" && (
        <Card>
          <FormGrid cols={isDesktop ? "2fr 1fr 1fr auto" : "1fr 1fr"}>
            {view === "vendor" && (
              <Field label="Vendor">
                <Select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                  <option value="all">— Select vendor —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="From Date"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
            <Field label="To Date">  <Input type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   /></Field>
            <Field label="&nbsp;">
              <Btn variant="ghost" small onClick={() => { setFromDate(""); setToDate(""); setSelectedVendor("all"); }}>Clear</Btn>
            </Field>
          </FormGrid>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: VENDOR SUMMARY TABLE
      ══════════════════════════════════════════════════════ */}
      {view === "summary" && (
        <Card>
          <CardTitle icon={IBuilding}>Vendor-wise Summary — Invoices + Expenses</CardTitle>
          {vendors.length === 0 ? <Empty icon={IBuilding} text="No vendors added yet." /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Vendor", "Invoiced", "Expenses", "Total Debit", "Paid", "Balance"].map((h, i) => (
                      <th key={h} style={{ textAlign: i > 0 ? "right" : "left", padding: "10px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendorSummary.map(v => (
                    <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedVendor(String(v.id)); setView("vendor"); }}>
                      <td style={{ padding: "11px 12px", borderBottom: `1px solid ${tk.bdr}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{v.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                            {v.cat && <div style={{ fontSize: 10, color: tk.tx3 }}>{v.cat}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", color: C.debitInvoice, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.invTotal)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", color: C.debitExpense, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.expTotal)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{Rs(v.debit)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", color: C.credit, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.paid)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: v.balance > 0.01 ? C.debitInvoice : C.credit, whiteSpace: "nowrap" }}>{Rs(v.balance)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}`, color: "#111827" }}>Total</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitInvoice, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.invoiceTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitExpense, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.expenseTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#111827", borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.invoiceTotal + grandTotals.expenseTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.credit, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.paidTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: (grandTotals.invoiceTotal + grandTotals.expenseTotal - grandTotals.paidTotal) > 0.01 ? C.debitInvoice : C.credit, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.invoiceTotal + grandTotals.expenseTotal - grandTotals.paidTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Outstanding list */}
          {(() => {
            const unpaid = inv.filter(i => i.status !== "Paid" && Math.abs((i.paid||0) - i.amount) > 0.01);
            if (!unpaid.length) return null;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.debitInvoice, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <IClock size={13} /> Outstanding invoices ({unpaid.length})
                </div>
                {unpaid.map(invoice => (
                  <div key={invoice.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.vendor}</div>
                      <div style={{ fontSize: 11, color: tk.tx2 }}>{invoice.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitInvoice, fontSize: 14, whiteSpace: "nowrap" }}>{Rs(invoice.amount - (invoice.paid||0))}</div>
                      <div style={{ fontSize: 10, color: tk.tx3 }}>of {Rs(invoice.amount)}</div>
                    </div>
                    {statusBadge(invoice)}
                    <Btn variant="primary" small onClick={() => openPaySheet(invoice)}><ICreditCard size={11} /> Pay</Btn>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: VENDOR LEDGER (combined invoices + expenses)
      ══════════════════════════════════════════════════════ */}
      {view === "vendor" && (
        <Card>
          <CardTitle icon={IFileText}>
            {selectedVendor === "all" ? "Select a vendor to view ledger" : (vendorLedger?.vendor?.name || "Vendor Ledger")}
          </CardTitle>

          {selectedVendor === "all" ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: tk.tx3, fontSize: 13 }}>
              Select a vendor from the dropdown above to view their complete Dr/Cr ledger.
            </div>
          ) : ledgerLoading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: tk.tx3 }}>Loading ledger…</div>
          ) : !vendorLedger ? (
            <Empty icon={IFileText} text="No data for this vendor." />
          ) : (
            <>
              {/* Vendor meta + totals */}
              <div style={{ display: "flex", gap: isDesktop ? 24 : 12, marginBottom: 16, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" }}>Vendor</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{vendorLedger.vendor.name}</div>
                  {vendorLedger.vendor.phone && <div style={{ fontSize: 11, color: tk.tx3 }}>{vendorLedger.vendor.phone}</div>}
                </div>
                {[
                  { l: "Total Debit",   v: Rs(vendorLedger.summary.total_debit), c: "#111827" },
                  { l: "Total Paid",    v: Rs(vendorLedger.summary.total_paid),  c: C.credit  },
                  { l: "Balance Due",   v: Rs(vendorLedger.summary.balance),     c: vendorLedger.summary.balance > 0.01 ? C.debitInvoice : C.credit },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" }}>{s.l}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 15, color: s.c, whiteSpace: "nowrap" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Colour legend */}
              <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { c: C.debitInvoice, l: "Invoice (Dr)" },
                  { c: C.debitExpense, l: "Expense (Dr)" },
                  { c: C.credit,       l: "Payment (Cr)" },
                ].map(x => (
                  <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c, display: "inline-block" }} />
                    <span style={{ color: "#6b7280" }}>{x.l}</span>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Date","Type","Particulars","Ref","Debit (Dr)","Credit (Cr)","Balance",""].map((h, i) => (
                        <th key={i} style={{ textAlign: i > 3 ? "right" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap", minWidth: i > 3 && i < 7 ? 110 : undefined }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={8} style={{ padding: "7px 10px", fontSize: 11, color: "#9ca3af", fontStyle: "italic", background: "#f9fafb", borderBottom: `1px solid ${tk.bdr}` }}>Opening Balance — ₹0.00</td></tr>

                    {vendorLedger.entries.map((entry, idx) => {
                      const isDebit   = entry.type === "debit";
                      const dataColor = entry.source === "invoice" ? C.debitInvoice
                                      : entry.source === "expense" ? C.debitExpense
                                      : C.credit;
                      const rowBg     = entry.source === "payment"
                        ? "#f0fdf4"
                        : entry.source === "expense" ? "#fffbeb" : "#fef2f2";

                      return (
                        <tr key={idx} style={{ background: rowBg }}>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtD(entry.date)}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}` }}><SourceBadge source={entry.source} /></td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 13, fontWeight: isDebit ? 600 : 400, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>{entry.particulars}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#9ca3af", whiteSpace: "nowrap" }}>{entry.ref}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: isDebit ? dataColor : "#d1d5db", whiteSpace: "nowrap" }}>{isDebit ? Rs(entry.amount) : "—"}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: !isDebit ? C.credit : "#d1d5db", whiteSpace: "nowrap" }}>{!isDebit ? Rs(entry.amount) : "—"}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: entry.running_balance > 0.01 ? C.debitInvoice : C.credit, whiteSpace: "nowrap" }}>{Rs(Math.max(0, entry.running_balance))}</td>
                          <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>
                            {entry.source === "invoice" && (() => {
                              const matchInv = inv.find(i => i.id === entry.invoice_id);
                              if (!matchInv) return null;
                              const isPaid = matchInv.status === "Paid" || Math.abs((matchInv.paid||0) - matchInv.amount) < 0.01;
                              return (
                                <div style={{ display: "flex", gap: 4} }}>
                                  {!isPaid && <Btn variant="primary" small onClick={() => openPaySheet(matchInv)}><ICreditCard size={11}/> Pay</Btn>}
                                  {(matchInv.paid||0) > 0 && <Btn variant="ghost" small onClick={() => openHistory(matchInv)}>Hist</Btn>}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Closing row */}
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={4} style={{ padding: "11px 10px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}`, color: "#111827" }}>Closing Balance</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitInvoice, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(vendorLedger.summary.total_debit)}</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.credit, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(vendorLedger.summary.total_paid)}</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: vendorLedger.summary.balance > 0.01 ? C.debitInvoice : C.credit, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(vendorLedger.summary.balance)}</td>
                      <td style={{ borderTop: `2px solid ${tk.bdr}` }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: LABOUR LEDGER
      ══════════════════════════════════════════════════════ */}
      {view === "labour" && (
        <Card>
          <CardTitle icon={IUsers}>
            Direct Labour Payments (Day-wise)
            <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.debitLabour, marginLeft: 8, fontWeight: 700 }}>
              {Rs(grandTotals.labourTotal)}
            </span>
          </CardTitle>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            Shows daily wage payments to direct workers. Each day is a debit entry against your cash.
          </div>
          {labourLoading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: tk.tx3 }}>Loading…</div>
          ) : labourLedger.length === 0 ? (
            <Empty icon={IUsers} text="No direct labour attendance recorded." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date","Workers","Day Total","Running Total"].map((h, i) => (
                      <th key={h} style={{ textAlign: i > 1 ? "right" : "left", padding: "10px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labourLedger.map((entry, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#f9fafb" }}>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{entry.date}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}` }}>
                        <div style={{ fontSize: 13, color: "#111827" }}>{entry.particulars}</div>
                        {entry.workers?.length > 0 && (
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                            {entry.workers.slice(0, 2).join(" · ")}{entry.workers.length > 2 ? ` +${entry.workers.length - 2} more` : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitLabour, whiteSpace: "nowrap" }}>{Rs(entry.amount)}</td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{Rs(entry.running_balance)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={2} style={{ padding: "11px 10px", fontWeight: 700, borderTop: `2px solid ${tk.bdr}`, color: "#111827" }}>Total Direct Labour</td>
                    <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitLabour, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(grandTotals.labourTotal)}</td>
                    <td style={{ padding: "11px 10px", borderTop: `2px solid ${tk.bdr}` }} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Pay Sheet ── */}
      <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Record Payment" icon={ICreditCard}
        footer={<><Btn variant="secondary" onClick={() => setPaySheet(false)} style={{ flex: 1 }}>Cancel</Btn><Btn variant="primary" onClick={submitPayment} disabled={paying} style={{ flex: 2 }}>{paying ? "Saving…" : "Confirm Payment"}</Btn></>}
      >
        {payInvoice && (
          <>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 10 }}>{payInvoice.desc}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[{l:"Total",v:Rs(payInvoice.amount),c:"#111827"},{l:"Paid",v:Rs(payInvoice.paid||0),c:C.credit},{l:"Remaining",v:Rs(payInvoice.amount-(payInvoice.paid||0)),c:C.debitInvoice}].map(s=>(
                  <div key={s.l}><div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>{s.l}</div><div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: s.c, whiteSpace: "nowrap" }}>{s.v}</div></div>
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

      {/* ── History Sheet ── */}
      <Sheet open={histSheet} onClose={() => setHistSheet(false)} title="Payment History" icon={IFileText}>
        {histInvoice && (
          <>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInvoice.vendor} — {histInvoice.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginTop: 4 }}>
                Total: {Rs(histInvoice.amount)} · Paid: <span style={{ color: C.credit }}>{Rs(histInvoice.paid||0)}</span> · Due: <span style={{ color: C.debitInvoice }}>{Rs(histInvoice.amount-(histInvoice.paid||0))}</span>
              </div>
            </div>
            {histLoading ? <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading…</div>
              : payments.length === 0 ? <Empty icon={IFileText} text="No payments yet." />
              : payments.map(p => (
                <div key={p.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", color: C.credit, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>₹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", color: C.credit }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>{p.payment_mode}{p.reference?` · ${p.reference}`:""}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDT(p.paid_at)}</div>
                    {p.notes && <div style={{ fontSize: 11, color: tk.tx2 }}>{p.notes}</div>}
                  </div>
                  <button onClick={() => deletePaymentEntry(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4, borderRadius: 6, flexShrink: 0 }}><ITrash size={13}/></button>
                </div>
              ))
            }
          </>
        )}
      </Sheet>
    </div>
  );
}
