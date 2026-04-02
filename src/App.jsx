import * as API from "./api";
import { useState, useEffect, useCallback } from "react";
import { AppCtx, LIGHT, DARK } from "./context/AppCtx";
import { GlobalStyles } from "./styles/GlobalStyles";
import { Sidebar, Topbar, BottomNav } from "./layouts/Navigation";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// For other pages, we can either move them now or leave them as placeholders/stubs
// To be fully modular, we'd move Materials, Attendance, etc. 
// For now, I'll keep the main App structure and import what we've moved.

const DEF_ROLES = ["Mason","Carpenter","Electrician","Plumber","Helper","Supervisor","Driver","Other"];

export default function App() {
  const [theme, _setTheme] = useState(() => localStorage.getItem("sl_theme") || "light");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  const [mats, setMats] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [matLogs, setMatLogs] = useState([]);
  const [att, setAtt] = useState([]);
  const [exp, setExp] = useState([]);
  const [inv, setInv] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expCats, setExpCats] = useState([]);
  const roles = DEF_ROLES;

  const setTheme = useCallback(t => { _setTheme(t); localStorage.setItem("sl_theme", t); }, []);
  const tk = theme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    const token = API.getToken();
    if (!token) { setAppLoading(false); return; }
    API.getMe()
      .then(res => { setUser(res.user); })
      .catch(() => { API.clearToken(); })
      .finally(() => setAppLoading(false));
  }, []);

  const loadAllData = async () => {
    try {
      const [m, w, ml, a, e, i, v, t, ec] = await Promise.all([
        API.getMaterials(), API.getWorkers(), API.getMatLogs({}),
        API.getAttendance({}), API.getExpenses({}), API.getInvoices(),
        API.getVendors(), API.getTasks({}), API.getExpCats()
      ]);
      setMats(m.map(x=>({...x, min:x.min_stock, cost:x.unit_cost})));
      setWorkers(w.map(x=>({...x, rate:x.daily_rate})));
      setMatLogs(ml.map(x=>({...x, material: x.material_name, qty: x.quantity})));
      setAtt(a.map(x=>({...x, workerId: x.worker_id, name: x.worker_name, ot: x.ot_hours, total: x.total_wage})));
      setExp(e.map(x=>({...x, category: x.category_name, desc: x.description, vendor: x.vendor_name, paymentMode: x.payment_mode})));
      setInv(i.map(x=>({...x, vendor: x.vendor_name, desc: x.description, due: x.due_date})));
      setVendors(v.map(x=>({...x, cat: x.category, ph: x.phone, bal: x.balance})));
      setTasks(t.map(x=>({...x, assigned: x.worker_name, pri: x.priority})));
      setExpCats(ec.map(x=>x.name));
    } catch(err) { console.error("Data load error:", err); }
  };

  useEffect(() => {
    if (!user) return;
    loadAllData();
  }, [user]);

  if (appLoading) return null;
  if (!user) return (
    <AppCtx.Provider value={{ tk }}>
      <GlobalStyles tk={tk} />
      <Login onLogin={setUser} />
    </AppCtx.Provider>
  );

  const renderPage = () => {
    switch(page) {
      case "dashboard": return <Dashboard />;
      // Other pages can be added here as they are moved to separate files
      default: return <Dashboard />; 
    }
  };

  return (
    <AppCtx.Provider value={{
      tk, theme, setTheme, user, setUser, page, setPage,
      mats, setMats, workers, setWorkers, matLogs, setMatLogs,
      att, setAtt, exp, setExp, inv, setInv, vendors, setVendors,
      tasks, setTasks, expCats, setExpCats, roles
    }}>
      <GlobalStyles tk={tk} />
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:tk.bg }}>
        <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />
        <Topbar onMenuClick={() => setSideOpen(true)} />
        <main style={{ flex:1, overflowY:"auto", padding:"16px 14px 80px", position:"relative" }}>
          <div style={{ maxWidth:800, margin:"0 auto" }}>
            {renderPage()}
          </div>
        </main>
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100 }}>
          <BottomNav />
        </div>
      </div>
    </AppCtx.Provider>
  );
}
