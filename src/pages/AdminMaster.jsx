import React, { useState, useEffect, useContext } from 'react';
import * as API from '../api';
import { AppCtx } from '../context/AppCtx';
import {
  Card, CardTitle, Btn, Alert, Field, Input, Badge, Empty, TableWrap, Sheet
} from '../components/Primitives';
import { IFileText, ITrash, IUsers } from '../icons/Icons';

// ── Inline icons not in the existing icon set ──────────────────
const ITable    = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9"  x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3"  x2="9"  y2="21"/>
  </svg>
);
const IEdit     = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IPlus     = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ITrashX   = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const ISearch   = ({ size = 13, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IShield   = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── Type badge colour helper ────────────────────────────────────
function typeBadge(type = "") {
  const t = type.toLowerCase();
  if (t.includes("int") || t.includes("numeric") || t.includes("float") || t.includes("double") || t.includes("decimal"))
    return <Badge color="blue">{type}</Badge>;
  if (t.includes("bool"))
    return <Badge color="amber">{type}</Badge>;
  if (t.includes("time") || t.includes("date"))
    return <Badge color="green">{type}</Badge>;
  return <Badge color="gray">{type}</Badge>;
}

// ── Null / empty display ────────────────────────────────────────
function CellVal({ v }) {
  if (v === null || v === undefined || v === "")
    return <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 11 }}>null</span>;
  const s = String(v);
  if (s.length > 60) return <span title={s}>{s.slice(0, 58)}…</span>;
  return s;
}

