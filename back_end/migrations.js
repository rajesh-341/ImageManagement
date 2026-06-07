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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scope VARCHAR(50) DEFAULT 'home'
      )
    `);
    console.log("[Migration] folders table ready");

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'folders' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE folders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

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
          plainPassword: "admin123",
          Role: "Owner",
          OwnerUniqueId: "owner_01"
        })]
      );
      console.log("[Migration] owner_table seeded with default data");
    }

    const empExisting = await pool.query("SELECT id FROM employee_details LIMIT 1");
    if (empExisting.rows.length > 0) {
      await pool.query("DELETE FROM employee_details");
      console.log("[Migration] Removed all existing users");
    }

    const ownerRes = await pool.query("SELECT id FROM owner_table LIMIT 1");
    const ownerId = ownerRes.rows[0]?.id || null;
    const employees = [
      { id: "ceo", name: "CEO", role: "CEO", pw: "ceo123" },
      { id: "marketinghead", name: "Marketing Head", role: "Marketing Head", pw: "mktghead123" },
      { id: "eventmanager", name: "Event Manager", role: "Event Managers", pw: "eventmgr123" },
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
          plainPassword: emp.pw,
          role: emp.role,
        })]
      );
    }
    console.log("[Migration] employee_details seeded with new roles");

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'owner_table' AND column_name = 'dropdown_config'
        ) THEN
          ALTER TABLE owner_table ADD COLUMN dropdown_config JSONB DEFAULT '{}';
        END IF;
      END $$;
    `);
    console.log("[Migration] owner_table.dropdown_config column ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favourite_folder_mapping (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
        image_id INTEGER NOT NULL REFERENCES image_management(id) ON DELETE CASCADE,
        employee_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(folder_id, image_id, employee_id)
      )
    `);
    console.log("[Migration] favourite_folder_mapping table ready");

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'folders' AND column_name = 'event_types'
        ) THEN
          ALTER TABLE folders ADD COLUMN event_types JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    console.log("[Migration] folders.event_types column ready");

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'folders' AND column_name = 'collected_by'
        ) THEN
          ALTER TABLE folders ADD COLUMN collected_by VARCHAR(255) DEFAULT '';
        END IF;
      END $$;
    `);
    console.log("[Migration] folders.collected_by column ready");

  } catch (error) {
    console.error("[Migration] Error:", error.message);
  }
}

module.exports = runMigrations;
