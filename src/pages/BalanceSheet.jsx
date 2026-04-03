import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, StatCard, Btn, Alert, Field, Select, Input,
  FormGrid, Sheet, Badge, Empty,
} from "../components/Primitives";
import {
  IFileText, IRupee, ICheckCirc, IXCircle, IBuilding, IClock, ITrash,
} from "../icons/Icons";

const Rs   = n  => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = d  => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("en-IN",   { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];

const IBalanceScale = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M3 9l4.5 4.5L12 9" /><path d="M12 9l4.5 4.5L21 9" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="1.5" y1="9" x2="10.5" y2="9" />
    <line x1="13.5" y1="9" x2="22.5" y2="9" />
  </svg>
);

const ICreditCard = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export default function BalanceSheet() {
  const { tk, vendors, inv, setInv, isDesktop } = useApp();

  const [selectedVendor, setSelectedVendor] = useState("all");
  const [loading,  setLoading]  = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  // Payment sheet
  const [paySheet,  setPaySheet]  = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode,   setPayMode]   = useState("Cash");
  const [payRef,    setPayRef]    = useState("");
  const [payNotes,  setPayNotes]  = useState("");
  const [payDate,   setPayDate]   = useState(new Date().toISOString().split("T")[0]);
  const [payMsg,    setPayMsg]    = useState(null);
  const [paying,    setPaying]    = useState(false);

  // History sheet
  const [histSheet,   setHistSheet]   = useState(false);
  const [histInvoice, setHistInvoice] = useState(null);
  const [payments,    setPayments]    = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // ── Derived totals ──────────────────────────────
  const vendorInvoices = selectedVendor === "all"
    ? inv
    : inv.filter(i => {
        const v = vendors.find(v => String(v.id) === String(selectedVendor));
        return v && i.vendor === v.name;
      });

  const totalInvoiced = vendorInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = vendorInvoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalDue      = totalInvoiced - totalPaid;

  // ── Pay sheet ───────────────────────────────────
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
      setPayMsg({ t: "ok", s: `${Rs(amt)} payment recorded!` });
      setTimeout(() => { setPaySheet(false); setPayMsg(null); }, 1200);
    } catch (e) { setPayMsg({ t: "err", s: e.message }); }
    finally { setPaying(false); }
  };

  // ── History sheet ───────────────────────────────
  const openHistory = async (invoice) => {
    setHistInvoice(invoice); setHistSheet(true); setHistLoading(true);
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
    } catch (e) { alert(e.message); }
  };

  const statusBadge = (inv) => {
    if (inv.status === "Paid" || Math.abs((inv.paid || 0) - inv.amount) < 0.01) return <Badge color="green">Paid</Badge>;
    if ((inv.paid || 0) > 0) return <Badge color="amber">Partial ({Rs(inv.paid)})</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  // ─────────────────────────────────────────────────
  // Th/Td helpers with sticky amount columns
  // ─────────────────────────────────────────────────
  const Th = ({ children, right, center, minW }) => (
    <th style={{
      textAlign: right ? "right" : center ? "center" : "left",
      padding: "10px 10px", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".08em",
      color: tk.tx3, background: tk.surf2,
      borderBottom: `2px solid ${tk.bdr}`,
      whiteSpace: "nowrap",
      minWidth: minW,
    }}>{children}</th>
  );

  const Td = ({ children, right, center, mono, bold, color, wrap, style: sx }) => (
    <td style={{
      padding: "10px 10px",
      borderBottom: `1px solid ${tk.bdr}`,
      textAlign: right ? "right" : center ? "center" : "left",
      fontFamily: mono ? "'DM Mono',monospace" : undefined,
      fontWeight: bold ? 700 : undefined,
      color: color || undefined,
      whiteSpace: wrap ? "normal" : "nowrap",
      verticalAlign: "middle",
      ...sx,
    }}>{children}</td>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Balance Sheet</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Vendor ledger — payables &amp; payment history</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3,1fr)" : "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <StatCard icon={IRupee}     value={Rs(totalInvoiced)} label="Total Invoiced"  color="acc" delay={0}   />
        <StatCard icon={ICheckCirc} value={Rs(totalPaid)}     label="Total Paid"      color="grn" delay={.04} />
        <StatCard icon={IClock}     value={Rs(totalDue)}      label="Balance Due"     color={totalDue > 0.01 ? "red" : "grn"} delay={.08} />
      </div>

      {/* Filters */}
      <Card delay={.1}>
        <CardTitle icon={IBalanceScale}>Filter Ledger</CardTitle>
        <FormGrid cols={isDesktop ? "2fr 1fr 1fr auto" : "1fr"}>
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
          <Field label="&nbsp;">
            <Btn variant="secondary" onClick={() => { setFromDate(""); setToDate(""); setSelectedVendor("all"); }}>
              Clear
            </Btn>
          </Field>
        </FormGrid>
      </Card>

      {/* ── ALL VENDORS SUMMARY TABLE ── */}
      {selectedVendor === "all" && (
        <Card delay={.12}>
          <CardTitle icon={IBuilding}>Vendor-wise Summary</CardTitle>
          {vendors.length === 0
            ? <Empty icon={IBuilding} text="No vendors found." />
            : (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                  <thead>
                    <tr>
                      <Th>Vendor</Th>
                      <Th center minW={70}>Invoices</Th>
                      <Th right minW={130}>Total Payable</Th>
                      <Th right minW={130}>Paid</Th>
                      <Th right minW={130}>Balance Due</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(v => {
                      const vInv     = inv.filter(i => i.vendor === v.name);
                      const invoiced = vInv.reduce((s, i) => s + i.amount, 0);
                      const paid     = vInv.reduce((s, i) => s + (i.paid || 0), 0);
                      const bal      = invoiced - paid;
                      return (
                        <tr
                          key={v.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedVendor(String(v.id))}
                        >
                          <Td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: tk.accL, color: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                {v.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</div>
                                {v.cat && <div style={{ fontSize: 10, color: tk.tx3 }}>{v.cat}</div>}
                              </div>
                            </div>
                          </Td>
                          <Td center>
                            <span style={{ background: tk.accL, color: tk.acc, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{vInv.length}</span>
                          </Td>
                          <Td right mono bold>{Rs(invoiced)}</Td>
                          <Td right mono bold color={tk.grn}>{Rs(paid)}</Td>
                          <Td right mono bold color={bal > 0.01 ? tk.red : tk.grn}>{Rs(bal)}</Td>
                        </tr>
                      );
                    })}
                    {/* Grand total row */}
                    <tr style={{ background: tk.surf2 }}>
                      <td colSpan={2} style={{ padding: "11px 10px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>Grand Total</td>
                      <Td right mono bold sx={{ borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalInvoiced)}</Td>
                      <Td right mono bold color={tk.grn} sx={{ borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalPaid)}</Td>
                      <Td right mono bold color={totalDue > 0.01 ? tk.red : tk.grn} sx={{ borderTop: `2px solid ${tk.bdr}` }}>{Rs(totalDue)}</Td>
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
            <CardTitle
              icon={IFileText}
              action={
                <button onClick={() => setSelectedVendor("all")} style={{ background: "none", border: "none", cursor: "pointer", color: tk.acc, fontSize: 12, fontWeight: 600 }}>
                  ← All Vendors
                </button>
              }
            >
              {v?.name || "Vendor"} — Account Ledger
            </CardTitle>

            {/* Vendor meta */}
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

            {vendorInvoices.length === 0
              ? <Empty icon={IFileText} text="No invoices for this vendor." />
              : (
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  {/* minWidth ensures all columns stay visible; outer div scrolls horizontally on small screens */}
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                    <thead>
                      <tr>
                        <Th minW={90}>Date</Th>
                        <Th minW={140}>Particulars</Th>
                        <Th minW={80}>Ref #</Th>
                        <Th right minW={120}>Debit (Dr)</Th>
                        <Th right minW={120}>Credit (Cr)</Th>
                        <Th right minW={120}>Balance</Th>
                        <Th center minW={90}>Status</Th>
                        <Th minW={100}></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening */}
                      <tr>
                        <td colSpan={8} style={{ padding: "7px 10px", fontSize: 11, color: tk.tx3, fontStyle: "italic", background: tk.surf2, borderBottom: `1px solid ${tk.bdr}` }}>
                          Opening Balance — ₹0.00
                        </td>
                      </tr>

                      {vendorInvoices.map(invoice => {
                        runningBalance += invoice.amount;
                        const isPaid = invoice.status === "Paid" || Math.abs((invoice.paid || 0) - invoice.amount) < 0.01;

                        const rows = [];

                        // DEBIT row
                        rows.push(
                          <tr key={`inv-${invoice.id}`} className="debit-row">
                            <Td color={tk.tx2} sx={{ fontSize: 12 }}>{fmtD(invoice.created_at || invoice.due)}</Td>
                            <Td wrap bold sx={{ maxWidth: 200 }}>{invoice.desc || "Invoice"}</Td>
                            <Td sx={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx2 }}>
                              INV-{String(invoice.id).padStart(4, "0")}
                            </Td>
                            <Td right mono bold color={tk.red}>{Rs(invoice.amount)}</Td>
                            <Td right color={tk.tx3}>—</Td>
                            <Td right mono bold color={tk.red}>{Rs(runningBalance)}</Td>
                            <Td center>{statusBadge(invoice)}</Td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                {!isPaid && (
                                  <Btn variant="primary" small onClick={() => openPaySheet(invoice)}>
                                    <ICreditCard size={11} /> Pay
                                  </Btn>
                                )}
                                {(invoice.paid || 0) > 0 && (
                                  <Btn variant="ghost" small onClick={() => openHistory(invoice)}>Hist</Btn>
                                )}
                              </div>
                            </td>
                          </tr>
                        );

                        // CREDIT row if payment exists
                        if ((invoice.paid || 0) > 0) {
                          runningBalance -= invoice.paid;
                          rows.push(
                            <tr key={`pmt-${invoice.id}`} className="credit-row">
                              <Td color={tk.tx2} sx={{ fontSize: 12 }}>{fmtD(invoice.last_payment_at || invoice.created_at)}</Td>
                              <Td wrap sx={{ fontSize: 12, color: tk.tx2, fontStyle: "italic" }}>
                                Payment — {invoice.desc}
                              </Td>
                              <Td sx={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: tk.tx3 }}>
                                PMT-{String(invoice.id).padStart(4, "0")}
                              </Td>
                              <Td right color={tk.tx3}>—</Td>
                              <Td right mono bold color={tk.grn}>{Rs(invoice.paid)}</Td>
                              <Td right mono bold color={runningBalance > 0.01 ? tk.amb : tk.grn}>
                                {Rs(Math.max(0, runningBalance))}
                              </Td>
                              <Td center></Td>
                              <td style={{ padding: "10px 10px", borderBottom: `1px solid ${tk.bdr}` }} />
                            </tr>
                          );
                        }

                        return rows;
                      })}

                      {/* Closing row */}
                      <tr className="ledger-total">
                        <td colSpan={3} style={{ padding: "11px 10px", fontWeight: 700, fontSize: 13, borderTop: `2px solid ${tk.bdr}` }}>
                          Closing Balance
                        </td>
                        <Td right mono bold color={tk.red} sx={{ borderTop: `2px solid ${tk.bdr}`, borderBottom: "none" }}>{Rs(totalInvoiced)}</Td>
                        <Td right mono bold color={tk.grn} sx={{ borderTop: `2px solid ${tk.bdr}`, borderBottom: "none" }}>{Rs(totalPaid)}</Td>
                        <Td right mono bold color={totalDue > 0.01 ? tk.red : tk.grn} sx={{ borderTop: `2px solid ${tk.bdr}`, borderBottom: "none" }}>{Rs(totalDue)}</Td>
                        <td colSpan={2} style={{ borderTop: `2px solid ${tk.bdr}` }} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        );
      })()}

      {/* ── Outstanding quick list ── */}
      {(() => {
        const unpaid = vendorInvoices.filter(i => i.status !== "Paid" && Math.abs((i.paid || 0) - i.amount) > 0.01);
        if (unpaid.length === 0) return null;
        return (
          <Card delay={.16}>
            <CardTitle icon={IClock}>Outstanding Invoices ({unpaid.length})</CardTitle>
            {unpaid.map(invoice => {
              const remaining = invoice.amount - (invoice.paid || 0);
              return (
                <div key={invoice.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{invoice.vendor}</div>
                    <div style={{ fontSize: 11, color: tk.tx2 }}>{invoice.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red, fontSize: 14, whiteSpace: "nowrap" }}>{Rs(remaining)}</div>
                    <div style={{ fontSize: 10, color: tk.tx3, whiteSpace: "nowrap" }}>of {Rs(invoice.amount)}</div>
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
        open={paySheet} onClose={() => setPaySheet(false)}
        title="Record Payment" icon={ICreditCard}
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
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{payInvoice.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 10 }}>{payInvoice.desc}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Invoice Total", val: Rs(payInvoice.amount), color: tk.tx },
                  { label: "Paid So Far",   val: Rs(payInvoice.paid || 0), color: tk.grn },
                  { label: "Remaining",     val: Rs(payInvoice.amount - (payInvoice.paid || 0)), color: tk.red },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: s.color, whiteSpace: "nowrap" }}>{s.val}</div>
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
              <Field label="Mode">
                <Select value={payMode} onChange={e => setPayMode(e.target.value)}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </Select>
              </Field>
            </FormGrid>
            <Field label="Reference / UTR / Cheque No.">
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Notes">
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </>
        )}
      </Sheet>

      {/* ── History Sheet ── */}
      <Sheet open={histSheet} onClose={() => setHistSheet(false)} title="Payment History" icon={IFileText}>
        {histInvoice && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInvoice.vendor} — {histInvoice.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginTop: 4 }}>
                Total: {Rs(histInvoice.amount)} &nbsp;·&nbsp; Paid: {Rs(histInvoice.paid || 0)} &nbsp;·&nbsp;
                <span style={{ color: tk.red }}>Due: {Rs(histInvoice.amount - (histInvoice.paid || 0))}</span>
              </div>
            </div>
            {histLoading
              ? <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading...</div>
              : payments.length === 0
              ? <Empty icon={IFileText} text="No payments recorded yet." />
              : payments.map(p => (
                <div key={p.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.grnL, color: tk.grn, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>₹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>{p.payment_mode}{p.reference ? ` · ${p.reference}` : ""}</div>
                    <div style={{ fontSize: 11, color: tk.tx3 }}>{fmtDT(p.paid_at)}</div>
                    {p.notes && <div style={{ fontSize: 11, color: tk.tx2, marginTop: 2 }}>{p.notes}</div>}
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
