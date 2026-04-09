const BASE = (process.env.REACT_APP_API_URL || "http://localhost:5001/api").replace(/\/$/, "");
export const BASE_URL = BASE.replace(/\/api$/, "");
export const getToken   = () => localStorage.getItem("sl_token");
export const setToken   = t  => localStorage.setItem("sl_token", t);
export const clearToken = () => localStorage.removeItem("sl_token");
const normalizeTimestamp = value => {
  if (!value || typeof value !== "string") return value;
  if (value.includes("T")) return value;
  return `${value.replace(" ", "T")}Z`;
};
async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, ...options, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}
async function upload(path, formData) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
  return data;
}
const get  = p      => request(p);
const post = (p, b) => request(p, { method: "POST",  body: b });
const patch= (p, b) => request(p, { method: "PATCH", body: b });
const put  = (p, b) => request(p, { method: "PUT",   body: b });
const del  = p      => request(p, { method: "DELETE" });
async function prepareBillFile(file) {
  if (!file?.type?.startsWith("image/")) return file;
  const { compressUploadImage } = await import("./utils/uploadCompression");
  return compressUploadImage(file);
}
export const login=       (u,p)=>post("/auth/login",{username:u,password:p});
export const getMe=       ()   =>get("/auth/me");
export const getUsers=    ()   =>get("/auth/users");
export const createUser=  d    =>post("/auth/users",d);
export const deleteUser=  id   =>del(`/auth/users/${id}`);
export const getMaterials=      ()     =>get("/materials");
export const addMaterial=       d      =>post("/materials",d);
export const updateMaterial=    (id,d) =>patch(`/materials/${id}`,d);
export const deleteMaterial=    id     =>del(`/materials/${id}`);
export const getMatLogs=        p      =>get(`/materials/logs?${new URLSearchParams(p)}`);
export const recordMatMovement= d      =>post("/materials/log",d);
export const getWorkers=              ()     =>get("/workers");
export const addWorker=               d      =>post("/workers",d);
export const updateWorker=            (id,d) =>patch(`/workers/${id}`,d);
export const deleteWorker=            id     =>del(`/workers/${id}`);
export const getWorkerSummary=        ()     =>get("/workers/summary");
export const getWorkerCategoryTotals= ()     =>get("/workers/category-totals");
export const getAttendance=   p      =>get(`/workers/attendance?${new URLSearchParams(p)}`);
export const recordAttendance=d      =>post("/workers/attendance",d);
export const patchAttendance= (id,d) =>patch(`/workers/attendance/${id}`,d);
export const deleteAttendance=id     =>del(`/workers/attendance/${id}`);
export const getSubcontractors=      ()     =>get("/subcontractors");
export const getSubcontractor=       id     =>get(`/subcontractors/${id}`);
export const addSubcontractor=       d      =>post("/subcontractors",d);
export const updateSubcontractor=    (id,d) =>patch(`/subcontractors/${id}`,d);
export const deleteSubcontractor=    id     =>del(`/subcontractors/${id}`);
export const getSubcontractorAtt=    (id,p) =>get(`/subcontractors/${id}/attendance?${new URLSearchParams(p)}`);
export const getSubcontractorTotals= ()     =>get("/subcontractors/totals/summary");
export const getExpenses=  p  =>get(`/expenses?${new URLSearchParams(p)}`);
export const addExpense=   d  =>post("/expenses",d);
export const deleteExpense=id =>del(`/expenses/${id}`);
export const getExpCats=   () =>get("/expenses/categories");
export const addExpCat=    n  =>post("/expenses/categories",{name:n});
export const deleteExpCat= id =>del(`/expenses/categories/${id}`);
export const uploadExpenseBill=async(id,f)=>{const fd=new FormData();fd.append("bill",await prepareBillFile(f));return upload(`/expenses/${id}/bill`,fd);};
export const uploadInvoiceBill=async(id,f)=>{const fd=new FormData();fd.append("bill",await prepareBillFile(f));return upload(`/expenses/invoices/${id}/bill`,fd);};
export const billUrl=fn=>fn?`${BASE_URL}/uploads/bills/${fn}`:null;
export const openBillFile = (filename) => {
  const url = billUrl(filename);
  if (!url || typeof window === "undefined") return;
  const popup = window.open(url, "_blank");
  if (popup) {
    try {
      popup.opener = null;
    } catch {}
    return;
  }
  window.location.assign(url);
};
export const getVendors=   ()     =>get("/expenses/vendors");
export const addVendor=    d      =>post("/expenses/vendors",d);
export const updateVendor= (id,d) =>patch(`/expenses/vendors/${id}`,d);
export const deleteVendor= id     =>del(`/expenses/vendors/${id}`);
export const getInvoices=   ()     =>get("/expenses/invoices");
export const addInvoice=    d      =>post("/expenses/invoices",d);
export const updateInvoice= (id,d) =>patch(`/expenses/invoices/${id}`,d);
export const deleteInvoice= id     =>del(`/expenses/invoices/${id}`);
export const getPayments=  id      =>get(`/expenses/invoices/${id}/payments`);
export const addPayment=   (id,d)  =>post(`/expenses/invoices/${id}/payments`,d);
export const deletePayment=(id,pid)=>del(`/expenses/invoices/${id}/payments/${pid}`);
export const getTasks=  p     =>get(`/tasks?${new URLSearchParams(p)}`);
export const addTask=   d     =>post("/tasks",d);
export const updateTask=(id,d)=>patch(`/tasks/${id}`,d);
export const deleteTask=id    =>del(`/tasks/${id}`);
export const getDailyLog=   date=>get(`/tasks/logs?date=${date}`);
export const saveDailyLog=  d   =>put("/tasks/logs",d);
export const getAllDailyLogs=()  =>get("/tasks/logs/all");
// SITE PHOTOS
export const getSitePhotos=  async date => {
  const photos = await get(`/tasks/photos?date=${date}`);
  return Array.isArray(photos) ? photos.map(photo => ({ ...photo, logged_at: normalizeTimestamp(photo.logged_at) })) : [];
};
export const uploadSitePhoto=(date,f,cap)=>{const fd=new FormData();fd.append("photo",f);fd.append("date",date);if(cap)fd.append("caption",cap);return upload("/tasks/photos",fd);};
export const deleteSitePhoto=id=>del(`/tasks/photos/${id}`);
export const photoUrl = (p) => {
  if (!p) return null;
  if (typeof p === "string") return `${BASE_URL}/uploads/daily_logs/${p}`;
  const fn = p.filename || p.file_path;
  const path = p.url || (fn ? `/uploads/daily_logs/${fn}` : null);
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
// REPORTS — all accept optional {from,to} params
export const getReportSummary= ()      =>get("/reports/summary");
export const getDailyReport=   d       =>get(`/reports/daily?date=${d}`);
export const getGrandTotals=   (p={})  =>get(`/reports/grand-totals?${new URLSearchParams(p)}`);
export const getBalanceSheet=  (p={})  =>get(`/reports/balance-sheet?${new URLSearchParams(p)}`);
export const getVendorLedger=  (id,p={})=>get(`/reports/vendor-ledger/${id}?${new URLSearchParams(p)}`);
export const getLabourLedger=  (p={})  =>get(`/reports/labour-ledger?${new URLSearchParams(p)}`);
