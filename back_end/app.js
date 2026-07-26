require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const timeout = require("connect-timeout");
const multer = require("multer");
const { saveImage, isLocal } = require("./config/storage");
const path = require("path");
const { ZipArchive } = require("archiver");

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

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(200).json({ status: "ok", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:3000"];

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", ...ALLOWED_ORIGINS],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGINS,
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

const DOWNLOAD_ROLES = ["Owner", "CEO", "Marketing Head", "Admin", "Event Managers"];

function hasDownloadRole(user) {
  const role = user && user.role ? user.role.toLowerCase() : "";
  return DOWNLOAD_ROLES.map(r => r.toLowerCase()).includes(role);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryFolderImagesWithRetry(pool, folderId, userId, maxRetries = 2, retryDelayMs = 500) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const mappingResult = await pool.query(
      `SELECT im.id, im.image_data FROM image_management im
       INNER JOIN favourite_folder_mapping ffm ON im.id = ffm.image_id
       WHERE ffm.folder_id = $1 AND ffm.employee_id = $2
       ORDER BY im.id`,
      [folderId, userId]
    );
    if (mappingResult.rows.length > 0) return mappingResult;
    if (attempt < maxRetries) await sleep(retryDelayMs * (attempt + 1));
  }
  return { rows: [] };
}

app.get("/api/download-folder/:folderName", verifyToken, async (req, res) => {
  try {
    if (!hasDownloadRole(req.user)) return res.status(403).json({ message: "Access denied" });

    const folderName = req.params.folderName;
    const imgResult = await pool.query(
      `SELECT id, image_data FROM image_management WHERE folder_name = $1 ORDER BY id`,
      [folderName]
    );
    if (imgResult.rows.length === 0) return res.status(404).json({ message: "No images found in this folder" });

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const archive = new ZipArchive({ zlib: { level: 0 } });
    archive.on("error", (err) => {
      console.error("[Download-Folder] Archive error:", err.message);
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitize(folderName)}_${Date.now()}.zip"`);
    archive.pipe(res);

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

    const CONCURRENCY = 20;
    for (let i = 0; i < imgResult.rows.length; i += CONCURRENCY) {
      const batch = imgResult.rows.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map(fetchWithRetry));
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          archive.append(r.value.buffer, { name: r.value.filename });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

app.get("/api/download-favorite-folder/:folderId", verifyToken, async (req, res) => {
  try {
    if (!hasDownloadRole(req.user)) return res.status(403).json({ message: "Access denied" });

    const folderId = parseInt(req.params.folderId, 10);
    if (isNaN(folderId)) return res.status(400).json({ message: "Invalid folder ID" });

    const folderResult = await pool.query("SELECT name FROM folders WHERE id = $1", [folderId]);
    const folderName = folderResult.rows.length > 0 ? folderResult.rows[0].name : `folder_${folderId}`;

    const mappingResult = await queryFolderImagesWithRetry(pool, folderId, req.user.userId);
    if (mappingResult.rows.length === 0) return res.status(404).json({ message: "No images found in this folder" });

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const safeFolderName = sanitize(folderName);
    const archive = new ZipArchive({ zlib: { level: 0 } });
    archive.on("error", (err) => {
      console.error("[Download-Favorite-Folder] Archive error:", err.message);
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="favorite_folder_${folderId}_${Date.now()}.zip"`);
    archive.pipe(res);

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
      console.warn(`[Download-Favorite-Folder] Skipping image ${row.id} after 3 attempts`);
      return null;
    };

    const CONCURRENCY = 20;
    for (let i = 0; i < mappingResult.rows.length; i += CONCURRENCY) {
      const batch = mappingResult.rows.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map(fetchWithRetry));
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          archive.append(r.value.buffer, { name: `${safeFolderName}/${r.value.filename}` });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("[Download-Favorite-Folder] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

app.post("/api/download-favorite-folders", verifyToken, async (req, res) => {
  try {
    if (!hasDownloadRole(req.user)) return res.status(403).json({ message: "Access denied" });

    const { folderIds } = req.body;
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({ message: "folderIds array is required" });
    }

    const archive = new ZipArchive({ zlib: { level: 0 } });
    archive.on("error", (err) => console.error("[Download-Favorite-Folders] Archive error:", err.message));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="Favourite_zip_${Date.now()}.zip"`);
    archive.pipe(res);

    const fetchWithRetry = async (row, folderPrefix) => {
      const imgData = typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data;
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
          return { buffer, filename, folderPrefix };
        } catch (err) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      console.warn(`[Download-Favorite-Folders] Skipping image ${row.id} after 3 attempts`);
      return null;
    };

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const CONCURRENCY = 20;
    const allTasks = [];

    for (const fId of folderIds) {
      const fIdNum = parseInt(fId, 10);
      if (isNaN(fIdNum)) continue;

      const folderResult = await pool.query("SELECT name FROM folders WHERE id = $1", [fIdNum]);
      const folderName = folderResult.rows.length > 0 ? folderResult.rows[0].name : `folder_${fIdNum}`;
      const safeName = sanitize(folderName);

      const mappingResult = await queryFolderImagesWithRetry(pool, fIdNum, req.user.userId);

      for (const row of mappingResult.rows) {
        allTasks.push(fetchWithRetry(row, safeName));
      }
    }

    if (allTasks.length === 0) {
      if (!res.headersSent) {
        return res.status(404).json({ message: "No images found in the selected folders" });
      }
      return archive.finalize();
    }

    for (let i = 0; i < allTasks.length; i += CONCURRENCY) {
      const batch = allTasks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch);
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) {
          archive.append(r.value.buffer, { name: `Favourite_zip/${r.value.folderPrefix}/${r.value.filename}` });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("[Download-Favorite-Folders] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

app.get("/api/download-all", verifyToken, async (req, res) => {
  const CONCURRENCY = 20;
  const PER_IMAGE_TIMEOUT = 15000;
  const MAX_RETRIES = 2;

  try {
    if (!hasDownloadRole(req.user)) return res.status(403).json({ message: "Access denied" });

    const imgResult = await pool.query(
      `SELECT id, folder_name, image_data FROM image_management
       WHERE (folder_name IN (SELECT name FROM folders WHERE scope = 'home' OR scope IS NULL) OR folder_name NOT IN (SELECT name FROM folders))
       ORDER BY folder_name, id`
    );
    if (imgResult.rows.length === 0) return res.status(404).json({ message: "No images found" });

    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
    const archive = new ZipArchive({ zlib: { level: 0 } });
    archive.on("error", (err) => {
      console.error("[Download-All] Archive error:", err.message);
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="all_images_${Date.now()}.zip"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    archive.pipe(res);

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

    await archive.finalize();
    console.log(`[Download-All] Completed: ${processed}/${total} images zipped`);
  } catch (error) {
    console.error("[Download-All] Fatal:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || "Download failed" });
    }
  }
});

app.post("/api/destroy-image", verifyToken, async (req, res) => {
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
