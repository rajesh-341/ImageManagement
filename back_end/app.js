const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");
const { saveImage, isLocal } = require("./config/storage");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const folderRoutes = require("./routes/folderRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const userRoutes = require("./routes/userRoutes");
const { logout, me } = require("./controllers/authController");
const verifyToken = require("./middleware/authMiddleware");
const pool = require("./config/db");

const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "res.cloudinary.com", `${process.env.FRONTEND_URL || "http://localhost:3000"}`],
      connectSrc: ["'self'", "res.cloudinary.com", process.env.FRONTEND_URL || "http://localhost:3000"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/", apiLimiter);

app.use((req, res, next) => {
  if (req.path.startsWith("/uploads/")) {
    return next();
  }
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const csrfHeader = req.headers["x-requested-with"];
    if (csrfHeader !== "XMLHttpRequest") {
      return next();
    }
  }
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

if (isLocal()) {
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
}

app.post("/api/upload", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const folderName = req.body.folderName || "uncategorized";
    const result = await saveImage(req.file.buffer, folderName);

    res.json({ imageUrl: result.imageUrl, filename: result.filename });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const BATCH_SIZE = 10;

app.post("/api/upload/batch", verifyToken, upload.array("images", 100), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    if (files.length > 100) {
      return res.status(400).json({ message: "Maximum 100 images allowed per batch upload" });
    }

    const folderName = req.body.folderName || "uncategorized";
    const totalImages = files.length;
    const startTime = Date.now();
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await saveImage(file.buffer, folderName);
          return { success: true, filename: result.filename, imageUrl: result.imageUrl };
        } catch (err) {
          return { success: false, filename: file.originalname, error: err.message };
        }
      });
      const batchResults = await Promise.allSettled(batchPromises);
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value.success) {
          results.push(r.value);
        } else {
          errors.push(r.status === "fulfilled" ? r.value : { error: r.reason?.message || "Unknown error" });
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      total: totalImages,
      uploaded: results.length,
      failed: errors.length,
      batchSize: BATCH_SIZE,
      batches: Math.ceil(totalImages / BATCH_SIZE),
      timeTaken: `${elapsed}s`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/users", userRoutes);
app.post("/api/logout", verifyToken, logout);
app.get("/api/me", verifyToken, me);

app.get("/api/upload-signature", verifyToken, (req, res) => {
  const folder = req.query.folder || "uncategorized";
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    timestamp,
    folder: `image_management/${sanitizedFolder}`,
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: `image_management/${sanitizedFolder}`,
  });
});

