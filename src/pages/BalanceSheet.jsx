import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, Select, Input, FormGrid, Sheet, Badge, Empty } from "../components/Primitives";
import { IFileText, ICheckCirc, IXCircle, IBuilding, IClock, ITrash, IUsers, IReceipt } from "../icons/Icons";

const Rs   = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const PAYMENT_MODES = ["Cash","UPI","Bank Transfer","Cheque","NEFT/RTGS","Card"];

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
const IDownload = ({ size = 13, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IFilter = ({ size = 13, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

function SourceBadge({ source, tk, C }) {
  const cfg = { invoice: { bg:tk.redL, c:C.debitInvoice, l:"INV" }, expense: { bg:tk.ambL, c:C.debitExpense, l:"EXP" }, payment: { bg:tk.grnL, c:C.credit, l:"PMT" }, labour: { bg:tk.accL, c:C.debitLabour, l:"LAB" } };
  const x = cfg[source] || cfg.invoice;
  return <span style={{ background: x.bg, color: x.c, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: `1px solid ${x.c}33`, whiteSpace: "nowrap" }}>{x.l}</span>;
}

function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a   = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv, exp, att, isDesktop } = useApp();
  const C = {
    debitInvoice: tk.red,
    debitExpense: tk.amb,
    debitLabour: tk.acc,
    credit: tk.grn,
  };

  // ── Date range filter — default is all-time (empty strings) ──
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [showFilter, setShowFilter] = useState(false); // shown by default so user can see/use it

  // Grand totals from backend (respects from/to)
  const [grandTotals,    setGrandTotals]    = useState({ invoiceTotal: 0, expenseTotal: 0, labourTotal: 0, grandTotal: 0, paidTotal: 0, outstanding: 0 });
  const [totalsLoading,  setTotalsLoading]  = useState(true);

  // View tabs
  const [view,           setView]           = useState("summary");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [vendorLedger,   setVendorLedger]   = useState(null);
  const [ledgerLoading,  setLedgerLoading]  = useState(false);
  const [labourLedger,   setLabourLedger]   = useState([]);
  const [labourLoading,  setLabourLoading]  = useState(false);

  // Payment sheet
  const [paySheet,   setPaySheet]   = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount,  setPayAmount]  = useState("");
  const [payMode,    setPayMode]    = useState("Cash");
  const [payRef,     setPayRef]     = useState("");
  const [payNotes,   setPayNotes]   = useState("");
  const [payDate,    setPayDate]    = useState(() => new Date().toISOString().split("T")[0]);
  const [payMsg,     setPayMsg]     = useState(null);
  const [paying,     setPaying]     = useState(false);
  const [histSheet,  setHistSheet]  = useState(false);
  const [histInv,    setHistInv]    = useState(null);
  const [payments,   setPayments]   = useState([]);
  const [histLoading,setHistLoading]= useState(false);

  // Load grand totals whenever from/to changes
  const loadGrandTotals = useCallback(() => {
    setTotalsLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    API.getGrandTotals(Object.keys(params).length ? params : undefined)
      .then(d => setGrandTotals(d))
      .catch(() => {})
      .finally(() => setTotalsLoading(false));
  }, [from, to]);

  useEffect(() => { loadGrandTotals(); }, [loadGrandTotals]);

  // Load vendor ledger when tab changes or dates change
  useEffect(() => {
    if (view !== "vendor" || selectedVendor === "all") { setVendorLedger(null); return; }
    setLedgerLoading(true);
    const p = {};
    if (from) p.from = from;
    if (to)   p.to   = to;
    API.getVendorLedger(selectedVendor, Object.keys(p).length ? p : undefined)
      .then(d => setVendorLedger(d))
      .catch(() => setVendorLedger(null))
      .finally(() => setLedgerLoading(false));
  }, [view, selectedVendor, from, to]);

  // Load labour ledger
  useEffect(() => {
    if (view !== "labour") return;
    setLabourLoading(true);
    const p = {};
    if (from) p.from = from;
    if (to)   p.to   = to;
    API.getLabourLedger(p)
      .then(d => setLabourLedger(d.entries || []))
      .catch(() => setLabourLedger([]))
      .finally(() => setLabourLoading(false));
  }, [view, from, to]);

  // Filter helper for local inv/exp arrays (for vendor summary tab)
  const filteredInv = inv.filter(i => {
    if (from && i.created_at && i.created_at.slice(0,10) < from) return false;
    if (to   && i.created_at && i.created_at.slice(0,10) > to)   return false;
    return true;
  });
  const filteredExp = exp.filter(e => {
    if (from && e.date < from) return false;
    if (to   && e.date > to)   return false;
    return true;
  });

  // Vendor summary using filtered data
  const vendorSummary = vendors.map(v => {
    const vInv = filteredInv.filter(i => i.vendor === v.name);
    const vExp = filteredExp.filter(e => e.vendor === v.name);
    const invT = vInv.reduce((s, i) => s + i.amount, 0);
    const expT = vExp.reduce((s, e) => s + e.amount, 0);
    const paid = vInv.reduce((s, i) => s + (i.paid || 0), 0);
    return { ...v, invTotal: invT, expTotal: expT, paid, debit: invT + expT, balance: invT + expT - paid };
  });

  const hasFilter = from || to;

  // Payment handlers
  const openPaySheet = (invoice) => {
    setPayInvoice(invoice); setPayAmount((invoice.amount - (invoice.paid || 0)).toFixed(2));
    setPayMode("Cash"); setPayRef(""); setPayNotes("");
    setPayDate(new Date().toISOString().split("T")[0]); setPayMsg(null); setPaySheet(true);
  };
  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return setPayMsg({ t: "err", s: "Enter a valid amount." });
    const rem = payInvoice.amount - (payInvoice.paid || 0);
    if (amt > rem + 0.01) return setPayMsg({ t: "err", s: `Max payable: ${Rs(rem)}` });
    setPaying(true);
    try {
      await API.addPayment(payInvoice.id, { amount: amt, payment_mode: payMode, reference: payRef, notes: payNotes, paid_at: `${payDate}T${new Date().toTimeString().slice(0,8)}` });
      const newPaid = (payInvoice.paid || 0) + amt;
      const newStatus = Math.abs(newPaid - payInvoice.amount) < 0.01 ? "Paid" : "Partially Paid";
      setInv(prev => prev.map(x => x.id === payInvoice.id ? { ...x, paid: newPaid, status: newStatus } : x));
      loadGrandTotals();
      setPayMsg({ t: "ok", s: `${Rs(amt)} recorded!` });
      setTimeout(() => { setPaySheet(false); setPayMsg(null); }, 1200);
    } catch (e) { setPayMsg({ t: "err", s: e.message }); }
    finally { setPaying(false); }
  };
  const openHistory = async (invoice) => {
    setHistInv(invoice); setHistSheet(true); setHistLoading(true);
    try { setPayments(await API.getPayments(invoice.id)); } catch { setPayments([]); } finally { setHistLoading(false); }
  };
  const deletePaymentEntry = async (pid) => {
    if (!window.confirm("Delete this payment?")) return;
    try { await API.deletePayment(histInv.id, pid); setPayments(prev => prev.filter(p => p.id !== pid)); loadGrandTotals(); } catch (e) { alert(e.message); }
  };

  const statusBadge = inv => {
    if (inv.status === "Paid" || Math.abs((inv.paid || 0) - inv.amount) < 0.01) return <Badge color="green">Paid</Badge>;
    if ((inv.paid || 0) > 0) return <Badge color="amber">Partial</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  const TabBtn = ({ id, label, icon }) => {
    const active = view === id;
    return <button onClick={() => setView(id)} style={{ padding: "8px 14px", border: `1.5px solid ${active ? tk.acc : tk.bdr}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", background: active ? tk.acc : "transparent", color: active ? "#fff" : tk.tx2, display: "flex", alignItems: "center", gap: 5, transition: "all .15s", boxShadow: active ? `0 2px 8px ${tk.acc}44` : "none" }}>{icon}{label}</button>;
  };

  // ── Summary cards ────────────────────────────────────────────
  const summaryCards = [
    { label: "Total Expenditure", sublabel: "Invoices + Expenses + Labour", value: Rs(grandTotals.grandTotal), color: tk.acc, bg: tk.accL, border: `${tk.acc}44`,
      breakdown: [
        { l: "Invoices", v: Rs(grandTotals.invoiceTotal), c: C.debitInvoice },
        { l: "Expenses", v: Rs(grandTotals.expenseTotal), c: C.debitExpense },
        { l: "Labour",   v: Rs(grandTotals.labourTotal),  c: C.debitLabour  },
      ]},
    { label: "Amount Paid", sublabel: "Payments made", value: Rs(grandTotals.paidTotal), color: C.credit, bg: tk.grnL, border: `${tk.grn}44`, breakdown: [] },
    { label: "Outstanding Balance", sublabel: "Remaining to pay", value: Rs(grandTotals.outstanding), color: grandTotals.outstanding > 0.01 ? C.debitInvoice : C.credit, bg: grandTotals.outstanding > 0.01 ? tk.redL : tk.grnL, border: grandTotals.outstanding > 0.01 ? `${tk.red}44` : `${tk.grn}44`, breakdown: [] },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Balance Sheet</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {hasFilter ? `${from || "All time"} → ${to || "today"}` : "All time · Financial overview"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant={showFilter ? "primary" : "secondary"} small onClick={() => setShowFilter(f => !f)}>
            <IFilter size={12} />{hasFilter ? "Filter On" : "Date Filter"}
          </Btn>
          <Btn variant="secondary" small onClick={() => exportCSV([
            ["Category","Amount"],
            ["Total Invoices", grandTotals.invoiceTotal.toFixed(2)],
            ["Total Expenses", grandTotals.expenseTotal.toFixed(2)],
            ["Direct Labour",  grandTotals.labourTotal.toFixed(2)],
            ["Grand Total",    grandTotals.grandTotal.toFixed(2)],
            ["Paid",           grandTotals.paidTotal.toFixed(2)],
            ["Outstanding",    grandTotals.outstanding.toFixed(2)],
          ], `balance-sheet-${new Date().toISOString().slice(0,10)}.csv`)}>
            <IDownload />Export
          </Btn>
        </div>
      </div>

      {/* ── Date range filter ─────────────────────────────────── */}
      {showFilter && (
        <Card delay={0} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, fontWeight: 600 }}>
            Date Range — leave blank for all-time totals
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field label="From Date" style={{ flex: 1, minWidth: 130 }}>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </Field>
            <Field label="To Date" style={{ flex: 1, minWidth: 130 }}>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </Field>
            <div style={{ paddingBottom: 2, display: "flex", gap: 6 }}>
              {/* Quick shortcuts */}
              {[
                { l: "This month", fn: () => { const n = new Date(); setFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`); setTo(new Date().toISOString().split("T")[0]); } },
                { l: "This year",  fn: () => { setFrom(`${new Date().getFullYear()}-01-01`); setTo(new Date().toISOString().split("T")[0]); } },
                { l: "Clear",      fn: () => { setFrom(""); setTo(""); } },
              ].map(b => (
                <Btn key={b.l} variant="ghost" small onClick={b.fn}>{b.l}</Btn>
              ))}
            </div>
          </div>
          {hasFilter && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
              Showing data from <strong>{from}</strong> to <strong>{to || "today"}</strong>. Grand totals below reflect this range.
            </div>
          )}
        </Card>
      )}

      {/* ── Top 3 summary cards ─────────────────────────────────
          Mobile: 1-column stack | Desktop: 3-column
      ────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: isDesktop ? 14 : 10, marginBottom: 18 }}>
        {summaryCards.map((card, i) => (
          <div key={i} style={{ background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: 14, padding: isDesktop ? "18px 20px" : "14px 16px", animation: `fadeUp .3s ease ${i * 0.06}s both` }}>
            <div style={{ fontSize: isDesktop ? 26 : 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: card.color, letterSpacing: "-.5px", marginBottom: 4 }}>
              {totalsLoading ? "—" : card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{card.label}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: card.breakdown.length ? 10 : 0 }}>{card.sublabel}</div>
            {card.breakdown.length > 0 && (
              <div style={{ borderTop: `1px solid ${card.border}`, paddingTop: 8 }}>
                {card.breakdown.map(b => (
                  <div key={b.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: b.c, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.c, display: "inline-block" }} />{b.l}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: b.c }}>{b.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <TabBtn id="summary" label="Vendor Summary" icon={<IBuilding size={13} />} />
        <TabBtn id="vendor"  label="Vendor Ledger"  icon={<IFileText size={13} />} />
        <TabBtn id="labour"  label="Labour Ledger"  icon={<IUsers size={13} />} />
      </div>

      {/* Vendor dropdown for ledger tab */}
      {view === "vendor" && (
        <Card>
          <Field label="Select Vendor">
            <Select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
              <option value="all">— Choose a vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
        </Card>
      )}

      {/* ══ TAB: VENDOR SUMMARY ══════════════════════════════════ */}
      {view === "summary" && (
        <Card>
          <CardTitle icon={IBuilding}>Vendor-wise Summary — Invoices + Expenses</CardTitle>
          {vendors.length === 0 ? <Empty icon={IBuilding} text="No vendors added yet." /> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Vendor","Invoiced","Expenses","Total Debit","Paid","Balance"].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 0 ? "right" : "left", padding: "10px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b7280", borderBottom: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {vendorSummary.map(v => (
                    <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedVendor(String(v.id)); setView("vendor"); }}>
                      <td style={{ padding: "11px 12px", borderBottom: `1px solid #f3f4f6` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{v.name.charAt(0)}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid #f3f4f6`, fontFamily: "'DM Mono',monospace", color: C.debitInvoice, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.invTotal)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid #f3f4f6`, fontFamily: "'DM Mono',monospace", color: C.debitExpense, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.expTotal)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid #f3f4f6`, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{Rs(v.debit)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid #f3f4f6`, fontFamily: "'DM Mono',monospace", color: C.credit, fontWeight: 600, whiteSpace: "nowrap" }}>{Rs(v.paid)}</td>
                      <td style={{ padding: "11px 12px", textAlign: "right", borderBottom: `1px solid #f3f4f6`, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: v.balance > 0.01 ? C.debitInvoice : C.credit, whiteSpace: "nowrap" }}>{Rs(v.balance)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: 13, borderTop: `2px solid #e5e7eb`, color: "#111827" }}>Total</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitInvoice, borderTop: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{Rs(grandTotals.invoiceTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitExpense, borderTop: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{Rs(grandTotals.expenseTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#111827", borderTop: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{Rs(grandTotals.invoiceTotal + grandTotals.expenseTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.credit, borderTop: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{Rs(grandTotals.paidTotal)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: grandTotals.outstanding > 0.01 ? C.debitInvoice : C.credit, borderTop: `2px solid #e5e7eb`, whiteSpace: "nowrap" }}>{Rs(grandTotals.outstanding)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Outstanding invoices */}
          {(() => {
            const unpaid = filteredInv.filter(i => i.status !== "Paid" && Math.abs((i.paid||0) - i.amount) > 0.01);
            if (!unpaid.length) return null;
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.debitInvoice, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <IClock size={13} /> Outstanding ({unpaid.length})
                </div>
                {unpaid.map(invoice => (
                  <div key={invoice.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid #f3f4f6`, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.vendor}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{invoice.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: C.debitInvoice, fontSize: 14, whiteSpace: "nowrap" }}>{Rs(invoice.amount - (invoice.paid||0))}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>of {Rs(invoice.amount)}</div>
                    </div>
                    {statusBadge(invoice)}
                    <Btn variant="primary" small onClick={() => openPaySheet(invoice)}><ICreditCard size={11}/> Pay</Btn>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}

      {/* ══ TAB: VENDOR LEDGER ══════════════════════════════════ */}
      {view === "vendor" && (
        <Card>
          <CardTitle icon={IFileText}>
            {selectedVendor === "all" ? "Select a vendor above" : (vendorLedger?.vendor?.name || "Vendor Ledger")}
          </CardTitle>
          {selectedVendor === "all" ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Choose a vendor from the dropdown above.</div>
          ) : ledgerLoading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af" }}>Loading…</div>
          ) : !vendorLedger ? (
            <Empty icon={IFileText} text="No transactions." />
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: 20, marginBottom: 14, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb", flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Vendor</div><div style={{ fontWeight: 700, fontSize: 14 }}>{vendorLedger.vendor.name}</div></div>
                {[{l:"Total Debit",v:Rs(vendorLedger.summary.total_debit),c:"#111827"},{l:"Total Paid",v:Rs(vendorLedger.summary.total_paid),c:C.credit},{l:"Balance",v:Rs(vendorLedger.summary.balance),c:vendorLedger.summary.balance>0.01?C.debitInvoice:C.credit}].map(s=>(
                  <div key={s.l}><div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase" }}>{s.l}</div><div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:15, color:s.c, whiteSpace:"nowrap" }}>{s.v}</div></div>
                ))}
              </div>
              {/* Colour legend */}
              <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                {[{c:C.debitInvoice,l:"Invoice Dr"},{c:C.debitExpense,l:"Expense Dr"},{c:C.credit,l:"Payment Cr"}].map(x=>(
                  <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#6b7280" }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:x.c, display:"inline-block" }}/>{x.l}
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:580 }}>
                  <thead><tr style={{ background:"#f8fafc" }}>
                    {["Date","Type","Particulars","Ref","Dr","Cr","Balance",""].map((h,i)=>(
                      <th key={i} style={{ textAlign:i>3?"right":"left", padding:"10px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#6b7280", borderBottom:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    <tr><td colSpan={8} style={{ padding:"7px 10px", fontSize:11, color:"#9ca3af", fontStyle:"italic", background:"#f9fafb", borderBottom:"1px solid #f3f4f6" }}>Opening Balance — ₹0.00</td></tr>
                    {vendorLedger.entries.map((e, i) => {
                      const isDr = e.type === "debit";
                      const dc   = e.source==="invoice"?C.debitInvoice:e.source==="expense"?C.debitExpense:C.credit;
                      const rowBg = e.source==="payment" ? tk.grnL : e.source==="expense" ? tk.ambL : tk.redL;
                      return (
                        <tr key={i} style={{ background:rowBg }}>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", fontSize:11, color:"#6b7280", whiteSpace:"nowrap" }}>{fmtD(e.date)}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6" }}><SourceBadge source={e.source} tk={tk} C={C}/></td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", fontSize:12, fontWeight:isDr?600:400, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.particulars}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", fontSize:10, fontFamily:"'DM Mono',monospace", color:"#9ca3af", whiteSpace:"nowrap" }}>{e.ref}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:isDr?dc:"#d1d5db", whiteSpace:"nowrap" }}>{isDr?Rs(e.amount):"—"}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:!isDr?C.credit:"#d1d5db", whiteSpace:"nowrap" }}>{!isDr?Rs(e.amount):"—"}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:e.running_balance>0.01?C.debitInvoice:C.credit, whiteSpace:"nowrap" }}>{Rs(Math.max(0,e.running_balance))}</td>
                          <td style={{ padding:"9px 10px", borderBottom:"1px solid #f3f4f6", whiteSpace:"nowrap" }}>
                            {e.source==="invoice"&&(()=>{const mi=inv.find(x=>x.id===e.invoice_id);if(!mi)return null;const isPaid=mi.status==="Paid"||Math.abs((mi.paid||0)-mi.amount)<0.01;return(<div style={{display:"flex",gap:4}}>{!isPaid&&<Btn variant="primary" small onClick={()=>openPaySheet(mi)}><ICreditCard size={11}/>Pay</Btn>}{(mi.paid||0)>0&&<Btn variant="ghost" small onClick={()=>openHistory(mi)}>Hist</Btn>}</div>);})()}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background:"#f8fafc" }}>
                      <td colSpan={4} style={{ padding:"11px 10px", fontWeight:700, fontSize:13, borderTop:"2px solid #e5e7eb", color:"#111827" }}>Closing Balance</td>
                      <td style={{ padding:"11px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:C.debitInvoice, borderTop:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{Rs(vendorLedger.summary.total_debit)}</td>
                      <td style={{ padding:"11px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:C.credit, borderTop:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{Rs(vendorLedger.summary.total_paid)}</td>
                      <td style={{ padding:"11px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:vendorLedger.summary.balance>0.01?C.debitInvoice:C.credit, borderTop:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{Rs(vendorLedger.summary.balance)}</td>
                      <td style={{ borderTop:"2px solid #e5e7eb" }}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ══ TAB: LABOUR LEDGER ══════════════════════════════════ */}
      {view === "labour" && (
        <Card>
          <CardTitle icon={IUsers}>
            Direct Labour Payments
            <span style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:C.debitLabour, marginLeft:8, fontWeight:700 }}>{Rs(grandTotals.labourTotal)}</span>
          </CardTitle>
          {labourLoading ? <div style={{ padding:"20px 0", textAlign:"center", color:"#9ca3af" }}>Loading…</div>
          : labourLedger.length === 0 ? <Empty icon={IUsers} text="No direct labour attendance recorded." />
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:380 }}>
                <thead><tr style={{ background:"#f8fafc" }}>
                  {["Date","Workers","Day Total","Running Total"].map((h,i)=>(
                    <th key={h} style={{ textAlign:i>1?"right":"left", padding:"10px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#6b7280", borderBottom:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {labourLedger.map((e,i)=>(
                    <tr key={i} style={{ background:i%2===0?"transparent":"#f9fafb" }}>
                      <td style={{ padding:"10px", borderBottom:"1px solid #f3f4f6", fontSize:12, color:"#6b7280", whiteSpace:"nowrap" }}>{e.date}</td>
                      <td style={{ padding:"10px", borderBottom:"1px solid #f3f4f6" }}>
                        <div style={{ fontSize:13, color:"#111827" }}>{e.particulars}</div>
                        {e.workers?.length>0&&<div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{e.workers.slice(0,2).join(" · ")}{e.workers.length>2?` +${e.workers.length-2} more`:""}</div>}
                      </td>
                      <td style={{ padding:"10px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:C.debitLabour, whiteSpace:"nowrap" }}>{Rs(e.amount)}</td>
                      <td style={{ padding:"10px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#374151", whiteSpace:"nowrap" }}>{Rs(e.running_balance)}</td>
                    </tr>
                  ))}
                  <tr style={{ background:"#f8fafc" }}>
                    <td colSpan={2} style={{ padding:"11px 10px", fontWeight:700, borderTop:"2px solid #e5e7eb" }}>Total</td>
                    <td style={{ padding:"11px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:C.debitLabour, borderTop:"2px solid #e5e7eb", whiteSpace:"nowrap" }}>{Rs(grandTotals.labourTotal)}</td>
                    <td style={{ borderTop:"2px solid #e5e7eb" }}/>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Pay Sheet */}
      <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Record Payment" icon={ICreditCard}
        footer={<><Btn variant="secondary" onClick={() => setPaySheet(false)} style={{ flex:1 }}>Cancel</Btn><Btn variant="primary" onClick={submitPayment} disabled={paying} style={{ flex:2 }}>{paying?"Saving…":"Confirm Payment"}</Btn></>}
      >
        {payInvoice && (
          <>
            <div style={{ background:"#f8fafc", borderRadius:10, padding:"12px 14px", marginBottom:14, border:"1px solid #e5e7eb" }}>
              <div style={{ fontWeight:700 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{payInvoice.desc}</div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                {[{l:"Total",v:Rs(payInvoice.amount),c:"#111827"},{l:"Paid",v:Rs(payInvoice.paid||0),c:C.credit},{l:"Remaining",v:Rs(payInvoice.amount-(payInvoice.paid||0)),c:C.debitInvoice}].map(s=>(
                  <div key={s.l}><div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase" }}>{s.l}</div><div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color:s.c, whiteSpace:"nowrap" }}>{s.v}</div></div>
                ))}
              </div>
            </div>
            {payMsg && <Alert type={payMsg.t}>{payMsg.t==="ok"?<ICheckCirc size={14}/>:<IXCircle size={14}/>}{payMsg.s}</Alert>}
            <Field label="Amount (₹)"><Input type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="Enter amount" step="0.01" min="0.01"/></Field>
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
        {histInv && (
          <>
            <div style={{ background:"#f8fafc", borderRadius:10, padding:"11px 14px", marginBottom:14, border:"1px solid #e5e7eb" }}>
              <div style={{ fontWeight:600 }}>{histInv.vendor} — {histInv.desc}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>Total: {Rs(histInv.amount)} · Paid: <span style={{color:C.credit}}>{Rs(histInv.paid||0)}</span></div>
            </div>
            {histLoading ? <div style={{ textAlign:"center", padding:24, color:"#9ca3af" }}>Loading…</div>
            : payments.length === 0 ? <Empty icon={IFileText} text="No payments yet." />
            : payments.map(p=>(
              <div key={p.id} style={{ display:"flex", gap:10, padding:"11px 0", borderBottom:"1px solid #f3f4f6", alignItems:"flex-start" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:tk.grnL, color:C.credit, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 }}>₹</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontFamily:"'DM Mono',monospace", color:C.credit }}>{Rs(p.amount)}</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{p.payment_mode}{p.reference?` · ${p.reference}`:""}</div>
                  <div style={{ fontSize:11, color:"#9ca3af" }}>{fmtDT(p.paid_at)}</div>
                </div>
                <button onClick={() => deletePaymentEntry(p.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db", padding:4, borderRadius:6 }}><ITrash size={13}/></button>
              </div>
            ))}
          </>
        )}
      </Sheet>
    </div>
  );
}
