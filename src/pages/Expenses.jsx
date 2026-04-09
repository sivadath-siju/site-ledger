import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import {
  Card, CardTitle, Btn, Alert, Field, Select, Input,
  FormGrid, Badge, Sheet, Empty,
} from "../components/Primitives";
import { ITag, IPlus, ICheckCirc, IXCircle, IReceipt, ISave, IFilter } from "../icons/Icons";

const today   = () => new Date().toISOString().split("T")[0];
const Rs      = n  => "₹" + Number(n || 0).toLocaleString("en-IN");
const IUpload = ({ size = 13, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IEye = ({ size = 12, color = "currentColor" }) => (
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
const IChevron = ({ size = 14, color = "currentColor", down = true }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: down ? "none" : "rotate(-90deg)", transition: "transform .2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

function BillWidget({ expenseId, existingPath, onUploaded, tk }) {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [billPath,  setBillPath]  = useState(existingPath || null);
  const [error,     setError]     = useState(null);
  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setError(null); setUploading(true);
    try {
      const res = await API.uploadExpenseBill(expenseId, file);
      setBillPath(res.bill_path); onUploaded?.(res.bill_path);
    } catch (err) { setError(err.message); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {billPath && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", marginBottom: 6 }}>
          <IFile size={13} color="#15803d" />
          <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600, flex: 1 }}>Bill attached</span>
          <button
            type="button"
            onClick={() => API.openBillFile(billPath)}
            style={{ fontSize: 11, color: tk.acc, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: tk.accL, borderRadius: 6, border: "none", cursor: "pointer" }}>
            <IEye size={11} color={tk.acc} /> View
          </button>
        </div>
      )}
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: tk.tx3, cursor: "pointer", fontWeight: 600 }}>
        <IUpload size={11} color={tk.tx3} />
        {uploading ? "Uploading…" : billPath ? "Replace bill" : "Attach bill / receipt"}
        <span style={{ fontSize: 10, fontWeight: 400 }}>(PDF or image)</span>
        {error && <span style={{ color: "#b91c1c" }}>— {error}</span>}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
    </div>
  );
}

