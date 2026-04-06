import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, TableWrap, Badge, Sheet, Empty,
} from "../components/Primitives";
import { ITag, IPlus, ICheckCirc, IXCircle, IReceipt, ISave } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");
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

// ── Bill upload widget ────────────────────────────────
function BillUploadWidget({ expenseId, existingPath, onUploaded, tk }) {
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
      const res = await API.uploadExpenseBill(expenseId, file);
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
    <div>
      {billPath && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", marginBottom: 8 }}>
          <IFile size={16} color="#15803d" />
          <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600, flex: 1 }}>Bill attached</span>
          <a href={viewUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.acc, fontWeight: 600, textDecoration: "none", padding: "4px 8px", background: tk.accL, borderRadius: 6, whiteSpace: "nowrap" }}>
            <IEye size={12} color={tk.acc} /> View
          </a>
        </div>
      )}

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "9px 14px", border: `1.5px dashed ${error ? "#b91c1c" : tk.bdr}`,
        borderRadius: 10, cursor: "pointer", background: tk.surf2,
        fontSize: 12, color: tk.tx3, fontWeight: 600,
      }}>
        <IUpload size={13} color={uploading ? tk.acc : tk.tx3} />
        {uploading ? "Uploading…" : billPath ? "Replace bill" : "Attach bill / receipt"}
        <span style={{ fontSize: 10, color: tk.tx3, fontWeight: 400 }}>(PDF or image)</span>
        {error && <span style={{ color: "#b91c1c", fontSize: 11 }}> — {error}</span>}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
    </div>
  );
}

