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

    let query = "SELECT im.* FROM image_management im";
    const params = [];
    let paramIndex = 1;

    if (folder) {
      query += ` INNER JOIN favourite_folder_mapping ffm ON im.id = ffm.image_id AND ffm.employee_id = $${paramIndex}
                 INNER JOIN folders f ON ffm.folder_id = f.id AND f.name = $${paramIndex + 1}`;
      params.push(req.user.userId, folder);
      paramIndex += 2;
    }

    query += ` WHERE im.id = ANY($${paramIndex}::int[])`;
    params.push(ids);

    query += " ORDER BY im.created_at DESC";

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

const addImageToFavouriteFolder = async (req, res) => {
  try {
    const { folderId, imageId } = req.body;
    if (!folderId || !imageId) return res.status(400).json({ message: "folderId and imageId are required" });

    const folderCheck = await pool.query("SELECT id FROM folders WHERE id = $1 AND scope = 'favourite'", [folderId]);
    if (folderCheck.rows.length === 0) return res.status(404).json({ message: "Favourite folder not found" });

    const imgCheck = await pool.query("SELECT id FROM image_management WHERE id = $1", [imageId]);
    if (imgCheck.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    await pool.query(
      `INSERT INTO favourite_folder_mapping (folder_id, image_id, employee_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (folder_id, image_id, employee_id) DO NOTHING`,
      [folderId, imageId, req.user.userId]
    );

    const ids = await getFavImageIds(req.user.userId);
    if (!ids.includes(imageId)) {
      ids.push(imageId);
      await pool.query(
        "UPDATE employee_details SET favourite_images = $1 WHERE employee_id = $2",
        [JSON.stringify(ids), req.user.userId]
      );
    }

    res.json({ message: "Image added to favourite folder" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeImageFromFavouriteFolder = async (req, res) => {
  try {
    const { folderId, imageId } = req.body;
    if (!folderId || !imageId) return res.status(400).json({ message: "folderId and imageId are required" });

    await pool.query(
      `DELETE FROM favourite_folder_mapping WHERE folder_id = $1 AND image_id = $2 AND employee_id = $3`,
      [folderId, imageId, req.user.userId]
    );

    res.json({ message: "Image removed from favourite folder" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addImagesToFavouriteFolder = async (req, res) => {
  try {
    const { folderId, imageIds } = req.body;
    if (!folderId || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ message: "folderId and imageIds array are required" });
    }

    const folderCheck = await pool.query("SELECT id FROM folders WHERE id = $1 AND scope = 'favourite'", [folderId]);
    if (folderCheck.rows.length === 0) return res.status(404).json({ message: "Favourite folder not found" });

    const ids = await getFavImageIds(req.user.userId);
    let changed = false;

    for (const imageId of imageIds) {
      await pool.query(
        `INSERT INTO favourite_folder_mapping (folder_id, image_id, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (folder_id, image_id, employee_id) DO NOTHING`,
        [folderId, imageId, req.user.userId]
      );
      if (!ids.includes(imageId)) {
        ids.push(imageId);
        changed = true;
      }
    }

    if (changed) {
      await pool.query(
        "UPDATE employee_details SET favourite_images = $1 WHERE employee_id = $2",
        [JSON.stringify(ids), req.user.userId]
      );
    }

    res.json({ message: `${imageIds.length} image(s) added to favourite folder` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFavoriteFolders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM folders WHERE scope = 'favourite' AND created_by = $1 ORDER BY created_at DESC",
      [req.user.userId]
    );
    const userFolders = result.rows;
    const allResult = await pool.query(
      "SELECT DISTINCT folder_id FROM favourite_folder_mapping WHERE employee_id = $1",
      [req.user.userId]
    );
    if (allResult.rows.length > 0) {
      const mappedFolderIds = allResult.rows.map(r => r.folder_id);
      const orphanedResult = await pool.query(
        "SELECT * FROM folders WHERE scope = 'favourite' AND id = ANY($1::int[]) AND (created_by != $2 OR created_by IS NULL) ORDER BY created_at DESC",
        [mappedFolderIds, req.user.userId]
      );
      for (const folder of orphanedResult.rows) {
        if (!userFolders.some(f => f.id === folder.id)) {
          userFolders.push(folder);
        }
      }
    }
    res.json(userFolders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFavoriteFolder = async (req, res) => {
  try {
    const { folderName, description, eventTypes, collectedBy } = req.body;
    if (!folderName) return res.status(400).json({ message: "Folder name required" });
    if (!req.user || !req.user.userId) return res.status(401).json({ message: "Authentication required" });

    const existing = await pool.query(
      "SELECT id FROM folders WHERE name = $1 AND scope = 'favourite'",
      [folderName]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Folder already exists in Favorites" });
    }

    const result = await pool.query(
      "INSERT INTO folders (name, description, created_by, scope, event_types, collected_by) VALUES ($1, $2, $3, 'favourite', $4, $5) RETURNING *",
      [folderName, description || "", req.user.userId, JSON.stringify(eventTypes || []), collectedBy || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFavoriteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { folderName } = req.body;
    if (!folderName || !folderName.trim()) return res.status(400).json({ message: "Folder name required" });

    const folderResult = await pool.query(
      "SELECT * FROM folders WHERE id = $1 AND scope = 'favourite'",
      [id]
    );
    if (folderResult.rows.length === 0) return res.status(404).json({ message: "Favourite folder not found" });

    const newName = folderName.trim();
    const existing = await pool.query(
      "SELECT id FROM folders WHERE name = $1 AND scope = 'favourite' AND id != $2",
      [newName, id]
    );
    if (existing.rows.length > 0) return res.status(400).json({ message: "A folder with this name already exists" });

    const oldName = folderResult.rows[0].name;
    await pool.query(
      "UPDATE folders SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newName, id]
    );

    const result = await pool.query("SELECT * FROM folders WHERE id = $1", [id]);
    res.json({ message: "Folder renamed successfully", folder: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFavoriteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const folderResult = await pool.query(
      "SELECT * FROM folders WHERE id = $1 AND scope = 'favourite'",
      [id]
    );
    if (folderResult.rows.length === 0) return res.status(404).json({ message: "Favourite folder not found" });

    await pool.query("DELETE FROM favourite_folder_mapping WHERE folder_id = $1", [id]);
    await pool.query("DELETE FROM folders WHERE id = $1", [id]);

    res.json({ message: "Folder deleted successfully" });
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
  updateFavoriteFolder,
  deleteFavoriteFolder,
  addImageToFavouriteFolder,
  removeImageFromFavouriteFolder,
  addImagesToFavouriteFolder,
};
