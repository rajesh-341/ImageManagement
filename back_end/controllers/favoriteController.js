const pool = require("../config/db");

const getFavImageIds = async (userId) => {
  const result = await pool.query(
    "SELECT favourite_images FROM employee_details WHERE employee_id = $1",
    [userId]
  );
  if (result.rows.length === 0) return [];
  let ids = result.rows[0].favourite_images || [];
  if (typeof ids === "string") ids = JSON.parse(ids);
  return ids.map(id => (typeof id === "string" ? parseInt(id, 10) : id)).filter(id => !isNaN(id));
};

const addFavorite = async (req, res) => {
  try {
    const { imageId } = req.body;
    if (!imageId) return res.status(400).json({ message: "Image ID required" });

    const ids = await getFavImageIds(req.user.userId);
    if (!ids.includes(imageId)) ids.push(imageId);

    await pool.query(
      "UPDATE employee_details SET favourite_images = $1 WHERE employee_id = $2",
      [JSON.stringify(ids), req.user.userId]
    );

    const imgResult = await pool.query("SELECT * FROM image_management WHERE id = $1", [imageId]);
    if (imgResult.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const img = imgResult.rows[0];
    img.image_data = typeof img.image_data === "string" ? JSON.parse(img.image_data) : img.image_data;
    res.json({ message: "Added to favorites", image: img });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { imageId } = req.params;
    const imageIdNum = parseInt(imageId, 10);

    const ids = await getFavImageIds(req.user.userId);
    const filtered = ids.filter(id => id !== imageIdNum);

    await pool.query(
      "UPDATE employee_details SET favourite_images = $1 WHERE employee_id = $2",
      [JSON.stringify(filtered), req.user.userId]
    );

    res.json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const { folder } = req.query;
    const ids = await getFavImageIds(req.user.userId);

    if (ids.length === 0) return res.json([]);

    let query = "SELECT * FROM image_management WHERE id = ANY($1::int[])";
    const params = [ids];

    if (folder) {
      query += " AND folder_name = $2";
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
