const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let token = req.cookies?.auth_token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

const ADMIN_ROLES = ["Owner", "Captain", "ViceCaptain"];

function verifyOwnership(model) {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role ? req.user.role.toLowerCase() : "";
      const isAdmin = ADMIN_ROLES.map(r => r.toLowerCase()).includes(userRole);
      if (isAdmin) return next();

      const { id } = req.params;
      if (!id) return next();

      const pool = require("../config/db");
      const validModels = {
        image: "image_management",
        user: "employee_details",
        folder: "folders",
      };
      const table = validModels[model];
      if (!table) return next();

      let result;
      if (model === "image") {
        result = await pool.query(
          `SELECT employee_id FROM ${table} WHERE id = $1`,
          [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Resource not found" });
        if (result.rows[0].employee_id !== req.user.userId) {
          return res.status(403).json({ message: "Access denied: you do not own this resource" });
        }
      } else if (model === "user") {
        result = await pool.query(
          `SELECT id FROM ${table} WHERE id = $1`,
          [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Resource not found" });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
}

module.exports = verifyToken;
module.exports.verifyOwnership = verifyOwnership;
