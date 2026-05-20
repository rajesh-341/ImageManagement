import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import FilterSidebar from "../components/FilterSidebar";
import ColorPicker from "../components/ColorPicker";
import AutocompleteInput from "../components/AutocompleteInput";
import FolderCard from "../components/FolderCard";
import {
  UPLOAD_ROLES, EDIT_DELETE_ROLES, FOLDER_VIEW_ROLES,
  SIZE_UNITS, FLOWER_TYPES, EVENT_TYPES, DECOR_TYPES,
  BATCH_COLORS, SAME_FIELDS,
} from "../constants";
import "./ImageManagement.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function ImageManagement() {
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState("single");
  const [selectedImage, setSelectedImage] = useState(null);
  const [batchImages, setBatchImages] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [view, setView] = useState("folders");
  const [filteredImages, setFilteredImages] = useState([]);
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedImageIds, setSelectedImageIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [allImagesPage, setAllImagesPage] = useState(1);
  const [allImagesHasMore, setAllImagesHasMore] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteImages, setFavoriteImages] = useState([]);
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [showAddFavFolderModal, setShowAddFavFolderModal] = useState(false);
  const [favCustName, setFavCustName] = useState("");
  const [favVenue, setFavVenue] = useState("");
  const [favEventDate, setFavEventDate] = useState("");
  const [favFolderDesc, setFavFolderDesc] = useState("");
  const [selectedFavFolder, setSelectedFavFolder] = useState(null);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderVenue, setEditFolderVenue] = useState("");
  const [editFolderDate, setEditFolderDate] = useState("");
  const [commonSearch, setCommonSearch] = useState("");
  const [commonSearchType, setCommonSearchType] = useState("designName");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editData, setEditData] = useState({});
  const getFormConfigKey = () => {
    const u = ApiService.getCurrentUser();
    return u ? `formConfig_${u.username || u.displayName || "default"}` : "formConfig";
  };

  const [formConfig, setFormConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getFormConfigKey())) || {}; } catch { return {}; }
  });
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [batchColorPickerIndex, setBatchColorPickerIndex] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadResolve, setDownloadResolve] = useState(null);

  const showNotif = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const saveFormConfig = (config) => {
    setFormConfig(config);
    localStorage.setItem(getFormConfigKey(), JSON.stringify(config));
  };

  const isFieldRequired = (fieldKey) => formConfig[fieldKey] !== false;

  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: "", displayName: "", role: "", password: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [folderDescription, setFolderDescription] = useState("");

  const [imageData, setImageData] = useState({
    designName: "",
    eventType: "",
    decorType: "",
    venueDate: "",
    sizeWidth: "",
    sizeLength: "",
    sizeHeight: "",
    sizeUnit: "sq.ft",
    colours: [],
    flowerType: "",
    priceMin: "",
    priceMax: "",
  });

  const navigate = useNavigate();
  const batchImageRef = useRef(null);
  const imageFileRef = useRef(null);
  const formSettingsRef = useRef(null);

  useEffect(() => {
    const checkAuth = () => {
      const user = ApiService.getCurrentUser();
      if (!user) {
        navigate("/", { replace: true });
        return;
      }
      setUser(user);
    };
    checkAuth();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkAuth();
    };
    const handlePopState = () => checkAuth();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadFolders();
      loadFavorites();
      const isFolderViewUser = user && FOLDER_VIEW_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
      if (!isFolderViewUser) {
        setView("images");
        loadAllImages();
      }
    }
  }, [user]);

  useEffect(() => {
    if (currentFolder) {
      loadImages();
      loadFavorites();
    }
  }, [currentFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFolders = async () => {
    try {
      const folderList = await ApiService.getFolders("home");
      setFolders(folderList);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  const loadImages = async (pageNum = 1, append = false) => {
    if (!currentFolder) { setImages([]); return; }
    setLoading(true);
    try {
      const result = await ApiService.getImages(currentFolder.name, pageNum, 50);
      if (append) {
        setImages(prev => [...prev, ...result.images]);
      } else {
        setImages(result.images);
      }
      setPage(pageNum);
      setHasMore(result.hasMore);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreImages = () => {
    if (!loading && hasMore) loadImages(page + 1, true);
  };

  const loadAllImages = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const result = await ApiService.getAllImages();
      setAllImages(result.images);
      setAllImagesHasMore(result.hasMore);
      setAllImagesPage(pageNum);
    } catch (err) {
      console.error("Failed to load images:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreAllImages = async () => {
    if (!loading && allImagesHasMore) {
      const nextPage = allImagesPage + 1;
      setLoading(true);
      try {
        const result = await ApiService.getImages(null, nextPage, 50);
        setAllImages(prev => [...prev, ...result.images]);
        setAllImagesPage(nextPage);
        setAllImagesHasMore(result.hasMore);
      } catch (err) {
        console.error("Failed to load more images:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const loadFavorites = async (folder = null) => {
    try {
      const favs = await ApiService.getFavorites(folder);
      setFavoriteImages(favs);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  };

  const loadFavoriteFolders = async () => {
    try {
      const favFolders = await ApiService.getFavoriteFolders();
      setFavoriteFolders(favFolders);
    } catch (err) {
      console.error("Failed to load favorite folders:", err);
    }
  };

  const openLightbox = useCallback((imageArray, index) => {
    const img = imageArray[index];
    setLightboxImage({
      url: img.image_data?.imageUrl ? (img.image_data.imageUrl.startsWith("http") ? img.image_data.imageUrl : `${IMAGE_BASE_URL}${img.image_data.imageUrl}`) : "",
      data: img.image_data,
      id: img.id,
      isFav: favoriteImages.some(fav => fav.id === img.id),
      allImages: imageArray,
      currentIndex: index,
    });
  }, [favoriteImages]);

  const handleAddFolder = async (e) => {
    e.preventDefault();
    const missing = [];
    if (isFieldRequired("folder_customerName") && !customerName.trim()) missing.push("Customer Name");
    if (isFieldRequired("folder_venue") && !venueName.trim()) missing.push("Venue");
    if (isFieldRequired("folder_eventDate") && !eventDate) missing.push("Event Date");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    const folderName = `${customerName.trim()}_${venueName.trim()}_${eventDate}`;
    setLoading(true);
    try {
      await ApiService.createFolder(folderName, folderDescription.trim());
      setCustomerName("");
      setVenueName("");
      setEventDate("");
      setFolderDescription("");
      setShowAddFolderModal(false);
      loadFolders();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditFolder = (folder, e) => {
    e.stopPropagation();
    const { customerName, venue, eventDate } = parseFolderName(folder.name);
    setEditingFolder(folder);
    setEditFolderName(customerName);
    setEditFolderVenue(venue);
    setEditFolderDate(eventDate);
    setShowEditFolderModal(true);
  };

  const handleSaveEditFolder = async (e) => {
    e.preventDefault();
    if (!editingFolder) return;
    const newName = `${editFolderName.trim()}_${editFolderVenue.trim()}_${editFolderDate}`;
    if (!editFolderName.trim()) { showNotif("Customer name is required", "warning"); return; }
    setLoading(true);
    try {
      await ApiService.updateFolder(editingFolder.id, newName);
      setShowEditFolderModal(false);
      setEditingFolder(null);
      loadFolders();
      if (showFavorites) loadFavoriteFolders();
    } catch (err) {
      showNotif(err.message || "Failed to rename folder");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete folder "${name}" and all its images?`)) return;
    setLoading(true);
    try {
      await ApiService.deleteFolder(id);
      if (currentFolder && currentFolder.id === id) {
        setCurrentFolder(null);
        setImages([]);
      }
      loadFolders();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFolder = (folder) => {
    setCurrentFolder(folder);
    setView("folders");
    setFilteredImages([]);
  };

  const resetUploadForm = () => {
    setImageData({ designName: "", eventType: "", decorType: "", venueDate: "", sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft", colours: [], flowerType: "", priceMin: "", priceMax: "" });
    setSelectedImage(null);
    setImagePreview("");
    setBatchImages([]);
    setUploadProgress("");
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setImages([]);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      showNotif("Please select a valid image file", "warning");
    }
  };

  

  const handleBatchImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const totalAfterAdd = batchImages.length + files.length;
    if (totalAfterAdd > 100) {
      showNotif(`Maximum 100 images allowed per batch. You can add ${100 - batchImages.length} more.`, "warning");
      e.target.value = "";
      return;
    }
    const newRows = files.map((file) => {
      const keepSame = {};
      SAME_FIELDS.forEach(f => { keepSame[f] = false; });
      return {
        file, preview: URL.createObjectURL(file),
        designName: "", eventType: "", decorType: "",
        venueDate: "",
        sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft",
        colours: "", flowerType: "", priceMin: "", priceMax: "",
        keepSame,
      };
    });
    setBatchImages(prev => [...prev, ...newRows]);
    e.target.value = "";
  };

  const toggleKeepSameField = (index, field) => {
    setBatchImages(prev => {
      const updated = [...prev];
      const row = updated[index];
      const newVal = !row.keepSame[field];
      row.keepSame = { ...row.keepSame, [field]: newVal };
      if (newVal && index > 0) {
        row[field] = updated[index - 1][field];
      }
      return updated;
    });
  };

  const updateBatchRow = (index, field, value) => {
    setBatchImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (SAME_FIELDS.includes(field)) {
        for (let i = index + 1; i < updated.length; i++) {
          if (updated[i].keepSame[field]) {
            updated[i] = { ...updated[i], [field]: value };
          }
        }
      }
      return updated;
    });
  };

  const removeBatchRow = (index) => {
    setBatchImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const buildSizeDisplay = (width, length, height, unit) => {
    const parts = [];
    if (width && width !== "0") parts.push(width);
    if (length && length !== "0") parts.push(length);
    if (height && height !== "0") parts.push(height);
    if (parts.length === 0) return "";
    return parts.join("x") + (unit ? ` ${unit}` : "");
  };

  const handleUploadBatch = async (e) => {
    e.preventDefault();
    if (batchImages.length === 0) { showNotif("Please select at least one image", "warning"); return; }

    const missingRows = [];
    batchImages.forEach((row, idx) => {
      const missing = [];
      if (isFieldRequired("image_designName") && !row.designName) missing.push("Design Name");
      if (isFieldRequired("image_eventType") && !row.eventType) missing.push("Event Type");
      if (isFieldRequired("image_decorType") && !row.decorType) missing.push("Decoration Type");
      if (isFieldRequired("image_colours") && (!row.colours || (typeof row.colours === "string" && !row.colours.trim()))) missing.push("Colour");
      if (isFieldRequired("image_venueDate") && !row.venueDate) missing.push("Event Date");
      if (isFieldRequired("image_price") && !row.priceMin && !row.priceMax) missing.push("Price Range");
      if (missing.length > 0) missingRows.push({ row: idx + 1, fields: missing });
    });

    if (missingRows.length > 0) {
      const msg = missingRows.map(r => `Row ${r.row}: ${r.fields.join(", ")}`).join(" | ");
      showNotif(`Please fill required fields - ${msg}`, "warning");
      return;
    }

    setLoading(true);
    const totalImages = batchImages.length;
    setUploadProgress(`Uploading 0 of ${totalImages} images...`);
    let successCount = 0;
    let errorCount = 0;
    const batchStartTime = Date.now();
    let perImageTimes = [];
    try {
      const isLocalDev = window.location.hostname === "localhost";
      for (let i = 0; i < totalImages; i++) {
        const row = batchImages[i];
        const imageStartTime = Date.now();
        setUploadProgress(`Uploading ${i + 1} of ${totalImages} images...`);
        let imageUrl;
        try {
          if (isLocalDev) {
            const uploadResult = await ApiService.uploadFile(row.file, currentFolder.name);
            imageUrl = uploadResult.imageUrl;
          } else {
            const sig = await ApiService.getUploadSignature(currentFolder.name);
            const cloudResult = await ApiService.uploadDirectToCloudinary(row.file, sig);
            imageUrl = cloudResult.secure_url;
          }
          const { customerName: folderCustomer, venue: folderVenue } = parseFolderName(currentFolder.name);
          const sizeDisplay = buildSizeDisplay(row.sizeWidth, row.sizeLength, row.sizeHeight, row.sizeUnit);
          const colours = Array.isArray(row.colours)
            ? row.colours
            : row.colours.split(",").map(c => c.trim()).filter(c => c);
          const metaData = {
            folderName: currentFolder.name,
            imageUrl,
            colourCombination: colours,
            sizeWidth: row.sizeWidth || null,
            sizeLength: row.sizeLength || null,
            sizeHeight: row.sizeHeight || null,
            sizeUnit: row.sizeUnit,
            sizeDisplay: sizeDisplay,
            designName: row.designName,
            eventType: row.eventType,
            decorType: row.decorType,
            venueCustomer: folderCustomer,
            venueName: folderVenue,
            venueDate: row.venueDate,
            flowerType: row.flowerType || null,
            priceMin: row.priceMin,
            priceMax: row.priceMax,
          };
          await ApiService.uploadImage(metaData);
          successCount++;
        } catch (err) {
          if (imageUrl && !isLocalDev) {
            ApiService.destroyCloudinaryImage(imageUrl).catch(() => {});
          }
          console.error(`Failed to upload image ${i + 1}:`, err);
          errorCount++;
        }
        const elapsed = ((Date.now() - imageStartTime) / 1000).toFixed(1);
        perImageTimes.push(elapsed);
        const avgTime = perImageTimes.reduce((a, b) => a + parseFloat(b), 0) / perImageTimes.length;
        const remaining = Math.max(0, totalImages - i - 1);
        const estRemaining = (avgTime * remaining).toFixed(1);
        if (i < totalImages - 1) {
          setUploadProgress(`Uploading ${i + 1} of ${totalImages} images... (${elapsed}s | ~${estRemaining}s remaining)`);
        }
      }
      const totalTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      setUploadProgress(`Successfully uploaded ${successCount} images in ${totalTime}s!${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
      batchImages.forEach(row => URL.revokeObjectURL(row.preview));
      setBatchImages([]);
      loadImages();
      setTimeout(() => {
        resetUploadForm();
        setShowUploadModal(false);
      }, 2000);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSingleImage = async (e) => {
    e.preventDefault();
    if (!selectedImage) { showNotif("Please select an image", "warning"); return; }
    const missing = [];
    if (isFieldRequired("image_designName") && !imageData.designName) missing.push("Design Name");
    if (isFieldRequired("image_eventType") && !imageData.eventType) missing.push("Event Type");
    if (isFieldRequired("image_decorType") && !imageData.decorType) missing.push("Decoration Type");
    if (isFieldRequired("image_colours") && imageData.colours.length === 0) missing.push("Colour");
    if (isFieldRequired("image_venueDate") && !imageData.venueDate) missing.push("Event Date");
    if (isFieldRequired("image_price") && !imageData.priceMin && !imageData.priceMax) missing.push("Price Range");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    setLoading(true);
    setUploadProgress("Uploading image...");
    let imageUrl;
    try {
      const isLocalDev = window.location.hostname === "localhost";

      if (isLocalDev) {
        const uploadResult = await ApiService.uploadFile(selectedImage, currentFolder.name);
        imageUrl = uploadResult.imageUrl;
      } else {
        const sig = await ApiService.getUploadSignature(currentFolder.name);
        const cloudResult = await ApiService.uploadDirectToCloudinary(selectedImage, sig);
        imageUrl = cloudResult.secure_url;
      }

      const { customerName: folderCustomer, venue: folderVenue } = parseFolderName(currentFolder.name);
      const sizeDisplay = buildSizeDisplay(imageData.sizeWidth, imageData.sizeLength, imageData.sizeHeight, imageData.sizeUnit);
      const metaData = {
        folderName: currentFolder.name,
        imageUrl,
        colourCombination: imageData.colours,
        sizeWidth: imageData.sizeWidth || null,
        sizeLength: imageData.sizeLength || null,
        sizeHeight: imageData.sizeHeight || null,
        sizeUnit: imageData.sizeUnit,
        sizeDisplay: sizeDisplay,
        designName: imageData.designName,
        eventType: imageData.eventType,
        decorType: imageData.decorType,
        venueCustomer: folderCustomer,
        venueName: folderVenue,
        venueDate: imageData.venueDate,
        flowerType: imageData.flowerType,
        priceMin: imageData.priceMin,
        priceMax: imageData.priceMax,
      };
      setUploadProgress("Saving metadata...");
      await ApiService.uploadImage(metaData);
      setUploadProgress("Uploaded successfully!");
      setSelectedImage(null);
      setImagePreview("");
      setImageData({ designName: "", eventType: "", decorType: "", venueDate: "", sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft", colours: [], flowerType: "", priceMin: "", priceMax: "" });
      loadImages();
      setTimeout(() => {
        resetUploadForm();
        setShowUploadModal(false);
      }, 1500);
    } catch (err) {
      if (imageUrl && !window.location.hostname.includes("localhost")) {
        ApiService.destroyCloudinaryImage(imageUrl).catch(() => {});
      }
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Delete this image?")) return;
    setLoading(true);
    try {
      await ApiService.deleteImage(id);
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImageIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedImageIds.size} image(s)?`)) return;
    setLoading(true);
    try {
      for (const id of selectedImageIds) {
        await ApiService.deleteImage(id);
      }
      setSelectedImageIds(new Set());
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const openDownloadModal = () => {
    return new Promise((resolve) => {
      setDownloadResolve(() => resolve);
      setShowDownloadModal(true);
    });
  };

  const handleDownloadChoice = (useCustom) => {
    setShowDownloadModal(false);
    if (downloadResolve) {
      downloadResolve(useCustom);
      setDownloadResolve(null);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImageIds.size === 0) return;
    const useCustom = await openDownloadModal();
    if (useCustom === undefined) return;
    for (const id of selectedImageIds) {
      try {
        await ApiService.downloadImage(id, useCustom);
      } catch (err) {
        showNotif(`Failed to download image ${id}: ${err.message}`);
      }
    }
  };

  const handleToggleFavorite = async (imageId, isFavorite) => {
    try {
      if (isFavorite) {
        await ApiService.removeFavorite(imageId);
      } else {
        await ApiService.addFavorite(imageId);
      }
      if (lightboxImage && lightboxImage.id === imageId) {
        setLightboxImage(prev => ({ ...prev, isFav: !isFavorite }));
      }
      loadImages();
      loadFavorites();
      if (showFavorites) loadFavoriteFolders();
      if (view === "images") loadAllImages();
    } catch (err) {
      showNotif("Something went wrong");
    }
  };

  const toggleImageSelection = (id) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMoveImagesToFolder = async (targetFolderName) => {
    if (selectedImageIds.size === 0) return;
    setLoading(true);
    try {
      for (const imageId of selectedImageIds) {
        await ApiService.moveImageToFolder(imageId, targetFolderName);
      }
      setSelectedImageIds(new Set());
      setShowMoveModal(false);
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (filterData) => {
    setLoading(true);
    try {
      const searchFilters = {};
      if (filterData.searchText) searchFilters.searchText = filterData.searchText;
      if (filterData.designName) searchFilters.designName = filterData.designName;
      if (filterData.eventTypes && filterData.eventTypes.length > 0) searchFilters.eventType = filterData.eventTypes.join(",");
      if (filterData.decorTypes && filterData.decorTypes.length > 0) searchFilters.decorType = filterData.decorTypes.join(",");
      if (filterData.colors && filterData.colors.length > 0) searchFilters.colors = filterData.colors.join(",");
      if (filterData.flowerTypes && filterData.flowerTypes.length > 0) searchFilters.flowerType = filterData.flowerTypes.join(",");
      if (filterData.venueCustomer) searchFilters.venueCustomer = filterData.venueCustomer;
      if (filterData.venueName) searchFilters.venueName = filterData.venueName;
      if (filterData.venueDate) searchFilters.venueDate = filterData.venueDate;
      if (filterData.priceRange) {
        searchFilters.priceMin = filterData.priceRange[0];
        searchFilters.priceMax = filterData.priceRange[1];
      }
      const data = await ApiService.searchImages(searchFilters);
      setFilteredImages(data);
      setView("filtered");
    } catch (err) {
      console.error("Filter search failed:", err);
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilteredImages([]);
    setView("folders");
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleCommonSearch = async () => {
    if (!commonSearch.trim()) return;
    setLoading(true);
    try {
      const searchFilters = {};
      if (commonSearchType === "designName") searchFilters.designName = commonSearch;
      else if (commonSearchType === "eventType") searchFilters.eventType = commonSearch;
      else if (commonSearchType === "decorType") searchFilters.decorType = commonSearch;
      else if (commonSearchType === "flowerType") searchFilters.flowerType = commonSearch;
      else if (commonSearchType === "venue") searchFilters.placeOfEvent = commonSearch;
      else searchFilters.searchText = commonSearch;
      const data = await ApiService.searchImages(searchFilters);
      setFilteredImages(data);
      setView("filtered");
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorites = () => {
    const wasShowing = showFavorites;
    setShowFavorites(!wasShowing);
    if (!wasShowing) {
      loadFavorites();
      loadFavoriteFolders();
      setCurrentFolder(null);
      setFilteredImages([]);
    }
  };

  const handleEnterFavoriteFolder = (folder) => {
    setSelectedFavFolder(folder);
    loadFavorites(folder.name);
  };

  const handleBackFromFavFolder = () => {
    setSelectedFavFolder(null);
    loadFavorites();
  };

  const handleDeleteFavoriteFolder = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete folder "${name}" from Favorites?`)) return;
    try {
      await ApiService.deleteFolder(id);
      loadFavoriteFolders();
    } catch (err) {
      showNotif("Something went wrong");
    }
  };

  const handleCreateFavFolder = async (e) => {
    e.preventDefault();
    const missing = [];
    if (isFieldRequired("folder_customerName") && !favCustName.trim()) missing.push("Customer Name");
    if (isFieldRequired("folder_venue") && !favVenue.trim()) missing.push("Venue");
    if (isFieldRequired("folder_eventDate") && !favEventDate) missing.push("Event Date");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    const folderName = `${favCustName.trim()}_${favVenue.trim()}_${favEventDate}`;
    try {
      await ApiService.createFavoriteFolder(folderName, favFolderDesc.trim());
      setFavCustName("");
      setFavVenue("");
      setFavEventDate("");
      setFavFolderDesc("");
      setShowAddFavFolderModal(false);
      loadFavoriteFolders();
    } catch (err) {
      showNotif("Something went wrong");
    }
  };

  const handleEditImage = (image) => {
    const data = image.image_data || {};
    setEditingImage(image);
    setEditData({
      designName: data.designName || "",
      eventType: data.eventType || "",
      decorType: data.decorType || "",
      venueCustomer: data.venueCustomer || "",
      venueName: data.venueName || "",
      venueDate: data.venueDate || "",
      sizeWidth: data.sizeWidth || "",
      sizeLength: data.sizeLength || "",
      sizeHeight: data.sizeHeight || "",
      sizeUnit: data.sizeUnit || "sq.ft",
      colours: data.colourCombination || [],
      flowerType: data.flowerType || "",
      priceMin: data.priceMin || "",
      priceMax: data.priceMax || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingImage) return;
    setLoading(true);
    try {
      const sizeDisplay = buildSizeDisplay(editData.sizeWidth, editData.sizeLength, editData.sizeHeight, editData.sizeUnit);
      await ApiService.updateImage(editingImage.id, {
        ...editData,
        sizeDisplay,
      });
      setShowEditModal(false);
      setEditingImage(null);
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
      if (view === "images") loadAllImages();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const userList = await ApiService.getUsers();
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleOpenUserModal = () => {
    loadUsers();
    setShowUserModal(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.displayName || !userForm.role || !userForm.password) {
      showNotif("All fields are required", "warning");
      return;
    }
    setLoading(true);
    try {
      await ApiService.createUser(userForm);
      setUserForm({ username: "", displayName: "", role: "", password: "" });
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      password: "",
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userForm.username || !userForm.displayName || !userForm.role) {
      showNotif("Username, display name, and role are required", "warning");
      return;
    }
    setLoading(true);
    try {
      await ApiService.updateUser(editingUser.id, userForm);
      setEditingUser(null);
      setUserForm({ username: "", displayName: "", role: "", password: "" });
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    setLoading(true);
    try {
      await ApiService.deleteUser(id);
      loadUsers();
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const renderImageCardDetails = (data) => {
    if (!data) return null;
    const sizeDisplay = data.sizeDisplay || buildSizeDisplay(data.sizeWidth, data.sizeLength, data.sizeHeight, data.sizeUnit);
    const priceDisplay = formatPrice(data.priceMin, data.priceMax);
    return (
      <div className="image-card-details-inline">
        {sizeDisplay && <span className="detail-item"><strong>Size:</strong> {sizeDisplay}</span>}
        {priceDisplay && <span className="detail-item"><strong>Price:</strong> {priceDisplay}</span>}
        {data.decorType && <span className="detail-item"><strong>Decor:</strong> {data.decorType}</span>}
        {data.eventType && <span className="detail-item"><strong>Event:</strong> {data.eventType}</span>}
        {data.flowerType && <span className="detail-item"><strong>Flower:</strong> {data.flowerType}</span>}
        {data.venueCustomer && <span className="detail-item"><strong>Customer:</strong> {data.venueCustomer}</span>}
        {data.venueName && <span className="detail-item"><strong>Venue:</strong> {data.venueName}</span>}
        {data.venueDate && <span className="detail-item"><strong>Date:</strong> {data.venueDate}</span>}
      </div>
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxImage) return;
      if (e.key === "ArrowLeft") {
        const all = lightboxImage.allImages;
        const idx = lightboxImage.currentIndex;
        if (all && idx > 0) openLightbox(all, idx - 1);
      } else if (e.key === "ArrowRight") {
        const all = lightboxImage.allImages;
        const idx = lightboxImage.currentIndex;
        if (all && idx < all.length - 1) openLightbox(all, idx + 1);
      } else if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage, openLightbox]);

  const handleLogout = async () => {
    await ApiService.logout();
    navigate("/", { replace: true });
  };

  const DOWNLOAD_ALL_ROLES = ["Owner", "Captain", "ViceCaptain", "Admin"];
  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canEditDelete = user && EDIT_DELETE_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canViewFolders = user && FOLDER_VIEW_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canDownloadAll = user && DOWNLOAD_ALL_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const [syncing, setSyncing] = useState(false);

  const handleSyncCloudinary = async () => {
    setSyncing(true);
    try {
      const result = await ApiService.syncCloudinary("import");
      let msg = `Sync complete: ${result.importedCount} imported`;
      if (result.skippedCount > 0) msg += `, ${result.skippedCount} skipped`;
      if (result.errorCount > 0) msg += `, ${result.errorCount} errors`;
      if (result.totalCloudinary > 0) msg += ` (Cloudinary: ${result.totalCloudinary})`;
      showNotif(msg, result.errorCount > 0 ? "warning" : "success");
      if (result.errors && result.errors.length > 0) {
        console.error("[Sync errors]", result.errors.slice(0, 10));
      }
      loadFolders();
      if (view === "images") loadAllImages();
    } catch (err) {
      showNotif("Sync failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };
  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = monthsShort[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day} ${year}`;
  };

  const parseFolderName = (name) => {
    if (!name) return { customerName: "", venue: "", eventDate: "" };
    const parts = name.split("_");
    return {
      customerName: parts[0] || "",
      venue: parts[1] || "",
      eventDate: parts.slice(2).join("_") || "",
    };
  };

  const renderFolderNameDisplay = (folder) => {
    const { customerName, venue, eventDate } = parseFolderName(folder.name);
    return (
      <div className="folder-name-labels">
        <div className="folder-label-row">{customerName}</div>
        <div className="folder-label-row">{venue}</div>
        {eventDate && <div className="folder-label-row">{formatEventDate(eventDate)}</div>}
      </div>
    );
  };

  const formatPrice = (min, max) => {
    if (min && max) return `₹${min} - ₹${max}`;
    if (min) return `₹${min}+`;
    if (max) return `Up to ₹${max}`;
    return "";
  };

  const renderImageCard = (image, index, imageArray) => {
    const rawUrl = image.image_data?.imageUrl || "";
    const imgUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl.replace("/upload/", "/upload/f_auto,q_auto/") : `${IMAGE_BASE_URL}${rawUrl}`) : "";
    const isFav = favoriteImages.some(fav => fav.id === image.id);
    const isSelected = selectedImageIds.has(image.id);
    const data = image.image_data || {};
    const buildSizeLabeled = (w, l, h) => {
      const parts = [];
      if (w && w !== "0") parts.push(`w:${w}`);
      if (l && l !== "0") parts.push(`L:${l}`);
      if (h && h !== "0") parts.push(`H:${h}`);
      return parts.join(" ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "");
    };
    const sizeDisplay = data.sizeDisplay ? data.sizeDisplay.replace(/(\d+)x(\d+)x(\d+)/, "w:$1 L:$2 H:$3") : buildSizeLabeled(data.sizeWidth, data.sizeLength, data.sizeHeight);
    const priceDisplay = formatPrice(data.priceMin, data.priceMax);

    return (
      <div
        key={image.id}
        className={`image-card ${isSelected ? "selected" : ""}`}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            toggleImageSelection(image.id);
          } else if (selectedImageIds.size > 0 && isSelected) {
            toggleImageSelection(image.id);
          } else {
            openLightbox(imageArray, index);
          }
        }}
      >
        <div className="image-card-img-wrap">
          {(isSelected || selectedImageIds.size > 0) && (
            <div className={`image-select-checkbox ${isSelected ? "selected" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleImageSelection(image.id); }}>
              {isSelected ? "✓" : ""}
            </div>
          )}
          <button
            className={`favorite-btn-card ${isFav ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(image.id, isFav);
            }}
            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
          >
            {isFav ? "★" : "☆"}
          </button>
          {imgUrl ? (
            <img className="image-card-img" src={imgUrl} alt={data.designName} loading="lazy"
              onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.style.background = "#e5e7eb"; }}
            />
          ) : (
            <div className="image-card-placeholder">No Image</div>
          )}
          <div className="image-card-hover-actions">
            {canEditDelete && (
              <>
                <button className="btn-image-edit" onClick={(e) => { e.stopPropagation(); handleEditImage(image); }}>Edit</button>
                <button className="btn-image-delete" onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}>Delete</button>
              </>
            )}
          </div>
          <div className="image-card-hover-details">
            {sizeDisplay && <div className="hover-detail"><span>Size</span> {sizeDisplay}</div>}
            {priceDisplay && <div className="hover-detail"><span>Price range</span> {priceDisplay}</div>}
            {data.venueDate && <div className="hover-detail"><span>Event Date</span> {formatEventDate(data.venueDate)}</div>}
          </div>
        </div>
        <div className="image-card-info">
          <div className="image-card-design"><span className="info-label">Design Name -</span> {data.designName || "Untitled"}</div>
        </div>
      </div>
    );
  };

  const sortedFolders = [...folders].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA;
  });

  const renderFolderView = () => (
    <div className="folder-view-with-filters">
      <div className="folder-main-content">
        <div className="action-bar">
          <div className="action-bar-left">
            {canViewFolders && <h2>{view === "images" ? "All Images" : "Folders"}</h2>}
            <div className="common-search-bar">
              <select
                className="common-search-select"
                value={commonSearchType}
                onChange={(e) => setCommonSearchType(e.target.value)}
              >
                <option value="designName">Design Name</option>
                <option value="eventType">Event Type</option>
                <option value="decorType">Decor Type</option>
                <option value="flowerType">Flower Type</option>
                <option value="venue">Venue</option>
                <option value="all">All Fields</option>
              </select>
              <input
                type="text"
                className="common-search-input"
                placeholder={`Search by ${commonSearchType}...`}
                value={commonSearch}
                onChange={(e) => setCommonSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCommonSearch(); }}
              />
              <button className="btn btn-common-search" onClick={handleCommonSearch}>
                Search
              </button>
            </div>
          </div>
          <div className="action-bar-buttons">
            <button
              className={`btn btn-filter-toggle ${showFiltersSidebar ? "active" : ""}`}
              onClick={() => setShowFiltersSidebar(!showFiltersSidebar)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>
            {canDownloadAll && (
              <button className="btn btn-download-all" onClick={async () => {
                try {
                  showNotif("Preparing download...", "warning");
                  await ApiService.downloadAllImages();
                  showNotif("Download complete", "warning");
                } catch (err) {
                  showNotif(err.message || "Download failed");
                }
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All
              </button>
            )}
            {canDownloadAll && (
              <button className="btn btn-sync-cloudinary" onClick={handleSyncCloudinary} disabled={syncing}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6"/>
                  <path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "Syncing..." : "Sync Cloudinary"}
              </button>
            )}
          </div>
        </div>

        {showFiltersSidebar && (
          <FilterSidebar
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFiltersSidebar(false)}
          />
        )}

        {showFavorites ? renderFavoritesContent() : (
          view === "filtered" ? renderFilteredContent() :
          view === "images" || !canViewFolders ? renderAllImagesContent() :
          renderFoldersContent()
        )}
      </div>
    </div>
  );

  const renderFilteredContent = () => (
    loading ? (
      <div className="loading-state"><div className="spinner"></div></div>
    ) : filteredImages.length === 0 ? (
      <div className="empty-state"><p>No images match your search.</p></div>
    ) : (
      <>
        <div className="filter-results-header">
          <h3>Search Results ({filteredImages.length})</h3>
          <button className="btn-clear-filters" onClick={handleClearFilters}>Clear Filters</button>
        </div>
        {selectedImageIds.size > 0 && renderSelectionToolbar()}
        <div className="image-grid">
          {filteredImages.map((image, index) => renderImageCard(image, index, filteredImages))}
        </div>
      </>
    )
  );

  const renderAllImagesContent = () => (
    loading ? (
      <div className="loading-state"><div className="spinner"></div></div>
    ) : allImages.length === 0 ? (
      <div className="empty-state"><p>No images yet.</p></div>
    ) : (
      <>
        <div className="filter-results-header">
          <h3>All Images ({allImages.length})</h3>
        </div>
        {selectedImageIds.size > 0 && renderSelectionToolbar()}
        <div className="image-grid">
          {allImages.map((image, index) => renderImageCard(image, index, allImages))}
        </div>
        {allImagesHasMore && (
          <div className="load-more-wrap">
            <button className="btn btn-load-more" onClick={loadMoreAllImages} disabled={loading}>
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </>
    )
  );

  const renderFoldersContent = () => (
    folders.length === 0 && !canUpload ? (
      <div className="empty-state">
        <p>No folders yet. Create one to get started!</p>
      </div>
    ) : (
      <div className="folder-card-grid">
        {canUpload && (
          <div className="upload-box-card add-folder-box" onClick={() => setShowAddFolderModal(true)}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Add Folder</span>
          </div>
        )}
          {sortedFolders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canDelete={canUpload}
              onEdit={(f, evt) => handleOpenEditFolder(f, evt)}
              onMoveToFolder={handleMoveImagesToFolder}
              onClick={() => handleEnterFolder(folder)}
              onDelete={(e) => handleDeleteFolder(folder.id, folder.name, e)}
            />
          ))}
      </div>
    )
  );

  const renderFavoritesContent = () => (
    <div className="favorites-view">
      <div className="action-bar">
        <h2>{selectedFavFolder ? parseFolderName(selectedFavFolder.name).customerName || selectedFavFolder.name : "★ Favorites"}</h2>
        <div className="action-bar-buttons">
          <button className="btn btn-secondary" onClick={() => setShowFavorites(false)}>← Home</button>
          {selectedFavFolder && (
            <button className="btn btn-secondary" onClick={handleBackFromFavFolder}>Back</button>
          )}
        </div>
      </div>

      {!selectedFavFolder && (
        <div className="folder-card-grid favorites-folders-grid">
          {canUpload && (
            <div className="upload-box-card add-folder-box" onClick={() => setShowAddFavFolderModal(true)}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Add Folder</span>
            </div>
          )}
          {favoriteFolders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canDelete={canUpload}
              onEdit={(f, evt) => handleOpenEditFolder(f, evt)}
              onMoveToFolder={handleMoveImagesToFolder}
              onClick={() => handleEnterFavoriteFolder(folder)}
              onDelete={(e) => handleDeleteFavoriteFolder(folder.id, folder.name, e)}
            />
          ))}
        </div>
      )}

      {favoriteImages.length === 0 ? (
        <div className="empty-state"><p>No favorites yet. Star images to add them here.</p></div>
      ) : (
        <>
      {selectedImageIds.size > 0 && renderSelectionToolbar()}
          <div className="favorites-images-grid">
            {favoriteImages.map((image, index) => renderImageCard(image, index, favoriteImages))}
          </div>
        </>
      )}
    </div>
  );

  const renderSelectionToolbar = () => (
    <div className="selection-toolbar">
      <span className="selection-count">{selectedImageIds.size} selected</span>
      <button className="btn btn-secondary" onClick={() => { setSelectedImageIds(new Set()); }}>
        Cancel
      </button>
      <button className="btn btn-secondary" onClick={() => setShowMoveModal(true)} disabled={selectedImageIds.size === 0}>
        Move
      </button>
      <button className="btn btn-secondary" onClick={handleBulkDownload} disabled={selectedImageIds.size === 0}>
        Download
      </button>
      <button className="btn btn-danger" onClick={handleBulkDelete} disabled={selectedImageIds.size === 0}>
        Delete
      </button>
    </div>
  );

  const renderFolderContent = () => (
    <div className="folder-content">
      <div className="folder-header">
        <button className="btn-back-folder" onClick={handleBackToFolders}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="folder-header-info">
          <h2>{parseFolderName(currentFolder.name).customerName || currentFolder.name}</h2>
          <div className="folder-header-sub">{renderFolderNameDisplay(currentFolder)}</div>
        </div>
        <div className="folder-header-actions">
          <span className="ctrl-select-hint">Ctrl+Click to select images</span>
        </div>
      </div>

      {selectedImageIds.size > 0 && renderSelectionToolbar()}

      {loading ? (
        <div className="loading-state"><div className="spinner"></div></div>
      ) : !canUpload && images.length === 0 ? (
        <div className="empty-state"><p>No images in this folder.</p></div>
      ) : (
        <>
          <div className="image-grid">
            {canUpload && selectedImageIds.size === 0 && (
              <div className="upload-box-card" onClick={() => { resetUploadForm(); setUploadTab("single"); setShowUploadModal(true); }}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Upload Image</span>
              </div>
            )}
            {images.map((image, index) => renderImageCard(image, index, images))}
          </div>
          {hasMore && (
            <div className="load-more-wrap">
              <button className="btn btn-load-more" onClick={loadMoreImages} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="image-management">
      <nav className="navbar">
        <div className="navbar-brand">Event Management</div>
        <div className="navbar-right">
          <div className="nav-menu">
            <button className={`nav-item ${!showFavorites && !currentFolder && view === "folders" ? "active" : ""}`} onClick={() => { setShowFavorites(false); setCurrentFolder(null); setView("folders"); setFilteredImages([]); }}>HOME</button>
            <button className={`nav-item ${view === "images" ? "active" : ""}`} onClick={() => { setView("images"); setShowFavorites(false); setCurrentFolder(null); setFilteredImages([]); loadAllImages(); }}>IMAGES</button>
            {canUpload && (
              <button className="nav-item" onClick={handleOpenUserModal}>USERS</button>
            )}
          </div>
          <button
            className={`nav-item nav-fav-btn ${showFavorites ? "active" : ""}`}
            onClick={handleToggleFavorites}
            title="Favorites"
          >
            ★ FAVOURITES
          </button>
          <div className="user-info">
            <span className="user-display"><span className="user-label">User</span> {displayName}</span>
            <span className="user-role"><span className="user-label">Role</span> {role}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      {notification && (
        <div className={`notification ${notification.type}`} onClick={() => setNotification(null)}>
          {notification.message}
        </div>
      )}
      <div className="main-content">
        {showFavorites && !currentFolder ? renderFavoritesContent() :
         currentFolder ? renderFolderContent() :
         renderFolderView()}
      </div>

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Folder</h2>
              <button className="modal-close" onClick={() => setShowAddFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddFolder}>
              <div className="form-group">
                <label className="label">Customer Name (max 15 characters){isFieldRequired("folder_customerName") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.slice(0, 15))}
                  placeholder="Enter customer name"
                  maxLength={15}
                  required={isFieldRequired("folder_customerName")}
                />
              </div>
              <div className="form-group">
                <label className="label">Venue (max 15 characters){isFieldRequired("folder_venue") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value.slice(0, 15))}
                  placeholder="Enter venue name"
                  maxLength={15}
                  required={isFieldRequired("folder_venue")}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Date{isFieldRequired("folder_eventDate") && <span className="required">*</span>}</label>
                <input
                  type="date"
                  className="input"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required={isFieldRequired("folder_eventDate")}
                />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                  rows={3}
                />
              </div>
              {customerName && venueName && eventDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{customerName}_{venueName}_{eventDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFolderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Favourite Folder Modal */}
      {showAddFavFolderModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Folder in Favorites</h2>
              <button className="modal-close" onClick={() => setShowAddFavFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateFavFolder}>
              <div className="form-group">
                <label className="label">Customer Name (max 15 characters){isFieldRequired("folder_customerName") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={favCustName}
                  onChange={(e) => setFavCustName(e.target.value.slice(0, 15))}
                  placeholder="Enter customer name"
                  maxLength={15}
                  required={isFieldRequired("folder_customerName")}
                />
              </div>
              <div className="form-group">
                <label className="label">Venue (max 15 characters){isFieldRequired("folder_venue") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={favVenue}
                  onChange={(e) => setFavVenue(e.target.value.slice(0, 15))}
                  placeholder="Enter venue name"
                  maxLength={15}
                  required={isFieldRequired("folder_venue")}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Date{isFieldRequired("folder_eventDate") && <span className="required">*</span>}</label>
                <input
                  type="date"
                  className="input"
                  value={favEventDate}
                  onChange={(e) => setFavEventDate(e.target.value)}
                  required={isFieldRequired("folder_eventDate")}
                />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={favFolderDesc}
                  onChange={(e) => setFavFolderDesc(e.target.value)}
                  placeholder="Enter folder description"
                  rows={3}
                />
              </div>
              {favCustName && favVenue && favEventDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{favCustName}_{favVenue}_{favEventDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFavFolderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditFolderModal && editingFolder && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Folder</h2>
              <button className="modal-close" onClick={() => setShowEditFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEditFolder}>
              <div className="form-group">
                <label className="label">Customer Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value.slice(0, 15))}
                  placeholder="Enter customer name"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Venue</label>
                <input
                  type="text"
                  className="input"
                  value={editFolderVenue}
                  onChange={(e) => setEditFolderVenue(e.target.value.slice(0, 15))}
                  placeholder="Enter venue name"
                  maxLength={15}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Date</label>
                <input
                  type="date"
                  className="input"
                  value={editFolderDate}
                  onChange={(e) => setEditFolderDate(e.target.value)}
                />
              </div>
              {editFolderName && editFolderVenue && editFolderDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{editFolderName}_{editFolderVenue}_{editFolderDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditFolderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Images</h2>
              <button className="modal-close" onClick={() => { resetUploadForm(); setShowUploadModal(false); }}>×</button>
            </div>

            <div className="upload-tabs">
              <button className={`upload-tab ${uploadTab === "single" ? "active" : ""}`} onClick={() => setUploadTab("single")}>Single Image</button>
              <button className={`upload-tab ${uploadTab === "batch" ? "active" : ""}`} onClick={() => setUploadTab("batch")}>Batch Upload</button>
            </div>

            {uploadTab === "single" && (
              <form onSubmit={handleUploadSingleImage}>
                <div className="form-group">
                  <label className="label">Select Image</label>
                  <div className="drop-zone" onClick={() => imageFileRef.current?.click()}>
                    <input ref={imageFileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                    {imagePreview ? (
                      <div className="image-preview-container">
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                        <button type="button" className="remove-preview" onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setImagePreview(""); }}>×</button>
                      </div>
                    ) : (
                      <div className="drop-text">
                        <span className="drop-icon">📷</span>
                        <p>Click to select or drag image here</p>
                        <p className="drop-hint">Supports: JPG, PNG, GIF, WebP</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Design Name{isFieldRequired("image_designName") && <span className="required">*</span>}</label>
                    <input type="text" className="input" value={imageData.designName}
                      onChange={(e) => setImageData({...imageData, designName: e.target.value})}
                      placeholder="Enter design name" required={isFieldRequired("image_designName")} />
                  </div>
                  <div className="form-group">
                    <label className="label">Decoration Type{isFieldRequired("image_decorType") && <span className="required">*</span>}</label>
                    <AutocompleteInput
                      options={DECOR_TYPES}
                      value={imageData.decorType}
                      onChange={(val) => setImageData({...imageData, decorType: val})}
                      placeholder="Search and select decoration type"
                      required={isFieldRequired("image_decorType")}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Event Type{isFieldRequired("image_eventType") && <span className="required">*</span>}</label>
                    <AutocompleteInput
                      options={EVENT_TYPES}
                      value={imageData.eventType}
                      onChange={(val) => setImageData({...imageData, eventType: val})}
                      placeholder="Type or select event type"
                      required={isFieldRequired("image_eventType")}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Flower Type{isFieldRequired("image_flowerType") && <span className="required">*</span>}</label>
                    <div className="checkbox-group-horizontal">
                      {FLOWER_TYPES.map(t => (
                        <label key={t} className="checkbox-item-inline">
                          <input type="radio" name="flowerType" value={t}
                            checked={imageData.flowerType === t}
                            onChange={(e) => setImageData({...imageData, flowerType: e.target.value})} />
                          <span>{t}</span>
                        </label>
                      ))}
                      <label className="checkbox-item-inline">
                        <input type="radio" name="flowerType" value=""
                          checked={imageData.flowerType === ""}
                          onChange={(e) => setImageData({...imageData, flowerType: ""})} />
                        <span>None</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Colour{isFieldRequired("image_colours") && <span className="required">*</span>}</label>
                    <ColorPicker
                      selectedColors={imageData.colours}
                      onChange={(colors) => setImageData({...imageData, colours: colors})}
                    />
                  </div>
                  <div className="form-right-col">
                    <div className="form-group">
                      <label className="label">Size{isFieldRequired("image_size") && <span className="required">*</span>}</label>
                      <div className="size-input-group-upload">
                        <input type="number" className="input size-input-sm" placeholder="W"
                          value={imageData.sizeWidth} min="0"
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => setImageData({...imageData, sizeWidth: e.target.value})} />
                        <span className="size-sep">x</span>
                        <input type="number" className="input size-input-sm" placeholder="L"
                          value={imageData.sizeLength} min="0"
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => setImageData({...imageData, sizeLength: e.target.value})} />
                        <span className="size-sep">x</span>
                        <input type="number" className="input size-input-sm" placeholder="H"
                          value={imageData.sizeHeight} min="0"
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => setImageData({...imageData, sizeHeight: e.target.value})} />
                        <select className="input size-unit-input" value={imageData.sizeUnit}
                          onChange={(e) => setImageData({...imageData, sizeUnit: e.target.value})}>
                          {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      {buildSizeDisplay(imageData.sizeWidth, imageData.sizeLength, imageData.sizeHeight, imageData.sizeUnit) && (
                        <div className="size-display-preview">
                          Size: {buildSizeDisplay(imageData.sizeWidth, imageData.sizeLength, imageData.sizeHeight, imageData.sizeUnit)}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Event Date{isFieldRequired("image_venueDate") && <span className="required">*</span>}</label>
                      <input type="date" className="input" value={imageData.venueDate}
                        onChange={(e) => setImageData({...imageData, venueDate: e.target.value})} required={isFieldRequired("image_venueDate")} />
                    </div>
                    <div className="form-group">
                      <label className="label">Price Range{isFieldRequired("image_price") && <span className="required">*</span>}</label>
                      <div className="flex-gap">
                        <input type="number" className="input" placeholder="Min" value={imageData.priceMin}
                          onChange={(e) => setImageData({...imageData, priceMin: e.target.value})} required={isFieldRequired("image_price")} />
                        <input type="number" className="input" placeholder="Max" value={imageData.priceMax}
                          onChange={(e) => setImageData({...imageData, priceMax: e.target.value})} required={isFieldRequired("image_price")} />
                      </div>
                    </div>
                  </div>
                </div>

                {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { resetUploadForm(); setShowUploadModal(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Uploading..." : "Upload Image"}
                  </button>
                </div>
              </form>
            )}

            {uploadTab === "batch" && (
              <form onSubmit={handleUploadBatch}>
                <div className="batch-upload-section">
                  <div className="batch-image-selector">
                    <button type="button" className="btn btn-secondary" onClick={() => batchImageRef.current?.click()}>
                      + Add Images
                    </button>
                    <input ref={batchImageRef} type="file" accept="image/*" multiple onChange={handleBatchImageSelect} style={{ display: "none" }} />
                    <span className="batch-hint">Select multiple images to add them to the table</span>
                  </div>

                  {batchImages.length > 0 && (
                    <div className="batch-table-container">
                      <table className="batch-table">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Design Name{isFieldRequired("image_designName") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Event Type{isFieldRequired("image_eventType") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Decor Type{isFieldRequired("image_decorType") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Size{isFieldRequired("image_size") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Unit<span className="batch-same-hdr">S</span></th>
                            <th>Colours{isFieldRequired("image_colours") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Flower{isFieldRequired("image_flowerType") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Date{isFieldRequired("image_venueDate") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Min{isFieldRequired("image_price") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th>Max{isFieldRequired("image_price") && <span className="required">*</span>}<span className="batch-same-hdr">S</span></th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchImages.map((row, index) => (
                            <tr key={index}>
                              <td><div className="batch-thumbnail"><img src={row.preview} alt="" /></div></td>
                              <td>
                                <div className="batch-field-with-same">
                                  <input type="text" className="batch-input" value={row.designName}
                                    onChange={(e) => updateBatchRow(index, "designName", e.target.value)} placeholder="Design" />
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.designName ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "designName")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <div className="batch-autocomplete-cell">
                                    <AutocompleteInput
                                      options={EVENT_TYPES}
                                      value={row.eventType}
                                      onChange={(val) => updateBatchRow(index, "eventType", val)}
                                      placeholder="Event Type"
                                    />
                                  </div>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.eventType ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "eventType")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <div className="batch-autocomplete-cell">
                                    <AutocompleteInput
                                      options={DECOR_TYPES}
                                      value={row.decorType}
                                      onChange={(val) => updateBatchRow(index, "decorType", val)}
                                      placeholder="Decor Type"
                                    />
                                  </div>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.decorType ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "decorType")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <div className="batch-size-row">
                                    <input type="number" className="batch-input-sm" placeholder="W" value={row.sizeWidth}
                                      onChange={(e) => updateBatchRow(index, "sizeWidth", e.target.value)} />
                                    <span>x</span>
                                    <input type="number" className="batch-input-sm" placeholder="L" value={row.sizeLength}
                                      onChange={(e) => updateBatchRow(index, "sizeLength", e.target.value)} />
                                    <span>x</span>
                                    <input type="number" className="batch-input-sm" placeholder="H" value={row.sizeHeight}
                                      onChange={(e) => updateBatchRow(index, "sizeHeight", e.target.value)} />
                                  </div>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.sizeWidth || row.keepSame.sizeLength || row.keepSame.sizeHeight ? "active" : ""}`}
                                    onClick={() => { toggleKeepSameField(index, "sizeWidth"); toggleKeepSameField(index, "sizeLength"); toggleKeepSameField(index, "sizeHeight"); }} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <select className="batch-select-sm" value={row.sizeUnit}
                                    onChange={(e) => updateBatchRow(index, "sizeUnit", e.target.value)}>
                                    {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.sizeUnit ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "sizeUnit")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <div className="batch-colour-cell">
                                    <button type="button" className="batch-colour-picker-btn"
                                      onClick={() => setBatchColorPickerIndex(batchColorPickerIndex === index ? null : index)}
                                      title="Select colours">
                                      <span className="batch-colour-swatches">
                                        {(row.colours ? (typeof row.colours === "string" ? row.colours.split(",").filter(c => c.trim()) : row.colours) : []).slice(0, 3).map((c, ci) => (
                                          <span key={ci} className="batch-colour-dot" style={{ backgroundColor: c.toLowerCase() }} />
                                        ))}
                                        {(row.colours ? (typeof row.colours === "string" ? row.colours.split(",").filter(c => c.trim()) : row.colours).length : 0) > 0 && <span className="batch-colour-count">{typeof row.colours === "string" ? row.colours.split(",").filter(c => c.trim()).length : row.colours.length}</span>}
                                        {(row.colours ? (typeof row.colours === "string" ? row.colours.split(",").filter(c => c.trim()) : row.colours).length : 0) === 0 && <span className="batch-colour-placeholder">🎨</span>}
                                      </span>
                                    </button>
                                    {batchColorPickerIndex === index && (
                                      <div className="batch-colour-popup">
                                        <div className="batch-colour-popup-header">
                                          <span>Select Colours</span>
                                          <button type="button" className="batch-colour-popup-close" onClick={() => setBatchColorPickerIndex(null)}>×</button>
                                        </div>
                                        <div className="batch-colour-popup-grid">
                                          {BATCH_COLORS.map(color => {
                                            const currentColors = row.colours ? (typeof row.colours === "string" ? row.colours.split(",").map(c => c.trim()).filter(c => c) : row.colours) : [];
                                            const isSelected = currentColors.includes(color);
                                            return (
                                              <button
                                                key={color}
                                                type="button"
                                                className={`batch-colour-option ${isSelected ? "selected" : ""}`}
                                                style={{ backgroundColor: color.toLowerCase() }}
                                                onClick={() => {
                                                  let updated = currentColors;
                                                  if (isSelected) {
                                                    updated = updated.filter(c => c !== color);
                                                  } else {
                                                    if (updated.length >= 3) { return; }
                                                    updated = [...updated, color];
                                                  }
                                                  updateBatchRow(index, "colours", updated.join(","));
                                                }}
                                                title={color}
                                              >
                                                {isSelected && "✓"}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <div className="batch-colour-popup-footer">
                                          <button type="button" className="batch-colour-clear-btn"
                                            onClick={() => { updateBatchRow(index, "colours", ""); setBatchColorPickerIndex(null); }}>
                                            Clear
                                          </button>
                                          <button type="button" className="batch-colour-done-btn"
                                            onClick={() => setBatchColorPickerIndex(null)}>
                                            Done
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.colours ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "colours")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <select className="batch-select" value={row.flowerType}
                                    onChange={(e) => updateBatchRow(index, "flowerType", e.target.value)}>
                                    <option value="">Flower</option>
                                    {FLOWER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.flowerType ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "flowerType")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <input type="date" className="batch-input-date" value={row.venueDate}
                                    onChange={(e) => updateBatchRow(index, "venueDate", e.target.value)} />
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.venueDate ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "venueDate")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <input type="number" className="batch-input-tiny" value={row.priceMin}
                                    onChange={(e) => updateBatchRow(index, "priceMin", e.target.value)} placeholder="₹" />
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.priceMin ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "priceMin")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td>
                                <div className="batch-field-with-same">
                                  <input type="number" className="batch-input-tiny" value={row.priceMax}
                                    onChange={(e) => updateBatchRow(index, "priceMax", e.target.value)} placeholder="₹" />
                                  {index > 0 && <button type="button" className={`batch-same-btn ${row.keepSame.priceMax ? "active" : ""}`}
                                    onClick={() => toggleKeepSameField(index, "priceMax")} title="Same as previous row">S</button>}
                                </div>
                              </td>
                              <td><button type="button" className="batch-remove-btn" onClick={() => removeBatchRow(index)}>×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}

                  <div className="batch-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => { setBatchImages([]); setUploadProgress(""); }}>Clear All</button>
                    <button type="submit" className="btn btn-primary" disabled={loading || batchImages.length === 0}>
                      {loading ? "Uploading..." : `Upload ${batchImages.length} Image(s)`}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => { resetUploadForm(); setShowUploadModal(false); }}>Cancel</button>
                  </div>
                </div>
              </form>
            )}


          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>X</button>
          {lightboxImage.allImages && lightboxImage.allImages.length > 1 && (
            <>
              <button className="lightbox-nav-btn lightbox-prev" onClick={(e) => {
                e.stopPropagation();
                const all = lightboxImage.allImages;
                const idx = lightboxImage.currentIndex;
                if (all && idx > 0) openLightbox(all, idx - 1);
              }} disabled={lightboxImage.currentIndex <= 0}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button className="lightbox-nav-btn lightbox-next" onClick={(e) => {
                e.stopPropagation();
                const all = lightboxImage.allImages;
                const idx = lightboxImage.currentIndex;
                if (all && idx < all.length - 1) openLightbox(all, idx + 1);
              }} disabled={lightboxImage.currentIndex >= (lightboxImage.allImages?.length || 1) - 1}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div className="lightbox-counter">
                {lightboxImage.currentIndex + 1} / {lightboxImage.allImages.length}
              </div>
            </>
          )}
          {lightboxImage.url ? (
            <img className="lightbox-image" src={lightboxImage.url} alt={lightboxImage.data?.designName}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }} />
          ) : (
            <div className="lightbox-placeholder">Image not available</div>
          )}
          <div className="lightbox-info" onClick={(e) => e.stopPropagation()}>
            <h3>{lightboxImage.data?.designName || "Untitled"}</h3>
            {renderImageCardDetails(lightboxImage.data)}
            <div className="lightbox-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => {
                handleEditImage({ id: lightboxImage.id, image_data: lightboxImage.data });
              }}>Edit</button>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const useCustom = await openDownloadModal();
                if (useCustom === undefined) return;
                ApiService.downloadImage(lightboxImage.id, useCustom).catch(err => showNotif(err.message));
              }}>Download</button>
              <button className={`btn btn-sm ${lightboxImage.isFav ? "btn-fav-active" : "btn-secondary"}`}
                onClick={() => {
                  handleToggleFavorite(lightboxImage.id, lightboxImage.isFav);
                }}>
                {lightboxImage.isFav ? "★ Unfavorite" : "☆ Favorite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {showMoveModal && (
        <div className="modal-overlay">
          <div className="modal move-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Move to Folder</h2>
              <button className="modal-close" onClick={() => setShowMoveModal(false)}>X</button>
            </div>
            {(showFavorites ? favoriteFolders : folders).length === 0 ? (
              <p className="empty-folder-message">No folders available.</p>
            ) : (
              <div className="move-folder-list">
                {(showFavorites ? favoriteFolders : folders).map(folder => {
                  const { customerName, venue, eventDate } = parseFolderName(folder.name);
                  return (
                    <button key={folder.id} className="move-folder-item"
                      onClick={() => handleMoveImagesToFolder(folder.name)}>
                      <svg className="move-folder-icon" viewBox="0 0 24 24" width="18" height="18" fill="#F5C842" stroke="#e6a800" strokeWidth="0.5">
                        <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
                      </svg>
                      <span className="move-folder-name">{customerName || folder.name}</span>
                      {venue && <span className="move-folder-venue"> - {venue}</span>}
                      {eventDate && <span className="move-folder-date">{formatEventDate(eventDate) ? ` (${formatEventDate(eventDate)})` : ""}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)} style={{ marginTop: "16px", width: "100%" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">User Management</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>

            {editingUser ? (
              <form onSubmit={handleUpdateUser}>
                <div className="form-group">
                  <label className="label">Username</label>
                  <input type="text" className="input" value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="label">Display Name</label>
                  <input type="text" className="input" value={userForm.displayName}
                    onChange={(e) => setUserForm({...userForm, displayName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="label">Role</label>
                  <select className="input" value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})} required>
                    <option value="">Select Role</option>
                    <option value="Captain">Captain</option>
                    <option value="ViceCaptain">ViceCaptain</option>
                    <option value="Facilitator">Facilitator</option>
                    <option value="TeamLead">TeamLead</option>
                    <option value="TeamMember">TeamMember</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Password (leave blank to keep current)</label>
                  <input type="text" className="input" value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    placeholder="Enter new password" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingUser(null); setUserForm({ username: "", displayName: "", role: "", password: "" }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleAddUser} className="user-add-form">
                  <div className="user-form-row">
                    <input type="text" className="input" placeholder="Username" value={userForm.username}
                      onChange={(e) => setUserForm({...userForm, username: e.target.value})} required />
                    <input type="text" className="input" placeholder="Display Name" value={userForm.displayName}
                      onChange={(e) => setUserForm({...userForm, displayName: e.target.value})} required />
                    <select className="input" value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value})} required>
                      <option value="">Role</option>
                      <option value="Captain">Captain</option>
                      <option value="ViceCaptain">ViceCaptain</option>
                      <option value="Facilitator">Facilitator</option>
                      <option value="TeamLead">TeamLead</option>
                      <option value="TeamMember">TeamMember</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                    <input type="text" className="input" placeholder="Password" value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})} required />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? "Adding..." : "Add"}
                    </button>
                  </div>
                </form>

                <div className="user-table-container">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Password</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={4} className="empty-table">No users found.</td></tr>
                      ) : (
                        users.map(user => (
                          <tr key={user.id}>
                            <td>{user.username}</td>
                            <td><span className={`role-badge ${user.role?.toLowerCase()}`}>{user.role}</span></td>
                            <td className="password-cell">
                              <div className="password-wrapper">
                                <span className="password-text">
                                  {visiblePasswords.has(user.id) && user.password ? user.password : "••••••••"}
                                </span>
                                <button
                                  className="password-toggle-btn"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  title={visiblePasswords.has(user.id) ? "Hide password" : "Show password"}
                                >
                                  {visiblePasswords.has(user.id) ? (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                      <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                      <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="actions-cell">
                              <button className="icon-btn icon-btn-edit" onClick={() => handleEditUser(user)} title="Edit user">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button className="icon-btn icon-btn-delete" onClick={() => handleDeleteUser(user.id, user.username)} title="Delete user">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {canUpload && (
                  <button className="btn btn-secondary" onClick={() => {
                    const next = !showFormSettings;
                    setShowFormSettings(next);
                    if (next) setTimeout(() => formSettingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }} style={{ marginTop: "16px", width: "100%" }}>
                    {showFormSettings ? "Close Form Settings" : "Form Settings"}
                  </button>
                )}

                {showFormSettings && (
                  <div className="form-settings-panel" ref={formSettingsRef}>
                    <h3 className="form-settings-title">Mandatory Field Settings</h3>
                    <p className="form-settings-hint">Toggle fields between mandatory (<span className="required-star">*</span>) and optional</p>
                    <div className="form-settings-group">
                      <h4>Add Folder</h4>
                      <label className="form-settings-row"><span>Customer Name</span><input type="checkbox" checked={isFieldRequired("folder_customerName")} onChange={(e) => { const c = {...formConfig, folder_customerName: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Venue</span><input type="checkbox" checked={isFieldRequired("folder_venue")} onChange={(e) => { const c = {...formConfig, folder_venue: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Event Date</span><input type="checkbox" checked={isFieldRequired("folder_eventDate")} onChange={(e) => { const c = {...formConfig, folder_eventDate: e.target.checked}; saveFormConfig(c); }} /></label>
                    </div>
                    <div className="form-settings-group">
                      <h4>Upload Image</h4>
                      <label className="form-settings-row"><span>Design Name</span><input type="checkbox" checked={isFieldRequired("image_designName")} onChange={(e) => { const c = {...formConfig, image_designName: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Event Type</span><input type="checkbox" checked={isFieldRequired("image_eventType")} onChange={(e) => { const c = {...formConfig, image_eventType: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Decoration Type</span><input type="checkbox" checked={isFieldRequired("image_decorType")} onChange={(e) => { const c = {...formConfig, image_decorType: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Flower Type</span><input type="checkbox" checked={isFieldRequired("image_flowerType")} onChange={(e) => { const c = {...formConfig, image_flowerType: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Colour</span><input type="checkbox" checked={isFieldRequired("image_colours")} onChange={(e) => { const c = {...formConfig, image_colours: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Size</span><input type="checkbox" checked={isFieldRequired("image_size")} onChange={(e) => { const c = {...formConfig, image_size: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Event Date</span><input type="checkbox" checked={isFieldRequired("image_venueDate")} onChange={(e) => { const c = {...formConfig, image_venueDate: e.target.checked}; saveFormConfig(c); }} /></label>
                      <label className="form-settings-row"><span>Price Range</span><input type="checkbox" checked={isFieldRequired("image_price")} onChange={(e) => { const c = {...formConfig, image_price: e.target.checked}; saveFormConfig(c); }} /></label>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="modal-overlay">
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Image</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="label">Design Name</label>
                <input type="text" className="input" value={editData.designName}
                  onChange={(e) => setEditData({...editData, designName: e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Event Type</label>
                  <AutocompleteInput
                    options={EVENT_TYPES}
                    value={editData.eventType}
                    onChange={(val) => setEditData({...editData, eventType: val})}
                    placeholder="Type or select event type"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Flower Type</label>
                  <select className="input" value={editData.flowerType}
                    onChange={(e) => setEditData({...editData, flowerType: e.target.value})}>
                    <option value="">Select</option>
                    {FLOWER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Decoration Type</label>
                <AutocompleteInput
                  options={DECOR_TYPES}
                  value={editData.decorType}
                  onChange={(val) => setEditData({...editData, decorType: val})}
                  placeholder="Search and select decoration type"
                />
              </div>
              <div className="form-group">
                <label className="label">Colours</label>
                <ColorPicker
                  selectedColors={editData.colours}
                  onChange={(colors) => setEditData({...editData, colours: colors})}
                />
              </div>
              <div className="form-group">
                <label className="label">Size</label>
                <div className="size-input-group-upload">
                  <input type="number" className="input size-input-sm" placeholder="W" value={editData.sizeWidth}
                    onChange={(e) => setEditData({...editData, sizeWidth: e.target.value})} />
                  <span className="size-sep">x</span>
                  <input type="number" className="input size-input-sm" placeholder="L" value={editData.sizeLength}
                    onChange={(e) => setEditData({...editData, sizeLength: e.target.value})} />
                  <span className="size-sep">x</span>
                  <input type="number" className="input size-input-sm" placeholder="H" value={editData.sizeHeight}
                    onChange={(e) => setEditData({...editData, sizeHeight: e.target.value})} />
                  <select className="input size-unit-input" value={editData.sizeUnit}
                    onChange={(e) => setEditData({...editData, sizeUnit: e.target.value})}>
                    {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Customer Name</label>
                  <input type="text" className="input" value={editData.venueCustomer}
                    onChange={(e) => setEditData({...editData, venueCustomer: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Venue</label>
                  <input type="text" className="input" value={editData.venueName}
                    onChange={(e) => setEditData({...editData, venueName: e.target.value})} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Event Date</label>
                  <input type="date" className="input" value={editData.venueDate}
                    onChange={(e) => setEditData({...editData, venueDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Price Range</label>
                  <div className="flex-gap">
                    <input type="number" className="input" placeholder="Min" value={editData.priceMin}
                      onChange={(e) => setEditData({...editData, priceMin: e.target.value})} />
                    <input type="number" className="input" placeholder="Max" value={editData.priceMax}
                      onChange={(e) => setEditData({...editData, priceMax: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(undefined); setDownloadResolve(null); } }}>
          <div className="modal download-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Download Image</h2>
              <button className="modal-close" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(undefined); setDownloadResolve(null); } }}>×</button>
            </div>
            <div className="modal-body">
              <p className="download-modal-desc">Choose how you want to save the image:</p>
              <div className="download-options">
                <button className="download-option-btn" onClick={() => handleDownloadChoice(true)}>
                  <span className="download-option-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 21H3M18 13l-6 6-6-6M12 3v16"/>
                    </svg>
                  </span>
                  <span className="download-option-label">Custom Path</span>
                  <span className="download-option-desc">Choose where to save the file</span>
                </button>
                <button className="download-option-btn" onClick={() => handleDownloadChoice(false)}>
                  <span className="download-option-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </span>
                  <span className="download-option-label">Default Path</span>
                  <span className="download-option-desc">Save to browser's default download folder</span>
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(undefined); setDownloadResolve(null); } }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageManagement;