app.get("/api/download-all", verifyToken, async (req, res) => {
  try {
    const DOWNLOAD_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const allowed = DOWNLOAD_ROLES.map(r => r.toLowerCase()).includes(userRole);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const imgResult = await pool.query(
      `SELECT id, folder_name, image_data FROM image_management
       WHERE (folder_name IN (SELECT name FROM folders WHERE scope = 'home' OR scope IS NULL) OR folder_name NOT IN (SELECT name FROM folders))
       ORDER BY folder_name, id`
    );
    if (imgResult.rows.length === 0) return res.status(404).json({ message: "No images found" });

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();

    const archiver = require("archiver");
    const archive = archiver("zip", { zlib: { level: 6 } });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="all_images_${Date.now()}.zip"`);

    archive.pipe(res);

    let processed = 0;
    const total = imgResult.rows.length;

    for (const row of imgResult.rows) {
      const imgData = typeof row.image_data === "string"
        ? JSON.parse(row.image_data)
        : row.image_data;

      if (!imgData || !imgData.imageUrl) continue;

      try {
        const imageResponse = await fetch(imgData.imageUrl);
        if (!imageResponse.ok) continue;

        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const folderPath = sanitize(row.folder_name);
        const urlParts = imgData.imageUrl.split("/");
        let filename = urlParts[urlParts.length - 1].split("?")[0];
        if (!filename) filename = `image_${row.id}.jpg`;
        archive.append(buffer, { name: `${folderPath}/${filename}` });
        processed++;
      } catch (err) {
        console.warn(`[Download-All] Skipping image ${row.id}: ${err.message}`);
      }
    }

    archive.finalize();

    archive.on("finish", () => {
      console.log(`[Download-All] Zipped ${processed}/${total} images`);
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/sync/cloudinary", verifyToken, async (req, res) => {
  try {
    const SYNC_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const allowed = SYNC_ROLES.map(r => r.toLowerCase()).includes(userRole);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const { action } = req.body;
    if (!action || !["dry-run", "cleanup", "import"].includes(action)) {
      return res.status(400).json({ message: "action must be 'dry-run', 'cleanup', or 'import'" });
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'image_management/',
      max_results: 500,
    });

    const dbResult = await pool.query("SELECT image_data FROM image_management");
    const dbUrls = new Set(
      dbResult.rows.map(r => {
        const d = typeof r.image_data === "string" ? JSON.parse(r.image_data) : r.image_data;
        return d?.imageUrl;
      }).filter(Boolean)
    );

    const orphaned = [];
    for (const asset of result.resources) {
      const assetUrl = asset.secure_url;
      if (!dbUrls.has(assetUrl)) {
        orphaned.push({ public_id: asset.public_id, url: assetUrl, created_at: asset.created_at });
      }
    }

    const cleaned = [];
    if (action === "cleanup" && orphaned.length > 0) {
      for (const asset of orphaned) {
        const destroyResult = await cloudinary.uploader.destroy(asset.public_id, { invalidate: true });
        cleaned.push({ public_id: asset.public_id, result: destroyResult.result });
      }
    }

    let imported = [];
    if (action === "import" && orphaned.length > 0) {
      for (const asset of orphaned) {
        try {
          const pathParts = asset.public_id.split("/");
          const folderName = pathParts.length >= 2 ? pathParts[1] : "uncategorized";
          const displayName = pathParts[pathParts.length - 1]?.replace(/\.\w+$/, "")?.replace(/[_-]/g, " ") || "Untitled";

          await pool.query(
            `INSERT INTO folders (name, description, created_by, scope) VALUES ($1, '', 'system', 'home') ON CONFLICT (name) WHERE (scope = 'home' OR scope IS NULL) DO NOTHING`,
            [folderName]
          );

          const imageData = {
            imageUrl: asset.secure_url,
            colourCombination: [],
            designName: displayName,
            eventType: "Other",
            decorType: "Other",
            uploadedAt: asset.created_at,
          };
          const insertResult = await pool.query(
            `INSERT INTO image_management (folder_name, image_data, employee_id) VALUES ($1, $2, 'system') RETURNING id`,
            [folderName, JSON.stringify(imageData)]
          );

          imported.push({
            public_id: asset.public_id,
            url: asset.secure_url,
            folder: folderName,
            db_id: insertResult.rows[0].id,
            created_at: asset.created_at,
          });
        } catch (importErr) {
          console.error(`[Sync] Failed to import ${asset.public_id}:`, importErr.message);
        }
      }
    }

    res.json({
      totalCloudinary: result.resources.length,
      totalDb: dbUrls.size,
      orphanedCount: orphaned.length,
      orphaned: action === "dry-run" ? orphaned : undefined,
      cleanedCount: cleaned.length,
      cleaned: action === "cleanup" ? cleaned : undefined,
      importedCount: imported.length,
      imported: action === "import" ? imported : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/destroy-cloudinary", verifyToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "imageUrl required" });
    const { deleteImage } = require("./config/storage");
    await deleteImage(imageUrl);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/download/:id", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT image_data FROM image_management WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const imgData = typeof result.rows[0].image_data === "string"
      ? JSON.parse(result.rows[0].image_data)
      : result.rows[0].image_data;

    if (!imgData || !imgData.imageUrl) return res.status(404).json({ message: "Image URL not found" });

    const imageResponse = await fetch(imgData.imageUrl);
    if (!imageResponse.ok) return res.status(502).json({ message: "Failed to fetch image from storage" });

    const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.split("/").pop() || "bin";
    const urlParts = imgData.imageUrl.split("/");
    let filename = urlParts[urlParts.length - 1].split("?")[0].replace(/\.\w+$/, "");
    if (!filename) filename = `image_${req.params.id}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}.${ext}"`);
    res.setHeader("Content-Type", contentType);

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

module.exports = app;
