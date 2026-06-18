require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } = require("../config/r2");
const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const BACKUP_DIR = path.join(__dirname, "..", "backups");
const CONCURRENCY = 10;
const TIMEOUT_MS = 30000;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeBackup(filename, data) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("res.cloudinary.com");
}

function isR2Url(url) {
  if (typeof url !== "string") return false;
  if (url.includes("r2.cloudflarestorage.com")) return true;
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL.replace(/\/+$/, ""))) return true;
  return false;
}

function isLocalUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function extractFolderFromKey(key) {
  const parts = key.split("/");
  return parts.length >= 2 ? parts[1] : "uncategorized";
}

async function getAllImages() {
  const result = await pool.query("SELECT id, folder_name, image_data FROM image_management ORDER BY id");
  return result.rows.map(row => ({
    ...row,
    image_data: typeof row.image_data === "string" ? JSON.parse(row.image_data) : row.image_data,
  }));
}

async function fetchImageBuffer(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) throw new Error(`Image too small: ${buffer.length} bytes`);
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadToR2(buffer, folder) {
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase();
  const key = `image_management/${sanitizedFolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "image/webp",
  });

  await getR2Client().send(command);

  const baseUrl = R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${R2_BUCKET_NAME}`;
  const imageUrl = `${baseUrl.replace(/\/+$/, "")}/${key}`;

  return { key, imageUrl };
}

async function updateImageInDb(id, newUrl, oldUrl) {
  const result = await pool.query(
    `UPDATE image_management
     SET image_data = jsonb_set(image_data, '{imageUrl}', $1::jsonb),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id`,
    [JSON.stringify(newUrl), id]
  );
  return result.rows.length > 0;
}

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");
  const isForce = process.argv.includes("--force") || process.argv.includes("-f");

  console.log("=== Cloudinary to R2 Migration ===\n");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`R2 Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  if (!R2_BUCKET_NAME || !process.env.R2_ENDPOINT) {
    console.error("ERROR: R2 configuration not found in .env. Check R2_ENDPOINT and R2_BUCKET_NAME.");
    process.exit(1);
  }

  console.log("Scanning database for Cloudinary images...\n");
  const allImages = await getAllImages();
  console.log(`Total images in DB: ${allImages.length}`);

  const cloudinaryImages = allImages.filter(img => isCloudinaryUrl(img.image_data?.imageUrl));
  const r2Images = allImages.filter(img => isR2Url(img.image_data?.imageUrl));
  const localImages = allImages.filter(img => isLocalUrl(img.image_data?.imageUrl));
  const unknownImages = allImages.filter(
    img => img.image_data?.imageUrl && !isCloudinaryUrl(img.image_data?.imageUrl) && !isR2Url(img.image_data?.imageUrl) && !isLocalUrl(img.image_data?.imageUrl)
  );

  console.log(`Cloudinary URLs: ${cloudinaryImages.length}`);
  console.log(`Already R2 URLs: ${r2Images.length}`);
  console.log(`Local URLs: ${localImages.length}`);
  console.log(`Unknown URLs: ${unknownImages.length}`);
  console.log("");

  if (cloudinaryImages.length === 0) {
    console.log("No Cloudinary images found. Nothing to migrate.");
    await pool.end();
    return;
  }

  const backupData = cloudinaryImages.map(img => ({
    id: img.id,
    folder_name: img.folder_name,
    old_imageUrl: img.image_data.imageUrl,
  }));
  const backupFile = writeBackup(`migration-backup-${timestamp()}.json`, backupData);
  console.log(`Backup saved to: ${backupFile}`);

  if (isDryRun) {
    console.log("\nDry run complete. No changes made.");
    console.log(`Would migrate ${cloudinaryImages.length} images from Cloudinary to R2.`);
    await pool.end();
    return;
  }

  if (!isForce) {
    console.log("\nThis is a LIVE migration. To proceed, re-run with --force flag.");
    console.log("Review the backup file before proceeding.");
    await pool.end();
    return;
  }

  console.log("\nStarting migration...\n");

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const errors = [];

  const batches = [];
  for (let i = 0; i < cloudinaryImages.length; i += CONCURRENCY) {
    batches.push(cloudinaryImages.slice(i, i + CONCURRENCY));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const batchPromises = batch.map(async (img) => {
      const oldUrl = img.image_data.imageUrl;
      const folder = img.folder_name || extractFolderFromKey(oldUrl);

      try {
        process.stdout.write(`[${img.id}] Downloading... `);
        const buffer = await fetchImageBuffer(oldUrl);
        process.stdout.write(`Uploading... `);
        const { imageUrl: newUrl } = await uploadToR2(buffer, folder);
        await updateImageInDb(img.id, newUrl, oldUrl);
        process.stdout.write(`Done -> ${newUrl.slice(0, 60)}...\n`);
        return { id: img.id, status: "success", oldUrl, newUrl };
      } catch (err) {
        process.stdout.write(`FAILED: ${err.message}\n`);
        return { id: img.id, status: "error", oldUrl, error: err.message };
      }
    });

    const results = await Promise.allSettled(batchPromises);
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.status === "success") successCount++;
        else {
          errorCount++;
          errors.push(r.value);
        }
      } else {
        errorCount++;
        errors.push({ error: r.reason?.message || "Unknown" });
      }
    }

    const done = successCount + errorCount + skipCount;
    const total = cloudinaryImages.length;
    const pct = ((done / total) * 100).toFixed(1);
    console.log(`\nProgress: ${done}/${total} (${pct}%) - ${successCount} success, ${errorCount} failed\n`);
  }

  console.log("=== Migration Complete ===");
  console.log(`Total Cloudinary images: ${cloudinaryImages.length}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Skipped: ${skipCount}`);

  if (errors.length > 0) {
    const errorFile = writeBackup(`migration-errors-${timestamp()}.json`, errors);
    console.log(`\nErrors saved to: ${errorFile}`);
    console.log("Review errors and re-run for failed items.");
  }

  await pool.end();
}

runMigration().catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
