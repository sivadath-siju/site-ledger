import React, { useState, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, StatCard, Btn, Alert, Field, Select, Input,
  FormGrid, Sheet, Badge, Empty,
} from "../components/Primitives";
import { IFileText, IRupee, ICheckCirc, IXCircle, IBuilding, IClock, ITrash } from "../icons/Icons";

const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD  = d  => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = d  => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];

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

// ── CSV Export helper ────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv, isDesktop } = useApp();

  const [selectedVendor, setSelectedVendor] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

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

  // Derived
  const vendorInvoices = selectedVendor === "all"
    ? inv
    : inv.filter(i => {
        const v = vendors.find(v => String(v.id) === String(selectedVendor));
        return v && i.vendor === v.name;
      });

  const totalInvoiced = vendorInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = vendorInvoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalDue      = totalInvoiced - totalPaid;

  // Apply date filter
  const filteredInvoices = vendorInvoices.filter(i => {
    if (fromDate && i.created_at && i.created_at < fromDate) return false;
    if (toDate   && i.created_at && i.created_at.slice(0, 10) > toDate) return false;
    return true;
  });

  // Pay
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
      await API.addPayment(payInvoice.id, {
        amount: amt, payment_mode: payMode, reference: payRef, notes: payNotes,
        paid_at: `${payDate}T${new Date().toTimeString().slice(0, 8)}`,
      });
      const newPaid   = (payInvoice.paid || 0) + amt;
      const newStatus = Math.abs(newPaid - payInvoice.amount) < 0.01 ? "Paid" : "Partially Paid";
      setInv(prev => prev.map(x => x.id === payInvoice.id ? { ...x, paid: newPaid, status: newStatus } : x));
      setPayMsg({ t: "ok", s: `${Rs(amt)} recorded!` });
      setTimeout(() => { setPaySheet(false); setPayMsg(null); }, 1200);
    } catch (e) { setPayMsg({ t: "err", s: e.message }); }
    finally { setPaying(false); }
  };

  // History
  const openHistory = async (invoice) => {
    setHistInvoice(invoice); setHistSheet(true); setHistLoading(true);
    try {
      const data = await API.getPayments(invoice.id);
      setPayments(Array.isArray(data) ? data : data.payments || []);
    } catch { setPayments([]); }
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

  // Export CSV
  const exportLedger = () => {
    const rows = [
      ["Invoice Ref", "Vendor", "Description", "Invoice Amount", "Paid", "Balance", "Status", "Date"],
      ...filteredInvoices.map(i => [
        `INV-${String(i.id).padStart(4, "0")}`,
        i.vendor,
        i.desc || "",
        i.amount.toFixed(2),
        (i.paid || 0).toFixed(2),
        (i.amount - (i.paid || 0)).toFixed(2),
        i.status,
        fmtD(i.created_at),
      ]),
      [],
      ["", "", "TOTALS", totalInvoiced.toFixed(2), totalPaid.toFixed(2), totalDue.toFixed(2), "", ""],
    ];
    exportCSV(rows, `ciel-homes-balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Balance Sheet</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Vendor ledger — payables &amp; payment history</div>
        </div>
        <Btn variant="secondary" small onClick={exportLedger}><IDownload size={13} />Export CSV</Btn>
      </div>

      {/* ── Summary stats — FIXED MOBILE: 3-col grid with min-width 0 ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",   // key: minmax(0,1fr) prevents overflow
        gap: isDesktop ? 12 : 8,
        marginBottom: 14,
      }}>
        {[
          { icon: IRupee,     value: Rs(totalInvoiced), label: "Invoiced",  color: "acc", delay: 0    },
          { icon: ICheckCirc, value: Rs(totalPaid),     label: "Paid",      color: "grn", delay: .04  },
          { icon: IClock,     value: Rs(totalDue),      label: "Due",       color: totalDue > 0.01 ? "red" : "grn", delay: .08 },
        ].map(s => (
          <div key={s.label} style={{
            background: tk.surf, border: `1px solid ${tk.bdr}`,
            borderRadius: 12, padding: isDesktop ? "14px 16px" : "11px 10px",
            boxShadow: tk.sh, position: "relative", overflow: "hidden",
            animation: `fadeUp .3s ease ${s.delay}s both`,
            minWidth: 0,   // prevents overflow on mobile
          }}>
            <div style={{ fontSize: isDesktop ? 18 : 14, fontWeight: 700, fontFamily: "'DM Mono',monospace",
              letterSpacing: "-.3px", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: tk.tx3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card delay={.1}>
        <CardTitle icon={IBalance}>Filter Ledger</CardTitle>
        <FormGrid cols={isDesktop ? "2fr 1fr 1fr" : "1fr"}>
          <Field label="Vendor">
            <Select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
              <option value="all">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="From Date"><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Field>
          <Field label="To Date">  <Input type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   /></Field>
        </FormGrid>
        <Btn variant="secondary" small onClick={() => { setFromDate(""); setToDate(""); setSelectedVendor("all"); }}>
          Clear Filters
        </Btn>
      </Card>

      {/* ── ALL-VENDOR SUMMARY TABLE ── */}
      {selectedVendor === "all" && (
        <Card delay={.12}>
          <CardTitle icon={IBuilding}>Vendor-wise Summary</CardTitle>
          {vendors.length === 0 ? <Empty icon={IBuilding} text="No vendors found." /> : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    {["Vendor", "Invoices", "Total Payable", "Paid", "Balance"].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i > 1 ? "right" : i === 1 ? "center" : "left",
                        padding: "10px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: ".08em", color: tk.tx3, background: tk.surf2,
                        borderBottom: `2px solid ${tk.bdr}`, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => {
                    const vInv     = inv.filter(i => i.vendor === v.name);
                    const invoiced = vInv.reduce((s, i) => s + i.amount, 0);
                    const paid     = vInv.reduce((s, i) => s + (i.paid || 0), 0);
                    const bal      = invoiced - paid;
                    return (
                      <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => setSelectedVendor(String(v.id))}>
                        <td style={{ padding: "11px 12px", borderBottom: `1px solid ${tk.bdr}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: tk.accL, color: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {v.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                              {v.cat && <div style={{ fontSize: 10, color: tk.tx3 }}>{v.cat}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "center", borderBottom: `1px solid ${tk.bdr}` }}>
                          <span style={{ background: tk.accL, color: tk.acc, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{vInv.length}</span>
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600, borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(invoiced)}</td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: tk.grn, fontWeight: 600, borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(paid)}</td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: `1px solid ${tk.bdr}`, color: bal > 0.01 ? tk.red : tk.grn, whiteSpace: "nowrap" }}>{Rs(bal)}</td>
                      </tr>
                    );
                  })}
                  {/* Grand total */}
                  <tr style={{ background: tk.surf2 }}>
                    <td colSpan={2} style={{ padding: "11px 12px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>Grand Total</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalInvoiced)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalPaid)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: totalDue > 0.01 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── SINGLE VENDOR LEDGER ── */}
      {selectedVendor !== "all" && (() => {
        const v = vendors.find(v => String(v.id) === String(selectedVendor));
        let runningBalance = 0;

        return (
          <Card delay={.12}>
            <CardTitle icon={IFileText} action={
              <button onClick={() => setSelectedVendor("all")} style={{ background: "none", border: "none", cursor: "pointer", color: tk.acc, fontSize: 12, fontWeight: 600 }}>
                ← All Vendors
              </button>
            }>
              {v?.name || "Vendor"} — Account Ledger
            </CardTitle>

            {v && (
              <div style={{ display: "flex", gap: 16, marginBottom: 14, padding: "10px 14px", background: tk.surf2, borderRadius: 10, border: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Vendor</div><div style={{ fontWeight: 700 }}>{v.name}</div></div>
                {v.ph && <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Phone</div><div style={{ fontWeight: 600 }}>{v.ph}</div></div>}
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Net Balance Due</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 18, color: totalDue > 0.01 ? tk.red : tk.grn }}>{Rs(totalDue)}</div>
                </div>
              </div>
            )}

            {filteredInvoices.length === 0 ? <Empty icon={IFileText} text="No invoices for this vendor." /> : (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
                  <thead>
                    <tr>
                      {[
                        { l: "Date",        a: "left"  },
                        { l: "Particulars", a: "left"  },
                        { l: "Ref #",       a: "left"  },
                        { l: "Debit (Dr)",  a: "right", min: 110 },
                        { l: "Credit (Cr)", a: "right", min: 110 },
                        { l: "Balance",     a: "right", min: 110 },
                        { l: "Status",      a: "center"},
                        { l: "",            a: "right" },
                      ].map(h => (
                        <th key={h.l} style={{
                          textAlign: h.a, padding: "10px 10px", fontSize: 10, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: ".08em", color: tk.tx3,
                          background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`,
                          whiteSpace: "nowrap", minWidth: h.min,
                        }}>{h.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening */}
                    <tr><td colSpan={8} style={{ padding: "7px 10px", fontSize: 11, color: tk.tx3, fontStyle: "italic", background: tk.surf2, borderBottom: `1px solid ${tk.bdr}` }}>Opening Balance — ₹0.00</td></tr>

                    {filteredInvoices.map(invoice => {
                      runningBalance += invoice.amount;
                      const isPaid = invoice.status === "Paid" || Math.abs((invoice.paid || 0) - invoice.amount) < 0.01;

                      return [
                        // DEBIT row
                        <tr key={`inv-${invoice.id}`} style={{ background: `${tk.redL}18` }}>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, whiteSpace: "nowrap" }}>{fmtD(invoice.created_at)}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invoice.desc || "Invoice"}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx2, whiteSpace: "nowrap" }}>INV-{String(invoice.id).padStart(4, "0")}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>{Rs(invoice.amount)}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>{Rs(runningBalance)}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "center" }}>{statusBadge(invoice)}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              {!isPaid && <Btn variant="primary" small onClick={() => openPaySheet(invoice)}><ICreditCard size={11} /> Pay</Btn>}
                              {(invoice.paid || 0) > 0 && <Btn variant="ghost" small onClick={() => openHistory(invoice)}>Hist</Btn>}
                            </div>
                          </td>
                        </tr>,

                        // CREDIT row if partially/fully paid
                        (invoice.paid || 0) > 0 ? (() => {
                          runningBalance -= invoice.paid;
                          return (
                            <tr key={`pmt-${invoice.id}`} style={{ background: `${tk.grnL}18` }}>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2 }}>{fmtD(invoice.last_payment_at)}</td>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, fontStyle: "italic" }}>Payment — {invoice.desc}</td>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx3 }}>PMT-{String(invoice.id).padStart(4, "0")}</td>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, whiteSpace: "nowrap" }}>{Rs(invoice.paid)}</td>
                              <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: runningBalance > 0.01 ? tk.amb : tk.grn, whiteSpace: "nowrap" }}>{Rs(Math.max(0, runningBalance))}</td>
                              <td colSpan={2} style={{ borderBottom: `1px solid ${tk.bdr}` }} />
                            </tr>
                          );
                        })() : null,
                      ];
                    })}

                    {/* Closing row */}
                    <tr style={{ background: tk.surf2 }}>
                      <td colSpan={3} style={{ padding: "11px 10px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>Closing Balance</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalInvoiced)}</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalPaid)}</td>
                      <td style={{ padding: "11px 10px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: totalDue > 0.01 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>{Rs(totalDue)}</td>
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
        if (unpaid.length === 0) return null;
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

      {/* Pay Sheet */}
      <Sheet open={paySheet} onClose={() => setPaySheet(false)} title="Record Payment" icon={ICreditCard}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setPaySheet(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="primary" onClick={submitPayment} disabled={paying} style={{ flex: 2 }}>
              {paying ? "Saving…" : "Confirm Payment"}
            </Btn>
          </>
        }
      >
        {payInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 10 }}>{payInvoice.desc}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { l: "Invoice Total", v: Rs(payInvoice.amount), c: tk.tx },
                  { l: "Paid So Far",   v: Rs(payInvoice.paid || 0), c: tk.grn },
                  { l: "Remaining",     v: Rs(payInvoice.amount - (payInvoice.paid || 0)), c: tk.red },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>{s.l}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: s.c, whiteSpace: "nowrap" }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            {payMsg && <Alert type={payMsg.t}>{payMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{payMsg.s}</Alert>}
            <Field label="Payment Amount (₹)">
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Enter amount" step="0.01" min="0.01" />
            </Field>
            <FormGrid>
              <Field label="Payment Date"><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></Field>
              <Field label="Mode"><Select value={payMode} onChange={e => setPayMode(e.target.value)}>{PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}</Select></Field>
            </FormGrid>
            <Field label="Reference / UTR / Cheque No."><Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" /></Field>
            <Field label="Notes"><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" /></Field>
          </>
        )}
      </Sheet>

      {/* History Sheet */}
      <Sheet open={histSheet} onClose={() => setHistSheet(false)} title="Payment History" icon={IFileText}>
        {histInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInvoice.vendor} — {histInvoice.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginTop: 4 }}>
                Total: {Rs(histInvoice.amount)} · Paid: {Rs(histInvoice.paid || 0)} ·{" "}
                <span style={{ color: tk.red }}>Due: {Rs(histInvoice.amount - (histInvoice.paid || 0))}</span>
              </div>
            </div>
            {histLoading
              ? <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading…</div>
              : payments.length === 0
              ? <Empty icon={IFileText} text="No payments yet." />
              : payments.map(p => (
                <div key={p.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.grnL, color: tk.grn, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>₹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>{p.payment_mode}{p.reference ? ` · ${p.reference}` : ""}</div>
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
