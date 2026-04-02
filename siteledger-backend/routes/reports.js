const express = require("express");
const { getDb } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports/summary — overall project summary
router.get("/summary", requireAuth, (req, res) => {
  const db = getDb();

  const totalLabour = db.prepare(
    "SELECT COALESCE(SUM(total_wage), 0) as total FROM attendance"
  ).get().total;

  const totalExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses"
  ).get().total;

  const expensesByCategory = db.prepare(`
    SELECT ec.name as category, COALESCE(SUM(e.amount), 0) as total
    FROM expense_categories ec
    LEFT JOIN expenses e ON ec.id = e.category_id
    GROUP BY ec.id
    ORDER BY total DESC
  `).all();

  const labourByRole = db.prepare(`
    SELECT w.role, COUNT(a.id) as records,
           COALESCE(SUM(a.hours), 0) as total_hours,
           COALESCE(SUM(a.total_wage), 0) as total_wages
    FROM workers w
    LEFT JOIN attendance a ON w.id = a.worker_id
    WHERE w.active = 1
    GROUP BY w.role
    ORDER BY total_wages DESC
  `).all();

  const stockValuation = db.prepare(`
    SELECT name, unit, stock, min_stock, unit_cost,
           (stock * unit_cost) as stock_value,
           CASE
             WHEN stock <= min_stock THEN 'Low'
             WHEN stock <= min_stock * 1.5 THEN 'Caution'
             ELSE 'Good'
           END as status
    FROM materials WHERE active = 1 ORDER BY name
  `).all();

  const unpaidInvoices = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM invoices WHERE status = 'Unpaid'"
  ).get();

  const pendingTasks = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed'"
  ).get().count;

  const lowStockItems = db.prepare(
    "SELECT COUNT(*) as count FROM materials WHERE active = 1 AND stock <= min_stock"
  ).get().count;

  res.json({
    totalLabour,
    totalExpenses,
    grandTotal: totalLabour + totalExpenses,
    expensesByCategory,
    labourByRole,
    stockValuation,
    unpaidInvoices,
    pendingTasks,
    lowStockItems,
  });
});

// GET /api/reports/daily?date=YYYY-MM-DD
router.get("/daily", requireAuth, (req, res) => {
  const db = getDb();
  const { date } = req.query;
  const d = date || new Date().toISOString().split("T")[0];

  const labour = db.prepare(`
    SELECT a.*, w.name as worker_name, w.role
    FROM attendance a JOIN workers w ON a.worker_id = w.id
    WHERE a.date = ?
  `).all(d);

  const expenses = db.prepare(`
    SELECT e.*, ec.name as category_name, v.name as vendor_name
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    LEFT JOIN vendors v ON e.vendor_id = v.id
    WHERE e.date = ?
  `).all(d);

  const log = db.prepare("SELECT * FROM daily_logs WHERE date = ?").get(d);

  res.json({
    date: d,
    labour,
    expenses,
    log,
    totalLabour: labour.reduce((s, a) => s + a.total_wage, 0),
    totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
  });
});

module.exports = router;
