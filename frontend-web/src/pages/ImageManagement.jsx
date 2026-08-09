import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import FilterSidebar from "../components/FilterSidebar";
import ColorPicker from "../components/ColorPicker";
import ReportModal from "../components/ReportModal";
import AutocompleteInput from "../components/AutocompleteInput";
import FolderCard from "../components/FolderCard";
import FolderBox from "../components/FolderBox";
import useChunkedRender from "../hooks/useChunkedRender";
import {
  UPLOAD_ROLES, EDIT_DELETE_ROLES, FOLDER_VIEW_ROLES, MANAGE_USERS_ROLES, REPORT_ROLES, DOWNLOAD_ALL_ROLES,
  SIZE_UNITS, FLOWER_TYPES, EVENT_TYPES, DECOR_TYPES,
} from "../constants";
import { downloadAsPDF } from "../utils/pdfGenerator";
import "./ImageManagement.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");
const COMMON_SEARCH_LABELS = {
  venue: "Venue",
  eventType: "Event Type",
  decorType: "Decoration Type",
  priceRange: "Price Range",
  size: "Size",
  colour: "Colour",
  flowerType: "Flower Type",
  designName: "Design Name",
  folderName: "Folder Name",
  collectedBy: "Collected By",
  all: "All Fields",
};

function ImageManagement() {
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxRotation, setLightboxRotation] = useState(0);
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
  const [favFolderEventTypes, setFavFolderEventTypes] = useState([]);
  const [favCollectedBy, setFavCollectedBy] = useState("");
  const [selectedFavFolder, setSelectedFavFolder] = useState(null);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderVenue, setEditFolderVenue] = useState("");
  const [editFolderDate, setEditFolderDate] = useState("");
  const [editFolderEventTypes, setEditFolderEventTypes] = useState([]);
  const [editFolderCollectedBy, setEditFolderCollectedBy] = useState("");
  const [showEditFavFolderModal, setShowEditFavFolderModal] = useState(false);
  const [editingFavFolder, setEditingFavFolder] = useState(null);
  const [editFavFolderName, setEditFavFolderName] = useState("");
  const [editFavFolderVenue, setEditFavFolderVenue] = useState("");
  const [editFavFolderDate, setEditFavFolderDate] = useState("");
  const [editFavFolderEventTypes, setEditFavFolderEventTypes] = useState([]);
  const [editFavFolderCollectedBy, setEditFavFolderCollectedBy] = useState("");
  const [commonSearch, setCommonSearch] = useState("");
  const [commonSearchType, setCommonSearchType] = useState("venue");
  const [searchSizeWidth, setSearchSizeWidth] = useState("");
  const [searchSizeLength, setSearchSizeLength] = useState("");
  const [searchSizeHeight, setSearchSizeHeight] = useState("");
  const [searchPriceMin, setSearchPriceMin] = useState("");
  const [searchPriceMax, setSearchPriceMax] = useState("");
  const [searchColors, setSearchColors] = useState([]);
  const commonSearchPrevView = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editData, setEditData] = useState({});
  const getFormConfigKey = () => {
    const u = ApiService.getCurrentUser();
    return u ? `formConfig_${u.username || u.displayName || "default"}` : "formConfig";
  };

  const [formConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getFormConfigKey())) || {}; } catch { return {}; }
  });
  const [notification, setNotification] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadResolve, setDownloadResolve] = useState(null);
  const [showOtherServices, setShowOtherServices] = useState(false);
  const [otherServicesTab, setOtherServicesTab] = useState("");
  const [customEventTypes, setCustomEventTypes] = useState([]);
  const [customDecorTypes, setCustomDecorTypes] = useState([]);
  const [customETInput, setCustomETInput] = useState("");
  const [customFavETInput, setCustomFavETInput] = useState("");
  const [customEditETInput, setCustomEditETInput] = useState("");
  const [customEditFavETInput, setCustomEditFavETInput] = useState("");
  const [hiddenEventTypes, setHiddenEventTypes] = useState([]);
  const [hiddenDecorTypes, setHiddenDecorTypes] = useState([]);
  const [designNameSugs, setDesignNameSugs] = useState([]);
  const [venueSugs, setVenueSugs] = useState([]);

  const designNameSugTimer = useRef(null);
  const venueSugTimer = useRef(null);
  const lightboxTouchStartX = useRef(0);
  const lightboxTouchStartY = useRef(0);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showFavEventTypeDropdown, setShowFavEventTypeDropdown] = useState(false);
  const [showEditEventTypeDropdown, setShowEditEventTypeDropdown] = useState(false);
  const [showEditFavEventTypeDropdown, setShowEditFavEventTypeDropdown] = useState(false);
  const eventTypeRef = useRef(null);
  const favEventTypeRef = useRef(null);
  const editEventTypeRef = useRef(null);
  const editFavEventTypeRef = useRef(null);

  const chunkedFiltered = useChunkedRender(filteredImages);
  const chunkedAllImages = useChunkedRender(allImages);
  const chunkedFavorites = useChunkedRender(favoriteImages);
  const chunkedFolderImages = useChunkedRender(images);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (eventTypeRef.current && !eventTypeRef.current.contains(e.target)) {
        setShowEventTypeDropdown(false);
      }
      if (favEventTypeRef.current && !favEventTypeRef.current.contains(e.target)) {
        setShowFavEventTypeDropdown(false);
      }
      if (editEventTypeRef.current && !editEventTypeRef.current.contains(e.target)) {
        setShowEditEventTypeDropdown(false);
      }
      if (editFavEventTypeRef.current && !editFavEventTypeRef.current.contains(e.target)) {
        setShowEditFavEventTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allEventTypes = [...EVENT_TYPES, ...customEventTypes].filter((t, i, arr) => arr.indexOf(t) === i && !hiddenEventTypes.includes(t));
  const allDecorTypes = [...DECOR_TYPES, ...customDecorTypes].filter((t, i, arr) => arr.indexOf(t) === i && !hiddenDecorTypes.includes(t));

  const showNotif = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const isFieldRequired = (fieldKey) => formConfig[fieldKey] !== false;

  const [customerName, setCustomerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderEventTypes, setFolderEventTypes] = useState([]);
  const [collectedBy, setCollectedBy] = useState("");

  const [imageData, setImageData] = useState({
    designName: "",
    eventType: "",
    decorType: "",
    sizeWidth: "",
    sizeLength: "",
    sizeHeight: "",
    sizeUnit: "sq.ft",
    colours: [],
    flowerType: "",
    priceMin: "",
    priceMax: "",
    venueName: "",
  });

  const navigate = useNavigate();
  const imageFileRef = useRef(null);
  const searchTimerRef = useRef(null);
  const searchSizeWidthRef = useRef("");
  const searchSizeLengthRef = useRef("");
  const searchSizeHeightRef = useRef("");
  const searchPriceMinRef = useRef("");
  const searchPriceMaxRef = useRef("");
  const searchColorsRef = useRef([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      loadDropdownConfig();
      const isFolderViewUser = user && FOLDER_VIEW_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
      if (!isFolderViewUser) {
        setView("images");
        loadAllImages();
      }
    }
  }, [user]);

  const loadDropdownConfig = async () => {
    try {
      const config = await ApiService.getDropdownConfig();
      if (config.eventTypes) setCustomEventTypes(config.eventTypes);
      if (config.decorTypes) setCustomDecorTypes(config.decorTypes);
      if (config.hiddenEventTypes) setHiddenEventTypes(config.hiddenEventTypes);
      if (config.hiddenDecorTypes) setHiddenDecorTypes(config.hiddenDecorTypes);
    } catch (err) {
      console.error("Failed to load dropdown config:", err);
    }
  };

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
    if (!currentFolder) { setImages([]); return []; }
    if (isUploading.current) return [];
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
      return result.images;
    } catch (err) {
      if (!isUploading.current) showNotif("Something went wrong");
      return [];
    } finally {
      isUploading.current = false;
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

  const getFullResUrl = useCallback((imageData) => {
    const rawUrl = imageData?.imageUrl || "";
    if (!rawUrl) return "";
    return rawUrl.startsWith("http") ? rawUrl : `${IMAGE_BASE_URL}${rawUrl}`;
  }, []);

  const preloadAdjacent = useCallback((imageArray, index) => {
    const preloadIdx = [index - 1, index + 1];
    for (const idx of preloadIdx) {
      if (idx >= 0 && idx < imageArray.length) {
        const url = imageArray[idx]?.image_data?.imageUrl;
        if (url && url.startsWith("http")) {
          const img = new Image();
          img.src = url;
        }
      }
    }
  }, []);

  const openLightbox = useCallback((imageArray, index) => {
    const img = imageArray[index];
    setLightboxRotation(0);
    setLightboxImage({
      url: getFullResUrl(img.image_data),
      data: img.image_data,
      id: img.id,
      isFav: favoriteImages.some(fav => fav.id === img.id),
      allImages: imageArray,
      currentIndex: index,
    });
    preloadAdjacent(imageArray, index);
  }, [favoriteImages, getFullResUrl, preloadAdjacent]);

  const handleAddFolder = async (e) => {
    e.preventDefault();
    const missing = [];
    if (isFieldRequired("folder_customerName") && !customerName.trim()) missing.push("Customer Name");
    if (isFieldRequired("folder_venue") && !venueName.trim()) missing.push("Venue");
    if (isFieldRequired("folder_eventDate") && !eventDate) missing.push("Event Date");
    if (isFieldRequired("folder_collectedBy") && !collectedBy.trim()) missing.push("Collected By");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    const folderName = `${customerName.trim()}_${venueName.trim()}_${eventDate}`;
    setLoading(true);
    try {
      await ApiService.createFolder(folderName, folderDescription.trim(), folderEventTypes, collectedBy.trim());
      resetAddFolderForm();
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
    setEditFolderEventTypes(folder.event_types || []);
    setEditFolderCollectedBy(folder.collected_by || "");
    setShowEditFolderModal(true);
  };

  const handleSaveEditFolder = async (e) => {
    e.preventDefault();
    if (!editingFolder) return;
    const newName = `${editFolderName.trim()}_${editFolderVenue.trim()}_${editFolderDate}`;
    if (!editFolderName.trim()) { showNotif("Customer name is required", "warning"); return; }
    setLoading(true);
    try {
      await ApiService.updateFolder(editingFolder.id, newName, editFolderEventTypes, editFolderCollectedBy.trim());
      resetEditFolderForm();
      setShowEditFolderModal(false);
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
    setSelectedImageIds(new Set());
  };

  const resetUploadForm = () => {
    const folderVenue = currentFolder ? parseFolderName(currentFolder.name).venue : "";
    setImageData({ designName: "", eventType: "", decorType: "", sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft", colours: [], flowerType: "", priceMin: "", priceMax: "", venueName: folderVenue });
    setSelectedImage(null);
    setImagePreview("");
    setUploadProgress("");
    setDesignNameSugs([]);
    setVenueSugs([]);
    isUploading.current = false;
  };

  const resetAddFolderForm = () => {
    setCustomerName("");
    setVenueName("");
    setEventDate("");
    setFolderDescription("");
    setFolderEventTypes([]);
    setCollectedBy("");
    setCustomETInput("");
    setShowEventTypeDropdown(false);
  };

  const resetAddFavFolderForm = () => {
    setFavCustName("");
    setFavVenue("");
    setFavEventDate("");
    setFavFolderDesc("");
    setFavFolderEventTypes([]);
    setFavCollectedBy("");
    setCustomFavETInput("");
    setShowFavEventTypeDropdown(false);
  };

  const resetEditFolderForm = () => {
    setEditingFolder(null);
    setEditFolderName("");
    setEditFolderVenue("");
    setEditFolderDate("");
    setEditFolderEventTypes([]);
    setEditFolderCollectedBy("");
    setCustomEditETInput("");
    setShowEditEventTypeDropdown(false);
  };

  const resetEditImageForm = () => {
    setEditingImage(null);
    setEditData({});
  };

  const preventNumberAction = (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
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

  

  const buildSizeDisplay = (width, length, height, unit) => {
    const parts = [];
    if (width && width !== "0") parts.push(`${width} W`);
    if (length && length !== "0") parts.push(`${length} L`);
    if (height && height !== "0") parts.push(`${height} H`);
    if (parts.length === 0) return "";
    return parts.join(" x ") + (unit ? ` ${unit}` : "");
  };

  const handleUploadSingleImage = async (e) => {
    e.preventDefault();
    if (!selectedImage) { showNotif("Please select an image", "warning"); return; }
    const missing = [];
    if (isFieldRequired("image_designName") && !imageData.designName) missing.push("Design Name");
    if (isFieldRequired("image_decorType") && !imageData.decorType) missing.push("Decoration Type");
    if (isFieldRequired("image_colours") && imageData.colours.length === 0) missing.push("Colour");
    if (isFieldRequired("image_size") && !imageData.sizeWidth && !imageData.sizeLength && !imageData.sizeHeight) missing.push("Size (at least W, L, or H)");
    if (isFieldRequired("image_price") && !imageData.priceMin && !imageData.priceMax) missing.push("Price Range");
    const folderVenueName = currentFolder ? parseFolderName(currentFolder.name).venue : "";
    if (isFieldRequired("image_venueName") && !imageData.venueName && !folderVenueName) missing.push("Venue");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    if (imageData.priceMin && imageData.priceMax && parseFloat(imageData.priceMax) <= parseFloat(imageData.priceMin)) {
      showNotif("Maximum price must be greater than minimum price", "warning");
      return;
    }
    setLoading(true);
    isUploading.current = true;
    setUploadProgress("Uploading image...");
    let imageUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const uploadResult = await ApiService.uploadFile(selectedImage, currentFolder.name);
      imageUrl = uploadResult.imageUrl;

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
        decorType: imageData.decorType,
        venueCustomer: folderCustomer,
        venueName: imageData.venueName || folderVenue,
        flowerType: imageData.flowerType,
        priceMin: imageData.priceMin,
        priceMax: imageData.priceMax,
        collectedBy: currentFolder.collected_by || "",
      };
      setUploadProgress("Saving metadata...");
      await ApiService.uploadImage(metaData);
      setUploadProgress("Uploaded successfully!");
      setSelectedImage(null);
      setImagePreview("");
      setImageData({ designName: "", eventType: "", decorType: "", sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft", colours: [], flowerType: "", priceMin: "", priceMax: "", venueName: "" });
      isUploading.current = false;
      try { await loadImages(); } catch {}
      setTimeout(() => {
        resetUploadForm();
        setShowUploadModal(false);
      }, 1500);
    } catch (err) {
      if (imageUrl) {
        ApiService.destroyImage(imageUrl).catch(() => {});
      }
      showNotif(err.name === "AbortError" ? "Upload timed out. Please try again." : "Something went wrong");
    } finally {
      clearTimeout(timeoutId);
      isUploading.current = false;
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Delete this image?")) return;
    setImages(prev => prev.filter(img => img.id !== id));
    setAllImages(prev => prev.filter(img => img.id !== id));
    setFilteredImages(prev => prev.filter(img => img.id !== id));
    setFavoriteImages(prev => prev.filter(img => img.id !== id));
    setSelectedImageIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    try {
      const res = await ApiService.deleteImage(id);
      if (res && res.folderDeleted && currentFolder && currentFolder.name === res.folderName) {
        setCurrentFolder(null);
        setImages([]);
        setView("folders");
      } else if (currentFolder) {
        await loadImages();
      }
      if (showFavorites) await loadFavorites(selectedFavFolder?.name);
      loadFolders();
    } catch (err) {
      if (currentFolder) await loadImages();
      showNotif("Something went wrong");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImageIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedImageIds.size} image(s)?`)) return;
    setLoading(true);
    try {
      for (const id of selectedImageIds) {
        const res = await ApiService.deleteImage(id);
        if (res && res.folderDeleted && currentFolder && currentFolder.name === res.folderName) {
          setCurrentFolder(null);
          setImages([]);
          setView("folders");
        }
      }
      setSelectedImageIds(new Set());
      if (currentFolder) loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
      loadFolders();
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

  const handleDownloadChoice = (choice) => {
    setShowDownloadModal(false);
    if (downloadResolve) {
      downloadResolve(choice);
      setDownloadResolve(null);
    }
  };

  const handleDownloadFolder = async (folderName) => {
    const choice = await openDownloadModal();
    if (!choice) return;
    if (choice === "image") {
      try {
        showNotif("Preparing folder download...", "warning");
        await ApiService.downloadFolder(folderName);
        showNotif("Folder download complete", "success");
      } catch (err) {
        showNotif(err.message || "Download failed");
      }
    } else {
      try {
        showNotif("Preparing PDF...", "warning");
        await downloadAsPDF(images);
        showNotif("PDF download complete", "success");
      } catch (err) {
        showNotif(err.message || "PDF generation failed");
      }
    }
  };

  const handleDownloadFavoriteFolder = async (folder) => {
    const choice = await openDownloadModal();
    if (!choice) return;
    if (choice === "image") {
      try {
        showNotif("Preparing favorite folder download...", "warning");
        await ApiService.downloadFavoriteFolder(folder.id);
        showNotif("Download complete", "success");
      } catch (err) {
        showNotif(err.message || "Download failed");
      }
    } else {
      try {
        showNotif("Preparing PDF...", "warning");
        const favImgs = favoriteFolders.length > 0 ? favoriteImages : [];
        await downloadAsPDF(favImgs);
        showNotif("PDF download complete", "success");
      } catch (err) {
        showNotif(err.message || "PDF generation failed");
      }
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImageIds.size === 0) return;
    const choice = await openDownloadModal();
    if (!choice) return;
    if (choice === "image") {
      for (const id of selectedImageIds) {
        try {
          await ApiService.downloadImage(id, false);
        } catch (err) {
          showNotif(`Failed to download image ${id}: ${err.message}`);
        }
      }
    } else {
      try {
        showNotif("Preparing PDF...", "warning");
        const allImgs = allImages.length > 0 ? allImages : images;
        const selectedImgs = allImgs.filter((img) => selectedImageIds.has(img.id));
        await downloadAsPDF(selectedImgs);
        showNotif("PDF download complete", "success");
      } catch (err) {
        showNotif(err.message || "PDF generation failed");
      }
    }
  };

  const handleDownloadAll = async () => {
    const choice = await openDownloadModal();
    if (!choice) return;
    if (choice === "image") {
      try {
        showNotif("Preparing download...", "warning");
        await ApiService.downloadAllImages();
        showNotif("Download complete", "success");
      } catch (err) {
        showNotif(err.message || "Download failed");
      }
    } else {
      try {
        showNotif("Preparing PDF...", "warning");
        await downloadAsPDF(allImages);
        showNotif("PDF download complete", "success");
      } catch (err) {
        showNotif(err.message || "PDF generation failed");
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

  const toggleImageSelection = useCallback((id) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleMoveImagesToFolder = async (targetFolderName, draggedImageId) => {
    const idsToMove = draggedImageId ? [parseInt(draggedImageId, 10)] : [...selectedImageIds];
    if (idsToMove.length === 0) return;
    setLoading(true);
    try {
      if (showFavorites) {
        const targetFolder = favoriteFolders.find(f => f.name === targetFolderName);
        if (!targetFolder) {
          showNotif("Selected folder not found in Favorites", "warning");
          setLoading(false);
          return;
        }
        await ApiService.addImagesToFavouriteFolder(targetFolder.id, idsToMove);
        showNotif(`${idsToMove.length} image(s) moved to "${parseFolderName(targetFolderName).customerName || targetFolderName}"`, "success");
      } else {
        for (const imageId of idsToMove) {
          await ApiService.moveImageToFolder(imageId, targetFolderName);
        }
      }
      setSelectedImageIds(new Set());
      setShowMoveModal(false);
      if (showFavorites) {
        await loadFavorites(selectedFavFolder?.name);
        await loadFavoriteFolders();
      } else {
        await loadImages();
      }
    } catch (err) {
      console.error("Move to folder failed:", err);
      showNotif(err.message || "Something went wrong");
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
      if (filterData.placeOfEvent) searchFilters.placeOfEvent = filterData.placeOfEvent;
      if (filterData.folderName) searchFilters.folderName = filterData.folderName;
      if (filterData.collectedBy) searchFilters.collectedBy = filterData.collectedBy;
      if (filterData.priceRange) {
        if (filterData.priceRange[0] != null && filterData.priceRange[0] > 0) searchFilters.priceMin = filterData.priceRange[0];
        if (filterData.priceRange[1] != null && filterData.priceRange[1] < 10000) searchFilters.priceMax = filterData.priceRange[1];
      }
      if (filterData.sizeFilters) {
        if (filterData.sizeFilters.width) searchFilters.sizeWidth = filterData.sizeFilters.width;
        if (filterData.sizeFilters.length) searchFilters.sizeLength = filterData.sizeFilters.length;
        if (filterData.sizeFilters.height) searchFilters.sizeHeight = filterData.sizeFilters.height;
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

  const clearCommonSearchResult = useCallback(() => {
    setFilteredImages([]);
    if (commonSearchPrevView.current) {
      setView(commonSearchPrevView.current);
      commonSearchPrevView.current = null;
    }
  }, []);

  const handleCommonSearch = useCallback(async (searchValue) => {
    const term = searchValue !== undefined ? searchValue : commonSearch;
    setLoading(true);
    try {
      const searchFilters = {};
      if (commonSearchType === "size") {
        const sw = searchSizeWidthRef.current;
        const sl = searchSizeLengthRef.current;
        const sh = searchSizeHeightRef.current;
        if (sw) searchFilters.sizeWidth = sw;
        if (sl) searchFilters.sizeLength = sl;
        if (sh) searchFilters.sizeHeight = sh;
        if (Object.keys(searchFilters).length === 0) {
          clearCommonSearchResult();
          setLoading(false);
          return;
        }
      } else if (commonSearchType === "priceRange") {
        const min = searchPriceMinRef.current ? parseFloat(searchPriceMinRef.current) : null;
        const max = searchPriceMaxRef.current ? parseFloat(searchPriceMaxRef.current) : null;
        if (min !== null && max !== null && min > max) {
          showNotif("Minimum price cannot be greater than maximum price", "warning");
          setLoading(false);
          return;
        }
        if (min !== null) searchFilters.priceMin = min;
        if (max !== null) searchFilters.priceMax = max;
        if (Object.keys(searchFilters).length === 0) {
          clearCommonSearchResult();
          setLoading(false);
          return;
        }
      } else if (commonSearchType === "colour") {
        const colors = searchColorsRef.current;
        if (colors.length > 0) {
          searchFilters.colors = colors.join(",");
        } else {
          clearCommonSearchResult();
          setLoading(false);
          return;
        }
      } else {
        if (!term.trim()) {
          clearCommonSearchResult();
          setLoading(false);
          return;
        }
        if (commonSearchType === "venue") searchFilters.placeOfEvent = term;
        else if (commonSearchType === "eventType") searchFilters.eventType = term;
        else if (commonSearchType === "decorType") searchFilters.decorType = term;
        else if (commonSearchType === "flowerType") searchFilters.flowerType = term;
        else if (commonSearchType === "designName") searchFilters.designName = term;
        else if (commonSearchType === "folderName") searchFilters.folderName = term;
        else if (commonSearchType === "collectedBy") searchFilters.collectedBy = term;
        else searchFilters.searchText = term;
      }
      if (view !== "filtered") {
        commonSearchPrevView.current = view;
      }
      const data = await ApiService.searchImages(searchFilters);
      setFilteredImages(data);
      setView("filtered");
    } catch (err) {
      showNotif("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [commonSearch, commonSearchType, view, clearCommonSearchResult]);

  const debouncedCommonSearch = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => handleCommonSearch(), 300);
  }, [handleCommonSearch]);

  const suggTimerRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (suggTimerRef.current) clearTimeout(suggTimerRef.current);
    if (!query.trim()) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    const sugFieldMap = { venue: "venueName", eventType: "eventType", decorType: "decorType", flowerType: "flowerType", designName: "designName", folderName: "folderName", collectedBy: "collectedBy", all: "designName" };
    const field = sugFieldMap[commonSearchType];
    if (!field) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    suggTimerRef.current = setTimeout(async () => {
      try {
        const data = await ApiService.getSuggestions(field, query);
        setSearchSuggestions(data);
        setShowSuggestions(true);
      } catch { setSearchSuggestions([]); }
    }, 200);
  };

  const handleToggleFavorites = () => {
    const wasShowing = showFavorites;
    setShowFavorites(!wasShowing);
    setSelectedImageIds(new Set());
    if (!wasShowing) {
      loadFavorites();
      loadFavoriteFolders();
      setCurrentFolder(null);
      setFilteredImages([]);
    }
  };

  const handleEnterFavoriteFolder = (folder) => {
    setSelectedFavFolder(folder);
    setSelectedImageIds(new Set());
    loadFavorites(folder.name);
  };

  const handleBackFromFavFolder = () => {
    setSelectedFavFolder(null);
    setSelectedImageIds(new Set());
    loadFavorites();
  };

  const handleDeleteFavoriteFolder = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete folder "${name}" from Favorites?`)) return;
    try {
      await ApiService.deleteFavoriteFolder(id);
      loadFavoriteFolders();
    } catch (err) {
      showNotif("Something went wrong");
    }
  };

  const handleOpenEditFavFolder = (folder, e) => {
    e.stopPropagation();
    const { customerName, venue, eventDate } = parseFolderName(folder.name);
    setEditingFavFolder(folder);
    setEditFavFolderName(customerName);
    setEditFavFolderVenue(venue);
    setEditFavFolderDate(eventDate);
    setEditFavFolderEventTypes(folder.event_types || []);
    setEditFavFolderCollectedBy(folder.collected_by || "");
    setShowEditFavFolderModal(true);
  };

  const handleSaveEditFavFolder = async (e) => {
    e.preventDefault();
    if (!editingFavFolder) return;
    const newName = `${editFavFolderName.trim()}_${editFavFolderVenue.trim()}_${editFavFolderDate}`;
    if (!editFavFolderName.trim()) { showNotif("Customer name is required", "warning"); return; }
    setLoading(true);
    try {
      await ApiService.updateFavoriteFolder(editingFavFolder.id, newName, editFavFolderCollectedBy.trim());
      resetEditFavFolderForm();
      setShowEditFavFolderModal(false);
      loadFavoriteFolders();
      if (selectedFavFolder && selectedFavFolder.id === editingFavFolder.id) {
        setSelectedFavFolder(prev => ({ ...prev, name: newName }));
      }
    } catch (err) {
      showNotif(err.message || "Failed to rename folder");
    } finally {
      setLoading(false);
    }
  };

  const resetEditFavFolderForm = () => {
    setEditingFavFolder(null);
    setEditFavFolderName("");
    setEditFavFolderVenue("");
    setEditFavFolderDate("");
    setEditFavFolderEventTypes([]);
    setEditFavFolderCollectedBy("");
    setCustomEditFavETInput("");
    setShowEditFavEventTypeDropdown(false);
  };

  const handleCreateFavFolder = async (e) => {
    e.preventDefault();
    const missing = [];
    if (isFieldRequired("folder_customerName") && !favCustName.trim()) missing.push("Customer Name");
    if (isFieldRequired("folder_venue") && !favVenue.trim()) missing.push("Venue");
    if (isFieldRequired("folder_eventDate") && !favEventDate) missing.push("Event Date");
    if (isFieldRequired("folder_collectedBy") && !favCollectedBy.trim()) missing.push("Collected By");
    if (missing.length > 0) {
      showNotif(`Please fill all required fields: ${missing.join(", ")}`, "warning");
      return;
    }
    const folderName = `${favCustName.trim()}_${favVenue.trim()}_${favEventDate}`;
    try {
      await ApiService.createFavoriteFolder(folderName, favFolderDesc.trim(), favFolderEventTypes, favCollectedBy.trim());
      resetAddFavFolderForm();
      setShowAddFavFolderModal(false);
      loadFavoriteFolders();
    } catch (err) {
      showNotif("Something went wrong");
    }
  };

  const handleEditImage = useCallback((image) => {
    const data = image.image_data || {};
    setEditingImage(image);
    setEditData({
      designName: data.designName || "",
      eventType: data.eventType || "",
      decorType: data.decorType || "",
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
  }, []);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingImage) return;
    if (editData.priceMin && editData.priceMax && parseFloat(editData.priceMax) <= parseFloat(editData.priceMin)) {
      showNotif("Maximum price must be greater than minimum price", "warning");
      return;
    }
    const sizeDisplay = buildSizeDisplay(editData.sizeWidth, editData.sizeLength, editData.sizeHeight, editData.sizeUnit);
    const { colours: editColours, ...editRest } = editData;
    const updatedImageData = { ...editingImage.image_data, ...editRest, colourCombination: editColours, sizeDisplay };
    const optimisticImage = { ...editingImage, image_data: updatedImageData };
    setImages(prev => prev.map(img => img.id === editingImage.id ? optimisticImage : img));
    setAllImages(prev => prev.map(img => img.id === editingImage.id ? optimisticImage : img));
    setFilteredImages(prev => prev.map(img => img.id === editingImage.id ? optimisticImage : img));
    setFavoriteImages(prev => prev.map(img => img.id === editingImage.id ? optimisticImage : img));
    resetEditImageForm();
    setShowEditModal(false);
    try {
      await ApiService.updateImage(editingImage.id, { ...editRest, colourCombination: editColours, sizeDisplay });
      if (currentFolder) await loadImages();
      if (showFavorites) await loadFavorites(selectedFavFolder?.name);
      if (view === "images") await loadAllImages();
    } catch (err) {
      if (currentFolder) await loadImages();
      showNotif("Something went wrong");
    }
  };

  const renderImageCardDetails = (data) => {
    if (!data) return null;
    const sizeDisplay = buildSizeDisplay(data.sizeWidth, data.sizeLength, data.sizeHeight, data.sizeUnit) || data.sizeDisplay;
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
      } else if (e.key === "r" || e.key === "R") {
        setLightboxRotation(prev => (prev + 90) % 360);
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

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canEditDelete = user && EDIT_DELETE_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canViewFolders = user && FOLDER_VIEW_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canDownloadAll = user && DOWNLOAD_ALL_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canViewUsers = user && (MANAGE_USERS_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase()) || user.role?.toLowerCase() === "admin");
  const canViewReport = user && REPORT_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const isUploading = useRef(false);

  const handleOpenReport = async () => {
    setReportLoading(true);
    setShowReportModal(true);
    try {
      const data = await ApiService.getReport();
      setReportData(data);
    } catch (err) {
      showNotif("Failed to load report: " + err.message);
      setShowReportModal(false);
    } finally {
      setReportLoading(false);
    }
  };

  const handleCloseReport = () => {
    setShowReportModal(false);
    setReportData([]);
  };

  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  const formatEventDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthsShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

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

  const renderImageCard = useCallback((image, index, imageArray, showActions = true) => {
    const rawUrl = image.image_data?.imageUrl || "";
    const imgUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `${IMAGE_BASE_URL}${rawUrl}`) : "";
    const isFav = favoriteImages.some(fav => fav.id === image.id);
    const isSelected = selectedImageIds.has(image.id);
    const data = image.image_data || {};
    const buildSizeLabeled = (w, l, h) => {
      const parts = [];
      if (w && w !== "0") parts.push(`${w} W`);
      if (l && l !== "0") parts.push(`${l} L`);
      if (h && h !== "0") parts.push(`${h} H`);
      return parts.join(" x ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "");
    };
    const sizeDisplay = buildSizeLabeled(data.sizeWidth, data.sizeLength, data.sizeHeight);
    const priceDisplay = formatPrice(data.priceMin, data.priceMax);
    const colorsDisplay = data.colourCombination?.length > 0 ? data.colourCombination.join(", ") : "";

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
          {showActions && (
          <div className="image-card-hover-actions">
            {canEditDelete && (
              <>
                <button className="btn-image-edit" onClick={(e) => { e.stopPropagation(); handleEditImage(image); }}>Edit</button>
                <button className="btn-image-delete" onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}>Delete</button>
              </>
            )}
          </div>
          )}
          <div className="image-card-hover-details">
            {data.designName && <div className="hover-detail"><span>Design</span> {data.designName}</div>}
            {data.decorType && <div className="hover-detail"><span>Decor</span> {data.decorType}</div>}
            {data.eventType && <div className="hover-detail"><span>Event</span> {data.eventType}</div>}
            {sizeDisplay && <div className="hover-detail"><span>Size</span> {sizeDisplay}</div>}
            {priceDisplay && <div className="hover-detail"><span>Price</span> {priceDisplay}</div>}
            {colorsDisplay && <div className="hover-detail"><span>Colors</span> {colorsDisplay}</div>}
            {data.flowerType && <div className="hover-detail"><span>Flower</span> {data.flowerType}</div>}
            {data.venueCustomer && <div className="hover-detail"><span>Customer</span> {data.venueCustomer}</div>}
            {data.venueName && <div className="hover-detail"><span>Venue</span> {data.venueName}</div>}
            {data.venueDate && <div className="hover-detail"><span>Date</span> {formatEventDate(data.venueDate)}</div>}
          </div>
        </div>
        <div className="image-card-info">
          <div className="image-card-design"><span className="info-label">Design Name -</span> {data.designName || "Untitled"}</div>
        </div>
      </div>
    );
  }, [favoriteImages, selectedImageIds, canEditDelete, toggleImageSelection, handleEditImage, openLightbox, formatEventDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedFolders = React.useMemo(() => [...folders].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA;
  }), [folders]);

  const renderFolderView = () => (
    <div className="folder-view-with-filters">
      <div className="folder-main-content">
        <div className="action-bar">
          <div className="action-bar-left">
            {canViewFolders && <h2>{view === "images" ? "All Images" : "Folders"}</h2>}
            <div className="common-search-bar common-search-with-suggestions">
              <select
                className="common-search-select"
                value={commonSearchType}
                onChange={(e) => {
                  setCommonSearchType(e.target.value);
                  setCommonSearch("");
                  setSearchSizeWidth("");
                  setSearchSizeHeight("");
                  setSearchSizeLength("");
                  setSearchPriceMin("");
                  setSearchPriceMax("");
                  setSearchColors([]);
                  searchSizeWidthRef.current = "";
                  searchSizeLengthRef.current = "";
                  searchSizeHeightRef.current = "";
                  searchPriceMinRef.current = "";
                  searchPriceMaxRef.current = "";
                  searchColorsRef.current = [];
                  setSearchSuggestions([]);
                  setShowSuggestions(false);
                  clearCommonSearchResult();
                }}
              >
                <option value="venue">Venue</option>
                <option value="eventType">Event Type</option>
                <option value="decorType">Decoration Type</option>
                <option value="priceRange">Price Range</option>
                <option value="size">Size</option>
                <option value="colour">Colour</option>
                <option value="flowerType">Flower Type</option>
                <option value="designName">Design Name</option>
                <option value="folderName">Folder Name</option>
                <option value="collectedBy">Collected By</option>
                <option value="all">All Fields</option>
              </select>
              <div className="common-search-input-wrap">
                {commonSearchType === "size" ? (
                  <div className="common-size-inputs">
                    <input type="number" className="common-search-input common-size-input" placeholder="W" min="0"
                      value={searchSizeWidth}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchSizeWidth(val);
                        searchSizeWidthRef.current = val;
                        debouncedCommonSearch();
                      }} />
                    <span className="size-sep">x</span>
                    <input type="number" className="common-search-input common-size-input" placeholder="L" min="0"
                      value={searchSizeLength}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchSizeLength(val);
                        searchSizeLengthRef.current = val;
                        debouncedCommonSearch();
                      }} />
                    <span className="size-sep">x</span>
                    <input type="number" className="common-search-input common-size-input" placeholder="H" min="0"
                      value={searchSizeHeight}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchSizeHeight(val);
                        searchSizeHeightRef.current = val;
                        debouncedCommonSearch();
                      }} />
                  </div>
                ) : commonSearchType === "priceRange" ? (
                  <div className="common-price-inputs">
                    <input type="number" className="common-search-input common-price-input" placeholder="Min Price" min="0"
                      value={searchPriceMin}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchPriceMin(val);
                        searchPriceMinRef.current = val;
                        debouncedCommonSearch();
                      }} />
                    <span className="price-sep">-</span>
                    <input type="number" className="common-search-input common-price-input" placeholder="Max Price" min="0"
                      value={searchPriceMax}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchPriceMax(val);
                        searchPriceMaxRef.current = val;
                        debouncedCommonSearch();
                      }} />
                  </div>
                ) : commonSearchType === "colour" ? (
                  <div className="common-colour-search">
                    <ColorPicker
                      selectedColors={searchColors}
                      onChange={(colors) => {
                        setSearchColors(colors);
                        searchColorsRef.current = colors;
                        debouncedCommonSearch();
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="common-search-input"
                      placeholder={`Search ${COMMON_SEARCH_LABELS[commonSearchType] || commonSearchType}...`}
                      value={commonSearch}
                      onChange={(e) => {
                        setCommonSearch(e.target.value);
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                        searchTimerRef.current = setTimeout(() => handleCommonSearch(e.target.value), 300);
                        fetchSuggestions(e.target.value);
                      }}
                      onFocus={() => { if (searchSuggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <ul className="search-suggestions-list">
                        {searchSuggestions.map((s, i) => (
                          <li key={i} className="search-suggestion-item"
                            onMouseDown={() => { setCommonSearch(s); handleCommonSearch(s); setShowSuggestions(false); }}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
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
              <button className="btn btn-download-all" onClick={handleDownloadAll}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All
              </button>
            )}
            {canViewReport && (
              <button className="btn btn-report" onClick={handleOpenReport} title="Report">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Report
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
            customEventTypes={customEventTypes}
            customDecorTypes={customDecorTypes}
            hiddenEventTypes={hiddenEventTypes}
            hiddenDecorTypes={hiddenDecorTypes}
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
        {selectedImageIds.size > 0 && renderSelectionToolbar(filteredImages)}
        <div className="image-grid">
          {chunkedFiltered.visibleItems.map((image, index) => renderImageCard(image, index, chunkedFiltered.visibleItems))}
          {chunkedFiltered.totalCount > chunkedFiltered.visibleCount && (
            <div className="loading-more" style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
              Loading more images...
            </div>
          )}
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
        {selectedImageIds.size > 0 && renderSelectionToolbar(allImages)}
        <div className="image-grid">
          {chunkedAllImages.visibleItems.map((image, index) => renderImageCard(image, index, chunkedAllImages.visibleItems))}
          {chunkedAllImages.totalCount > chunkedAllImages.visibleCount && (
            <div className="loading-more" style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
              Loading more images...
            </div>
          )}
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
          <div className="upload-box-card add-folder-box" onClick={() => { loadDropdownConfig(); setShowAddFolderModal(true); }}>
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
              onDownload={(f) => handleDownloadFolder(f.name)}
            />
          ))}
      </div>
    )
  );

  const renderFavoritesContent = () => (
    <div className="favorites-view">
      <div className="action-bar">
        <div className="action-bar-title">
          {selectedFavFolder && (
            <button className="btn-icon back-icon" onClick={handleBackFromFavFolder} title="Back">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <h2>{selectedFavFolder ? parseFolderName(selectedFavFolder.name).customerName || selectedFavFolder.name : "★ Favorites"}</h2>
        </div>
        <div className="action-bar-buttons">
          <button className="btn-icon home-icon" onClick={() => setShowFavorites(false)} title="Home">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>
            </svg>
          </button>
        </div>
      </div>

      {!selectedFavFolder && (
        <div className="folder-card-grid favorites-folders-grid">
          <div className="upload-box-card add-folder-box" onClick={() => { loadDropdownConfig(); setShowAddFavFolderModal(true); }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Add Folder</span>
          </div>
          {favoriteFolders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canDelete={true}
              onEdit={(f, evt) => handleOpenEditFavFolder(f, evt)}
              onMoveToFolder={handleMoveImagesToFolder}
              onClick={() => handleEnterFavoriteFolder(folder)}
              onDelete={(e) => handleDeleteFavoriteFolder(folder.id, folder.name, e)}
              onDownload={(f) => handleDownloadFavoriteFolder(f)}
            />
          ))}
        </div>
      )}

      {favoriteImages.length === 0 ? (
        <div className="empty-state"><p>No favorites yet. Star images to add them here.</p></div>
      ) : (
        <>
      {selectedImageIds.size > 0 && renderSelectionToolbar(favoriteImages)}
          <div className="favorites-images-grid">
            {chunkedFavorites.visibleItems.map((image, index) => renderImageCard(image, index, chunkedFavorites.visibleItems, false))}
            {chunkedFavorites.totalCount > chunkedFavorites.visibleCount && (
              <div className="loading-more" style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
                Loading more favorites...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderSelectionToolbar = (currentImageList = []) => {
    const allSelected = currentImageList.length > 0 && currentImageList.every(img => selectedImageIds.has(img.id));
    return (
    <div className="selection-toolbar">
      <span className="selection-count">{selectedImageIds.size} selected</span>
      <button className="btn btn-secondary" onClick={() => {
        if (allSelected) {
          setSelectedImageIds(new Set());
        } else {
          setSelectedImageIds(new Set(currentImageList.map(img => img.id)));
        }
      }}>
        {allSelected ? "Deselect All" : "Select All"}
      </button>
      <button className="btn btn-secondary" onClick={() => { setSelectedImageIds(new Set()); }}>
        Cancel
      </button>
      {showFavorites && (
        <button className="btn btn-secondary" onClick={() => setShowMoveModal(true)} disabled={selectedImageIds.size === 0}>
          Move
        </button>
      )}
      <button className="btn btn-secondary" onClick={handleBulkDownload} disabled={selectedImageIds.size === 0}>
        Download
      </button>
      <button className="btn btn-danger" onClick={handleBulkDelete} disabled={selectedImageIds.size === 0}>
        Delete
      </button>
    </div>
  );
  };

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

      {selectedImageIds.size > 0 && renderSelectionToolbar(images)}

      {loading ? (
        <div className="loading-state"><div className="spinner"></div></div>
      ) : !canUpload && images.length === 0 ? (
        <div className="empty-state"><p>No images in this folder.</p></div>
      ) : (
        <>
          <div className="image-grid">
            {canUpload && selectedImageIds.size === 0 && (
              <>
                <div className="upload-box-card" onClick={() => { loadDropdownConfig(); resetUploadForm(); setShowUploadModal(true); }}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  <span>Upload Image</span>
                </div>
                <div className="upload-box-card" onClick={() => navigate("/batch-upload")}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                    <rect x="2" y="2" width="20" height="20" rx="2"/>
                  </svg>
                  <span>Batch Upload</span>
                </div>
              </>
            )}
            {chunkedFolderImages.visibleItems.map((image, index) => renderImageCard(image, index, chunkedFolderImages.visibleItems))}
            {chunkedFolderImages.totalCount > chunkedFolderImages.visibleCount && (
              <div className="loading-more" style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
                Loading more images...
              </div>
            )}
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
            {canViewFolders && (
              <button className={`nav-item ${!showFavorites && !currentFolder && view === "folders" ? "active" : ""}`} onClick={() => { setCommonSearch(""); commonSearchPrevView.current = null; setShowFavorites(false); setCurrentFolder(null); setView("folders"); setFilteredImages([]); setSelectedImageIds(new Set()); }}>HOME</button>
            )}
            <button className={`nav-item ${view === "images" ? "active" : ""}`} onClick={() => { setCommonSearch(""); commonSearchPrevView.current = null; setView("images"); setShowFavorites(false); setCurrentFolder(null); setFilteredImages([]); setSelectedImageIds(new Set()); loadAllImages(); }}>IMAGES</button>
            {canViewUsers && (
              <button className="nav-item" onClick={() => navigate("/users")}>USERS</button>
            )}
            <div className="nav-item-dropdown">
              <button
                className={`nav-item ${showOtherServices ? "active" : ""}`}
                onClick={() => { setShowOtherServices(!showOtherServices); setShowFavorites(false); setCurrentFolder(null); setFilteredImages([]); }}
              >
                OTHER SERVICES ▾
              </button>
              {showOtherServices && (
                <div className="nav-dropdown-menu">
                  {["Rental", "Garland", "Electrical Materials", "Events Handled"].map(tab => (
                    <button key={tab}
                      className={`nav-dropdown-item ${otherServicesTab === tab ? "active" : ""}`}
                      onClick={() => setOtherServicesTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
        {showOtherServices ? (
          <div className="other-services-view">
            <h2>Other Services</h2>
            <div className="other-services-tabs">
              {["Rental", "Garland", "Electrical Materials", "Events Handled"].map(tab => (
                <button key={tab}
                  className={`other-services-tab ${otherServicesTab === tab ? "active" : ""}`}
                  onClick={() => setOtherServicesTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="other-services-content">
              {otherServicesTab ? (
                <p className="other-services-placeholder">Content for <strong>{otherServicesTab}</strong> will be added here.</p>
              ) : (
                <p className="other-services-placeholder">Select a service tab above to view details.</p>
              )}
            </div>
          </div>
        ) : showFavorites && !currentFolder ? renderFavoritesContent() :
         currentFolder ? renderFolderContent() :
         renderFolderView()}
      </div>

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Folder</h2>
              <button className="modal-close" onClick={() => { resetAddFolderForm(); setShowAddFolderModal(false); }}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddFolder(e); }}>
              <div className="form-group">
                <label className="label">Customer Name (max 25 characters){isFieldRequired("folder_customerName") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.slice(0, 25))}
                  placeholder="Enter customer name"
                  maxLength={25}
                  required={isFieldRequired("folder_customerName")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Venue (max 25 characters){isFieldRequired("folder_venue") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value.slice(0, 25))}
                  placeholder="Enter venue name"
                  maxLength={25}
                  required={isFieldRequired("folder_venue")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
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
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Collected By{isFieldRequired("folder_collectedBy") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  placeholder="Enter collector name"
                  required={isFieldRequired("folder_collectedBy")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Types (multi-select, max 3)</label>
                <div className="custom-multiselect" ref={eventTypeRef}>
                  <div className="custom-multiselect-trigger" onClick={() => setShowEventTypeDropdown(prev => !prev)}>
                    {folderEventTypes.length > 0 ? (
                      <span className="custom-multiselect-summary">{folderEventTypes.length} selected</span>
                    ) : (
                      <span className="custom-multiselect-placeholder">Select event types...</span>
                    )}
                    <span className={`custom-multiselect-arrow ${showEventTypeDropdown ? "open" : ""}`}>▾</span>
                  </div>
                  {showEventTypeDropdown && (
                    <div className="custom-multiselect-dropdown">
                      <div className="custom-multiselect-input-row">
                        <input type="text" className="input input-sm" placeholder="Type custom..." value={customETInput}
                          onChange={(e) => setCustomETInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customETInput.trim()) {
                              e.preventDefault(); e.stopPropagation();
                              if (folderEventTypes.length >= 3) { showNotif("Maximum 3 event types allowed", "warning"); return; }
                              const val = customETInput.trim();
                              if (!allEventTypes.includes(val)) setCustomEventTypes(prev => [...prev, val]);
                              setFolderEventTypes(prev => prev.includes(val) ? prev : [...prev, val]);
                              setCustomETInput("");
                            }
                          }} />
                      </div>
                      {folderEventTypes.length >= 3 && (
                        <div className="multiselect-limit-msg" style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444", background: "#fef2f2" }}>
                          Maximum 3 event types allowed. Remove one to add another.
                        </div>
                      )}
                      {allEventTypes.map(type => (
                        <label key={type} className={`custom-multiselect-option ${folderEventTypes.includes(type) ? "selected" : ""}`}>
                          <input type="checkbox" checked={folderEventTypes.includes(type)}
                            onChange={() => {
                              setFolderEventTypes(prev =>
                                prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                              );
                            }} />
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setFolderEventTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                            );
                          }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {customerName && venueName && eventDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{customerName}_{venueName}_{eventDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { resetAddFolderForm(); setShowAddFolderModal(false); }}>Cancel</button>
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
              <button className="modal-close" onClick={() => { resetAddFavFolderForm(); setShowAddFavFolderModal(false); }}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateFavFolder(e); }}>
              <div className="form-group">
                <label className="label">Customer Name (max 25 characters){isFieldRequired("folder_customerName") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={favCustName}
                  onChange={(e) => setFavCustName(e.target.value.slice(0, 25))}
                  placeholder="Enter customer name"
                  maxLength={25}
                  required={isFieldRequired("folder_customerName")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Venue (max 25 characters){isFieldRequired("folder_venue") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={favVenue}
                  onChange={(e) => setFavVenue(e.target.value.slice(0, 25))}
                  placeholder="Enter venue name"
                  maxLength={25}
                  required={isFieldRequired("folder_venue")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
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
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Collected By{isFieldRequired("folder_collectedBy") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={favCollectedBy}
                  onChange={(e) => setFavCollectedBy(e.target.value)}
                  placeholder="Enter collector name"
                  required={isFieldRequired("folder_collectedBy")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={favFolderDesc}
                  onChange={(e) => setFavFolderDesc(e.target.value)}
                  placeholder="Enter folder description"
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Types (multi-select, max 3)</label>
                <div className="custom-multiselect" ref={favEventTypeRef}>
                  <div className="custom-multiselect-trigger" onClick={() => setShowFavEventTypeDropdown(prev => !prev)}>
                    {favFolderEventTypes.length > 0 ? (
                      <span className="custom-multiselect-summary">{favFolderEventTypes.length} selected</span>
                    ) : (
                      <span className="custom-multiselect-placeholder">Select event types...</span>
                    )}
                    <span className={`custom-multiselect-arrow ${showFavEventTypeDropdown ? "open" : ""}`}>▾</span>
                  </div>
                  {showFavEventTypeDropdown && (
                    <div className="custom-multiselect-dropdown">
                      <div className="custom-multiselect-input-row">
                        <input type="text" className="input input-sm" placeholder="Type custom..." value={customFavETInput}
                          onChange={(e) => setCustomFavETInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customFavETInput.trim()) {
                              e.preventDefault(); e.stopPropagation();
                              if (favFolderEventTypes.length >= 3) { showNotif("Maximum 3 event types allowed", "warning"); return; }
                              const val = customFavETInput.trim();
                              if (!allEventTypes.includes(val)) setCustomEventTypes(prev => [...prev, val]);
                              setFavFolderEventTypes(prev => prev.includes(val) ? prev : [...prev, val]);
                              setCustomFavETInput("");
                            }
                          }} />
                      </div>
                      {favFolderEventTypes.length >= 3 && (
                        <div className="multiselect-limit-msg" style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444", background: "#fef2f2" }}>
                          Maximum 3 event types allowed. Remove one to add another.
                        </div>
                      )}
                      {allEventTypes.map(type => (
                        <label key={type} className={`custom-multiselect-option ${favFolderEventTypes.includes(type) ? "selected" : ""}`}>
                          <input type="checkbox" checked={favFolderEventTypes.includes(type)}
                            onChange={() => {
                              setFavFolderEventTypes(prev =>
                                prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                              );
                            }} />
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setFavFolderEventTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                            );
                          }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {favCustName && favVenue && favEventDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{favCustName}_{favVenue}_{favEventDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { resetAddFavFolderForm(); setShowAddFavFolderModal(false); }}>Cancel</button>
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
              <button className="modal-close" onClick={() => { resetEditFolderForm(); setShowEditFolderModal(false); }}>×</button>
            </div>
            <form onSubmit={handleSaveEditFolder}>
              <div className="form-group">
                <label className="label">Customer Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value.slice(0, 25))}
                  placeholder="Enter customer name"
                  maxLength={25}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Venue</label>
                <input
                  type="text"
                  className="input"
                  value={editFolderVenue}
                  onChange={(e) => setEditFolderVenue(e.target.value.slice(0, 25))}
                  placeholder="Enter venue name"
                  maxLength={25}
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
              <div className="form-group">
                <label className="label">Collected By{isFieldRequired("folder_collectedBy") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={editFolderCollectedBy}
                  onChange={(e) => setEditFolderCollectedBy(e.target.value)}
                  placeholder="Enter collector name"
                  required={isFieldRequired("folder_collectedBy")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Types (multi-select, max 3)</label>
                <div className="custom-multiselect" ref={editEventTypeRef}>
                  <div className="custom-multiselect-trigger" onClick={() => setShowEditEventTypeDropdown(prev => !prev)}>
                    {editFolderEventTypes.length > 0 ? (
                      <span className="custom-multiselect-summary">{editFolderEventTypes.length} selected</span>
                    ) : (
                      <span className="custom-multiselect-placeholder">Select event types...</span>
                    )}
                    <span className={`custom-multiselect-arrow ${showEditEventTypeDropdown ? "open" : ""}`}>▾</span>
                  </div>
                  {showEditEventTypeDropdown && (
                    <div className="custom-multiselect-dropdown">
                      <div className="custom-multiselect-input-row">
                        <input type="text" className="input input-sm" placeholder="Type custom..." value={customEditETInput}
                          onChange={(e) => setCustomEditETInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customEditETInput.trim()) {
                              e.preventDefault(); e.stopPropagation();
                              if (editFolderEventTypes.length >= 3) { showNotif("Maximum 3 event types allowed", "warning"); return; }
                              const val = customEditETInput.trim();
                              if (!allEventTypes.includes(val)) setCustomEventTypes(prev => [...prev, val]);
                              setEditFolderEventTypes(prev => prev.includes(val) ? prev : [...prev, val]);
                              setCustomEditETInput("");
                            }
                          }} />
                      </div>
                      {editFolderEventTypes.length >= 3 && (
                        <div className="multiselect-limit-msg" style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444", background: "#fef2f2" }}>
                          Maximum 3 event types allowed. Remove one to add another.
                        </div>
                      )}
                      {allEventTypes.map(type => (
                        <label key={type} className={`custom-multiselect-option ${editFolderEventTypes.includes(type) ? "selected" : ""}`}>
                          <input type="checkbox" checked={editFolderEventTypes.includes(type)}
                            onChange={() => {
                              setEditFolderEventTypes(prev =>
                                prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                              );
                            }} />
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setEditFolderEventTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                            );
                          }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {editFolderName && editFolderVenue && editFolderDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{editFolderName}_{editFolderVenue}_{editFolderDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { resetEditFolderForm(); setShowEditFolderModal(false); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Favourite Folder Modal */}
      {showEditFavFolderModal && editingFavFolder && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Rename Favourite Folder</h2>
              <button className="modal-close" onClick={() => { resetEditFavFolderForm(); setShowEditFavFolderModal(false); }}>×</button>
            </div>
            <form onSubmit={handleSaveEditFavFolder}>
              <div className="form-group">
                <label className="label">Customer Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={editFavFolderName}
                  onChange={(e) => setEditFavFolderName(e.target.value.slice(0, 25))}
                  placeholder="Enter customer name"
                  maxLength={25}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Venue</label>
                <input
                  type="text"
                  className="input"
                  value={editFavFolderVenue}
                  onChange={(e) => setEditFavFolderVenue(e.target.value.slice(0, 25))}
                  placeholder="Enter venue name"
                  maxLength={25}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Date</label>
                <input
                  type="date"
                  className="input"
                  value={editFavFolderDate}
                  onChange={(e) => setEditFavFolderDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Collected By{isFieldRequired("folder_collectedBy") && <span className="required">*</span>}</label>
                <input
                  type="text"
                  className="input"
                  value={editFavFolderCollectedBy}
                  onChange={(e) => setEditFavFolderCollectedBy(e.target.value)}
                  placeholder="Enter collector name"
                  required={isFieldRequired("folder_collectedBy")}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                />
              </div>
              <div className="form-group">
                <label className="label">Event Types (multi-select, max 3)</label>
                <div className="custom-multiselect" ref={editFavEventTypeRef}>
                  <div className="custom-multiselect-trigger" onClick={() => setShowEditFavEventTypeDropdown(prev => !prev)}>
                    {editFavFolderEventTypes.length > 0 ? (
                      <span className="custom-multiselect-summary">{editFavFolderEventTypes.length} selected</span>
                    ) : (
                      <span className="custom-multiselect-placeholder">Select event types...</span>
                    )}
                    <span className={`custom-multiselect-arrow ${showEditFavEventTypeDropdown ? "open" : ""}`}>▾</span>
                  </div>
                  {showEditFavEventTypeDropdown && (
                    <div className="custom-multiselect-dropdown">
                      <div className="custom-multiselect-input-row">
                        <input type="text" className="input input-sm" placeholder="Type custom..." value={customEditFavETInput}
                          onChange={(e) => setCustomEditFavETInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customEditFavETInput.trim()) {
                              e.preventDefault(); e.stopPropagation();
                              if (editFavFolderEventTypes.length >= 3) { showNotif("Maximum 3 event types allowed", "warning"); return; }
                              const val = customEditFavETInput.trim();
                              if (!allEventTypes.includes(val)) setCustomEventTypes(prev => [...prev, val]);
                              setEditFavFolderEventTypes(prev => prev.includes(val) ? prev : [...prev, val]);
                              setCustomEditFavETInput("");
                            }
                          }} />
                      </div>
                      {editFavFolderEventTypes.length >= 3 && (
                        <div className="multiselect-limit-msg" style={{ padding: "6px 12px", fontSize: 12, color: "#ef4444", background: "#fef2f2" }}>
                          Maximum 3 event types allowed. Remove one to add another.
                        </div>
                      )}
                      {allEventTypes.map(type => (
                        <label key={type} className={`custom-multiselect-option ${editFavFolderEventTypes.includes(type) ? "selected" : ""}`}>
                          <input type="checkbox" checked={editFavFolderEventTypes.includes(type)}
                            onChange={() => {
                              setEditFavFolderEventTypes(prev =>
                                prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                              );
                            }} />
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setEditFavFolderEventTypes(prev =>
                              prev.includes(type) ? prev.filter(t => t !== type) : (prev.length >= 3 ? (showNotif("Maximum 3 event types allowed", "warning"), prev) : [...prev, type])
                            );
                          }}>{type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {editFavFolderName && editFavFolderVenue && editFavFolderDate && (
                <div className="folder-name-preview">
                  Folder will be: <strong>{editFavFolderName}_{editFavFolderVenue}_{editFavFolderDate}</strong>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { resetEditFavFolderForm(); setShowEditFavFolderModal(false); }}>Cancel</button>
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
                    <AutocompleteInput
                      options={designNameSugs}
                      value={imageData.designName}
                      onChange={(val) => {
                        setImageData({...imageData, designName: val});
                        if (designNameSugTimer.current) clearTimeout(designNameSugTimer.current);
                        if (val.trim()) {
                          designNameSugTimer.current = setTimeout(async () => {
                            const sugs = await ApiService.getSuggestions("designName", val);
                            setDesignNameSugs(sugs);
                          }, 200);
                        } else {
                          setDesignNameSugs([]);
                        }
                      }}
                      placeholder="Enter design name"
                      required={isFieldRequired("image_designName")}
                      showOnEmpty={false}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Decoration Type{isFieldRequired("image_decorType") && <span className="required">*</span>}</label>
                    <AutocompleteInput
                      options={allDecorTypes}
                      value={imageData.decorType}
                      onChange={(val) => setImageData({...imageData, decorType: val})}
                      placeholder="Search and select decoration type"
                      required={isFieldRequired("image_decorType")}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Flower Type{isFieldRequired("image_flowerType") && <span className="required">*</span>}</label>
                    <div className="checkbox-group-horizontal">
                      {[{ value: "", label: "None" }, ...FLOWER_TYPES.filter(t => t !== "None").map(t => ({ value: t, label: t }))].map(item => (
                        <label key={item.value || "none"} className="checkbox-item-inline">
                          <input type="radio" name="flowerType" value={item.value}
                            checked={imageData.flowerType === item.value}
                            onChange={(e) => setImageData({...imageData, flowerType: e.target.value})} />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Venue{isFieldRequired("image_venueName") && <span className="required">*</span>}</label>
                  <AutocompleteInput
                    options={venueSugs}
                    value={imageData.venueName}
                    onChange={(val) => {
                      setImageData({...imageData, venueName: val});
                      if (venueSugTimer.current) clearTimeout(venueSugTimer.current);
                      if (val.trim()) {
                        venueSugTimer.current = setTimeout(async () => {
                          const sugs = await ApiService.getSuggestions("venueName", val);
                          setVenueSugs(sugs);
                        }, 200);
                      } else {
                        setVenueSugs([]);
                      }
                    }}
                    placeholder="Enter venue name"
                    required={isFieldRequired("image_venueName")}
                    showOnEmpty={false}
                  />
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
                           onKeyDown={preventNumberAction}
                           onChange={(e) => setImageData({...imageData, sizeWidth: e.target.value})} />
                         <span className="size-sep">x</span>
                         <input type="number" className="input size-input-sm" placeholder="L"
                           value={imageData.sizeLength} min="0"
                           onWheel={(e) => e.target.blur()}
                           onKeyDown={preventNumberAction}
                           onChange={(e) => setImageData({...imageData, sizeLength: e.target.value})} />
                         <span className="size-sep">x</span>
                         <input type="number" className="input size-input-sm" placeholder="H"
                           value={imageData.sizeHeight} min="0"
                           onWheel={(e) => e.target.blur()}
                           onKeyDown={preventNumberAction}
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
                      <label className="label">Price Range{isFieldRequired("image_price") && <span className="required">*</span>}</label>
                      <div className="flex-gap">
                         <input type="number" className="input" placeholder="Min" value={imageData.priceMin} min="0"
                           onWheel={(e) => e.target.blur()}
                           onKeyDown={preventNumberAction}
                           onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setImageData({...imageData, priceMin: v}); }} required={isFieldRequired("image_price")} />
                         <input type="number" className="input" placeholder="Max" value={imageData.priceMax} min="0"
                           onWheel={(e) => e.target.blur()}
                           onKeyDown={preventNumberAction}
                           onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setImageData({...imageData, priceMax: v}); }} required={isFieldRequired("image_price")} />
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

          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}
          onTouchStart={(e) => {
            lightboxTouchStartX.current = e.touches[0].clientX;
            lightboxTouchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - lightboxTouchStartX.current;
            const dy = e.changedTouches[0].clientY - lightboxTouchStartY.current;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              const all = lightboxImage.allImages;
              const idx = lightboxImage.currentIndex;
              if (dx > 0 && all && idx > 0) {
                e.stopPropagation();
                openLightbox(all, idx - 1);
              } else if (dx < 0 && all && idx < all.length - 1) {
                e.stopPropagation();
                openLightbox(all, idx + 1);
              }
            }
          }}>
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
              style={{ transform: `rotate(${lightboxRotation}deg)` }}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }} />
          ) : (
            <div className="lightbox-placeholder">Image not available</div>
          )}
          <div className="lightbox-info" onClick={(e) => e.stopPropagation()}>
            <h3>{lightboxImage.data?.designName || "Untitled"}</h3>
            {renderImageCardDetails(lightboxImage.data)}
            <div className="lightbox-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}>
                Rotate
              </button>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const choice = await openDownloadModal();
                if (!choice) return;
                if (choice === "image") {
                  ApiService.downloadImage(lightboxImage.id, false).catch(err => showNotif(err.message));
                } else {
                  showNotif("Preparing PDF...", "warning");
                  await downloadAsPDF([lightboxImage]);
                  showNotif("PDF download complete", "success");
                }
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
            {(() => {
              const targetFolders = showFavorites ? favoriteFolders : folders;
              return targetFolders.length === 0 ? (
                <p className="empty-folder-message">No folders available.</p>
              ) : (
                <div className="move-folder-grid">
                  {targetFolders.map(folder => (
                    <FolderBox
                      key={folder.id}
                      folder={folder}
                      isFavoriteFolder={showFavorites}
                      onClick={() => handleMoveImagesToFolder(folder.name)}
                    />
                  ))}
                </div>
              );
            })()}
            <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)} style={{ marginTop: "16px", width: "100%" }}>Cancel</button>
          </div>
        </div>
      )}



      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="modal-overlay">
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Image</h2>
              <button className="modal-close" onClick={() => { resetEditImageForm(); setShowEditModal(false); }}>×</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="label">Design Name</label>
                <AutocompleteInput
                  options={designNameSugs}
                  value={editData.designName}
                  onChange={(val) => {
                    setEditData({...editData, designName: val});
                    if (designNameSugTimer.current) clearTimeout(designNameSugTimer.current);
                    if (val.trim()) {
                      designNameSugTimer.current = setTimeout(async () => {
                        const sugs = await ApiService.getSuggestions("designName", val);
                        setDesignNameSugs(sugs);
                      }, 200);
                    } else {
                      setDesignNameSugs([]);
                    }
                  }}
                  placeholder="Enter design name"
                  showOnEmpty={false}
                />
              </div>
              <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Event Type</label>
                    <AutocompleteInput
                      options={allEventTypes}
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
                    options={allDecorTypes}
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
                  <input type="number" className="input size-input-sm" placeholder="W" value={editData.sizeWidth} min="0"
                     onWheel={(e) => e.target.blur()}
                     onKeyDown={preventNumberAction}
                     onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setEditData({...editData, sizeWidth: v}); }} />
                   <span className="size-sep">x</span>
                   <input type="number" className="input size-input-sm" placeholder="L" value={editData.sizeLength} min="0"
                     onWheel={(e) => e.target.blur()}
                     onKeyDown={preventNumberAction}
                     onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setEditData({...editData, sizeLength: v}); }} />
                   <span className="size-sep">x</span>
                   <input type="number" className="input size-input-sm" placeholder="H" value={editData.sizeHeight} min="0"
                     onWheel={(e) => e.target.blur()}
                     onKeyDown={preventNumberAction}
                     onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setEditData({...editData, sizeHeight: v}); }} />
                  <select className="input size-unit-input" value={editData.sizeUnit}
                    onChange={(e) => setEditData({...editData, sizeUnit: e.target.value})}>
                    {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Price Range</label>
                  <div className="flex-gap">
                     <input type="number" className="input" placeholder="Min" value={editData.priceMin} min="0"
                       onWheel={(e) => e.target.blur()}
                       onKeyDown={preventNumberAction}
                       onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setEditData({...editData, priceMin: v}); }} />
                     <input type="number" className="input" placeholder="Max" value={editData.priceMax} min="0"
                       onWheel={(e) => e.target.blur()}
                       onKeyDown={preventNumberAction}
                       onChange={(e) => { const v = e.target.value; if (v === "" || parseFloat(v) >= 0) setEditData({...editData, priceMax: v}); }} />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { resetEditImageForm(); setShowEditModal(false); }}>Cancel</button>
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
        <div className="modal-overlay" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(null); setDownloadResolve(null); } }}>
          <div className="modal download-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Download Options</h2>
              <button className="modal-close" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(null); setDownloadResolve(null); } }}>×</button>
            </div>
            <div className="modal-body">
              <p className="download-modal-desc">Select the download format:</p>
              <div className="download-options">
                <button className="download-option-btn" onClick={() => handleDownloadChoice("image")}>
                  <span className="download-option-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                  </span>
                  <span className="download-option-label">Image Only</span>
                  <span className="download-option-desc">Download as image file</span>
                </button>
                <button className="download-option-btn" onClick={() => handleDownloadChoice("pdf")}>
                  <span className="download-option-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/>
                      <path d="M9 15h6M9 12h6M9 18h4"/>
                    </svg>
                  </span>
                  <span className="download-option-label">Image with Features</span>
                  <span className="download-option-desc">Download as PDF with specifications</span>
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDownloadModal(false); if (downloadResolve) { downloadResolve(null); setDownloadResolve(null); } }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={handleCloseReport}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  );
}

export default ImageManagement;
