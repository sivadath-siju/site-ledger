/**
 * BillUpload.jsx
 * Reusable component — add this wherever you want file upload for a bill/receipt.
 *
 * Usage in Invoices.jsx:
 *   <BillUpload
 *     billPath={invoice.bill_path}
 *     onUpload={async (file) => {
 *       const res = await API.uploadInvoiceBill(invoice.id, file);
 *       // update local state with res.bill_path
 *     }}
 *   />
 *
 * Usage in Expenses.jsx:
 *   <BillUpload
 *     billPath={expense.bill_path}
 *     onUpload={async (file) => {
 *       const res = await API.uploadExpenseBill(expense.id, file);
 *     }}
 *   />
 */

import React, { useState, useRef } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";

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
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IFile = ({ size = 14, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

export default function BillUpload({ billPath, onUpload, compact = false }) {
  const { tk } = useApp();
  const inputRef    = useRef(null);
  const [uploading, setUploading]   = useState(false);
  const [error,     setError]       = useState(null);
  const [localPath, setLocalPath]   = useState(billPath || null);

  const viewUrl = API.billUrl(localPath);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const res = await onUpload(file);
      setLocalPath(res.bill_path);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (compact) {
    // Compact mode — inline button used inside table rows
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {localPath ? (
          <button
            type="button"
            onClick={() => API.openBillFile(localPath)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.acc, fontWeight: 600, textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <IEye size={12} color={tk.acc} /> View bill
          </button>
        ) : (
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: tk.tx3, cursor: "pointer", fontWeight: 600 }}>
            <IUpload size={11} color={tk.tx3} />
            {uploading ? "Uploading…" : "Attach bill"}
            <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}
        {!localPath && (
          <label style={{ cursor: "pointer" }}>
            <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}
      </div>
    );
  }

  // Full mode — used in a sheet/detail view
  return (
    <div>
      {/* Existing bill */}
      {localPath && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: tk.surf2, borderRadius: 10, border: `1px solid ${tk.bdr}`, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: tk.accL, color: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IFile size={16} color={tk.acc} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: tk.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {localPath}
            </div>
            <div style={{ fontSize: 10, color: tk.tx3 }}>Bill attached</div>
          </div>
          <button
            type="button"
            onClick={() => API.openBillFile(localPath)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: tk.acc, fontWeight: 600, textDecoration: "none", background: tk.accL, padding: "5px 10px", borderRadius: 7, whiteSpace: "nowrap", border: "none", cursor: "pointer" }}>
            <IEye size={13} color={tk.acc} /> Open
          </button>
        </div>
      )}

      {/* Upload area */}
      <label style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "18px 12px",
        border: `2px dashed ${error ? tk.red : tk.bdr}`,
        borderRadius: 12, cursor: "pointer",
        background: tk.surf2, transition: "border-color .15s",
      }}>
        <IUpload size={20} color={uploading ? tk.acc : tk.tx3} />
        <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx2 }}>
          {uploading ? "Uploading…" : localPath ? "Replace bill" : "Attach bill / receipt"}
        </div>
        <div style={{ fontSize: 11, color: tk.tx3 }}>JPEG, PNG, WebP or PDF · max 10 MB</div>
        {error && <div style={{ fontSize: 11, color: tk.red, marginTop: 2 }}>{error}</div>}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
    </div>
  );
}
