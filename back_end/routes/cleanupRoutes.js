const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { runCleanup } = require("../controllers/cleanupController");

router.post("/", verifyToken, runCleanup);

module.exports = router;
