const pool = require("../config/db");

exports.getFavorites = async (req, res) => {
  try {
    const username = req.user.username || req.user.id;
    const result = await pool.query(
      `SELECT i.id, i.folder_name, i.image_data, i.created_at, f.created_at as favorited_at
       FROM favorites f
       JOIN images i ON f.image_id = i.id
       WHERE f.username = $1
       ORDER BY f.created_at DESC`,
      [username]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addFavorite = async (req, res) => {
  try {
    const { imageId } = req.body;
    const username = req.user.username || req.user.id;

    const result = await pool.query(
      `INSERT INTO favorites (image_id, username)
       VALUES ($1, $2)
       ON CONFLICT (image_id, username) DO NOTHING
       RETURNING *`,
      [imageId, username]
    );

    res.json({ success: true, favorite: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const { imageId } = req.params;
    const username = req.user.username || req.user.id;

    await pool.query(
      "DELETE FROM favorites WHERE image_id = $1 AND username = $2",
      [imageId, username]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFavoriteStatus = async (req, res) => {
  try {
    const username = req.user.username || req.user.id;
    const result = await pool.query(
      "SELECT image_id FROM favorites WHERE username = $1",
      [username]
    );

    const favoriteIds = new Set(result.rows.map(row => row.image_id));
    res.json({ favorites: favoriteIds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
