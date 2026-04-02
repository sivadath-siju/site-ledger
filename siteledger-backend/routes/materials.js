const express = require("express");
const { getDb } = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/materials — get all materials
router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  const mats = db.prepare(
    "SELECT * FROM materials WHERE active = 1 ORDER BY name"
  ).all();
  res.json(mats);
});

// POST /api/materials — add new material (admin/manager)
router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { name, unit, stock, min_stock, unit_cost } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO materials (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)"
  ).run(name, unit || "units", stock || 0, min_stock || 10, unit_cost || 0);

  res.status(201).json({ id: result.lastInsertRowid, name, unit, stock, min_stock, unit_cost });
});

// PATCH /api/materials/:id — update material details
router.patch("/:id", requireAuth, requireAdmin, (req, res) => {
  const { name, unit, min_stock, unit_cost } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE materials SET name = COALESCE(?, name), unit = COALESCE(?, unit), min_stock = COALESCE(?, min_stock), unit_cost = COALESCE(?, unit_cost) WHERE id = ?"
  ).run(name, unit, min_stock, unit_cost, req.params.id);
  res.json({ success: true });
});

// DELETE /api/materials/:id — soft delete
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE materials SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// GET /api/materials/logs — all transaction logs
router.get("/logs", requireAuth, (req, res) => {
  const db = getDb();
  const { from, to, material_id } = req.query;
  let sql = `
    SELECT ml.*, m.name as material_name, m.unit, u.name as logged_by_name
    FROM material_logs ml
    JOIN materials m ON ml.material_id = m.id
    JOIN users u ON ml.logged_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (from)        { sql += " AND date(ml.logged_at) >= ?"; params.push(from); }
  if (to)          { sql += " AND date(ml.logged_at) <= ?"; params.push(to); }
  if (material_id) { sql += " AND ml.material_id = ?";      params.push(material_id); }
  sql += " ORDER BY ml.logged_at DESC";
  res.json(db.prepare(sql).all(...params));
});

// POST /api/materials/log — record stock movement
router.post("/log", requireAuth, (req, res) => {
  const { material_id, type, quantity, note, supplier } = req.body;

  if (!material_id || !type || !quantity)
    return res.status(400).json({ error: "material_id, type and quantity required" });
  if (!["in", "out"].includes(type))
    return res.status(400).json({ error: "type must be 'in' or 'out'" });

  const db = getDb();
  const mat = db.prepare("SELECT * FROM materials WHERE id = ?").get(material_id);
  if (!mat) return res.status(404).json({ error: "Material not found" });
  if (type === "out" && quantity > mat.stock)
    return res.status(400).json({ error: `Insufficient stock. Available: ${mat.stock} ${mat.unit}` });

  // Update stock and insert log in a transaction
  const transaction = db.transaction(() => {
    const newStock = type === "in" ? mat.stock + quantity : mat.stock - quantity;
    db.prepare("UPDATE materials SET stock = ? WHERE id = ?").run(newStock, material_id);
    const result = db.prepare(
      "INSERT INTO material_logs (material_id, type, quantity, note, supplier, logged_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(material_id, type, quantity, note || null, supplier || null, req.user.id);
    return { logId: result.lastInsertRowid, newStock };
  });

  const { logId, newStock } = transaction();
  res.status(201).json({ id: logId, material_id, type, quantity, newStock });
});

module.exports = router;