export default function Expenses() {
  const { tk, exp, setExp, expCats, setExpCats, vendors, user } = useApp();

  const [expCatsRaw, setExpCatsRaw] = useState([]);
  useEffect(() => { API.getExpCats().then(r => setExpCatsRaw(r)).catch(() => {}); }, []);

  const [tab,      setTab]     = useState("add");
  const [catOpen,  setCatOpen] = useState(false);
  const [cat,      setCat]     = useState(expCats[0]);
  const [amount,   setAmount]  = useState("");
  const [desc,     setDesc]    = useState("");
  const [vendor,   setVendor]  = useState("");
  const [pay,      setPay]     = useState("Cash");
  const [date,     setDate]    = useState(today());
  const [msg,      setMsg]     = useState(null);
  const [newCat,   setNewCat]  = useState("");

  // After-add bill upload
  const [lastAddedId, setLastAddedId]   = useState(null);
  const [billSheet,   setBillSheet]     = useState(false);
  const [activeExp,   setActiveExp]     = useState(null);

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) return setMsg({ t: "err", s: "Enter a valid amount." });
    if (!desc) return setMsg({ t: "err", s: "Description is required." });
    try {
      const catObj    = expCatsRaw.find(c => c.name === cat);
      const vendorObj = vendors.find(v => v.name === vendor);
      const res = await API.addExpense({
        category_id: catObj?.id, amount: parseFloat(amount), description: desc,
        vendor_id: vendorObj?.id || null, payment_mode: pay, date,
      });
      const newId = res.id || Date.now();
      const newExp = { id: newId, category: cat, amount: parseFloat(amount), desc, vendor, paymentMode: pay, date, by: user.name, bill_path: null };
      setExp(prev => [newExp, ...prev]);
      setLastAddedId(newId);
      setMsg({ t: "ok", s: "Expense recorded. You can now attach a bill." });
      setAmount(""); setDesc(""); setVendor("");
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  const openBillSheet = (expense) => {
    setActiveExp(expense);
    setBillSheet(true);
  };

  const totE = exp.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Expenses</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Log and categorise expenditures</div>
        </div>
        <Btn variant="secondary" small onClick={() => setCatOpen(true)}><ITag size={13} />Categories</Btn>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["add","list"].map(t => (
          <Btn key={t} variant={tab === t ? "primary" : "secondary"} small onClick={() => setTab(t)} style={{ flex: 1 }}>
            {t === "add" ? "Add Expense" : "All Expenses"}
          </Btn>
        ))}
      </div>

      {tab === "add" ? (
        <Card delay={.05}>
          <CardTitle icon={IPlus}>New Expense</CardTitle>
          {msg && (
            <div>
              <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>
              {/* After a successful add — offer to attach bill to the just-added expense */}
              {msg.t === "ok" && lastAddedId && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: tk.surf2, borderRadius: 10, border: `1px solid ${tk.bdr}` }}>
                  <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 8 }}>Do you have a bill / receipt for this expense?</div>
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "9px 14px", border: `1.5px dashed ${tk.bdr}`,
                    borderRadius: 10, cursor: "pointer", background: "#fff", fontSize: 12, color: tk.tx3, fontWeight: 600,
                  }}>
                    <IUpload size={13} color={tk.tx3} /> Attach bill now (optional)
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !lastAddedId) return;
                        try {
                          const res = await API.uploadExpenseBill(lastAddedId, file);
                          setExp(prev => prev.map(x => x.id === lastAddedId ? { ...x, bill_path: res.bill_path } : x));
                          setMsg({ t: "ok", s: "Expense and bill saved." });
                          setLastAddedId(null);
                        } catch (err) { alert(err.message); }
                      }}
                      style={{ display: "none" }} />
                  </label>
                  <button onClick={() => { setMsg(null); setLastAddedId(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: tk.tx3, marginTop: 6, width: "100%", textAlign: "center" }}>
                    Skip — I'll add it later
                  </button>
                </div>
              )}
            </div>
          )}

          <FormGrid>
            <Field label="Category">
              <Select value={cat} onChange={e => setCat(e.target.value)}>
                {expCats.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </Field>
          </FormGrid>
          <Field label="Description">
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What was this expense for?" />
          </Field>
          <FormGrid>
            <Field label="Vendor">
              <Select value={vendor} onChange={e => setVendor(e.target.value)}>
                <option value="">— Optional —</option>
                {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Payment">
              <Select value={pay} onChange={e => setPay(e.target.value)}>
                {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(p => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Btn fullWidth onClick={submit}><ISave size={14} />Add Expense</Btn>
        </Card>
      ) : (
        <Card delay={.05}>
          <CardTitle icon={IReceipt} action={<span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{Rs(totE)}</span>}>
            All Expenses
          </CardTitle>
          {exp.length === 0 ? <Empty icon={IReceipt} text="No expenses yet." /> : (
            <div>
              {exp.map(e => (
                <div key={e.id} style={{ padding: "11px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.desc}</div>
                      <div style={{ fontSize: 11, color: tk.tx3, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge color="blue">{e.category}</Badge>
                        {e.vendor && <span>{e.vendor}</span>}
                        <span>{e.date}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14 }}>{Rs(e.amount)}</div>
                    </div>
                  </div>

                  {/* Bill upload / view */}
                  <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                    {e.bill_path ? (
                      <>
                        <a href={`${BASE_URL}/uploads/bills/${e.bill_path}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#15803d", fontWeight: 600, textDecoration: "none", padding: "3px 8px", background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                          <IEye size={11} color="#15803d" /> View Bill
                        </a>
                        <button onClick={() => openBillSheet(e)} style={{ fontSize: 11, color: tk.tx3, cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}>
                          Replace
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openBillSheet(e)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.tx3, fontWeight: 600, cursor: "pointer", padding: "3px 8px", background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 6 }}>
                        <IUpload size={11} color={tk.tx3} /> Attach Bill
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* By category summary */}
      <Card delay={.1}>
        <CardTitle icon={ITag}>By Category</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 9 }}>
          {expCats.map(c => {
            const t = exp.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0);
            if (!t) return null;
            return (
              <div key={c} style={{ background: tk.surf2, border: `1px solid ${tk.bdr}`, borderRadius: 10, padding: 11 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{Rs(t)}</div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>{c}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Bill upload sheet for existing expenses */}
      <Sheet open={billSheet} onClose={() => setBillSheet(false)} title="Attach Bill / Receipt" icon={IUpload}
        footer={<Btn variant="secondary" onClick={() => setBillSheet(false)} style={{ width: "100%" }}>Close</Btn>}
      >
        {activeExp && (
          <>
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", marginBottom: 14, border: `1px solid ${tk.bdr}` }}>
              <div style={{ fontWeight: 700 }}>{activeExp.desc}</div>
              <div style={{ fontSize: 12, color: tk.tx2 }}>{activeExp.category} · {activeExp.date}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{Rs(activeExp.amount)}</div>
            </div>
            <BillUploadWidget
              tk={tk}
              expenseId={activeExp.id}
              existingPath={activeExp.bill_path}
              onUploaded={(path) => {
                setExp(prev => prev.map(x => x.id === activeExp.id ? { ...x, bill_path: path } : x));
                setActiveExp(prev => ({ ...prev, bill_path: path }));
              }}
            />
            <div style={{ marginTop: 14, padding: "10px 12px", background: tk.surf2, borderRadius: 8, fontSize: 11, color: tk.tx3, lineHeight: 1.6 }}>
              ℹ️ JPEG, PNG, WebP or PDF · Max 10 MB
            </div>
          </>
        )}
      </Sheet>

      {/* Category management sheet */}
      <Sheet open={catOpen} onClose={() => setCatOpen(false)} title="Expense Categories" icon={ITag}
        footer={
          <>
            <Btn onClick={() => {
              if (newCat.trim() && !expCats.includes(newCat)) {
                setExpCats(p => [...p, newCat]); setNewCat("");
              }
            }}><IPlus size={14} />Add</Btn>
            <Btn variant="secondary" onClick={() => setCatOpen(false)}>Done</Btn>
          </>
        }
      >
        <div style={{ marginBottom: 14 }}>
          {expCats.map((c, i) => (
            <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${tk.bdr}` }}>
              <span style={{ fontSize: 13 }}>{c}</span>
              {i > 4 ? <Btn variant="ghost" small onClick={() => setExpCats(p => p.filter(x => x !== c))}>Remove</Btn> : <span style={{ fontSize: 10, color: tk.tx3 }}>Default</span>}
            </div>
          ))}
        </div>
        <Field label="New Category Name">
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="e.g. Legal Fees" />
        </Field>
      </Sheet>
    </div>
  );
}
