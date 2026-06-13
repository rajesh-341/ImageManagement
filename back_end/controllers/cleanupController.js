const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const BACKUP_DIR = path.join(__dirname, "..", "backups");

function ensureBackupDir() {
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

const runCleanup = async (req, res) => {
  try {
    const role = req.user.role;
    const roleLower = role ? role.toLowerCase() : "";
    const allowedRoles = ["ceo", "admin"];

    if (!allowedRoles.includes(roleLower)) {
      return res.status(403).json({ message: "Access denied. Only CEO and Admin can run cleanup." });
    }

    const confirm = req.query.confirm === "true";

    ensureBackupDir();
    const ts = timestamp();

    const orphanedFolders = await findOrphanedFolders();
    const orphanedImages = await findOrphanedImages();
    const orphanedFavMappings = await findOrphanedFavMappings();

    const result = {
      dryRun: !confirm,
      timestamp: new Date().toISOString(),
      orphanedFolders: { count: orphanedFolders.length, records: orphanedFolders },
      orphanedImages: { count: orphanedImages.length, records: orphanedImages },
      orphanedFavMappings: { count: orphanedFavMappings.length, records: orphanedFavMappings },
    };

    if (orphanedFolders.length === 0 && orphanedImages.length === 0 && orphanedFavMappings.length === 0) {
      return res.json({ message: "No orphaned records found. Database is clean.", ...result });
    }

    const backupFile = writeBackup(`orphans-backup-${ts}.json`, result);
    result.backupFile = backupFile;

    if (!confirm) {
      return res.json({
        message: `Dry run. Found ${orphanedFolders.length} empty folders, ${orphanedImages.length} orphaned images, ${orphanedFavMappings.length} orphaned favourite mappings. Pass ?confirm=true to delete.`,
        ...result,
      });
    }

    await deleteOrphanedFavMappings(orphanedFavMappings.map(r => r.id));
    await deleteOrphanedFolders(orphanedFolders.map(r => r.id));
    await deleteOrphanedImages(orphanedImages.map(r => r.id));

    res.json({
      message: `Cleanup complete. Deleted ${orphanedFolders.length} empty folders, ${orphanedImages.length} orphaned images, ${orphanedFavMappings.length} orphaned favourite mappings.`,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { runCleanup };
