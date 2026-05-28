const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const timeout = require("connect-timeout");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");
const { saveImage, isLocal } = require("./config/storage");
const path = require("path");
const archiver = require("archiver");
const { PassThrough } = require("stream");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const folderRoutes = require("./routes/folderRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const userRoutes = require("./routes/userRoutes");
const dropdownRoutes = require("./routes/dropdownRoutes");
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

const shouldCompress = (req, res) => {
  if (req.path.startsWith("/api/download")) return false;
  return compression.filter(req, res);
};
app.use(compression({ level: 6, threshold: 1024, filter: shouldCompress }));

const skipTimeout = (req, res) => req.path.startsWith("/api/download");
app.use((req, res, next) => {
  if (skipTimeout(req)) return next();
  timeout("30s")(req, res, next);
});
app.use((req, res, next) => {
  if (!req.timedout) next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 50,
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 1000,
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
app.use("/api/dropdown", dropdownRoutes);
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

app.get("/api/download-folder/:folderName", verifyToken, async (req, res) => {
  try {
    const DOWNLOAD_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const allowed = DOWNLOAD_ROLES.map(r => r.toLowerCase()).includes(userRole);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const folderName = req.params.folderName;
    const imgResult = await pool.query(
      `SELECT id, image_data FROM image_management WHERE folder_name = $1 ORDER BY id`,
      [folderName]
    );
    if (imgResult.rows.length === 0) return res.status(404).json({ message: "No images found in this folder" });

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const archive = archiver("zip", { zlib: { level: 3 } });
    const chunks = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => { throw err; });

    const done = new Promise((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    const fetchWithRetry = async (row) => {
      const imgData = typeof row.image_data === "string"
        ? JSON.parse(row.image_data)
        : row.image_data;
      if (!imgData || !imgData.imageUrl) return null;

      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          const imageResponse = await fetch(imgData.imageUrl, { signal: AbortSignal.timeout(15000) });
          if (!imageResponse.ok) continue;

          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          if (buffer.length < 100) continue;

          const urlParts = imgData.imageUrl.split("/");
          let filename = urlParts[urlParts.length - 1].split("?")[0];
          if (!filename || !filename.includes(".")) filename = `image_${row.id}.jpg`;
          return { buffer, filename };
        } catch (err) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      console.warn(`[Download-Folder] Skipping image ${row.id} after 3 attempts`);
      return null;
    };

    const CONCURRENCY = 15;
    let processed = 0;
    for (let i = 0; i < imgResult.rows.length; i += CONCURRENCY) {
      const batch = imgResult.rows.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map(fetchWithRetry));
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          archive.append(r.value.buffer, { name: r.value.filename });
          processed++;
        }
      }
    }

    archive.finalize();
    await done;

    const zipBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitize(folderName)}_${Date.now()}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    res.send(zipBuffer);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

app.get("/api/download-all", verifyToken, async (req, res) => {
  const CONCURRENCY = 15;
  const PER_IMAGE_TIMEOUT = 15000;
  const MAX_RETRIES = 2;
  const DOWNLOAD_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];

  try {
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
    const archive = archiver("zip", { zlib: { level: 1 } });
    const chunks = [];

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => { throw err; });

    const done = new Promise((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    const fetchWithRetry = async (row) => {
      const imgData = typeof row.image_data === "string"
        ? JSON.parse(row.image_data)
        : row.image_data;
      if (!imgData || !imgData.imageUrl) return null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const imageResponse = await fetch(imgData.imageUrl, {
            signal: AbortSignal.timeout(PER_IMAGE_TIMEOUT),
          });
          if (!imageResponse.ok) continue;

          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          if (buffer.length < 100) continue;

          const folderPath = sanitize(row.folder_name);
          const urlParts = imgData.imageUrl.split("/");
          let filename = urlParts[urlParts.length - 1].split("?")[0];
          if (!filename || !filename.includes(".")) filename = `image_${row.id}.jpg`;
          return { buffer, name: `${folderPath}/${filename}` };
        } catch (err) {
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
      console.warn(`[Download-All] Skipping image ${row.id} after ${MAX_RETRIES + 1} attempts`);
      return null;
    };

    let processed = 0;
    const total = imgResult.rows.length;

    for (let i = 0; i < total; i += CONCURRENCY) {
      const batch = imgResult.rows.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map(fetchWithRetry));
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          archive.append(r.value.buffer, { name: r.value.name });
          processed++;
        }
      }
    }

    archive.finalize();
    await done;

    console.log(`[Download-All] Completed: ${processed}/${total} images zipped`);
    const zipBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="all_images_${Date.now()}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(zipBuffer);
  } catch (error) {
    console.error("[Download-All] Fatal:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

let isImporting = false;
let lastImportResult = null;

const importCloudinaryAssets = async () => {
  if (isImporting) return { status: 'skipped', reason: 'already running' };
  if (!process.env.CLOUDINARY_CLOUD_NAME) return { status: 'skipped', reason: 'no cloudinary config' };

  isImporting = true;
  const stats = { totalCloudinary: 0, totalDb: 0, importedCount: 0, skippedCount: 0, errorCount: 0, imported: [], errors: [] };

  console.log('[Auto-Sync] Starting Cloudinary import...');
  try {
    const dbResult = await pool.query("SELECT image_data FROM image_management");
    const dbUrlsAndFolders = new Map(
      dbResult.rows.map(r => {
        const d = typeof r.image_data === "string" ? JSON.parse(r.image_data) : r.image_data;
        return [d?.imageUrl, d];
      }).filter(([url]) => url)
    );
    stats.totalDb = dbUrlsAndFolders.size;

    let cursor = null;
    let allAssets = [];

    do {
      const params = { type: 'upload', prefix: 'image_management/', max_results: 500 };
      if (cursor) params.next_cursor = cursor;
      const page = await cloudinary.api.resources(params);
      allAssets = allAssets.concat(page.resources);
      cursor = page.next_cursor;
    } while (cursor);

    stats.totalCloudinary = allAssets.length;
    console.log(`[Auto-Sync] Cloudinary has ${allAssets.length} assets, DB has ${dbUrlsAndFolders.size} records`);

    const seenPublicIds = new Set();

    for (const asset of allAssets) {
      if (dbUrlsAndFolders.has(asset.secure_url)) {
        stats.skippedCount++;
        continue;
      }
      if (seenPublicIds.has(asset.public_id)) {
        stats.skippedCount++;
        continue;
      }
      seenPublicIds.add(asset.public_id);

      try {
        const pathParts = asset.public_id.split("/");
        const folderName = pathParts.length >= 2 ? pathParts[1] : "uncategorized";
        const rawName = pathParts[pathParts.length - 1]?.replace(/\.\w+$/, "") || "";
        const dateStr = asset.created_at ? new Date(asset.created_at).toISOString().split("T")[0] : "";
        let displayName = rawName
          .replace(/[_-]/g, " ")
          .replace(/\d{13,}/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!displayName || displayName.replace(/\d+/g, "").trim().length < 2) {
          displayName = dateStr ? `Image ${dateStr}` : "Imported Image";
        }

        try {
          await pool.query(
            `INSERT INTO folders (name, description, created_by, scope) VALUES ($1, '', 'system', 'home') ON CONFLICT (name) DO NOTHING`,
            [folderName]
          );
        } catch (folderErr) {
          stats.errors.push({ public_id: asset.public_id, step: 'folder_insert', error: folderErr.message });
        }

        const imageData = {
          imageUrl: asset.secure_url,
          colourCombination: [],
          designName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          eventType: "Other",
          decorType: "Other",
          uploadedAt: asset.created_at,
          cloudinaryPublicId: asset.public_id,
        };

        const insertResult = await pool.query(
          `INSERT INTO image_management (folder_name, image_data, employee_id) VALUES ($1, $2, 'system') RETURNING id`,
          [folderName, JSON.stringify(imageData)]
        );

        stats.importedCount++;
        if (stats.importedCount <= 20) {
          stats.imported.push({
            public_id: asset.public_id,
            url: asset.secure_url,
            folder: folderName,
            db_id: insertResult.rows[0].id,
          });
        }
      } catch (importErr) {
        stats.errorCount++;
        stats.errors.push({ public_id: asset.public_id, error: importErr.message });
      }
    }

    console.log(`[Auto-Sync] Imported ${stats.importedCount}, skipped ${stats.skippedCount}, errors ${stats.errorCount}`);
  } catch (err) {
    console.error('[Auto-Sync] Fatal error:', err.message);
    stats.error = err.message;
  } finally {
    isImporting = false;
    lastImportResult = { ...stats, finishedAt: new Date().toISOString() };
  }

  return stats;
};

app.post("/api/sync/cloudinary", verifyToken, async (req, res) => {
  try {
    const SYNC_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const allowed = SYNC_ROLES.map(r => r.toLowerCase()).includes(userRole);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const { action } = req.body;
    if (!action || !["dry-run", "import"].includes(action)) {
      return res.status(400).json({ message: "action must be 'dry-run' or 'import'" });
    }

    if (action === "import") {
      if (isImporting) return res.status(409).json({ message: "Import already in progress" });
      const stats = await importCloudinaryAssets();
      return res.json({ message: "Import completed", ...stats });
    }

    const allAssets = [];
    let cursor = null;
    do {
      const params = { type: 'upload', prefix: 'image_management/', max_results: 500 };
      if (cursor) params.next_cursor = cursor;
      const page = await cloudinary.api.resources(params);
      allAssets.push(...page.resources);
      cursor = page.next_cursor;
    } while (cursor);

    const dbResult = await pool.query("SELECT image_data FROM image_management");
    const dbUrls = new Set(
      dbResult.rows.map(r => {
        const d = typeof r.image_data === "string" ? JSON.parse(r.image_data) : r.image_data;
        return d?.imageUrl;
      }).filter(Boolean)
    );

    const orphaned = allAssets.filter(a => !dbUrls.has(a.secure_url)).map(a => ({
      public_id: a.public_id,
      url: a.secure_url,
      folder: a.public_id.split("/").slice(0, -1).join("/"),
      created_at: a.created_at,
    }));

    res.json({
      totalCloudinary: allAssets.length,
      totalDb: dbUrls.size,
      orphanedCount: orphaned.length,
      orphaned,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/sync/cloudinary/status", verifyToken, async (req, res) => {
  res.json({ isImporting, lastImportResult });
});

app.get("/api/sync/cloudinary/diagnose", verifyToken, async (req, res) => {
  try {
    const SYNC_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const allowed = SYNC_ROLES.map(r => r.toLowerCase()).includes(userRole);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const allAssets = [];
    let cursor = null;
    do {
      const params = { type: 'upload', prefix: 'image_management/', max_results: 500 };
      if (cursor) params.next_cursor = cursor;
      const page = await cloudinary.api.resources(params);
      allAssets.push(...page.resources);
      cursor = page.next_cursor;
    } while (cursor);

    const dbResult = await pool.query("SELECT image_data, folder_name FROM image_management");
    const dbByUrl = new Map();
    const dbFolders = new Set();
    for (const r of dbResult.rows) {
      const d = typeof r.image_data === "string" ? JSON.parse(r.image_data) : r.image_data;
      if (d?.imageUrl) dbByUrl.set(d.imageUrl, r.folder_name);
      dbFolders.add(r.folder_name);
    }

    const cloudFolders = {};
    for (const asset of allAssets) {
      const pathParts = asset.public_id.split("/");
      const folder = pathParts.length >= 2 ? pathParts[1] : "uncategorized";
      if (!cloudFolders[folder]) cloudFolders[folder] = { cloudinary: 0, inDb: 0, missing: [] };
      cloudFolders[folder].cloudinary++;
      if (dbByUrl.has(asset.secure_url)) {
        cloudFolders[folder].inDb++;
      } else {
        cloudFolders[folder].missing.push({
          public_id: asset.public_id,
          url: asset.secure_url,
          created_at: asset.created_at,
        });
      }
    }

    const dbOnlyFolders = [];
    for (const f of dbFolders) {
      if (!cloudFolders[f]) {
        dbOnlyFolders.push(f);
      }
    }

    res.json({
      totalCloudinary: allAssets.length,
      totalDb: dbByUrl.size,
      cloudFolders,
      dbOnlyFolders,
      missingTotal: allAssets.length - dbByUrl.size,
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
module.exports.importCloudinaryAssets = importCloudinaryAssets;
