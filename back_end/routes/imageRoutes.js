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
  getSuggestions,
  getReport,
  VIEW_ROLES,
  UPLOAD_ROLES,
  DELETE_ROLES,
  FOLDER_VIEW_ROLES,
} = require("../controllers/imageController");

// Get all images - accessible by all roles
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

// Get autocomplete suggestions
router.get(
  "/suggestions",
  verifyToken,
  allowRoles(VIEW_ROLES),
  getSuggestions
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

// Delete image - accessible by edit/delete roles
router.delete(
  "/:id",
  verifyToken,
  allowRoles(DELETE_ROLES),
  deleteImage
);

// Update image folder - accessible by edit/delete roles
router.put(
  "/:id/folder",
  verifyToken,
  allowRoles(DELETE_ROLES),
  updateImageFolder
);

// Update image metadata - accessible by edit/delete roles
router.put(
  "/:id",
  verifyToken,
  allowRoles(DELETE_ROLES),
  updateImage
);

// Report - accessible only by CEO and Admin
const REPORT_ROLES = ["ceo", "admin"];
router.get(
  "/report/all",
  verifyToken,
  allowRoles(REPORT_ROLES),
  getReport
);

module.exports = router;