const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const verifyToken = require("../middleware/authMiddleware");

const ADMIN_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];

const isAdmin = (role) => ADMIN_ROLES.map(r => r.toLowerCase()).includes(role?.toLowerCase());

router.get("/config", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT dropdown_config FROM owner_table LIMIT 1"
    );
    if (result.rows.length === 0) {
      return res.json({ eventTypes: [], decorTypes: [] });
    }
    const config = typeof result.rows[0].dropdown_config === "string"
      ? JSON.parse(result.rows[0].dropdown_config)
      : (result.rows[0].dropdown_config || {});
    res.json({
      eventTypes: config.eventTypes || [],
      decorTypes: config.decorTypes || [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/config", verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { eventTypes, decorTypes } = req.body;
    if (!Array.isArray(eventTypes) || !Array.isArray(decorTypes)) {
      return res.status(400).json({ message: "eventTypes and decorTypes must be arrays" });
    }

    const existing = await pool.query("SELECT dropdown_config FROM owner_table LIMIT 1");
    const currentConfig = existing.rows.length > 0
      ? (typeof existing.rows[0].dropdown_config === "string"
        ? JSON.parse(existing.rows[0].dropdown_config)
        : (existing.rows[0].dropdown_config || {}))
      : {};

    const updatedConfig = {
      ...currentConfig,
      eventTypes,
      decorTypes,
    };

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE owner_table SET dropdown_config = $1 WHERE id = (SELECT id FROM owner_table LIMIT 1)",
        [JSON.stringify(updatedConfig)]
      );
    } else {
      await pool.query(
        "INSERT INTO owner_table (dropdown_config) VALUES ($1)",
        [JSON.stringify(updatedConfig)]
      );
    }

    res.json({ success: true, eventTypes, decorTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
