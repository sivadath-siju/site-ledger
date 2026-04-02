const express = require("express");
const { getDb } = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ── TASKS ── */

router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = `
    SELECT t.*, w.name as assigned_name, u.name as created_by_name
    FROM tasks t
    LEFT JOIN workers w ON t.assigned_to = w.id
    JOIN users u ON t.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += " AND t.status = ?"; params.push(status); }
  sql += " ORDER BY t.created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

router.post("/", requireAuth, (req, res) => {
  const { title, assigned_to, due_date, priority } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO tasks (title, assigned_to, due_date, priority, created_by) VALUES (?, ?, ?, ?, ?)"
  ).run(title, assigned_to || null, due_date || null, priority || "Medium", req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, title, priority, status: "Pending" });
});

router.patch("/:id", requireAuth, (req, res) => {
  const { status, title, assigned_to, due_date, priority } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE tasks SET
      status      = COALESCE(?, status),
      title       = COALESCE(?, title),
      assigned_to = COALESCE(?, assigned_to),
      due_date    = COALESCE(?, due_date),
      priority    = COALESCE(?, priority)
    WHERE id = ?
  `).run(status, title, assigned_to, due_date, priority, req.params.id);
  res.json({ success: true });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ── DAILY LOGS ── */

router.get("/logs", requireAuth, (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT dl.*, u.name as logged_by_name
    FROM daily_logs dl
    JOIN users u ON dl.logged_by = u.id
    ORDER BY dl.date DESC
    LIMIT 30
  `).all();
  res.json(logs);
});

router.post("/logs", requireAuth, (req, res) => {
  const { date, notes, weather, safety } = req.body;
  if (!date) return res.status(400).json({ error: "Date required" });

  const db = getDb();
  // Upsert — if log for this date exists, update it
  const existing = db.prepare("SELECT id FROM daily_logs WHERE date = ?").get(date);
  if (existing) {
    db.prepare(
      "UPDATE daily_logs SET notes = ?, weather = ?, safety = ?, logged_by = ?, logged_at = datetime('now') WHERE date = ?"
    ).run(notes || null, weather || "Clear", safety || "All Clear", req.user.id, date);
    res.json({ id: existing.id, updated: true });
  } else {
    const result = db.prepare(
      "INSERT INTO daily_logs (date, notes, weather, safety, logged_by) VALUES (?, ?, ?, ?, ?)"
    ).run(date, notes || null, weather || "Clear", safety || "All Clear", req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, created: true });
  }
});

module.exports = router;
