const pool = require("./config/db");

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] folders table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        folder_name VARCHAR(255) NOT NULL,
        image_data JSONB NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] images table ready");

    await pool.query(`ALTER TABLE folders ALTER COLUMN created_by TYPE VARCHAR(255)`);
    console.log("[Migration] updated created_by to VARCHAR");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(image_id, username)
      )
    `);
    console.log("[Migration] favorites table ready");
  } catch (error) {
    console.error("[Migration] Error:", error.message);
  }
}

module.exports = runMigrations;
