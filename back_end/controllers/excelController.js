const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const xlsx = require("xlsx");

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];

const uploadExcel = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const canUpload = UPLOAD_ROLES.map(r => r.toLowerCase()).includes(roleLower);

    if (!canUpload) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    const excelFile = req.files[0];
    const workbook = xlsx.readFile(excelFile.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      fs.unlinkSync(excelFile.path);
      return res.status(400).json({ message: "Excel file is empty" });
    }

    const folderName = req.body.folderName;
    if (!folderName) {
      fs.unlinkSync(excelFile.path);
      return res.status(400).json({ message: "Folder name is required" });
    }

    const sanitizedFolder = folderName.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const uploadDir = path.join(__dirname, "../uploads", sanitizedFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const imageBuffer = row["Image"];
      if (!imageBuffer) {
        errors.push(`Row ${i + 1}: No image data`);
        continue;
      }

      let imageData;
      let webpPath;

      try {
        let buffer;

        if (typeof imageBuffer === "string" && imageBuffer.startsWith("data:")) {
          const base64Data = imageBuffer.split(",")[1];
          buffer = Buffer.from(base64Data, "base64");
        } else if (imageBuffer instanceof ArrayBuffer) {
          buffer = Buffer.from(imageBuffer);
        } else if (Buffer.isBuffer(imageBuffer)) {
          buffer = imageBuffer;
        } else {
          errors.push(`Row ${i + 1}: Invalid image format`);
          continue;
        }

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const webpFilename = `${uniqueSuffix}.webp`;
        webpPath = path.join(uploadDir, webpFilename);

        await sharp(buffer).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toFile(webpPath);
        imageData = `/uploads/${sanitizedFolder}/${webpFilename}`;
      } catch (imgError) {
        errors.push(`Row ${i + 1}: Failed to process image`);
        continue;
      }

      const imageRecord = {
        imageUrl: imageData,
        colourCombination: row["Colours"] ? row["Colours"].toString().split(",").map(c => c.trim()).filter(c => c) : [],
        size: row["Size"] ? row["Size"].toString() : "",
        sizeUnit: "inch",
        designName: row["Decoration Name"] ? row["Decoration Name"].toString() : "",
        placeOfEvent: row["Place"] ? row["Place"].toString() : "",
        decorType: row["Decor Type"] ? row["Decor Type"].toString() : "",
        eventName: row["Event Name"] ? row["Event Name"].toString() : "",
        eventTime: null,
        uploadedAt: new Date().toISOString(),
      };

      try {
        const query = `
          INSERT INTO images (folder_name, image_data, created_by)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        const result = await pool.query(query, [folderName, JSON.stringify(imageRecord), req.user.userId]);
        results.push(result.rows[0]);
      } catch (dbError) {
        errors.push(`Row ${i + 1}: Database error - ${dbError.message}`);
      }
    }

    fs.unlinkSync(excelFile.path);

    res.status(201).json({
      message: `Uploaded ${results.length} images${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      uploaded: results.length,
      errors: errors.length > 0 ? errors : undefined,
      images: results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadExcel };
