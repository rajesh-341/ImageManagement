const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteFolders,
  createFavoriteFolder,
} = require("../controllers/favoriteController");

router.use(verifyToken);

router.get("/", getFavorites);
router.post("/", addFavorite);
router.delete("/:imageId", removeFavorite);
router.get("/folders", getFavoriteFolders);
router.post("/folders", createFavoriteFolder);

module.exports = router;
