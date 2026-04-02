/* ════════════════════════════════════════════════
   api.js — Drop this in your React src/ folder
   All backend calls go through here
════════════════════════════════════════════════ */

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// ── TOKEN MANAGEMENT ────────────────────────────
export const getToken = () => localStorage.getItem("sl_token");
export const setToken = (t) => localStorage.setItem("sl_token", t);
export const clearToken = () => localStorage.removeItem("sl_token");

// ── BASE FETCH ──────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

const get    = (path)         => request(path);
const post   = (path, body)   => request(path, { method: "POST",   body });
const patch  = (path, body)   => request(path, { method: "PATCH",  body });
const del    = (path)         => request(path, { method: "DELETE" });

// ── AUTH ────────────────────────────────────────
export const login   = (username, password) => post("/auth/login", { username, password });
export const getMe   = ()                   => get("/auth/me");
export const getUsers = ()                  => get("/auth/users");
export const createUser = (data)            => post("/auth/users", data);
export const deleteUser = (id)              => del(`/auth/users/${id}`);

// ── MATERIALS ───────────────────────────────────
export const getMaterials    = ()          => get("/materials");
export const addMaterial     = (data)      => post("/materials", data);
export const updateMaterial  = (id, data)  => patch(`/materials/${id}`, data);
export const deleteMaterial  = (id)        => del(`/materials/${id}`);
export const getMatLogs      = (params)    => get(`/materials/logs?${new URLSearchParams(params)}`);
export const recordMatMovement = (data)    => post("/materials/log", data);

// ── WORKERS ─────────────────────────────────────
export const getWorkers       = ()         => get("/workers");
export const addWorker        = (data)     => post("/workers", data);
export const updateWorker     = (id, data) => patch(`/workers/${id}`, data);
export const deleteWorker     = (id)       => del(`/workers/${id}`);
export const getWorkerSummary = ()         => get("/workers/summary");

// ── ATTENDANCE ──────────────────────────────────
export const getAttendance    = (params)   => get(`/workers/attendance?${new URLSearchParams(params)}`);
export const recordAttendance = (data)     => post("/workers/attendance", data);
export const deleteAttendance = (id)       => del(`/workers/attendance/${id}`);

// ── EXPENSES ────────────────────────────────────
export const getExpenses     = (params)    => get(`/expenses?${new URLSearchParams(params)}`);
export const addExpense      = (data)      => post("/expenses", data);
export const deleteExpense   = (id)        => del(`/expenses/${id}`);
export const getExpCats      = ()          => get("/expenses/categories");
export const addExpCat       = (name)      => post("/expenses/categories", { name });
export const deleteExpCat    = (id)        => del(`/expenses/categories/${id}`);

// ── VENDORS ─────────────────────────────────────
export const getVendors      = ()          => get("/expenses/vendors");
export const addVendor       = (data)      => post("/expenses/vendors", data);
export const updateVendor    = (id, data)  => patch(`/expenses/vendors/${id}`, data);
export const deleteVendor    = (id)        => del(`/expenses/vendors/${id}`);

// ── INVOICES ────────────────────────────────────
export const getInvoices     = ()          => get("/expenses/invoices");
export const addInvoice      = (data)      => post("/expenses/invoices", data);
export const updateInvoice   = (id, data)  => patch(`/expenses/invoices/${id}`, data);
export const deleteInvoice   = (id)        => del(`/expenses/invoices/${id}`);

// ── TASKS ───────────────────────────────────────
export const getTasks        = (params)    => get(`/tasks?${new URLSearchParams(params)}`);
export const addTask         = (data)      => post("/tasks", data);
export const updateTask      = (id, data)  => patch(`/tasks/${id}`, data);
export const deleteTask      = (id)        => del(`/tasks/${id}`);
export const getDailyLogs    = ()          => get("/tasks/logs");
export const saveDailyLog    = (data)      => post("/tasks/logs", data);

// ── REPORTS ─────────────────────────────────────
export const getReportSummary = ()         => get("/reports/summary");
export const getDailyReport   = (date)     => get(`/reports/daily?date=${date}`);
