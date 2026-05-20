const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { createFolder, getFolders, updateFolder, deleteFolder } = require("../controllers/folderController");
const { UPLOAD_ROLES, FOLDER_VIEW_ROLES } = require("../controllers/imageController");

router.post(
  "/",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  createFolder
);

router.get(
  "/",
  verifyToken,
  allowRoles(FOLDER_VIEW_ROLES),
  getFolders
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  updateFolder
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  deleteFolder
);

module.exports = router;
