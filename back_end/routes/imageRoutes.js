const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const { 
  getImages, 
  getFolders, 
  uploadImage, 
  deleteImage, 
  getImageById,
  updateImageFolder,
  updateImage,
  VIEW_ROLES,
  UPLOAD_ROLES,
  DELETE_ROLES
} = require("../controllers/imageController");

// Get all images - accessible by defined roles
router.get(
  "/",
  verifyToken,
  allowRoles(VIEW_ROLES),
  getImages
);

// Get unique folders
router.get(
  "/folders",
  verifyToken,
  allowRoles(VIEW_ROLES),
  getFolders
);

// Get single image by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(VIEW_ROLES),
  getImageById
);

// Upload image - Captain, ViceCaptain, Owner only
router.post(
  "/",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  uploadImage
);

// Delete image - Captain, ViceCaptain, Owner only
router.delete(
  "/:id",
  verifyToken,
  allowRoles(DELETE_ROLES),
  deleteImage
);

// Update image folder - Captain, ViceCaptain, Owner only
router.put(
  "/:id/folder",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  updateImageFolder
);

// Update image metadata
router.put(
  "/:id",
  verifyToken,
  allowRoles(UPLOAD_ROLES),
  updateImage
);

module.exports = router;