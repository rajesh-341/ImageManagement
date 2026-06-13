const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const BACKUP_DIR = path.join(__dirname, "..", "backups");

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeBackup(filename, data) {
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

async function findOrphanedFolders() {
  const result = await pool.query(`
    SELECT f.*
    FROM folders f
    LEFT JOIN image_management im ON f.name = im.folder_name
    WHERE im.id IS NULL AND (f.scope = 'home' OR f.scope IS NULL)
    ORDER BY f.created_at DESC
  `);
  return result.rows;
}

async function findOrphanedImages() {
  const result = await pool.query(`
    SELECT im.*
    FROM image_management im
    WHERE im.folder_name NOT IN (
      SELECT name FROM folders WHERE scope = 'home' OR scope IS NULL
    )
    ORDER BY im.created_at DESC
  `);
  return result.rows;
}

async function findOrphanedFavMappings() {
  const result = await pool.query(`
    SELECT ffm.*
    FROM favourite_folder_mapping ffm
    WHERE NOT EXISTS (SELECT 1 FROM folders WHERE id = ffm.folder_id)
       OR NOT EXISTS (SELECT 1 FROM image_management WHERE id = ffm.image_id)
  `);
  return result.rows;
}

async function deleteOrphanedFolders(ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await pool.query(`DELETE FROM folders WHERE id IN (${placeholders})`, ids);
}

async function deleteOrphanedImages(ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await pool.query(`DELETE FROM image_management WHERE id IN (${placeholders})`, ids);
}

async function deleteOrphanedFavMappings(ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await pool.query(`DELETE FROM favourite_folder_mapping WHERE id IN (${placeholders})`, ids);
}

async function runCleanup() {
  console.log("Starting orphan cleanup...\n");

  await ensureBackupDir();
  const ts = timestamp();

  const orphanedFolders = await findOrphanedFolders();
  console.log(`Found ${orphanedFolders.length} empty folders (no images).`);

  const orphanedImages = await findOrphanedImages();
  console.log(`Found ${orphanedImages.length} images with non-existent folder_name.`);

  const orphanedFavMappings = await findOrphanedFavMappings();
  console.log(`Found ${orphanedFavMappings.length} orphaned favourite_folder_mapping records.`);

  if (orphanedFolders.length === 0 && orphanedImages.length === 0 && orphanedFavMappings.length === 0) {
    console.log("\nNo orphaned records found. Database is clean.");
    await pool.end();
    return;
  }

  const backup = {
    timestamp: new Date().toISOString(),
    orphanedFolders,
    orphanedImages,
    orphanedFavMappings,
  };

  const backupFile = writeBackup(`orphans-backup-${ts}.json`, backup);
  console.log(`\nBackup saved to: ${backupFile}`);

  const confirm = process.argv.includes("--force")
    || process.argv.includes("-f")
    || process.env.CLEANUP_CONFIRM === "yes";

  if (!confirm) {
    console.log("\nDry run complete. To delete orphans, re-run with --force flag.");
    console.log("Review the backup file before proceeding.");
    await pool.end();
    return;
  }

  console.log("\nProceeding with deletion...");

  await deleteOrphanedFavMappings(orphanedFavMappings.map(r => r.id));
  console.log(`Deleted ${orphanedFavMappings.length} orphaned favourite_folder_mapping records.`);

  await deleteOrphanedFolders(orphanedFolders.map(r => r.id));
  console.log(`Deleted ${orphanedFolders.length} empty folders.`);

  await deleteOrphanedImages(orphanedImages.map(r => r.id));
  console.log(`Deleted ${orphanedImages.length} images with non-existent folders.`);

  console.log("\nCleanup complete. Backup saved for recovery if needed.");
  await pool.end();
}

runCleanup().catch(err => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
