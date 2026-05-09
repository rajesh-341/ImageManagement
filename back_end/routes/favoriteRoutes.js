const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteStatus,
} = require("../controllers/favoriteController");

router.use(verifyToken);

router.get("/", getFavorites);
router.get("/status", getFavoriteStatus);
router.post("/", addFavorite);
router.delete("/:imageId", removeFavorite);

module.exports = router;
