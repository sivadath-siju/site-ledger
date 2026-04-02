const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

// Database file stored in the backend folder
const DB_PATH = path.join(__dirname, "siteledger.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL"); // better performance
    db.pragma("foreign_keys = ON");  // enforce relationships
  }
  return db;
}

function initDb() {
  const db = getDb();

  // ── USERS ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'Data Entry',
      initials    TEXT    NOT NULL DEFAULT 'XX',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── MATERIALS ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      unit        TEXT    NOT NULL DEFAULT 'units',
      stock       REAL    NOT NULL DEFAULT 0,
      min_stock   REAL    NOT NULL DEFAULT 10,
      unit_cost   REAL    NOT NULL DEFAULT 0,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── MATERIAL LOGS ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS material_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id),
      type        TEXT    NOT NULL CHECK(type IN ('in','out')),
      quantity    REAL    NOT NULL,
      note        TEXT,
      supplier    TEXT,
      logged_by   INTEGER NOT NULL REFERENCES users(id),
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── WORKERS ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'Helper',
      daily_rate  REAL    NOT NULL DEFAULT 500,
      phone       TEXT,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── ATTENDANCE ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id   INTEGER NOT NULL REFERENCES workers(id),
      date        TEXT    NOT NULL,
      status      TEXT    NOT NULL CHECK(status IN ('present','absent','half')),
      hours       REAL    NOT NULL DEFAULT 8,
      ot_hours    REAL    NOT NULL DEFAULT 0,
      ot_rate     REAL    NOT NULL DEFAULT 0,
      total_wage  REAL    NOT NULL DEFAULT 0,
      note        TEXT,
      logged_by   INTEGER NOT NULL REFERENCES users(id),
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── EXPENSE CATEGORIES ─────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      is_default  INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ── EXPENSES ───────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES expense_categories(id),
      amount      REAL    NOT NULL,
      description TEXT    NOT NULL,
      vendor_id   INTEGER REFERENCES vendors(id),
      payment_mode TEXT   NOT NULL DEFAULT 'Cash',
      date        TEXT    NOT NULL,
      logged_by   INTEGER NOT NULL REFERENCES users(id),
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── VENDORS ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL DEFAULT 'Other',
      phone       TEXT,
      balance     REAL    NOT NULL DEFAULT 0,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── INVOICES ───────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id   INTEGER NOT NULL REFERENCES vendors(id),
      description TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      due_date    TEXT,
      status      TEXT    NOT NULL DEFAULT 'Unpaid' CHECK(status IN ('Unpaid','Paid','Partially Paid')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── TASKS ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      assigned_to INTEGER REFERENCES workers(id),
      due_date    TEXT,
      priority    TEXT    NOT NULL DEFAULT 'Medium' CHECK(priority IN ('High','Medium','Low')),
      status      TEXT    NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Completed')),
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── DAILY LOGS ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL UNIQUE,
      notes       TEXT,
      weather     TEXT    DEFAULT 'Clear',
      safety      TEXT    DEFAULT 'All Clear',
      logged_by   INTEGER NOT NULL REFERENCES users(id),
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── SEED DATA (only if tables are empty) ───────────────────
  seedIfEmpty(db);

  console.log("✅ Database initialised at:", DB_PATH);
  return db;
}

function seedIfEmpty(db) {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount > 0) return; // already seeded

  console.log("🌱 Seeding database with initial data...");

  // Seed users
  const insertUser = db.prepare(
    "INSERT INTO users (username, password, name, role, initials) VALUES (?, ?, ?, ?, ?)"
  );
  const users = [
    ["admin",   bcrypt.hashSync("admin123",   10), "Rajesh Kumar",   "Administrator", "RK"],
    ["manager", bcrypt.hashSync("manager123", 10), "Suresh Menon",   "Site Manager",  "SM"],
    ["entry",   bcrypt.hashSync("entry123",   10), "Priya Nair",     "Data Entry",    "PN"],
    ["account", bcrypt.hashSync("account123", 10), "Arun Krishnan",  "Accountant",    "AK"],
  ];
  users.forEach(u => insertUser.run(...u));

  // Seed materials
  const insertMat = db.prepare(
    "INSERT INTO materials (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)"
  );
  [
    ["Cement",     "bags",    120,  50,  320],
    ["Steel Rods", "pieces",  85,   30,  150],
    ["Sand",       "cu.ft",   200,  80,  45 ],
    ["Bricks",     "pieces",  1500, 500, 12 ],
    ["Gravel",     "cu.ft",   150,  60,  55 ],
    ["Timber",     "pieces",  40,   20,  280],
    ["Paint",      "litres",  60,   20,  180],
  ].forEach(m => insertMat.run(...m));

  // Seed workers
  const insertWorker = db.prepare(
    "INSERT INTO workers (name, role, daily_rate, phone) VALUES (?, ?, ?, ?)"
  );
  [
    ["Mohammed Aslam", "Mason",       700, "9876543210"],
    ["Vinod Kumar",    "Carpenter",   800, "9876543211"],
    ["Santhosh T.",    "Helper",      500, "9876543212"],
    ["Rajan P.",       "Electrician", 900, "9876543213"],
    ["Babu Raj",       "Helper",      500, "9876543214"],
    ["Ajith Mohan",    "Plumber",     850, "9876543215"],
  ].forEach(w => insertWorker.run(...w));

  // Seed vendors
  const insertVendor = db.prepare(
    "INSERT INTO vendors (name, category, phone, balance) VALUES (?, ?, ?, ?)"
  );
  [
    ["Alappuzha Cement Works", "Materials",  "9800000001", 45000],
    ["KG Steel Suppliers",     "Materials",  "9800000002", 18000],
    ["Fast Transport Co.",     "Transport",  "9800000003", 8500 ],
    ["Power Electricals",      "Equipment",  "9800000004", 22000],
  ].forEach(v => insertVendor.run(...v));

  // Seed expense categories
  const insertCat = db.prepare(
    "INSERT INTO expense_categories (name, is_default) VALUES (?, ?)"
  );
  ["Materials","Equipment Rental","Transport","Subcontractor",
   "Food & Water","Safety Gear","Tools","Utilities","Miscellaneous"
  ].forEach((c, i) => insertCat.run(c, i < 5 ? 1 : 0));

  // Seed tasks
  const adminId = db.prepare("SELECT id FROM users WHERE username='admin'").get().id;
  const workers = db.prepare("SELECT id, name FROM workers").all();
  const insertTask = db.prepare(
    "INSERT INTO tasks (title, assigned_to, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  );
  [
    ["Foundation pour — Block A",  workers[0].id, "2026-04-05", "High",   "In Progress"],
    ["Shuttering — Column 3",       workers[1].id, "2026-04-03", "Medium", "Pending"    ],
    ["Electrical conduit install",  workers[3].id, "2026-04-08", "High",   "Pending"    ],
    ["Backfill north boundary",     workers[4].id, "2026-04-02", "Low",    "Completed"  ],
  ].forEach(t => insertTask.run(...t, adminId));

  console.log("✅ Seed data inserted.");
}

module.exports = { getDb, initDb };