export default function AdminMaster() {
  const { tk, user } = useContext(AppCtx);

  const [tables,        setTables]        = useState([]);
  const [tableSearch,   setTableSearch]   = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [schema,        setSchema]        = useState([]);
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  // Sheet state — shared for add & edit
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [sheetMode,  setSheetMode]  = useState("add"); // "add" | "edit"
  const [sheetRow,   setSheetRow]   = useState({});
  const [sheetOrig,  setSheetOrig]  = useState(null);  // original row (edit mode)
  const [saving,     setSaving]     = useState(false);
  const [sheetMsg,   setSheetMsg]   = useState(null);

  // Confirm delete
  const [deleteId,   setDeleteId]   = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // ── Load tables list ────────────────────────────────────────
  useEffect(() => {
    API.adminGetTables().then(setTables).catch(e => setError(e.message));
  }, []);

  // ── Select a table ──────────────────────────────────────────
  const selectTable = async (table) => {
    setSelectedTable(table);
    setLoading(true);
    setError(null);
    setData([]); setSchema([]);
    try {
      const [s, d] = await Promise.all([
        API.adminGetSchema(table),
        API.adminGetData(table),
      ]);
      setSchema(s);
      setData(d.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshTable = () => selectedTable && selectTable(selectedTable);

  // ── Open add sheet ──────────────────────────────────────────
  const openAdd = () => {
    setSheetMode("add");
    setSheetRow({});
    setSheetOrig(null);
    setSheetMsg(null);
    setSheetOpen(true);
  };

  // ── Open edit sheet ─────────────────────────────────────────
  const openEdit = (row) => {
    setSheetMode("edit");
    setSheetRow({ ...row });
    setSheetOrig(row);
    setSheetMsg(null);
    setSheetOpen(true);
  };

  // ── Save (add or edit) ──────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSheetMsg(null);
    try {
      if (sheetMode === "add") {
        await API.adminAddData(selectedTable, sheetRow);
      } else {
        await API.adminUpdateData(selectedTable, sheetOrig.id, sheetRow);
      }
      setSheetOpen(false);
      refreshTable();
    } catch (e) {
      setSheetMsg({ t: "err", s: e.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await API.adminDeleteData(selectedTable, id);
      setDeleteId(null);
      refreshTable();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Access guard ─────────────────────────────────────────────
  if (user?.role !== "Administrator") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Card style={{ textAlign: "center", padding: "40px 32px", maxWidth: 340 }}>
          <IShield size={38} color={tk.red} />
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12, color: tk.tx }}>Access Denied</div>
          <div style={{ fontSize: 13, color: tk.tx2, marginTop: 6 }}>Administrator role required.</div>
        </Card>
      </div>
    );
  }

  const filteredTables = tables.filter(t =>
    t.toLowerCase().includes(tableSearch.toLowerCase())
  );

  // ── Columns to show (hide overly long JSON blobs in preview) ─
  const visibleCols = schema.slice(0, 10);

  return (
    <div style={{ animation: "fadeUp .25s ease" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <IShield size={18} color={tk.acc} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.4px", color: tk.tx }}>
            Master Database Control
          </div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 1 }}>
            Direct table access · Administrator only
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

        {/* ── Sidebar: table list ─────────────────────────── */}
        <Card style={{ width: 210, flexShrink: 0, marginBottom: 0, padding: "12px 10px" }}>
          <CardTitle icon={ITable}>Tables</CardTitle>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <ISearch size={12} color={tk.tx3} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Filter…"
              style={{
                width: "100%", padding: "7px 10px 7px 28px",
                fontSize: 12, borderRadius: 8,
                border: `1.5px solid ${tk.bdr}`,
                background: tk.surf2, color: tk.tx, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {filteredTables.length === 0
            ? <div style={{ fontSize: 12, color: tk.tx3, textAlign: "center", padding: "12px 0" }}>No tables found</div>
            : filteredTables.map(t => {
                const active = selectedTable === t;
                return (
                  <button
                    key={t}
                    onClick={() => selectTable(t)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      width: "100%", textAlign: "left", padding: "8px 10px",
                      marginBottom: 2, borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      background: active ? tk.acc : "transparent",
                      color: active ? "#fff" : tk.tx2,
                      transition: "all .15s",
                    }}
                  >
                    <ITable size={11} color={active ? "#fff" : tk.tx3} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                  </button>
                );
              })
          }
        </Card>

        {/* ── Main panel ─────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedTable ? (
            <Card style={{ padding: "40px 20px", textAlign: "center" }}>
              <ITable size={38} color={tk.bdr2} />
              <div style={{ marginTop: 14, fontSize: 14, color: tk.tx3 }}>
                Select a table from the left to view and manage its data.
              </div>
            </Card>
          ) : (
            <Card style={{ marginBottom: 0 }}>

              {/* Card header */}
              <CardTitle icon={ITable}
                action={
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {data.length > 0 && (
                      <Badge color="blue">{data.length} row{data.length !== 1 ? "s" : ""}</Badge>
                    )}
                    <Btn variant="primary" small onClick={openAdd} disabled={loading}>
                      <IPlus size={12} /> Add Row
                    </Btn>
                  </div>
                }
              >
                {selectedTable}
              </CardTitle>

              {/* Error */}
              {error && (
                <Alert type="err">
                  <span style={{ fontWeight: 600 }}>Error:</span> {error}
                </Alert>
              )}

              {/* Loading */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: tk.tx3, fontSize: 13 }}>
                  Loading data…
                </div>
              ) : data.length === 0 && !error ? (
                <Empty icon={ITable} text={`No records in "${selectedTable}".`} />
              ) : (
                <>
                  {/* Schema strip */}
                  {schema.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {schema.map(c => (
                        <div key={c.column_name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: tk.tx2 }}>
                          <span style={{ fontWeight: 600, color: tk.tx }}>{c.column_name}</span>
                          {typeBadge(c.data_type)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Table */}
                  <TableWrap>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: tk.surf2 }}>
                          {visibleCols.map((c, i) => (
                            <th key={c.column_name} style={{
                              padding: "9px 10px", textAlign: "left",
                              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                              letterSpacing: ".07em", color: tk.tx2,
                              borderBottom: `2px solid ${tk.bdr}`,
                              whiteSpace: "nowrap",
                            }}>
                              {c.column_name}
                            </th>
                          ))}
                          {schema.length > 10 && (
                            <th style={{ padding: "9px 10px", fontSize: 10, color: tk.tx3, borderBottom: `2px solid ${tk.bdr}` }}>
                              +{schema.length - 10} more
                            </th>
                          )}
                          <th style={{ padding: "9px 10px", borderBottom: `2px solid ${tk.bdr}`, width: 90 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i}
                            style={{
                              background: i % 2 === 0 ? "transparent" : tk.surf2,
                              transition: "background .1s",
                            }}
                          >
                            {visibleCols.map(c => (
                              <td key={c.column_name} style={{
                                padding: "9px 10px",
                                borderBottom: `1px solid ${tk.bdr}`,
                                maxWidth: 160, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                color: tk.tx,
                              }}>
                                <CellVal v={row[c.column_name]} />
                              </td>
                            ))}
                            {schema.length > 10 && (
                              <td style={{ padding: "9px 10px", borderBottom: `1px solid ${tk.bdr}`, color: tk.tx3, fontSize: 11 }}>…</td>
                            )}
                            <td style={{ padding: "7px 10px", borderBottom: `1px solid ${tk.bdr}`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 5 }}>
                                <Btn variant="ghost" small onClick={() => openEdit(row)}>
                                  <IEdit size={11} /> Edit
                                </Btn>
                                <Btn variant="danger" small onClick={() => setDeleteId(row.id)}>
                                  <ITrashX size={11} />
                                </Btn>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ══ Add / Edit Sheet ═════════════════════════════════════ */}
      <Sheet
        open={sheetOpen}
        onClose={() => !saving && setSheetOpen(false)}
        title={sheetMode === "add" ? `Add Row — ${selectedTable}` : `Edit Row — ${selectedTable}`}
        icon={sheetMode === "add" ? IPlus : IEdit}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setSheetOpen(false)} disabled={saving} style={{ flex: 1 }}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? "Saving…" : sheetMode === "add" ? "Add Row" : "Save Changes"}
            </Btn>
          </>
        }
      >
        {sheetMsg && (
          <Alert type={sheetMsg.t}>{sheetMsg.s}</Alert>
        )}

        {/* Skip auto-generated / read-only columns in add mode */}
        {schema
          .filter(c => sheetMode === "edit" || !["id", "created_at", "updated_at"].includes(c.column_name))
          .map(c => (
            <Field key={c.column_name} label={`${c.column_name} ${c.data_type ? `(${c.data_type})` : ""}`}>
              <Input
                value={sheetRow[c.column_name] ?? ""}
                onChange={e => setSheetRow(prev => ({ ...prev, [c.column_name]: e.target.value }))}
                placeholder={c.column_name}
                disabled={sheetMode === "edit" && c.column_name === "id"}
              />
            </Field>
          ))
        }
      </Sheet>

      {/* ══ Delete Confirm Sheet ════════════════════════════════ */}
      <Sheet
        open={deleteId !== null}
        onClose={() => !deleting && setDeleteId(null)}
        title="Delete Record"
        icon={ITrashX}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDeleteId(null)} disabled={deleting} style={{ flex: 1 }}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={() => handleDelete(deleteId)} disabled={deleting} style={{ flex: 2 }}>
              {deleting ? "Deleting…" : "Yes, Delete"}
            </Btn>
          </>
        }
      >
        <Alert type="err">
          This will permanently delete record <strong>#{deleteId}</strong> from <strong>{selectedTable}</strong>. This cannot be undone.
        </Alert>
      </Sheet>
    </div>
  );
}
