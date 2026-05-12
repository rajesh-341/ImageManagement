const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const { UPLOAD_ROLES, DELETE_ROLES, VIEW_ROLES } = require("../config/constants");

const getImages = async (req, res) => {
  try {
    const { folder, designName, size, decorType, placeOfEvent, eventName, folderName, eventType, flowerType, colors, priceMin, priceMax, searchText } = req.query;
    
    let query = "SELECT * FROM image_management";
    let params = [];
    let paramIndex = 1;

    const conditions = [];

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
      conditions.push(`(image_data->>'venueCustomer' ILIKE $${paramIndex} OR image_data->>'venueName' ILIKE $${paramIndex})`);
      params.push(`%${placeOfEvent}%`);
      paramIndex++;
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

    if (priceMin) {
      conditions.push(`(image_data->>'priceMin' IS NOT NULL AND CAST(image_data->>'priceMin' AS NUMERIC) >= $${paramIndex})`);
      params.push(parseFloat(priceMin));
      paramIndex++;
    }

    if (priceMax) {
      conditions.push(`(image_data->>'priceMax' IS NOT NULL AND CAST(image_data->>'priceMax' AS NUMERIC) <= $${paramIndex})`);
      params.push(parseFloat(priceMax));
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
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
      venueDate,
      sizeWidth,
      sizeLength,
      sizeHeight,
      sizeDisplay,
      flowerType,
      priceMin,
      priceMax
    } = req.body;

    if (!folderName || !imageUrl) {
      return res.status(400).json({ message: "Folder name and image URL required" });
    }

    if (!designName) {
      return res.status(400).json({ message: "Missing required field: Design Name" });
    }
    if (!eventType) {
      return res.status(400).json({ message: "Missing required field: Event Type" });
    }
    if (!decorType) {
      return res.status(400).json({ message: "Missing required field: Decoration Type" });
    }
    if (!colourCombination || colourCombination.length === 0) {
      return res.status(400).json({ message: "Missing required field: Colour" });
    }
    if (!flowerType) {
      return res.status(400).json({ message: "Missing required field: Flower Type" });
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
      eventType,
      decorType,
      venueCustomer: venueCustomer || null,
      venueName: venueName || null,
      venueDate: venueDate || null,
      flowerType,
      priceMin: priceMin ? parseFloat(priceMin) : null,
      priceMax: priceMax ? parseFloat(priceMax) : null,
      uploadedAt: new Date().toISOString()
    };

    const query = `
      INSERT INTO image_management (folder_name, image_data, employee_id)
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

    const selectQuery = "SELECT image_data FROM image_management WHERE id = $1";
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

    const query = "DELETE FROM image_management WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    res.json({ message: "Image deleted successfully" });
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
    
    const canUpdate = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    
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
    const canUpdate = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);
    if (!canUpdate) return res.status(403).json({ message: "Update access denied" });

    const { id } = req.params;
    const existing = await pool.query("SELECT image_data FROM image_management WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const currentData = typeof existing.rows[0].image_data === "string"
      ? JSON.parse(existing.rows[0].image_data)
      : existing.rows[0].image_data;

    const {
      designName, eventType, decorType, venueCustomer, venueName, venueDate,
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
      ...(venueDate !== undefined && { venueDate }),
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

module.exports = {
  getImages,
  getFolders,
  uploadImage,
  deleteImage,
  getImageById,
  updateImageFolder,
  updateImage,
  UPLOAD_ROLES,
  DELETE_ROLES,
  VIEW_ROLES
};