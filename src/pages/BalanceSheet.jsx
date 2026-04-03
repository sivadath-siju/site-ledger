import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, StatCard, Btn, Alert, Field, Select, Input, FormGrid, Sheet, Badge, Empty, Divider } from "../components/Primitives";
import { IFileText, IRupee, ICheckCirc, IXCircle, IBuilding, IClock, IPlus, ITrash } from "../icons/Icons";

const Rs = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = d => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];

// ── Inline icon for balance scale ──────────────
const IBalanceScale = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M3 9l4.5 4.5L12 9" />
    <path d="M12 9l4.5 4.5L21 9" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="1.5" y1="9" x2="10.5" y2="9" />
    <line x1="13.5" y1="9" x2="22.5" y2="9" />
  </svg>
);

const ICreditCard = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv } = useApp();

  // ── State ──────────────────────────────────────
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [ledger, setLedger]     = useState(null);      // { entries, summary } for a single vendor
  const [allLedger, setAllLedger] = useState(null);    // overall balance sheet
  const [loading, setLoading]   = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  // Payment sheet state
  const [paySheet, setPaySheet] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);   // invoice being paid
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode]   = useState("Cash");
  const [payRef, setPayRef]     = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate]   = useState(new Date().toISOString().split("T")[0]);
  const [payMsg, setPayMsg]     = useState(null);
  const [paying, setPaying]     = useState(false);

  // Payment history sheet
  const [histSheet, setHistSheet] = useState(false);
  const [histInvoice, setHistInvoice] = useState(null);
  const [payments, setPayments]   = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // ── Load balance sheet data ────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedVendor !== "all") params.vendor_id = selectedVendor;
      if (fromDate) params.from = fromDate;
      if (toDate)   params.to   = toDate;

      const data = await API.getBalanceSheet(params);
      if (selectedVendor !== "all") {
        setLedger(data);
        setAllLedger(null);
      } else {
        setAllLedger(data);
        setLedger(null);
      }
    } catch (e) {
      console.error("Balance sheet load error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedVendor, fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Open payment sheet ─────────────────────────
  const openPaySheet = (invoice) => {
    setPayInvoice(invoice);
    const remaining = invoice.amount - (invoice.paid || 0);
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setPayMode("Cash");
    setPayRef("");
    setPayNotes("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMsg(null);
    setPaySheet(true);
  };

  // ── Submit payment ─────────────────────────────
  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return setPayMsg({ t: "err", s: "Enter a valid payment amount." });
    const remaining = payInvoice.amount - (payInvoice.paid || 0);
    if (amt > remaining + 0.01) return setPayMsg({ t: "err", s: `Max payable: ${Rs(remaining)}` });

    setPaying(true);
    try {
      await API.addPayment(payInvoice.id, {
        amount:       amt,
        payment_mode: payMode,
        reference:    payRef,
        notes:        payNotes,
        paid_at:      payDate ? `${payDate}T${new Date().toTimeString().slice(0, 8)}` : new Date().toISOString(),
      });
      const newPaid = (payInvoice.paid || 0) + amt;
      const newStatus = Math.abs(newPaid - payInvoice.amount) < 0.01 ? "Paid" : "Partially Paid";

      // Update local invoice state
      setInv(prev => prev.map(x =>
        x.id === payInvoice.id ? { ...x, paid: newPaid, status: newStatus } : x
      ));

      setPayMsg({ t: "ok", s: `Payment of ${Rs(amt)} recorded!` });
      setTimeout(() => {
        setPaySheet(false);
        setPayMsg(null);
        loadData();
      }, 1200);
    } catch (e) {
      setPayMsg({ t: "err", s: e.message });
    } finally {
      setPaying(false);
    }
  };

  // ── Load payment history ───────────────────────
  const openHistory = async (invoice) => {
    setHistInvoice(invoice);
    setHistSheet(true);
    setHistLoading(true);
    try {
      const data = await API.getPayments(invoice.id);
      setPayments(Array.isArray(data) ? data : data.payments || []);
    } catch { setPayments([]); }
    finally { setHistLoading(false); }
  };

  const deletePaymentEntry = async (pid) => {
    if (!window.confirm("Delete this payment record?")) return;
    try {
      await API.deletePayment(histInvoice.id, pid);
      setPayments(prev => prev.filter(p => p.id !== pid));
      loadData();
    } catch (e) { alert(e.message); }
  };

  // ── Derived ────────────────────────────────────
  const vendorInvoices = selectedVendor === "all"
    ? inv
    : inv.filter(i => i.vendor_id === parseInt(selectedVendor) || i.vendor === vendors.find(v => v.id === parseInt(selectedVendor))?.name);

  const totalInvoiced = vendorInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = vendorInvoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalDue      = totalInvoiced - totalPaid;

  // Build ledger entries from local state (fallback when API not yet integrated)
  const buildLocalEntries = () => {
    const entries = [];
    vendorInvoices.forEach(inv => {
      entries.push({
        id:          `inv-${inv.id}`,
        date:        inv.created_at || inv.due || new Date().toISOString(),
        particulars: inv.desc || "Invoice",
        ref:         `INV-${String(inv.id).padStart(4, "0")}`,
        vendor:      inv.vendor,
        type:        "debit",
        amount:      inv.amount,
      });
    });
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    entries.forEach(e => {
      if (e.type === "debit")  running += e.amount;
      if (e.type === "credit") running -= e.amount;
      e.running_balance = running;
    });
    return entries;
  };

  const displayEntries = ledger?.entries || buildLocalEntries();

  // ── Status badge helper ────────────────────────
  const statusBadge = (inv) => {
    const paid = inv.paid || 0;
    if (inv.status === "Paid" || Math.abs(paid - inv.amount) < 0.01)
      return <Badge color="green">Paid</Badge>;
    if (paid > 0)
      return <Badge color="amber">Partial ({Rs(paid)})</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Balance Sheet</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Vendor ledger — payables &amp; payment history</div>
      </div>

      {/* ── Summary stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <StatCard icon={IRupee} value={Rs(totalInvoiced)} label="Total Invoiced" color="acc" delay={0} />
        <StatCard icon={ICheckCirc} value={Rs(totalPaid)} label="Total Paid" color="grn" delay={.04} />
        <StatCard icon={IClock} value={Rs(totalDue)} label="Balance Due" color={totalDue > 0 ? "red" : "grn"} delay={.08} />
      </div>

      {/* ── Filters ── */}
      <Card delay={.1}>
        <CardTitle icon={IBalanceScale}>Filters</CardTitle>
        <FormGrid cols="1fr 1fr 1fr">
          <Field label="Vendor">
            <Select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
              <option value="all">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="From Date">
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </Field>
          <Field label="To Date">
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </Field>
        </FormGrid>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={loadData}>Apply Filter</Btn>
          <Btn variant="secondary" onClick={() => { setFromDate(""); setToDate(""); setSelectedVendor("all"); }}>
            Clear
          </Btn>
        </div>
      </Card>

      {/* ── Vendor summary table (all-vendor view) ── */}
      {selectedVendor === "all" && (
        <Card delay={.12}>
          <CardTitle icon={IBuilding}>Vendor-wise Summary</CardTitle>
          {vendors.length === 0 ? <Empty icon={IBuilding} text="No vendors found." /> : (
            <div style={{ overflowX: "auto" }}>
              <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr>
                    {["Vendor", "Invoices", "Total Payable", "Paid", "Balance"].map(h => (
                      <th key={h} style={{
                        textAlign: h === "Invoices" ? "center" : h === "Vendor" ? "left" : "right",
                        padding: "10px 12px", fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: ".08em",
                        color: tk.tx3, background: tk.surf2,
                        borderBottom: `2px solid ${tk.bdr}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => {
                    const vInv = inv.filter(i => i.vendor === v.name);
                    const invoiced = vInv.reduce((s, i) => s + i.amount, 0);
                    const paid     = vInv.reduce((s, i) => s + (i.paid || 0), 0);
                    const bal      = invoiced - paid;
                    return (
                      <tr
                        key={v.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedVendor(String(v.id))}
                      >
                        <td style={{ padding: "11px 12px", fontWeight: 600, borderBottom: `1px solid ${tk.bdr}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: tk.accL, color: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {v.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13 }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: tk.tx3 }}>{v.cat || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "center", borderBottom: `1px solid ${tk.bdr}` }}>
                          <span style={{ background: tk.accL, color: tk.acc, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {vInv.length}
                          </span>
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600, borderBottom: `1px solid ${tk.bdr}` }}>
                          {Rs(invoiced)}
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: tk.grn, fontWeight: 600, borderBottom: `1px solid ${tk.bdr}` }}>
                          {Rs(paid)}
                        </td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderBottom: `1px solid ${tk.bdr}`, color: bal > 0 ? tk.red : tk.grn }}>
                          {Rs(bal)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr style={{ background: tk.surf2 }}>
                    <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }} colSpan={2}>Grand Total</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalInvoiced)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalPaid)}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: totalDue > 0 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Single vendor ledger ── */}
      {selectedVendor !== "all" && (
        <Card delay={.12}>
          <CardTitle
            icon={IFileText}
            action={
              <button
                onClick={() => setSelectedVendor("all")}
                style={{ background: "none", border: "none", cursor: "pointer", color: tk.acc, fontSize: 12, fontWeight: 600 }}
              >
                ← All Vendors
              </button>
            }
          >
            {vendors.find(v => v.id === parseInt(selectedVendor))?.name || "Vendor"} — Account Ledger
          </CardTitle>

          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: tk.tx3 }}>Loading ledger...</div>
          ) : vendorInvoices.length === 0 ? (
            <Empty icon={IFileText} text="No invoices for this vendor." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr>
                    {[
                      { label: "Date", align: "left" },
                      { label: "Particulars", align: "left" },
                      { label: "Ref #", align: "left" },
                      { label: "Debit (Dr)", align: "right" },
                      { label: "Credit (Cr)", align: "right" },
                      { label: "Balance", align: "right" },
                      { label: "Status", align: "center" },
                      { label: "", align: "right" },
                    ].map(h => (
                      <th key={h.label} style={{
                        textAlign: h.align, padding: "10px 12px",
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: ".08em", color: tk.tx3,
                        background: tk.surf2, borderBottom: `2px solid ${tk.bdr}`,
                        whiteSpace: "nowrap",
                      }}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Opening balance row */}
                  <tr>
                    <td colSpan={8} style={{ padding: "8px 12px", fontSize: 11, color: tk.tx3, fontStyle: "italic", background: tk.surf2, borderBottom: `1px solid ${tk.bdr}` }}>
                      Opening Balance — ₹0.00
                    </td>
                  </tr>

                  {/* Invoice rows with inline payment rows */}
                  {(() => {
                    let runningBalance = 0;
                    const rows = [];

                    vendorInvoices.forEach(invoice => {
                      runningBalance += invoice.amount;
                      const isPaid    = invoice.status === "Paid" || Math.abs((invoice.paid || 0) - invoice.amount) < 0.01;
                      const isPartial = !isPaid && (invoice.paid || 0) > 0;

                      // Debit row (invoice)
                      rows.push(
                        <tr
                          key={`inv-${invoice.id}`}
                          style={{ background: `${tk.redL}18` }}
                        >
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, whiteSpace: "nowrap" }}>
                            {fmtDate(invoice.created_at || invoice.due)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>
                            {invoice.desc || "Invoice"}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx2 }}>
                            INV-{String(invoice.id).padStart(4, "0")}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>
                            {Rs(invoice.amount)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, whiteSpace: "nowrap" }}>
                            {Rs(runningBalance)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "center" }}>
                            {statusBadge(invoice)}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              {!isPaid && (
                                <Btn variant="primary" small onClick={() => openPaySheet(invoice)}>
                                  <ICreditCard size={11} /> Pay
                                </Btn>
                              )}
                              {(invoice.paid || 0) > 0 && (
                                <Btn variant="ghost" small onClick={() => openHistory(invoice)}>
                                  History
                                </Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );

                      // Credit row if partially/fully paid
                      if ((invoice.paid || 0) > 0) {
                        runningBalance -= (invoice.paid || 0);
                        rows.push(
                          <tr key={`pay-${invoice.id}`} style={{ background: `${tk.grnL}18` }}>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2 }}>
                              {fmtDate(invoice.last_payment_at || invoice.created_at)}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 12, color: tk.tx2, fontStyle: "italic" }}>
                              Payment received — {invoice.desc}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx3 }}>
                              PMT-{String(invoice.id).padStart(4, "0")}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", color: tk.tx3 }}>—</td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, whiteSpace: "nowrap" }}>
                              {Rs(invoice.paid)}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}`, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: runningBalance > 0 ? tk.amb : tk.grn, whiteSpace: "nowrap" }}>
                              {Rs(Math.max(0, runningBalance))}
                            </td>
                            <td colSpan={2} style={{ padding: "8px 12px", borderBottom: `1px solid ${tk.bdr}` }} />
                          </tr>
                        );
                      }
                    });

                    return rows;
                  })()}

                  {/* Closing / totals row */}
                  <tr style={{ background: tk.surf2 }}>
                    <td colSpan={3} style={{ padding: "11px 12px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>
                      Closing Balance
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, borderTop: `2px solid ${tk.bdr}` }}>
                      {Rs(totalInvoiced)}
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn, borderTop: `2px solid ${tk.bdr}` }}>
                      {Rs(totalPaid)}
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: totalDue > 0 ? tk.red : tk.grn, borderTop: `2px solid ${tk.bdr}` }}>
                      {Rs(totalDue)}
                    </td>
                    <td colSpan={2} style={{ borderTop: `2px solid ${tk.bdr}` }} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Unpaid invoices quick list ── */}
      {(() => {
        const unpaidList = vendorInvoices.filter(i => i.status !== "Paid" && Math.abs((i.paid || 0) - i.amount) > 0.01);
        if (unpaidList.length === 0) return null;
        return (
          <Card delay={.16}>
            <CardTitle icon={IClock}>Outstanding Invoices ({unpaidList.length})</CardTitle>
            {unpaidList.map(invoice => {
              const remaining = invoice.amount - (invoice.paid || 0);
              return (
                <div key={invoice.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`,
                  flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.vendor}</div>
                    <div style={{ fontSize: 11, color: tk.tx2 }}>{invoice.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, fontSize: 14 }}>
                      {Rs(remaining)}
                    </div>
                    <div style={{ fontSize: 10, color: tk.tx3 }}>
                      of {Rs(invoice.amount)}
                    </div>
                  </div>
                  {statusBadge(invoice)}
                  <Btn variant="primary" small onClick={() => openPaySheet(invoice)}>
                    <ICreditCard size={11} /> Pay
                  </Btn>
                </div>
              );
            })}
          </Card>
        );
      })()}

      {/* ── Payment Sheet ── */}
      <Sheet
        open={paySheet}
        onClose={() => setPaySheet(false)}
        title="Record Payment"
        icon={ICreditCard}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setPaySheet(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="primary" onClick={submitPayment} disabled={paying} style={{ flex: 2 }}>
              {paying ? "Saving..." : "Confirm Payment"}
            </Btn>
          </>
        }
      >
        {payInvoice && (
          <>
            {/* Invoice summary */}
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "12px 14px", marginBottom: 16, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontSize: 12, color: tk.tx3, marginBottom: 4 }}>Paying invoice to</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 8 }}>{payInvoice.desc}</div>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Invoice Total</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.tx }}>{Rs(payInvoice.amount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Paid So Far</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn }}>{Rs(payInvoice.paid || 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Remaining</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red }}>
                    {Rs(payInvoice.amount - (payInvoice.paid || 0))}
                  </div>
                </div>
              </div>
            </div>

            {payMsg && (
              <Alert type={payMsg.t}>
                {payMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}
                {payMsg.s}
              </Alert>
            )}

            <Field label="Payment Amount (₹)">
              <Input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                max={payInvoice.amount - (payInvoice.paid || 0)}
                step="0.01"
              />
            </Field>
            <FormGrid>
              <Field label="Payment Date">
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </Field>
              <Field label="Payment Mode">
                <Select value={payMode} onChange={e => setPayMode(e.target.value)}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </Select>
              </Field>
            </FormGrid>
            <Field label="Reference / Cheque No. / UTR">
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Notes">
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional notes" />
            </Field>
          </>
        )}
      </Sheet>

      {/* ── Payment History Sheet ── */}
      <Sheet
        open={histSheet}
        onClose={() => setHistSheet(false)}
        title="Payment History"
        icon={IFileText}
      >
        {histInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInvoice.vendor} — {histInvoice.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2 }}>
                Invoice: {Rs(histInvoice.amount)} &nbsp;|&nbsp; Paid: {Rs(histInvoice.paid || 0)} &nbsp;|&nbsp;
                <span style={{ color: tk.red }}>Due: {Rs(histInvoice.amount - (histInvoice.paid || 0))}</span>
              </div>
            </div>
            {histLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading...</div>
            ) : payments.length === 0 ? (
              <Empty icon={IFileText} text="No payments recorded yet." />
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.grnL, color: tk.grn, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    ₹
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 14 }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>
                      {p.payment_mode}{p.reference ? ` · ${p.reference}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: tk.tx3 }}>{fmtDateTime(p.paid_at)}</div>
                    {p.notes && <div style={{ fontSize: 11, color: tk.tx2, marginTop: 2 }}>{p.notes}</div>}
                  </div>
                  <button
                    onClick={() => deletePaymentEntry(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: tk.tx3, padding: 4, borderRadius: 6, flexShrink: 0 }}
                  >
                    <ITrash size={14} />
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
