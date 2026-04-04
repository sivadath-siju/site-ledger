import * as API from "./api";
import { useState, useEffect, useCallback } from "react";
import { AppCtx, LIGHT, DARK, ROLES, LABOUR_CATEGORIES } from "./context/AppCtx";
import { GlobalStyles } from "./styles/GlobalStyles";
import { Sidebar, Topbar, BottomNav } from "./layouts/Navigation";
import Dashboard    from "./pages/Dashboard";
import Login        from "./pages/Login";
import Materials    from "./pages/Materials";
import Attendance   from "./pages/Attendance";
import Expenses     from "./pages/Expenses";
import Tasks        from "./pages/Tasks";
import Invoices     from "./pages/Invoices";
import Vendors      from "./pages/Vendors";
import Reports      from "./pages/Reports";
import BalanceSheet from "./pages/BalanceSheet";
import Workflow     from "./pages/Workflow";
import Settings     from "./pages/Settings";

const DESKTOP = 768;

// Roles with full financial access
const FINANCE_ROLES = ["Administrator", "Site Owner", "Site Manager", "Accountant"];
export const canViewFinance = (role) => FINANCE_ROLES.includes(role);

const PAGE_LABELS = {
  dashboard: "Dashboard", materials: "Materials", attendance: "Labour & Attendance",
  expenses: "Expenses", tasks: "Task Tracker", invoices: "Invoices & Payables",
  vendors: "Vendors", reports: "Reports", balancesheet: "Balance Sheet",
  workflow: "Daily Workflow", settings: "Settings",
};

export default function App() {
  const [theme, _setTheme]  = useState(() => localStorage.getItem("sl_theme") || "light");
  const [user,  setUser]    = useState(null);
  const [page,  setPage]    = useState("dashboard");
  const [sideOpen, setSideOpen]   = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [isDesktop, setIsDesktop]   = useState(() => window.innerWidth >= DESKTOP);

  const [mats,    setMats]    = useState([]);
  const [workers, setWorkers] = useState([]);
  const [matLogs, setMatLogs] = useState([]);
  const [att,     setAtt]     = useState([]);
  const [exp,     setExp]     = useState([]);
  const [inv,     setInv]     = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [expCats, setExpCats] = useState([]);

  const roles = ROLES;
  const labourCategories = LABOUR_CATEGORIES;

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= DESKTOP);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const setTheme = useCallback(t => { _setTheme(t); localStorage.setItem("sl_theme", t); }, []);
  const tk = theme === "dark" ? DARK : LIGHT;

  useEffect(() => {
    const token = API.getToken();
    if (!token) { setAppLoading(false); return; }
    API.getMe().then(r => setUser(r.user)).catch(() => API.clearToken()).finally(() => setAppLoading(false));
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [m, w, ml, a, e, i, v, t, ec] = await Promise.all([
        API.getMaterials(), API.getWorkers(), API.getMatLogs({}),
        API.getAttendance({}), API.getExpenses({}), API.getInvoices(),
        API.getVendors(), API.getTasks({}), API.getExpCats(),
      ]);
      setMats(m.map(x => ({ ...x, min: x.min_stock, cost: x.unit_cost })));
      setWorkers(w.map(x => ({ ...x, rate: x.daily_rate })));
      setMatLogs(ml.map(x => ({ ...x, material: x.material_name, qty: x.quantity })));
      setAtt(a.map(x => ({ ...x, workerId: x.worker_id, name: x.worker_name, role: x.worker_role, ot: x.ot_hours, total: x.total_wage, isSubcontract: !!x.is_subcontract })));
      setExp(e.map(x => ({ ...x, category: x.category_name, desc: x.description, vendor: x.vendor_name, paymentMode: x.payment_mode })));
      setInv(i.map(x => ({ ...x, vendor: x.vendor_name, desc: x.description, due: x.due_date, paid: x.amount_paid || 0 })));
      setVendors(v.map(x => ({ ...x, cat: x.category, ph: x.phone, bal: x.invoice_outstanding || x.balance || 0, expTotal: x.expense_total || 0 })));
      setTasks(t.map(x => ({ ...x, assigned: x.worker_name, pri: x.priority })));
      setExpCats(ec.map(x => x.name));
    } catch (err) { console.error("Data load error:", err); }
  }, []);

  useEffect(() => { if (user) loadAllData(); }, [user, loadAllData]);

  if (appLoading) return null;

  if (!user) return (
    <AppCtx.Provider value={{ tk }}>
      <GlobalStyles tk={tk} isDesktop={false} />
      <Login onLogin={setUser} />
    </AppCtx.Provider>
  );

  // Guard: redirect Site Engineer away from balance sheet
  const hasFinance = canViewFinance(user.role);
  const safePage   = (!hasFinance && page === "balancesheet") ? "dashboard" : page;

  const renderPage = () => {
    switch (safePage) {
      case "dashboard":    return <Dashboard />;
      case "materials":    return <Materials />;
      case "attendance":   return <Attendance />;
      case "expenses":     return <Expenses />;
      case "tasks":        return <Tasks />;
      case "invoices":     return <Invoices />;
      case "vendors":      return <Vendors />;
      case "reports":      return <Reports />;
      case "balancesheet": return hasFinance ? <BalanceSheet /> : <Dashboard />;
      case "workflow":     return <Workflow />;
      case "settings":     return <Settings />;
      default:             return <Dashboard />;
    }
  };

  const mobileBottomPad = "calc(62px + env(safe-area-inset-bottom, 16px) + 8px)";

  return (
    <AppCtx.Provider value={{
      tk, theme, setTheme, user, setUser, page: safePage, setPage,
      mats, setMats, workers, setWorkers, matLogs, setMatLogs,
      att, setAtt, exp, setExp, inv, setInv,
      vendors, setVendors, tasks, setTasks,
      expCats, setExpCats, roles, labourCategories,
      loadAllData, isDesktop, hasFinance,
    }}>
      <GlobalStyles tk={tk} isDesktop={isDesktop} />

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: tk.bg }}>
        {isDesktop && <Sidebar open desktop />}
        {!isDesktop && <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {!isDesktop && <Topbar onMenuClick={() => setSideOpen(true)} />}
          {isDesktop  && <DesktopTopbar tk={tk} user={user} page={safePage} />}

          <main style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            padding: isDesktop ? "24px 32px 40px" : `14px 12px ${mobileBottomPad}`,
          }}>
            <div style={{ maxWidth: isDesktop ? 1100 : 800, margin: "0 auto" }}>
              {renderPage()}
            </div>
          </main>

          {!isDesktop && (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
              <BottomNav />
            </div>
          )}
        </div>
      </div>
    </AppCtx.Provider>
  );
}

function DesktopTopbar({ tk, user, page }) {
  return (
    <div style={{ height: 54, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 32px", borderBottom: `1px solid ${tk.bdr}`, background: tk.surf }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.2px" }}>{PAGE_LABELS[page] || "Ciel Homes"}</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx }}>{user?.name}</div>
          <div style={{ fontSize: 10, color: tk.tx3 }}>{user?.role}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: tk.acc, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {user?.ini || "U"}
        </div>
      </div>
    </div>
  );
}
