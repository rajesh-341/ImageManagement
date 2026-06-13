const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { deleteImage: deleteStorageImage } = require("../config/storage");
const { UPLOAD_ROLES, DELETE_ROLES, VIEW_ROLES, FOLDER_VIEW_ROLES } = require("../config/constants");

const ADMIN_ROLES = ["Owner", "CEO", "Marketing Head"];

const isAdmin = (role) => ADMIN_ROLES.map(r => r.toLowerCase()).includes(role?.toLowerCase());

const getImages = async (req, res) => {
  try {
    const { folder, designName, size, decorType, placeOfEvent, venueCustomer, venueName, venueDate, eventName, folderName, eventType, flowerType, colors, priceMin, priceMax, searchText, sizeWidth, sizeLength, sizeHeight, collectedBy, page = 1, limit = 200 } = req.query;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const noLimit = !limitNum || limitNum <= 0;
    const effectiveLimit = noLimit ? 100000 : Math.min(100000, limitNum);
    const offset = (pageNum - 1) * effectiveLimit;

    let whereClause = "";
    let params = [];
    let paramIndex = 1;

    const conditions = [];

    if (!folder && !searchText && !eventType && !decorType && !colors && !flowerType && !priceMin && !priceMax && !designName && !placeOfEvent && !folderName && !sizeWidth && !sizeLength && !sizeHeight && !collectedBy) {
      conditions.push(`(folder_name IN (SELECT name FROM folders WHERE scope = 'home' OR scope IS NULL) OR folder_name NOT IN (SELECT name FROM folders))`);
    }

    if (searchText) {
      conditions.push(`(
        image_data->>'designName' ILIKE $${paramIndex} OR
        image_data->>'eventType' ILIKE $${paramIndex} OR
        image_data->>'decorType' ILIKE $${paramIndex} OR
        image_data->>'venueCustomer' ILIKE $${paramIndex} OR
        image_data->>'venueName' ILIKE $${paramIndex} OR
        image_data->>'flowerType' ILIKE $${paramIndex} OR
        folder_name ILIKE $${paramIndex}
      )`);
      params.push(`%${searchText}%`);
      paramIndex++;
    }

    if (folder) {
      conditions.push(`folder_name = $${paramIndex}`);
      params.push(folder);
      paramIndex++;
    }

    if (folderName) {
      conditions.push(`folder_name ILIKE $${paramIndex}`);
      params.push(`%${folderName}%`);
      paramIndex++;
    }

    if (designName) {
      conditions.push(`image_data->>'designName' ILIKE $${paramIndex}`);
      params.push(`%${designName}%`);
      paramIndex++;
    }

    if (eventType) {
      const eventTypes = eventType.split(",");
      const eventTypeConditions = eventTypes.map(() => `image_data->>'eventType' ILIKE $${paramIndex++}`);
      conditions.push(`(${eventTypeConditions.join(" OR ")})`);
      eventTypes.forEach(type => params.push(`%${type}%`));
    }

    if (decorType) {
      const decorTypes = decorType.split(",");
      const decorTypeConditions = decorTypes.map(() => `image_data->>'decorType' ILIKE $${paramIndex++}`);
      conditions.push(`(${decorTypeConditions.join(" OR ")})`);
      decorTypes.forEach(type => params.push(`%${type}%`));
    }

          if (placeOfEvent) {
            conditions.push(`image_data->>'venueName' ILIKE $${paramIndex}`);
            params.push(`%${placeOfEvent}%`);
            paramIndex++;
          }
          if (sizeWidth) {
            conditions.push(`image_data->>'sizeWidth' = $${paramIndex}`);
            params.push(sizeWidth);
            paramIndex++;
          }
          if (sizeLength) {
            conditions.push(`image_data->>'sizeLength' = $${paramIndex}`);
            params.push(sizeLength);
            paramIndex++;
          }
          if (sizeHeight) {
            conditions.push(`image_data->>'sizeHeight' = $${paramIndex}`);
            params.push(sizeHeight);
            paramIndex++;
          }
    const venueConditions = [];
    if (venueCustomer) {
      venueConditions.push(`image_data->>'venueCustomer' ILIKE $${paramIndex}`);
      params.push(`%${venueCustomer}%`);
      paramIndex++;
    }
    if (venueName) {
      venueConditions.push(`image_data->>'venueName' ILIKE $${paramIndex}`);
      params.push(`%${venueName}%`);
      paramIndex++;
    }
    if (venueDate) {
      venueConditions.push(`image_data->>'venueDate' ILIKE $${paramIndex}`);
      params.push(`%${venueDate}%`);
      paramIndex++;
    }
    if (venueConditions.length > 0) {
      conditions.push(`(${venueConditions.join(" OR ")})`);
    }

    if (eventName) {
      conditions.push(`image_data->>'eventName' ILIKE $${paramIndex}`);
      params.push(`%${eventName}%`);
      paramIndex++;
    }

    if (flowerType) {
      conditions.push(`image_data->>'flowerType' ILIKE $${paramIndex}`);
      params.push(`%${flowerType}%`);
      paramIndex++;
    }

    if (colors) {
      const colorList = colors.split(",");
      const colorConditions = colorList.map(() => `image_data->'colourCombination' @> $${paramIndex++}`);
      conditions.push(`(${colorConditions.join(" AND ")})`);
      colorList.forEach(color => params.push(`["${color}"]`));
    }

    if (priceMin !== undefined && priceMin !== '' && parseFloat(priceMin) > 0) {
      conditions.push(`(image_data->>'priceMax' IS NOT NULL AND image_data->>'priceMax' != '' AND CAST(image_data->>'priceMax' AS NUMERIC) >= $${paramIndex})`);
      params.push(parseFloat(priceMin));
      paramIndex++;
    }

    if (priceMax !== undefined && priceMax !== '' && parseFloat(priceMax) < 10000) {
      conditions.push(`(image_data->>'priceMin' IS NOT NULL AND image_data->>'priceMin' != '' AND CAST(image_data->>'priceMin' AS NUMERIC) <= $${paramIndex})`);
      params.push(parseFloat(priceMax));
      paramIndex++;
    }

    if (collectedBy) {
      conditions.push(`image_data->>'collectedBy' ILIKE $${paramIndex}`);
      params.push(`%${collectedBy}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      whereClause = " WHERE " + conditions.join(" AND ");
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM image_management${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    let queryStr = `SELECT * FROM image_management${whereClause} ORDER BY created_at DESC`;
    const queryParams = [...params];
    if (!noLimit) {
      queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(effectiveLimit, offset);
    }
    const result = await pool.query(queryStr, queryParams);
    const rows = result.rows.map(row => ({
      ...row,
      image_data: typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data,
    }));
    res.json({ images: rows, total, page: pageNum, limit: limitNum, hasMore: offset + limitNum < total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFolders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT folder_name FROM image_management ORDER BY folder_name DESC"
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
      eventTime,
      eventType,
      venueCustomer,
      venueName,
      sizeWidth,
      sizeLength,
      sizeHeight,
      sizeDisplay,
      flowerType,
      priceMin,
      priceMax,
      collectedBy
    } = req.body;

    if (!folderName || !imageUrl) {
      return res.status(400).json({ message: "Folder name and image URL required" });
    }

    let folderEventType = eventType;
    if (!folderEventType) {
      const folderResult = await pool.query(
        "SELECT event_types FROM folders WHERE name = $1 AND (scope = 'home' OR scope IS NULL) LIMIT 1",
        [folderName]
      );
      if (folderResult.rows.length > 0 && folderResult.rows[0].event_types) {
        const types = folderResult.rows[0].event_types;
        if (Array.isArray(types) && types.length > 0) {
          folderEventType = types[0];
        }
      }
    }

    const imageData = {
      imageUrl,
      colourCombination: colourCombination || [],
      sizeWidth: sizeWidth || null,
      sizeLength: sizeLength || null,
      sizeHeight: sizeHeight || null,
      sizeUnit: sizeUnit || "sq.ft",
      sizeDisplay: sizeDisplay || null,
      designName,
      eventType: folderEventType || "",
      decorType,
      venueCustomer: venueCustomer || null,
      venueName: venueName || null,
      flowerType: flowerType || null,
      priceMin: priceMin ? parseFloat(priceMin) : null,
      priceMax: priceMax ? parseFloat(priceMax) : null,
      uploadedAt: new Date().toISOString(),
      collectedBy: collectedBy || ""
    };

    await pool.query(
      `INSERT INTO folders (name, description, created_by, scope) VALUES ($1, '', $2, 'home') ON CONFLICT (name) WHERE (scope = 'home' OR scope IS NULL) DO NOTHING`,
      [folderName, req.user.userId]
    );

    const query = `
      INSERT INTO image_management (folder_name, image_data, employee_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [folderName, JSON.stringify(imageData), req.user.userId]);
      res.status(201).json(result.rows[0]);
    } catch (dbError) {
      await deleteStorageImage(imageUrl).catch(() => {});
      throw dbError;
    }
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

    const selectQuery = "SELECT image_data, folder_name FROM image_management WHERE id = $1";
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    const row = selectResult.rows[0];
    const folderName = row.folder_name;
    const parsedData = typeof row.image_data === "string"
      ? JSON.parse(row.image_data)
      : row.image_data;
    if (parsedData && parsedData.imageUrl) {
      await deleteStorageImage(parsedData.imageUrl);
    }

    await pool.query("DELETE FROM image_management WHERE id = $1", [id]);

    let folderDeleted = false;
    const remaining = await pool.query(
      "SELECT COUNT(*) AS cnt FROM image_management WHERE folder_name = $1",
      [folderName]
    );
    if (parseInt(remaining.rows[0].cnt) === 0) {
      const folderResult = await pool.query(
        "DELETE FROM folders WHERE name = $1 AND (scope = 'home' OR scope IS NULL) RETURNING id",
        [folderName]
      );
      folderDeleted = folderResult.rows.length > 0;
    }

    res.json({ message: "Image deleted successfully", folderDeleted, folderName });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM image_management WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateImageFolder = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    
    const canUpdate = DELETE_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    
    if (!canUpdate) {
      return res.status(403).json({ message: "Update access denied" });
    }

    const { id } = req.params;
    const { folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const query = "UPDATE image_management SET folder_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [folderName, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image moved successfully", image: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateImage = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const canUpdate = DELETE_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    if (!canUpdate) return res.status(403).json({ message: "Update access denied" });

    const { id } = req.params;
    const existing = await pool.query("SELECT image_data FROM image_management WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const currentData = typeof existing.rows[0].image_data === "string"
      ? JSON.parse(existing.rows[0].image_data)
      : existing.rows[0].image_data;

    const {
      designName, eventType, decorType, venueCustomer, venueName,
      sizeWidth, sizeLength, sizeHeight, sizeUnit, sizeDisplay,
      colourCombination, flowerType, priceMin, priceMax
    } = req.body;

    const updatedData = {
      ...currentData,
      ...(designName !== undefined && { designName }),
      ...(eventType !== undefined && { eventType }),
      ...(decorType !== undefined && { decorType }),
      ...(venueCustomer !== undefined && { venueCustomer }),
      ...(venueName !== undefined && { venueName }),
      ...(sizeWidth !== undefined && { sizeWidth }),
      ...(sizeLength !== undefined && { sizeLength }),
      ...(sizeHeight !== undefined && { sizeHeight }),
      ...(sizeUnit !== undefined && { sizeUnit }),
      ...(sizeDisplay !== undefined && { sizeDisplay }),
      ...(colourCombination !== undefined && { colourCombination }),
      ...(flowerType !== undefined && { flowerType }),
      ...(priceMin !== undefined && { priceMin: parseFloat(priceMin) }),
      ...(priceMax !== undefined && { priceMax: parseFloat(priceMax) }),
    };

    const result = await pool.query(
      "UPDATE image_management SET image_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [JSON.stringify(updatedData), id]
    );

    const img = result.rows[0];
    img.image_data = typeof img.image_data === "string" ? JSON.parse(img.image_data) : img.image_data;
    res.json({ message: "Image updated successfully", image: img });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const { field, query } = req.query;
    if (!field) return res.status(400).json({ message: "Field parameter is required" });

    const fieldMap = {
      designName: "image_data->>'designName'",
      eventType: "image_data->>'eventType'",
      decorType: "image_data->>'decorType'",
      venueName: "image_data->>'venueName'",
      venueCustomer: "image_data->>'venueCustomer'",
      flowerType: "image_data->>'flowerType'",
      collectedBy: "image_data->>'collectedBy'",
      folderName: "folder_name",
    };

    const dbField = fieldMap[field];
    if (!dbField) return res.status(400).json({ message: "Invalid field" });

    let sql = `SELECT DISTINCT ${dbField} AS val FROM image_management WHERE ${dbField} IS NOT NULL AND ${dbField} != ''`;
    const params = [];

    if (query) {
      sql += ` AND ${dbField} ILIKE $1`;
      params.push(`%${query}%`);
    }

    sql += ` ORDER BY val LIMIT 20`;

    const result = await pool.query(sql, params);
    const suggestions = result.rows.map(r => r.val).filter(Boolean);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReport = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const allowedRoles = ["ceo", "admin"];
    if (!allowedRoles.includes(roleLower)) {
      return res.status(403).json({ message: "Access denied. Only CEO and Admin can view reports." });
    }

    const result = await pool.query(`
      SELECT
        f.id,
        f.name,
        f.description,
        f.created_by AS uploaded_by_user_id,
        COALESCE(ed.employee_details->>'employee_name', f.created_by) AS uploaded_by,
        f.scope,
        f.event_types,
        f.collected_by,
        f.created_at AS upload_date,
        COALESCE(img_counts.image_count, 0) AS image_count
      FROM folders f
      LEFT JOIN employee_details ed ON f.created_by = ed.employee_id
      LEFT JOIN (
        SELECT folder_name, COUNT(*) AS image_count
        FROM image_management
        GROUP BY folder_name
      ) img_counts ON f.name = img_counts.folder_name
      WHERE (f.scope = 'home' OR f.scope IS NULL)
      ORDER BY f.created_at DESC
    `);

    res.json(result.rows);
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
  updateImageFolder,
  updateImage,
  getSuggestions,
  getReport,
  UPLOAD_ROLES,
  DELETE_ROLES,
  VIEW_ROLES,
  FOLDER_VIEW_ROLES,
};