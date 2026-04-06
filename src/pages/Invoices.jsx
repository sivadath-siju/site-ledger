import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Empty, Sheet,
} from "../components/Primitives";
import { IFilePlus, ICheckCirc, IXCircle, IClock, IFileText, ISave, ITrash } from "../icons/Icons";

const Rs = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5001/api").replace("/api", "");

// ── Inline icons ──────────────────────────────────────
const IUpload = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IEye = ({ size = 13, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IFile = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);

// ── Bill upload widget (inline, no external file) ──────
function BillUploadWidget({ invoiceId, existingPath, onUploaded, tk }) {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [billPath,  setBillPath]  = useState(existingPath || null);
  const [error,     setError]     = useState(null);

  const viewUrl = billPath ? `${BASE_URL}/uploads/bills/${billPath}` : null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const res = await API.uploadInvoiceBill(invoiceId, file);
      setBillPath(res.bill_path);
      onUploaded?.(res.bill_path);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {billPath ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", marginBottom: 8 }}>
          <IFile size={16} color="#15803d" />
          <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Bill attached</span>
          <a href={viewUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.acc, fontWeight: 600, textDecoration: "none", padding: "4px 8px", background: tk.accL, borderRadius: 6, whiteSpace: "nowrap" }}>
            <IEye size={12} color={tk.acc} /> View
          </a>
        </div>
      ) : null}

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "9px 14px", border: `1.5px dashed ${error ? tk.red : tk.bdr}`,
        borderRadius: 10, cursor: "pointer", background: tk.surf2, fontSize: 12, color: tk.tx3,
        fontWeight: 600, transition: "border-color .15s",
      }}>
        <IUpload size={13} color={uploading ? tk.acc : tk.tx3} />
        {uploading ? "Uploading…" : billPath ? "Replace bill" : "Attach bill / receipt"}
        <span style={{ fontSize: 10, color: tk.tx3, fontWeight: 400 }}>(PDF or image)</span>
        {error && <span style={{ color: tk.red, fontSize: 11 }}> — {error}</span>}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
    </div>
  );
}

