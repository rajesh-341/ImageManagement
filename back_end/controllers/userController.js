const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const ADMIN_ROLES = ["Owner", "CEO", "Marketing Head"];

const canManageUsers = (role) => {
  return ADMIN_ROLES.map(r => r.toLowerCase()).includes(role.toLowerCase());
};

const getUsers = async (req, res) => {
  try {
    if (!canManageUsers(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      "SELECT id, employee_id, employee_details FROM employee_details ORDER BY id"
    );

    const users = result.rows.map(row => {
      const details = typeof row.employee_details === "string"
        ? JSON.parse(row.employee_details)
        : row.employee_details;
      return {
        id: row.id,
        username: details.employee_id || row.employee_id,
        displayName: details.employee_name || "",
        role: details.role || "",
        password: details.plainPassword || "",
      };
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    if (!canManageUsers(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { username, displayName, role, password } = req.body;
    if (!username || !displayName || !role || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await pool.query(
      "SELECT id FROM employee_details WHERE employee_id = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const ownerRes = await pool.query("SELECT id FROM owner_table LIMIT 1");
    const ownerId = ownerRes.rows[0]?.id || null;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO employee_details (owner_id, employee_id, employee_details) VALUES ($1, $2, $3)`,
      [ownerId, username, JSON.stringify({
        employee_id: username,
        employee_name: displayName,
        Password: hashedPassword,
        plainPassword: password,
        role: role,
      })]
    );

    res.json({ success: true, message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!canManageUsers(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { username, displayName, role, password } = req.body;
    if (!username || !displayName || !role) {
      return res.status(400).json({ message: "Username, display name, and role are required" });
    }

    const result = await pool.query(
      "SELECT employee_details FROM employee_details WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingDetails = typeof result.rows[0].employee_details === "string"
      ? JSON.parse(result.rows[0].employee_details)
      : result.rows[0].employee_details;

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : existingDetails.Password;

    const plainPassword = password || existingDetails.plainPassword || "";

    await pool.query(
      `UPDATE employee_details SET employee_id = $1, employee_details = $2 WHERE id = $3`,
      [username, JSON.stringify({
        employee_id: username,
        employee_name: displayName,
        Password: hashedPassword,
        plainPassword,
        role: role,
      }), id]
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!canManageUsers(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const result = await pool.query(
      "SELECT employee_id FROM employee_details WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await pool.query("DELETE FROM employee_details WHERE id = $1", [id]);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
