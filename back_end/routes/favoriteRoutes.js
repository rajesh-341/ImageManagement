const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteFolders,
  createFavoriteFolder,
  addImageToFavouriteFolder,
  removeImageFromFavouriteFolder,
  addImagesToFavouriteFolder,
} = require("../controllers/favoriteController");

router.use(verifyToken);

router.get("/", getFavorites);
router.post("/", addFavorite);
router.delete("/:imageId", removeFavorite);
router.get("/folders", getFavoriteFolders);
router.post("/folders", createFavoriteFolder);
router.post("/folder-images", addImageToFavouriteFolder);
router.delete("/folder-images", removeImageFromFavouriteFolder);
router.post("/folder-images/batch", addImagesToFavouriteFolder);

module.exports = router;
