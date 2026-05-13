const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const { getUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");

router.get("/", verifyToken, getUsers);
router.post("/", verifyToken, createUser);
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyToken, deleteUser);

module.exports = router;
