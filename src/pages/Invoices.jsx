import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Empty, Sheet, Divider,
} from "../components/Primitives";
import { IFilePlus, ICheckCirc, IXCircle, IClock, IFileText, ISave, ITrash } from "../icons/Icons";

const Rs = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = d => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT/RTGS", "Card"];

const ICreditCard = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export default function Invoices() {
  const { tk, inv, setInv, vendors } = useApp();
  const [vId, setVId]       = useState(null);
  const [amount, setAmount] = useState("");
  const [desc, setDesc]     = useState("");
  const [due, setDue]       = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [msg, setMsg]       = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => { if (vendors.length && !vId) setVId(vendors[0]?.id); }, [vendors, vId]);

  // Payment sheet
  const [paySheet, setPaySheet] = useState(false);
  const [payInv, setPayInv]     = useState(null);
  const [payAmt, setPayAmt]     = useState("");
  const [payMode, setPayMode]   = useState("Cash");
  const [payRef, setPayRef]     = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate]   = useState(new Date().toISOString().split("T")[0]);
  const [payMsg, setPayMsg]     = useState(null);
  const [paying, setPaying]     = useState(false);

  // History sheet
  const [histSheet, setHistSheet]   = useState(false);
  const [histInv, setHistInv]       = useState(null);
  const [payments, setPayments]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const unpaidCount = inv.filter(i => i.status !== "Paid").length;
  const unpaidTotal = inv.filter(i => i.status !== "Paid").reduce((s, i) => s + i.amount - (i.paid || 0), 0);

  const filtered = filter === "All" ? inv
    : filter === "Paid"    ? inv.filter(i => i.status === "Paid")
    : filter === "Unpaid"  ? inv.filter(i => i.status === "Unpaid")
    : inv.filter(i => i.status === "Partially Paid");

  // ── Add invoice ──────────────────────────────
  const submit = async () => {
    const v = vendors.find(x => x.id === vId);
    if (!amount || !desc) return setMsg({ t: "err", s: "Amount and description required." });
    try {
      const res = await API.addInvoice({
        vendor_id: vId, description: desc,
        amount: parseFloat(amount), due_date: due || null, status,
      });
      setInv(prev => [{
        id: res.id || Date.now(), vendor: v?.name || "",
        desc, amount: parseFloat(amount), due, status, paid: 0,
      }, ...prev]);
      setMsg({ t: "ok", s: "Invoice added." });
      setAmount(""); setDesc(""); setDue(""); setStatus("Unpaid");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  // ── Open pay sheet ───────────────────────────
  const openPay = (invoice) => {
    setPayInv(invoice);
    setPayAmt((invoice.amount - (invoice.paid || 0)).toFixed(2));
    setPayMode("Cash"); setPayRef(""); setPayNotes("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMsg(null);
    setPaySheet(true);
  };

  const submitPayment = async () => {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) return setPayMsg({ t: "err", s: "Enter a valid amount." });
    const remaining = payInv.amount - (payInv.paid || 0);
    if (amt > remaining + 0.01) return setPayMsg({ t: "err", s: `Max payable: ${Rs(remaining)}` });
    setPaying(true);
    try {
      await API.addPayment(payInv.id, {
        amount: amt, payment_mode: payMode, reference: payRef, notes: payNotes,
        paid_at: `${payDate}T${new Date().toTimeString().slice(0, 8)}`,
      });
      const newPaid   = (payInv.paid || 0) + amt;
      const newStatus = Math.abs(newPaid - payInv.amount) < 0.01 ? "Paid" : "Partially Paid";
      setInv(prev => prev.map(x => x.id === payInv.id ? { ...x, paid: newPaid, status: newStatus } : x));
      setPayMsg({ t: "ok", s: `Payment of ${Rs(amt)} recorded!` });
      setTimeout(() => { setPaySheet(false); setPayMsg(null); }, 1200);
    } catch (e) { setPayMsg({ t: "err", s: e.message }); }
    finally { setPaying(false); }
  };

  // ── Open history sheet ───────────────────────
  const openHistory = async (invoice) => {
    setHistInv(invoice);
    setHistSheet(true);
    setHistLoading(true);
    try {
      const data = await API.getPayments(invoice.id);
      setPayments(Array.isArray(data) ? data : data.payments || []);
    } catch { setPayments([]); }
    finally { setHistLoading(false); }
  };

  const deletePayment = async (pid) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await API.deletePayment(histInv.id, pid);
      setPayments(prev => prev.filter(p => p.id !== pid));
    } catch (e) { alert(e.message); }
  };

  const statusBadge = (inv) => {
    if (inv.status === "Paid" || Math.abs((inv.paid || 0) - inv.amount) < 0.01)
      return <Badge color="green">Paid</Badge>;
    if ((inv.paid || 0) > 0)
      return <Badge color="amber">Partial</Badge>;
    return <Badge color="red">Unpaid</Badge>;
  };

  return (
    <div>
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Invoices &amp; Payables</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Supplier invoices and payment tracking</div>
      </div>

      {unpaidTotal > 0 && (
        <Alert type="warn">
          <IClock size={14} />
          <span>Outstanding: <strong>{Rs(unpaidTotal)}</strong> across {unpaidCount} invoice{unpaidCount !== 1 ? "s" : ""}</span>
        </Alert>
      )}

      {/* Add invoice form */}
      <Card delay={.05}>
        <CardTitle icon={IFilePlus}>Add Invoice</CardTitle>
        {msg && <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>}
        <FormGrid>
          <Field label="Vendor">
            <Select value={vId || ""} onChange={e => setVId(parseInt(e.target.value))}>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" />
          </Field>
        </FormGrid>
        <Field label="Description">
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Work or supply covered" />
        </Field>
        <FormGrid>
          <Field label="Due Date"><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option>Unpaid</option><option>Paid</option><option>Partially Paid</option>
            </Select>
          </Field>
        </FormGrid>
        <Btn onClick={submit} fullWidth><ISave size={14} />Add Invoice</Btn>
      </Card>

      {/* Invoice list */}
      <Card delay={.1}>
        <CardTitle
          icon={IFileText}
          action={
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["All", "Unpaid", "Partially Paid", "Paid"].map(f => (
                <Btn key={f} variant={filter === f ? "primary" : "secondary"} small onClick={() => setFilter(f)}>{f}</Btn>
              ))}
            </div>
          }
        >Invoice Register</CardTitle>

        {filtered.length === 0 ? <Empty icon={IFileText} text="No invoices found." /> : (
          <TableWrap>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <thead>
                <tr>
                  {["Vendor", "Description", "Invoice", "Paid", "Due", "Status", ""].map(h => (
                    <th key={h} style={{
                      textAlign: h === "Invoice" || h === "Paid" || h === "Due" ? "right" : "left",
                      padding: "9px 10px", fontSize: 10, fontWeight: 700,
                      color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em",
                      borderBottom: `1.5px solid ${tk.bdr}`, background: tk.surf2,
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const remaining = i.amount - (i.paid || 0);
                  const isPaid    = Math.abs(remaining) < 0.01;
                  return (
                    <tr key={i.id}>
                      <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontWeight: 600 }}>{i.vendor}</td>
                      <td style={{ padding: "10px", fontSize: 12, borderBottom: `1px solid ${tk.bdr}`, color: tk.tx2, maxWidth: 140 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.desc}</div>
                      </td>
                      <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", fontWeight: 700, textAlign: "right" }}>
                        {Rs(i.amount)}
                      </td>
                      <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", textAlign: "right", color: tk.grn }}>
                        {(i.paid || 0) > 0 ? Rs(i.paid) : <span style={{ color: tk.tx3 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px", fontSize: 13, borderBottom: `1px solid ${tk.bdr}`, fontFamily: "'DM Mono',monospace", textAlign: "right", color: !isPaid && remaining > 0 ? tk.red : tk.grn }}>
                        {isPaid ? <span style={{ color: tk.grn }}>✓</span> : Rs(remaining)}
                      </td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}` }}>
                        {statusBadge(i)}
                      </td>
                      <td style={{ padding: "10px", borderBottom: `1px solid ${tk.bdr}` }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {!isPaid && (
                            <Btn variant="primary" small onClick={() => openPay(i)}>
                              <ICreditCard size={11} /> Pay
                            </Btn>
                          )}
                          {(i.paid || 0) > 0 && (
                            <Btn variant="ghost" small onClick={() => openHistory(i)}>Hist</Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {/* ── Pay Sheet ── */}
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
        {payInv && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{payInv.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 8 }}>{payInv.desc}</div>
              <div style={{ display: "flex", gap: 16 }}>
                <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Total</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{Rs(payInv.amount)}</div></div>
                <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Paid</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.grn }}>{Rs(payInv.paid || 0)}</div></div>
                <div><div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase" }}>Remaining</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.red }}>{Rs(payInv.amount - (payInv.paid || 0))}</div></div>
              </div>
            </div>
            {payMsg && <Alert type={payMsg.t}>{payMsg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{payMsg.s}</Alert>}
            <Field label="Payment Amount (₹)">
              <Input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Enter amount" step="0.01" min="0.01" />
            </Field>
            <FormGrid>
              <Field label="Date"><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></Field>
              <Field label="Payment Mode">
                <Select value={payMode} onChange={e => setPayMode(e.target.value)}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </Select>
              </Field>
            </FormGrid>
            <Field label="Reference / UTR / Cheque No">
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
        {histInv && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 600 }}>{histInv.vendor} — {histInv.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2 }}>
                Total: {Rs(histInv.amount)} &nbsp;·&nbsp; Paid: {Rs(histInv.paid || 0)} &nbsp;·&nbsp;
                <span style={{ color: tk.red }}>Due: {Rs(histInv.amount - (histInv.paid || 0))}</span>
              </div>
            </div>
            {histLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: tk.tx3 }}>Loading...</div>
            ) : payments.length === 0 ? (
              <Empty icon={IFileText} text="No payments yet." />
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${tk.bdr}`, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.grnL, color: tk.grn, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>₹</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{Rs(p.amount)}</div>
                    <div style={{ fontSize: 12, color: tk.tx2 }}>{p.payment_mode}{p.reference ? ` · ${p.reference}` : ""}</div>
                    <div style={{ fontSize: 11, color: tk.tx3 }}>{fmtDateTime(p.paid_at)}</div>
                    {p.notes && <div style={{ fontSize: 11, color: tk.tx2, marginTop: 2 }}>{p.notes}</div>}
                  </div>
                  <button onClick={() => deletePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: tk.tx3, padding: 4, borderRadius: 6 }}>
                    <ITrash size={13} />
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
