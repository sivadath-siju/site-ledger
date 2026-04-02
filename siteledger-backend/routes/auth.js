const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  const db = getDb();
  const user = db.prepare(
    "SELECT * FROM users WHERE username = ? AND active = 1"
  ).get(username);

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid username or password" });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, ini: user.initials },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, ini: user.initials }
  });
});

// GET /api/auth/me — verify token and return user
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users — list all users (admin only)
router.get("/users", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    "SELECT id, username, name, role, initials, active, created_at FROM users"
  ).all();
  res.json(users);
});

// POST /api/auth/users — create new user (admin only)
router.post("/users", requireAuth, requireAdmin, (req, res) => {
  const { username, password, name, role, initials } = req.body;
  if (!username || !password || !name || !role)
    return res.status(400).json({ error: "All fields required" });

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exists) return res.status(409).json({ error: "Username already taken" });

  const hash = bcrypt.hashSync(password, 10);
  const ini = initials || name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const result = db.prepare(
    "INSERT INTO users (username, password, name, role, initials) VALUES (?, ?, ?, ?, ?)"
  ).run(username, hash, name, role, ini);

  res.status(201).json({ id: result.lastInsertRowid, username, name, role, ini });
});

// PATCH /api/auth/users/:id/password — change password
router.patch("/users/:id/password", requireAuth, requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.params.id);
  res.json({ success: true });
});

// DELETE /api/auth/users/:id — deactivate user
router.delete("/users/:id", requireAuth, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
