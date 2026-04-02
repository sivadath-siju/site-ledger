#!/usr/bin/env node
/**
 * SiteLedger — Daily Backup Script
 * Run this manually or set it up as a scheduled task
 *
 * On Windows: Task Scheduler → run "node backup.js" daily
 * On Mac/Linux: crontab -e → add: 0 2 * * * node /path/to/backup.js
 */

const fs   = require("fs");
const path = require("path");

const DB_FILE    = path.join(__dirname, "siteledger.db");
const BACKUP_DIR = path.join(__dirname, "backups");

// Create backups folder if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create timestamped backup
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupFile = path.join(BACKUP_DIR, `siteledger-${timestamp}.db`);

try {
  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`✅ Backup created: ${backupFile}`);

  // Keep only the last 30 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".db"))
    .sort()
    .reverse();

  if (files.length > 30) {
    const toDelete = files.slice(30);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`🗑️  Deleted old backup: ${f}`);
    });
  }

  console.log(`📦 Total backups kept: ${Math.min(files.length, 30)}`);
} catch (err) {
  console.error("❌ Backup failed:", err.message);
  process.exit(1);
}
