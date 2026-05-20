require("dotenv").config();
process.env.JWT_SECRET
process.env.PORT

const app = require("./app");
const runMigrations = require("./migrations");

const PORT = process.env.PORT || 5000;

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    app.importCloudinaryAssets().then(result => {
      if (result.status === 'skipped') {
        console.log(`[Auto-Sync] ${result.reason}`);
      } else {
        console.log(`[Auto-Sync] Imported ${result.importedCount}, skipped ${result.skippedCount}, errors ${result.errorCount} (Cloudinary: ${result.totalCloudinary}, DB: ${result.totalDb})`);
      }
    });
  });
});
