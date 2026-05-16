import React, { useState, useEffect, useContext } from 'react';
import * as API from '../api';
import { AppCtx } from '../context/AppCtx';

export default function AdminMaster() {
  const { tk, user } = useContext(AppCtx);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [schema, setSchema] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [newRow, setNewRow] = useState(null);

  useEffect(() => {
    API.adminGetTables().then(setTables).catch(e => setError(e.message));
  }, []);

  const selectTable = async (table) => {
    setSelectedTable(table);
    setLoading(true);
    setError(null);
    setData([]);
    setSchema([]);
    try {
      const [s, d] = await Promise.all([
        API.adminGetSchema(table),
        API.adminGetData(table)
      ]);
      setSchema(s);
      setData(d.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, rowData) => {
    try {
      await API.adminUpdateData(selectedTable, id, rowData);
      setEditingRow(null);
      selectTable(selectedTable);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await API.adminDeleteData(selectedTable, id);
      selectTable(selectedTable);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAdd = async () => {
    try {
      await API.adminAddData(selectedTable, newRow);
      setNewRow(null);
      selectTable(selectedTable);
    } catch (e) {
      alert(e.message);
    }
  };

  if (user?.role !== 'Administrator') {
    return <div style={{ color: tk.tx }}>Access Denied</div>;
  }

  return (
    <div style={{ color: tk.tx }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Master Database Control</h1>
      
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Tables</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tables.map(t => (
              <li 
                key={t} 
                onClick={() => selectTable(t)}
                style={{ 
                  padding: '8px 12px', 
                  cursor: 'pointer',
                  borderRadius: 6,
                  background: selectedTable === t ? tk.acc : 'transparent',
                  color: selectedTable === t ? '#fff' : tk.tx,
                  marginBottom: 4,
                  fontSize: 14
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1, overflowX: 'auto' }}>
          {selectedTable ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: 18 }}>Table: {selectedTable}</h3>
                <button 
                  onClick={() => setNewRow({})}
                  style={{ background: tk.acc, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
                >
                  Add Row
                </button>
              </div>

              {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
              {loading ? (
                <div>Loading data...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: tk.surf, textAlign: 'left' }}>
                      {schema.map(c => (
                        <th key={c.column_name} style={{ padding: 8, border: `1px solid ${tk.bdr}` }}>{c.column_name}</th>
                      ))}
                      <th style={{ padding: 8, border: `1px solid ${tk.bdr}` }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newRow && (
                      <tr>
                        {schema.map(c => (
                          <td key={c.column_name} style={{ padding: 4, border: `1px solid ${tk.bdr}` }}>
                            <input 
                              type="text" 
                              style={{ width: '100%', padding: 4, background: tk.bg, color: tk.tx, border: `1px solid ${tk.bdr}` }}
                              placeholder={c.column_name}
                              onChange={(e) => setNewRow({ ...newRow, [c.column_name]: e.target.value })}
                            />
                          </td>
                        ))}
                        <td style={{ padding: 4, border: `1px solid ${tk.bdr}` }}>
                          <button onClick={handleAdd} style={{ marginRight: 4 }}>Save</button>
                          <button onClick={() => setNewRow(null)}>Cancel</button>
                        </td>
                      </tr>
                    )}
                    {data.map((row, i) => (
                      <tr key={i}>
                        {schema.map(c => (
                          <td key={c.column_name} style={{ padding: 8, border: `1px solid ${tk.bdr}` }}>
                            {editingRow?.id === row.id ? (
                              <input 
                                type="text" 
                                defaultValue={row[c.column_name]}
                                style={{ width: '100%', padding: 4, background: tk.bg, color: tk.tx, border: `1px solid ${tk.bdr}` }}
                                onChange={(e) => setEditingRow({ ...editingRow, [c.column_name]: e.target.value })}
                              />
                            ) : (
                              String(row[c.column_name] ?? '')
                            )}
                          </td>
                        ))}
                        <td style={{ padding: 8, border: `1px solid ${tk.bdr}`, whiteSpace: 'nowrap' }}>
                          {editingRow?.id === row.id ? (
                            <>
                              <button onClick={() => handleUpdate(row.id, editingRow)} style={{ marginRight: 4 }}>Save</button>
                              <button onClick={() => setEditingRow(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditingRow(row)} style={{ marginRight: 4 }}>Edit</button>
                              <button onClick={() => handleDelete(row.id)} style={{ color: 'red' }}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 100, color: tk.tx3 }}>
              Select a table from the left to manage its data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
