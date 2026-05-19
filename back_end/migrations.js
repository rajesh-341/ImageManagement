const pool = require("./config/db");
const bcrypt = require("bcryptjs");

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scope VARCHAR(50) DEFAULT 'home'
      )
    `);
    console.log("[Migration] folders table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS image_management (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(255),
        folder_name VARCHAR(255) NOT NULL,
        favourite BOOLEAN DEFAULT false,
        image_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] image_management table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS owner_table (
        id SERIAL PRIMARY KEY,
        owner_details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] owner_table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_details (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES owner_table(id) ON DELETE CASCADE,
        employee_id VARCHAR(255) NOT NULL,
        employee_details JSONB DEFAULT '{}',
        favourite_images JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] employee_details table ready");

    const existing = await pool.query("SELECT id FROM owner_table LIMIT 1");
    if (existing.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await pool.query(
        `INSERT INTO owner_table (owner_details) VALUES ($1)`,
        [JSON.stringify({
          UserName: "admin",
          Password: hashedPassword,
          Role: "Owner",
          OwnerUniqueId: "owner_01"
        })]
      );
      console.log("[Migration] owner_table seeded with default data");
    }

    const empExisting = await pool.query("SELECT id FROM employee_details LIMIT 1");
    if (empExisting.rows.length === 0) {
      const ownerRes = await pool.query("SELECT id FROM owner_table LIMIT 1");
      const ownerId = ownerRes.rows[0]?.id || null;
      const employees = [
        { id: "captain", name: "captain", role: "Captain", pw: "captain123" },
        { id: "vicecaptain", name: "vicecaptain", role: "ViceCaptain", pw: "vicecaptain123" },
        { id: "facilitator", name: "facilitator", role: "Facilitator", pw: "facilitator123" },
        { id: "teamlead", name: "teamlead", role: "TeamLead", pw: "teamlead123" },
        { id: "teammember", name: "teammember", role: "TeamMember", pw: "teammember123" },
        { id: "marketing", name: "marketing", role: "Marketing", pw: "marketing123" },
        { id: "admin", name: "admin", role: "Admin", pw: "admin123" },
      ];
      for (const emp of employees) {
        const hashed = await bcrypt.hash(emp.pw, 10);
        await pool.query(
          `INSERT INTO employee_details (owner_id, employee_id, employee_details) VALUES ($1, $2, $3)`,
          [ownerId, emp.id, JSON.stringify({
            employee_id: emp.id,
            employee_name: emp.name,
            Password: hashed,
            role: emp.role,
          })]
        );
      }
      console.log("[Migration] employee_details seeded with default employees");
    }

    const cleanResult = await pool.query(
      `UPDATE employee_details 
       SET employee_details = employee_details #- '{rawPassword}' #- '{plainPassword}'
       WHERE employee_details ? 'rawPassword' OR employee_details ? 'plainPassword'`
    );
    if (cleanResult.rowCount > 0) {
      console.log(`[Migration] Cleaned plaintext passwords from ${cleanResult.rowCount} employee record(s)`);
    }
  } catch (error) {
    console.error("[Migration] Error:", error.message);
  }
}

module.exports = runMigrations;
