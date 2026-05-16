const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const { deleteImage: deleteStorageImage, isLocal } = require("../config/storage");

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];

const createFolder = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const canUpload = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);

    if (!canUpload) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { folderName, description } = req.body;

    if (!folderName) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const existing = await pool.query("SELECT id FROM folders WHERE name = $1 AND (scope = 'home' OR scope IS NULL)", [folderName]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Folder already exists" });
    }

    const result = await pool.query(
      "INSERT INTO folders (name, description, created_by, scope) VALUES ($1, $2, $3, 'home') RETURNING *",
      [folderName, description || "", req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFolders = async (req, res) => {
  try {
    const { scope } = req.query;
    let query = "SELECT * FROM folders";
    const params = [];
    if (scope === 'home') {
      query += " WHERE (scope = 'home' OR scope IS NULL)";
    } else if (scope) {
      query += " WHERE scope = $1";
      params.push(scope);
    }
    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const canDelete = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);

    if (!canDelete) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    const folderResult = await pool.query("SELECT name, scope FROM folders WHERE id = $1", [id]);
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const folderName = folderResult.rows[0].name;
    const sanitizedFolder = folderName.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();

    const imagesResult = await pool.query("SELECT image_data FROM image_management WHERE folder_name = $1", [folderName]);
    for (const row of imagesResult.rows) {
      const imageData = typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data;
      if (imageData && imageData.imageUrl) {
        if (isLocal()) {
          const filePath = path.join(__dirname, "..", imageData.imageUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } else {
          await deleteStorageImage(imageData.imageUrl);
        }
      }
    }

    await pool.query("DELETE FROM image_management WHERE folder_name = $1", [folderName]);

    const uploadDir = path.join(__dirname, "..", "uploads", sanitizedFolder);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    await pool.query("DELETE FROM folders WHERE id = $1", [id]);

    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder,
};
