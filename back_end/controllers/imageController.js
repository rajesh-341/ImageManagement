const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];
const DELETE_ROLES = ["Captain", "ViceCaptain", "Owner"];
const VIEW_ROLES = ["Captain", "ViceCaptain", "Facilitator", "TeamLead", "TeamMember", "Owner"];

const getImages = async (req, res) => {
  try {
    const { folder } = req.query;
    
    let query = "SELECT * FROM images";
    let params = [];

    if (folder) {
      query += " WHERE folder_name = $1";
      params.push(folder);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    const rows = result.rows.map(row => ({
      ...row,
      image_data: typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data,
    }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFolders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT folder_name FROM images ORDER BY folder_name DESC"
    );
    res.json(result.rows.map(r => r.folder_name));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadImage = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    
    // Check against lowercase roles
    const canUpload = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    
    if (!canUpload) {
      console.log("[IMAGE] Access denied, role:", role);
      return res.status(403).json({ message: "Upload access denied" });
    }

    const { 
      folderName,
      imageUrl,
      colourCombination,
      size,
      sizeUnit,
      designName,
      placeOfEvent,
      decorType,
      eventName,
      eventTime
    } = req.body;

    if (!folderName || !imageUrl) {
      return res.status(400).json({ message: "Folder name and image URL required" });
    }

    const imageData = {
      imageUrl,
      colourCombination: colourCombination || [],
      size: size || "",
      sizeUnit: sizeUnit || "inch",
      designName: designName || "",
      placeOfEvent: placeOfEvent || "",
      decorType: decorType || "",
      eventName: eventName || "",
      eventTime: eventTime || null,
      uploadedAt: new Date().toISOString()
    };

    const query = `
      INSERT INTO images (folder_name, image_data, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [folderName, JSON.stringify(imageData), req.user.userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log("[IMAGE] Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const deleteImage = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    
    const canDelete = DELETE_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    
    if (!canDelete) {
      return res.status(403).json({ message: "Delete access denied" });
    }

    const { id } = req.params;

    const selectQuery = "SELECT image_data FROM images WHERE id = $1";
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imageData = selectResult.rows[0].image_data;
    const parsedData = typeof imageData === "string" ? JSON.parse(imageData) : imageData;
    if (parsedData && parsedData.imageUrl) {
      const filePath = path.join(__dirname, "..", parsedData.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const query = "DELETE FROM images WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM images WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getImages,
  getFolders,
  uploadImage,
  deleteImage,
  getImageById,
  UPLOAD_ROLES,
  DELETE_ROLES,
  VIEW_ROLES
};