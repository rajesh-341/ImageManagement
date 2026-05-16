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
