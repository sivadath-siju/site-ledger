const express = require("express");
const { getDb } = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ── EXPENSE CATEGORIES ── */

router.get("/categories", requireAuth, (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM expense_categories ORDER BY name").all());
});

router.post("/categories", requireAuth, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const db = getDb();
  const exists = db.prepare("SELECT id FROM expense_categories WHERE name = ?").get(name);
  if (exists) return res.status(409).json({ error: "Category already exists" });
  const result = db.prepare("INSERT INTO expense_categories (name) VALUES (?)").run(name);
  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.delete("/categories/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const cat = db.prepare("SELECT * FROM expense_categories WHERE id = ?").get(req.params.id);
  if (cat?.is_default) return res.status(400).json({ error: "Cannot delete a default category" });
  db.prepare("DELETE FROM expense_categories WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ── EXPENSES ── */

router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  const { from, to, category_id } = req.query;
  let sql = `
    SELECT e.*, ec.name as category_name, v.name as vendor_name, u.name as logged_by_name
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    LEFT JOIN vendors v ON e.vendor_id = v.id
    JOIN users u ON e.logged_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (from)        { sql += " AND e.date >= ?";         params.push(from); }
  if (to)          { sql += " AND e.date <= ?";         params.push(to); }
  if (category_id) { sql += " AND e.category_id = ?";  params.push(category_id); }
  sql += " ORDER BY e.date DESC, e.logged_at DESC";
  res.json(db.prepare(sql).all(...params));
});

router.post("/", requireAuth, (req, res) => {
  const { category_id, amount, description, vendor_id, payment_mode, date } = req.body;
  if (!category_id || !amount || !description || !date)
    return res.status(400).json({ error: "category_id, amount, description and date required" });
  if (amount <= 0)
    return res.status(400).json({ error: "Amount must be greater than 0" });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO expenses (category_id, amount, description, vendor_id, payment_mode, date, logged_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(category_id, amount, description, vendor_id || null, payment_mode || "Cash", date, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ── VENDORS ── */

router.get("/vendors", requireAuth, (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM vendors WHERE active = 1 ORDER BY name").all());
});

router.post("/vendors", requireAuth, requireAdmin, (req, res) => {
  const { name, category, phone, balance } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO vendors (name, category, phone, balance) VALUES (?, ?, ?, ?)"
  ).run(name, category || "Other", phone || null, balance || 0);
  res.status(201).json({ id: result.lastInsertRowid, name, category, phone, balance });
});

router.patch("/vendors/:id", requireAuth, requireAdmin, (req, res) => {
  const { name, category, phone, balance } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE vendors SET name = COALESCE(?, name), category = COALESCE(?, category), phone = COALESCE(?, phone), balance = COALESCE(?, balance) WHERE id = ?"
  ).run(name, category, phone, balance, req.params.id);
  res.json({ success: true });
});

router.delete("/vendors/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE vendors SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ── INVOICES ── */

router.get("/invoices", requireAuth, (req, res) => {
  const db = getDb();
  const invoices = db.prepare(`
    SELECT i.*, v.name as vendor_name
    FROM invoices i
    JOIN vendors v ON i.vendor_id = v.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(invoices);
});

router.post("/invoices", requireAuth, (req, res) => {
  const { vendor_id, description, amount, due_date, status } = req.body;
  if (!vendor_id || !description || !amount)
    return res.status(400).json({ error: "vendor_id, description and amount required" });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO invoices (vendor_id, description, amount, due_date, status) VALUES (?, ?, ?, ?, ?)"
  ).run(vendor_id, description, amount, due_date || null, status || "Unpaid");

  res.status(201).json({ id: result.lastInsertRowid });
});

router.patch("/invoices/:id", requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body;
  const db = getDb();
  db.prepare("UPDATE invoices SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

router.delete("/invoices/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
