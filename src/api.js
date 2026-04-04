const BASE = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export const getToken   = () => localStorage.getItem("sl_token");
export const setToken   = t  => localStorage.setItem("sl_token", t);
export const clearToken = () => localStorage.removeItem("sl_token");

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
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

const get  = path       => request(path);
const post = (path, b)  => request(path, { method: "POST",   body: b });
const patch= (path, b)  => request(path, { method: "PATCH",  body: b });
const put  = (path, b)  => request(path, { method: "PUT",    body: b });
const del  = path       => request(path, { method: "DELETE" });

// AUTH
export const login      = (u, p) => post("/auth/login", { username: u, password: p });
export const getMe      = ()     => get("/auth/me");
export const getUsers   = ()     => get("/auth/users");
export const createUser = d      => post("/auth/users", d);
export const deleteUser = id     => del(`/auth/users/${id}`);

// MATERIALS
export const getMaterials      = ()      => get("/materials");
export const addMaterial       = d       => post("/materials", d);
export const updateMaterial    = (id, d) => patch(`/materials/${id}`, d);
export const deleteMaterial    = id      => del(`/materials/${id}`);
export const getMatLogs        = p       => get(`/materials/logs?${new URLSearchParams(p)}`);
export const recordMatMovement = d       => post("/materials/log", d);

// WORKERS
export const getWorkers            = ()      => get("/workers");
export const addWorker             = d       => post("/workers", d);
export const updateWorker          = (id, d) => patch(`/workers/${id}`, d);
export const deleteWorker          = id      => del(`/workers/${id}`);
export const getWorkerSummary      = ()      => get("/workers/summary");
export const getWorkerCategoryTotals = ()   => get("/workers/category-totals");

// ATTENDANCE
export const getAttendance    = p  => get(`/workers/attendance?${new URLSearchParams(p)}`);
export const recordAttendance = d  => post("/workers/attendance", d);
export const deleteAttendance = id => del(`/workers/attendance/${id}`);

// EXPENSES
export const getExpenses   = p  => get(`/expenses?${new URLSearchParams(p)}`);
export const addExpense    = d  => post("/expenses", d);
export const deleteExpense = id => del(`/expenses/${id}`);
export const getExpCats    = () => get("/expenses/categories");
export const addExpCat     = name  => post("/expenses/categories", { name });
export const deleteExpCat  = id    => del(`/expenses/categories/${id}`);

// VENDORS
export const getVendors   = ()      => get("/expenses/vendors");
export const addVendor    = d       => post("/expenses/vendors", d);
export const updateVendor = (id, d) => patch(`/expenses/vendors/${id}`, d);
export const deleteVendor = id      => del(`/expenses/vendors/${id}`);

// INVOICES
export const getInvoices   = ()      => get("/expenses/invoices");
export const addInvoice    = d       => post("/expenses/invoices", d);
export const updateInvoice = (id, d) => patch(`/expenses/invoices/${id}`, d);
export const deleteInvoice = id      => del(`/expenses/invoices/${id}`);

// PAYMENTS
export const getPayments   = invoiceId        => get(`/expenses/invoices/${invoiceId}/payments`);
export const addPayment    = (invoiceId, d)   => post(`/expenses/invoices/${invoiceId}/payments`, d);
export const deletePayment = (invoiceId, pid) => del(`/expenses/invoices/${invoiceId}/payments/${pid}`);

// TASKS
export const getTasks   = p       => get(`/tasks?${new URLSearchParams(p)}`);
export const addTask    = d       => post("/tasks", d);
export const updateTask = (id, d) => patch(`/tasks/${id}`, d);
export const deleteTask = id      => del(`/tasks/${id}`);

// DAILY LOGS
export const getDailyLog    = date => get(`/tasks/logs?date=${date}`);
export const saveDailyLog   = d    => put("/tasks/logs", d);
export const getAllDailyLogs = ()   => get("/tasks/logs/all");

// REPORTS
export const getReportSummary = () => get("/reports/summary");
export const getDailyReport   = d  => get(`/reports/daily?date=${d}`);
export const getBalanceSheet  = p  => get(`/reports/balance-sheet?${new URLSearchParams(p)}`);
export const getVendorLedger  = id => get(`/reports/vendor-ledger/${id}`);
