const pool = require("../config/db");

const addFavorite = async (req, res) => {
  try {
    const { imageId } = req.body;
    if (!imageId) return res.status(400).json({ message: "Image ID required" });

    const result = await pool.query(
      "UPDATE image_management SET favourite = true WHERE id = $1 RETURNING *",
      [imageId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const img = result.rows[0];
    img.image_data = typeof img.image_data === "string" ? JSON.parse(img.image_data) : img.image_data;
    res.json({ message: "Added to favorites", image: img });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { imageId } = req.params;
    const result = await pool.query(
      "UPDATE image_management SET favourite = false WHERE id = $1 RETURNING *",
      [imageId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    res.json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const { folder } = req.query;
    let query = "SELECT * FROM image_management WHERE favourite = true";
    const params = [];

    if (folder) {
      query += " AND folder_name = $1";
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

const getFavoriteFolders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM folders WHERE scope = 'favourite' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFavoriteFolder = async (req, res) => {
  try {
    const { folderName, description } = req.body;
    if (!folderName) return res.status(400).json({ message: "Folder name required" });

    const existing = await pool.query(
      "SELECT id FROM folders WHERE name = $1 AND scope = 'favourite'",
      [folderName]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Folder already exists in Favorites" });
    }

    const result = await pool.query(
      "INSERT INTO folders (name, description, created_by, scope) VALUES ($1, $2, $3, 'favourite') RETURNING *",
      [folderName, description || "", req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteFolders,
  createFavoriteFolder,
};