export default function Invoices() {
  const { tk, inv, setInv, vendors } = useApp();

  const [vId,    setVId]    = useState(null);
  const [amount, setAmount] = useState("");
  const [desc,   setDesc]   = useState("");
  const [due,    setDue]    = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [msg,    setMsg]    = useState(null);
  const [adding, setAdding] = useState(false);

  // Upload sheet — open on an existing invoice
  const [uploadSheet, setUploadSheet] = useState(false);
  const [activeInv,   setActiveInv]   = useState(null);

  useEffect(() => {
    if (vendors.length && !vId) setVId(vendors[0].id);
  }, [vendors]);

  const unpaid = inv.filter(i => i.status === "Unpaid").reduce((s, i) => s + i.amount, 0);

  const submit = async () => {
    if (!amount || !desc) return setMsg({ t: "err", s: "Amount and description required." });
    if (!vId)             return setMsg({ t: "err", s: "Select a vendor." });
    const v = vendors.find(x => x.id === vId);
    setAdding(true);
    try {
      const res = await API.addInvoice({ vendor_id: vId, description: desc, amount: parseFloat(amount), due_date: due || null, status });
      setInv(prev => [{ id: res.id || Date.now(), vendor: v?.name || "", desc, amount: parseFloat(amount), due, status, paid: 0, bill_path: null }, ...prev]);
      setMsg({ t: "ok", s: "Invoice added." });
      setAmount(""); setDesc(""); setDue(""); setStatus("Unpaid");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) { setMsg({ t: "err", s: e.message }); }
    finally { setAdding(false); }
  };

  const markPaid = async (invoice) => {
    try {
      await API.updateInvoice(invoice.id, { status: "Paid" });
      setInv(prev => prev.map(x => x.id === invoice.id ? { ...x, status: "Paid" } : x));
    } catch (e) { alert(e.message); }
  };

  const openUploadSheet = (invoice) => {
    setActiveInv(invoice);
    setUploadSheet(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Invoices & Payables</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Supplier invoices and outstanding payments</div>
      </div>

      {unpaid > 0 && (
        <Alert type="warn">
          <IClock size={14} />
          <span>Outstanding: <strong>{Rs(unpaid)}</strong> across {inv.filter(i => i.status === "Unpaid").length} invoices</span>
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
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
        </FormGrid>
        <Field label="Description">
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Work or supply covered" />
        </Field>
        <FormGrid>
          <Field label="Due Date">
            <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option>Unpaid</option><option>Paid</option><option>Partially Paid</option>
            </Select>
          </Field>
        </FormGrid>
        <Btn onClick={submit} disabled={adding}>
          <ISave size={14} />{adding ? "Adding…" : "Add Invoice"}
        </Btn>
      </Card>

      {/* Invoice list */}
      <Card delay={.1}>
        <CardTitle icon={IFileText}>Invoice Register</CardTitle>
        {inv.length === 0 ? <Empty icon={IFileText} text="No invoices yet." /> : (
          <div>
            {inv.map(invoice => (
              <div key={invoice.id} style={{
                padding: "13px 0", borderBottom: `1px solid ${tk.bdr}`,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: tk.tx }}>{invoice.vendor}</div>
                    <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>{invoice.desc}</div>
                    {invoice.due && (
                      <div style={{ fontSize: 11, color: tk.tx3, marginTop: 2 }}>Due: {invoice.due}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 15, color: tk.tx }}>
                      {Rs(invoice.amount)}
                    </div>
                    {(invoice.paid || 0) > 0 && (
                      <div style={{ fontSize: 11, color: "#15803d" }}>Paid: {Rs(invoice.paid)}</div>
                    )}
                  </div>
                </div>

                {/* Bottom row — status + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Badge color={invoice.status === "Paid" ? "green" : invoice.status === "Unpaid" ? "red" : "amber"}>
                    {invoice.status}
                  </Badge>

                  {/* ── BILL UPLOAD BUTTON ── */}
                  {invoice.bill_path ? (
                    <a
                      href={`${BASE_URL}/uploads/bills/${invoice.bill_path}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#15803d", fontWeight: 600, textDecoration: "none", padding: "3px 8px", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                      <IEye size={11} color="#15803d" /> View Bill
                    </a>
                  ) : (
                    <button
                      onClick={() => openUploadSheet(invoice)}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.tx3, fontWeight: 600, cursor: "pointer", padding: "3px 8px", background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 6 }}>
                      <IUpload size={11} color={tk.tx3} /> Attach Bill
                    </button>
                  )}

                  {invoice.status !== "Paid" && (
                    <Btn variant="secondary" small onClick={() => markPaid(invoice)} style={{ marginLeft: "auto" }}>
                      Mark Paid
                    </Btn>
                  )}
                  {invoice.bill_path && (
                    <button
                      onClick={() => openUploadSheet(invoice)}
                      style={{ fontSize: 11, color: tk.tx3, cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}>
                      Replace
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bill upload sheet */}
      <Sheet
        open={uploadSheet}
        onClose={() => setUploadSheet(false)}
        title="Attach Bill / Receipt"
        icon={IUpload}
        footer={<Btn variant="secondary" onClick={() => setUploadSheet(false)} style={{ width: "100%" }}>Close</Btn>}
      >
        {activeInv && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 16, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{activeInv.vendor}</div>
              <div style={{ fontSize: 12, color: tk.tx2 }}>{activeInv.desc}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 16, color: tk.tx, marginTop: 4 }}>{Rs(activeInv.amount)}</div>
            </div>

            <BillUploadWidget
              tk={tk}
              invoiceId={activeInv.id}
              existingPath={activeInv.bill_path}
              onUploaded={(path) => {
                setInv(prev => prev.map(x => x.id === activeInv.id ? { ...x, bill_path: path } : x));
                setActiveInv(prev => ({ ...prev, bill_path: path }));
              }}
            />

            <div style={{ marginTop: 14, padding: "10px 12px", background: tk.surf2, borderRadius: 8, fontSize: 11, color: tk.tx3, lineHeight: 1.6 }}>
              ℹ️ Accepted formats: JPEG, PNG, WebP, PDF · Max 10 MB<br />
              The file is stored on the server and accessible from any device.
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