export default function Expenses() {
  const { tk, exp, setExp, expCats, setExpCats, vendors, user } = useApp();

  const [expCatsRaw, setExpCatsRaw] = useState([]);
  useEffect(() => { API.getExpCats().then(r => setExpCatsRaw(r)).catch(() => {}); }, []);

  // Add form state
  const [cat,    setCat]    = useState(expCats[0] || "");
  const [amount, setAmount] = useState("");
  const [desc,   setDesc]   = useState("");
  const [vendor, setVendor] = useState("");
  const [pay,    setPay]    = useState("Cash");
  const [date,   setDate]   = useState(today());
  const [msg,    setMsg]    = useState(null);
  const [lastId, setLastId] = useState(null);

  // Date filter
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo,   setFilterTo]   = useState("");

  // Category management
  const [catOpen, setCatOpen] = useState(false);
  const [newCat,  setNewCat]  = useState("");

  // Collapsed categories
  const [collapsed, setCollapsed] = useState({});
  const toggleCat = c => setCollapsed(p => ({ ...p, [c]: !p[c] }));

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) return setMsg({ t: "err", s: "Enter a valid amount." });
    if (!desc) return setMsg({ t: "err", s: "Description is required." });
    try {
      const catObj    = expCatsRaw.find(c => c.name === cat);
      const vendorObj = vendors.find(v => v.name === vendor);
      const res = await API.addExpense({ category_id: catObj?.id, amount: parseFloat(amount), description: desc, vendor_id: vendorObj?.id || null, payment_mode: pay, date });
      const newId  = res.id || Date.now();
      setExp(prev => [{ id: newId, category: cat, amount: parseFloat(amount), desc, vendor, paymentMode: pay, date, by: user.name, bill_path: null }, ...prev]);
      setLastId(newId);
      setMsg({ t: "ok", s: "Expense recorded." });
      setAmount(""); setDesc(""); setVendor("");
    } catch (e) { setMsg({ t: "err", s: e.message }); }
  };

  // Filtered + sorted expenses
  const filtered = exp
    .filter(e => !filterFrom || e.date >= filterFrom)
    .filter(e => !filterTo   || e.date <= filterTo);

  const totFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const grouped = expCats.reduce((acc, c) => {
    const items = filtered.filter(e => e.category === c);
    if (items.length > 0) acc[c] = items;
    return acc;
  }, {});
  // Uncategorised
  const uncatItems = filtered.filter(e => !expCats.includes(e.category));
  if (uncatItems.length > 0) grouped["Other"] = uncatItems;

  const hasFilter = filterFrom || filterTo;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Expenses</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Log and categorise expenditures</div>
        </div>
        <Btn variant="secondary" small onClick={() => setCatOpen(true)}><ITag size={13} />Categories</Btn>
      </div>

      {/* Add expense form */}
      <Card delay={.05}>
        <CardTitle icon={IPlus}>New Expense</CardTitle>
        {msg && (
          <div>
            <Alert type={msg.t}>{msg.t === "ok" ? <ICheckCirc size={14} /> : <IXCircle size={14} />}{msg.s}</Alert>
            {msg.t === "ok" && lastId && (
              <div style={{ padding: "10px 12px", background: tk.surf2, borderRadius: 10, border: `1px solid ${tk.bdr}`, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: tk.tx2, marginBottom: 6 }}>Attach a bill / receipt for this expense?</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: tk.tx2, cursor: "pointer", fontWeight: 600 }}>
                  <IUpload size={13} color={tk.tx3} /> Attach bill now (optional)
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display: "none" }}
                    onChange={async e => {
                      const file = e.target.files?.[0]; if (!file || !lastId) return;
                      try { const res = await API.uploadExpenseBill(lastId, file); setExp(prev => prev.map(x => x.id === lastId ? { ...x, bill_path: res.bill_path } : x)); setMsg({ t: "ok", s: "Expense and bill saved." }); setLastId(null); }
                      catch (err) { alert(err.message); }
                    }} />
                </label>
                <button onClick={() => { setMsg(null); setLastId(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: tk.tx3, marginTop: 6, display: "block" }}>
                  Skip — add later
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
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What was this for?" />
        </Field>
        <FormGrid>
          <Field label="Vendor">
            <Select value={vendor} onChange={e => setVendor(e.target.value)}>
              <option value="">— Optional —</option>
              {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Payment Mode">
            <Select value={pay} onChange={e => setPay(e.target.value)}>
              {["Cash","UPI","Bank Transfer","Cheque","Credit"].map(p => <option key={p}>{p}</option>)}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Btn fullWidth onClick={submit}><ISave size={14} />Add Expense</Btn>
      </Card>

      {/* Date filter */}
      <Card delay={.08}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <IFilter size={13} color={hasFilter ? tk.acc : tk.tx3} />
          <span style={{ fontSize: 12, fontWeight: 700, color: hasFilter ? tk.acc : tk.tx2 }}>Filter by Date</span>
          {hasFilter && (
            <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} style={{ marginLeft: "auto", fontSize: 11, color: tk.tx3, cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}>Clear</button>
          )}
        </div>
        <FormGrid>
          <Field label="From"><Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></Field>
          <Field label="To">  <Input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   /></Field>
        </FormGrid>
        {hasFilter && (
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 6 }}>
            Showing <strong>{filtered.length}</strong> expense{filtered.length !== 1 ? "s" : ""} — Total: <strong style={{ fontFamily: "'DM Mono',monospace" }}>{Rs(totFiltered)}</strong>
          </div>
        )}
      </Card>

      {/* All expenses grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <Card delay={.1}>
          <Empty icon={IReceipt} text={hasFilter ? "No expenses in this date range." : "No expenses yet. Add one above."} />
        </Card>
      ) : (
        Object.entries(grouped).map(([catName, items], idx) => {
          const catTotal    = items.reduce((s, e) => s + e.amount, 0);
          const isCollapsed = collapsed[catName];
          return (
            <Card key={catName} delay={.08 + idx * 0.03}>
              {/* Category header — clickable to collapse */}
              <button onClick={() => toggleCat(catName)} style={{
                display: "flex", alignItems: "center", width: "100%",
                background: "none", border: "none", cursor: "pointer",
                padding: "0 0 12px", gap: 10,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: tk.acc, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: tk.tx, flex: 1, textAlign: "left" }}>{catName}</span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.acc }}>{Rs(catTotal)}</span>
                <span style={{ fontSize: 10, color: tk.tx3, fontWeight: 500 }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                <IChevron size={14} color={tk.tx3} down={!isCollapsed} />
              </button>

              {!isCollapsed && items.map((e, i) => (
                <div key={e.id} style={{ borderTop: `1px solid ${tk.bdr}`, paddingTop: 10, marginTop: i === 0 ? 0 : 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.desc}</div>
                      <div style={{ fontSize: 11, color: tk.tx3, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>{e.date}</span>
                        {e.vendor && <span>· {e.vendor}</span>}
                        <span>· {e.paymentMode || "Cash"}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14, color: tk.tx, flexShrink: 0 }}>
                      {Rs(e.amount)}
                    </div>
                  </div>
                  {/* Bill upload inline */}
                  <BillWidget
                    tk={tk}
                    expenseId={e.id}
                    existingPath={e.bill_path}
                    onUploaded={path => setExp(prev => prev.map(x => x.id === e.id ? { ...x, bill_path: path } : x))}
                  />
                </div>
              ))}
            </Card>
          );
        })
      )}

      {/* Category management sheet */}
      <Sheet open={catOpen} onClose={() => setCatOpen(false)} title="Expense Categories" icon={ITag}
        footer={
          <>
            <Btn onClick={() => { if (newCat.trim() && !expCats.includes(newCat)) { setExpCats(p => [...p, newCat]); setNewCat(""); } }}>
              <IPlus size={14} />Add
            </Btn>
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
