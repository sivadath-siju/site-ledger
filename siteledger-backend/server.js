require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { initDb } = require("./database");

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── MIDDLEWARE ── */
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

/* ── INIT DATABASE ── */
initDb();

/* ── ROUTES ── */
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/workers",   require("./routes/workers"));
app.use("/api/expenses",  require("./routes/expenses"));
app.use("/api/tasks",     require("./routes/tasks"));
app.use("/api/reports",   require("./routes/reports"));

/* ── HEALTH CHECK ── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* ── 404 HANDLER ── */
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

/* ── GLOBAL ERROR HANDLER ── */
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

/* ── START ── */
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   SiteLedger Backend                 ║
║   Running on http://localhost:${PORT}   ║
╚══════════════════════════════════════╝
  `);
});
