const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const runMigrations = async () => {
  try {
    const sqlPath = path.join(__dirname, "indexes.sql");
    if (!fs.existsSync(sqlPath)) {
      console.log("[Migrations] No SQL files found");
      return;
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log(`[Migrations] OK: ${stmt.substring(0, 60)}...`);
      } catch (err) {
        console.warn(`[Migrations] Skipped: ${err.message}`);
      }
    }
    console.log("[Migrations] Complete");
  } catch (err) {
    console.error("[Migrations] Failed:", err.message);
  }
};

module.exports = runMigrations;
