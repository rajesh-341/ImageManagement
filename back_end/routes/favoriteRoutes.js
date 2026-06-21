const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteFolders,
  createFavoriteFolder,
  updateFavoriteFolder,
  deleteFavoriteFolder,
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
router.put("/folders/:id", updateFavoriteFolder);
router.delete("/folders/:id", deleteFavoriteFolder);
router.post("/folder-images", addImageToFavouriteFolder);
router.delete("/folder-images", removeImageFromFavouriteFolder);
router.post("/folder-images/batch", addImagesToFavouriteFolder);

module.exports = router;
