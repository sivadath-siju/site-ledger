const express = require("express");
const { getDb } = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ── WORKERS ── */

// GET /api/workers
router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  const workers = db.prepare(
    "SELECT * FROM workers WHERE active = 1 ORDER BY name"
  ).all();
  res.json(workers);
});

// POST /api/workers
router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { name, role, daily_rate, phone } = req.body;
  if (!name || !role) return res.status(400).json({ error: "Name and role required" });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO workers (name, role, daily_rate, phone) VALUES (?, ?, ?, ?)"
  ).run(name, role, daily_rate || 500, phone || null);

  res.status(201).json({ id: result.lastInsertRowid, name, role, daily_rate, phone });
});

// PATCH /api/workers/:id
router.patch("/:id", requireAuth, requireAdmin, (req, res) => {
  const { name, role, daily_rate, phone } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE workers SET name = COALESCE(?, name), role = COALESCE(?, role), daily_rate = COALESCE(?, daily_rate), phone = COALESCE(?, phone) WHERE id = ?"
  ).run(name, role, daily_rate, phone, req.params.id);
  res.json({ success: true });
});

// DELETE /api/workers/:id
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE workers SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

/* ── ATTENDANCE ── */

// GET /api/workers/attendance
router.get("/attendance", requireAuth, (req, res) => {
  const db = getDb();
  const { from, to, worker_id, date } = req.query;
  let sql = `
    SELECT a.*, w.name as worker_name, w.role as worker_role, u.name as logged_by_name
    FROM attendance a
    JOIN workers w ON a.worker_id = w.id
    JOIN users u ON a.logged_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (date)      { sql += " AND a.date = ?";            params.push(date); }
  if (from)      { sql += " AND a.date >= ?";           params.push(from); }
  if (to)        { sql += " AND a.date <= ?";           params.push(to); }
  if (worker_id) { sql += " AND a.worker_id = ?";       params.push(worker_id); }
  sql += " ORDER BY a.date DESC, a.logged_at DESC";
  res.json(db.prepare(sql).all(...params));
});

// POST /api/workers/attendance
router.post("/attendance", requireAuth, (req, res) => {
  const { worker_id, date, status, hours, ot_hours, note } = req.body;
  if (!worker_id || !date || !status)
    return res.status(400).json({ error: "worker_id, date and status required" });

  const db = getDb();
  const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(worker_id);
  if (!worker) return res.status(404).json({ error: "Worker not found" });

  const h     = parseFloat(hours) || 8;
  const ot    = parseFloat(ot_hours) || 0;
  const otRate = Math.round(worker.daily_rate / 8 * 1.5);
  const base  = status === "half" ? worker.daily_rate / 2
              : status === "present" ? worker.daily_rate : 0;
  const total = base + ot * otRate;

  const result = db.prepare(`
    INSERT INTO attendance (worker_id, date, status, hours, ot_hours, ot_rate, total_wage, note, logged_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(worker_id, date, status, h, ot, otRate, total, note || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, worker_id, date, status, hours: h, ot_hours: ot, ot_rate: otRate, total_wage: total });
});

// DELETE /api/workers/attendance/:id
router.delete("/attendance/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM attendance WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// GET /api/workers/summary — total wages per worker
router.get("/summary", requireAuth, (req, res) => {
  const db = getDb();
  const summary = db.prepare(`
    SELECT w.id, w.name, w.role, w.daily_rate, w.phone,
           COUNT(a.id) as days_worked,
           COALESCE(SUM(a.hours), 0) as total_hours,
           COALESCE(SUM(a.total_wage), 0) as total_wages
    FROM workers w
    LEFT JOIN attendance a ON w.id = a.worker_id
    WHERE w.active = 1
    GROUP BY w.id
    ORDER BY w.name
  `).all();
  res.json(summary);
});

module.exports = router;
