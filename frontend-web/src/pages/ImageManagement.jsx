import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import FilterSidebar from "../components/FilterSidebar";
import ColorPicker from "../components/ColorPicker";
import ImageMeta from "../components/ImageMeta";
import "./ImageManagement.css";

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const SIZE_UNITS = ["sq.ft", "feet", "inch", "cm", "m"];
const FLOWER_TYPES = ["Natural", "Artificial", "Both"];
const EVENT_TYPES = [
  "Wedding", "Puberty", "House Warming", "Ear Piercing", "Baby Shower",
  "Birthday", "Inauguration", "Meeting", "25th Wedding Anniversary",
  "Shashtiabdapoorti", "Surprise Gift", "Salagai Poojai", "Annual Day",
  "Labour Day", "Naming Ceremony", "Holy Communion", "Farewell",
  "Kari Virundhu", "Get Together"
];
const DECOR_TYPES = [
  "Name board", "Stage Ceiling", "Hall side Decoration",
  "Hall ceiling work", "Hall Entrance", "Receiption Area",
  "Pathway", "Main Entrance", "Orchestra Stage", "Car Decoration",
  "Selfie Area", "Bedroom Decoration", "Home Decoration",
  "Lighting work in Home", "Lighting work in Mahal", "Audio work",
];

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
  const [selectedExcelFile, setSelectedExcelFile] = useState(null);
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteImages, setFavoriteImages] = useState([]);
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [showAddFavFolderModal, setShowAddFavFolderModal] = useState(false);
  const [favFolderName, setFavFolderName] = useState("");
  const [selectedFavFolder, setSelectedFavFolder] = useState(null);
  const [commonSearch, setCommonSearch] = useState("");
  const [commonSearchType, setCommonSearchType] = useState("designName");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editData, setEditData] = useState({});

  const [customerName, setCustomerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [folderDescription, setFolderDescription] = useState("");

  const [imageData, setImageData] = useState({
    designName: "",
    eventType: "",
    decorType: "",
    venueCustomer: "",
    venue: "",
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
  const excelFileRef = useRef(null);
  const batchImageRef = useRef(null);
  const imageFileRef = useRef(null);

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
    if (user) loadFolders();
  }, [user]);

  useEffect(() => {
    if (currentFolder) loadImages();
  }, [currentFolder]);

  const loadFolders = async () => {
    try {
      const folderList = await ApiService.getFolders();
      setFolders(folderList);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  const loadImages = async () => {
    if (!currentFolder) { setImages([]); return; }
    setLoading(true);
    try {
      const imageList = await ApiService.getImages(currentFolder.name);
      setImages(imageList);
    } catch (err) {
      alert("Error loading images: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllImages = async () => {
    setLoading(true);
    try {
      const imageList = await ApiService.getImages();
      setAllImages(imageList);
    } catch (err) {
      console.error("Failed to load images:", err);
    } finally {
      setLoading(false);
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

  const openLightbox = (imageArray, index) => {
    const img = imageArray[index];
    setLightboxImage({
      url: img.image_data?.imageUrl ? `${IMAGE_BASE_URL}${img.image_data.imageUrl}` : "",
      data: img.image_data,
      id: img.id,
      allImages: imageArray,
      currentIndex: index,
    });
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !venueName.trim() || !eventDate) {
      alert("Please fill all fields: Customer Name, Venue, and Event Date");
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
      alert("Failed to create folder: " + err.message);
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
      alert("Failed to delete folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFolder = (folder) => {
    setCurrentFolder(folder);
    setView("folders");
    setFilteredImages([]);
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setImages([]);
  };

  const handleExcelSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedExcelFile(file);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file");
    }
  };

  const handleBatchImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const newRows = files.map(file => ({
      file, preview: URL.createObjectURL(file),
      designName: "", eventType: "", decorType: "",
      venueCustomer: "", venueName: "", venueDate: "",
      sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft",
      colours: "", flowerType: "", priceMin: "", priceMax: "",
    }));
    setBatchImages(prev => [...prev, ...newRows]);
    e.target.value = "";
  };

  const updateBatchRow = (index, field, value) => {
    setBatchImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
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
    if (batchImages.length === 0) { alert("Please select at least one image"); return; }
    setLoading(true);
    setUploadProgress(`Uploading 0 of ${batchImages.length} images...`);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (let i = 0; i < batchImages.length; i++) {
        const row = batchImages[i];
        setUploadProgress(`Uploading ${i + 1} of ${batchImages.length} images...`);
        try {
          const uploadResult = await ApiService.uploadFile(row.file, currentFolder.name);
          const sizeDisplay = buildSizeDisplay(row.sizeWidth, row.sizeLength, row.sizeHeight, row.sizeUnit);
          const colours = Array.isArray(row.colours)
            ? row.colours
            : row.colours.split(",").map(c => c.trim()).filter(c => c);
          const metaData = {
            folderName: currentFolder.name,
            imageUrl: uploadResult.imageUrl,
            colourCombination: colours,
            sizeWidth: row.sizeWidth || null,
            sizeLength: row.sizeLength || null,
            sizeHeight: row.sizeHeight || null,
            sizeUnit: row.sizeUnit,
            sizeDisplay: sizeDisplay,
            designName: row.designName,
            eventType: row.eventType,
            decorType: row.decorType,
            venueCustomer: row.venueCustomer,
            venueName: row.venueName,
            venueDate: row.venueDate,
            flowerType: row.flowerType,
            priceMin: row.priceMin,
            priceMax: row.priceMax,
          };
          await ApiService.uploadImage(metaData);
          successCount++;
        } catch (err) {
          console.error(`Failed to upload image ${i + 1}:`, err);
          errorCount++;
        }
      }
      setUploadProgress(`Successfully uploaded ${successCount} images!${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
      batchImages.forEach(row => URL.revokeObjectURL(row.preview));
      setBatchImages([]);
      loadImages();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress("");
        setUploadTab("single");
      }, 2000);
    } catch (err) {
      alert("Batch upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSingleImage = async (e) => {
    e.preventDefault();
    if (!selectedImage) { alert("Please select an image"); return; }
    if (!imageData.designName) { alert("Design Name is required"); return; }
    if (!imageData.eventType) { alert("Event Type is required"); return; }
    if (!imageData.decorType) { alert("Decoration Type is required"); return; }
    if (imageData.colours.length === 0) { alert("Please select at least one colour"); return; }
    if (!imageData.flowerType) { alert("Flower Type is required"); return; }
    setLoading(true);
    setUploadProgress("Uploading image...");
    try {
      const uploadResult = await ApiService.uploadFile(selectedImage, currentFolder.name);
      const sizeDisplay = buildSizeDisplay(imageData.sizeWidth, imageData.sizeLength, imageData.sizeHeight, imageData.sizeUnit);
      const metaData = {
        folderName: currentFolder.name,
        imageUrl: uploadResult.imageUrl,
        colourCombination: imageData.colours,
        sizeWidth: imageData.sizeWidth || null,
        sizeLength: imageData.sizeLength || null,
        sizeHeight: imageData.sizeHeight || null,
        sizeUnit: imageData.sizeUnit,
        sizeDisplay: sizeDisplay,
        designName: imageData.designName,
        eventType: imageData.eventType,
        decorType: imageData.decorType,
        venueCustomer: imageData.venueCustomer,
        venueName: imageData.venue,
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
      setImageData({ designName: "", eventType: "", decorType: "", venueCustomer: "", venue: "", venueDate: "", sizeWidth: "", sizeLength: "", sizeHeight: "", sizeUnit: "sq.ft", colours: [], flowerType: "", priceMin: "", priceMax: "" });
      loadImages();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress("");
        setUploadTab("single");
      }, 1500);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!selectedExcelFile) { alert("Please select an Excel file"); return; }
    setLoading(true);
    setUploadProgress("Uploading and processing Excel file...");
    try {
      const result = await ApiService.uploadExcel(selectedExcelFile, currentFolder.name);
      setUploadProgress(`Success! ${result.uploaded} images uploaded`);
      if (result.errors && result.errors.length > 0) {
        setUploadProgress(prev => prev + `\nErrors: ${result.errors.join(", ")}`);
      }
      setSelectedExcelFile(null);
      loadImages();
      setTimeout(() => { setShowUploadModal(false); setUploadProgress(""); }, 2000);
    } catch (err) {
      alert("Upload failed: " + err.message);
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
      alert("Delete failed: " + err.message);
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
      setSelectionMode(false);
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImageIds.size === 0) return;
    if (!window.confirm(`Download ${selectedImageIds.size} image(s)? Choose OK for default path or Cancel for custom path.`)) {
      // Cancel = custom path - open save dialog for each
      for (const id of selectedImageIds) {
        await ApiService.downloadImage(id);
      }
    } else {
      for (const id of selectedImageIds) {
        await ApiService.downloadImage(id);
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
      loadImages();
      if (showFavorites) {
        loadFavorites(selectedFavFolder?.name);
        loadFavoriteFolders();
      }
      if (view === "images") loadAllImages();
    } catch (err) {
      alert("Failed to update favorite: " + err.message);
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
      setSelectionMode(false);
      loadImages();
      if (showFavorites) loadFavorites(selectedFavFolder?.name);
    } catch (err) {
      alert("Move failed: " + err.message);
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
      if (filterData.venueFilter) searchFilters.placeOfEvent = filterData.venueFilter;
      if (filterData.priceRange) {
        searchFilters.priceMin = filterData.priceRange[0];
        searchFilters.priceMax = filterData.priceRange[1];
      }
      const data = await ApiService.searchImages(searchFilters);
      setFilteredImages(data);
      setView("filtered");
    } catch (err) {
      console.error("Filter search failed:", err);
      alert("Search failed: " + err.message);
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
      alert("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorites = () => {
    setShowFavorites(!showFavorites);
    if (!showFavorites) {
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

  const handleCreateFavFolder = async (e) => {
    e.preventDefault();
    if (!favFolderName.trim()) { alert("Please enter a folder name"); return; }
    try {
      await ApiService.createFavoriteFolder(favFolderName.trim());
      setFavFolderName("");
      setShowAddFavFolderModal(false);
      loadFavoriteFolders();
    } catch (err) {
      alert("Failed to create folder: " + err.message);
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
      alert("Failed to update image: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToImagesView = async () => {
    if (view === "images") { setView("folders"); return; }
    setView("images");
    setCurrentFolder(null);
    setFilteredImages([]);
    setShowFavorites(false);
    loadAllImages();
  };

  const handleLogout = async () => {
    await ApiService.logout();
    navigate("/", { replace: true });
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const displayName = user?.displayName || user?.username || "User";
  const role = user?.role || "N/A";

  const renderFolderDate = (folder) => {
    const dateStr = folder.created_at || folder.createdAt;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const days = String(d.getDate()).padStart(2, "0");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return (
      <div className="folder-date-vertical">
        <span className="folder-date-day">{days}</span>
        <span className="folder-date-month">{month}</span>
        <span className="folder-date-year">{year}</span>
      </div>
    );
  };

  const renderImageCard = (image, index, imageArray) => {
    const imgUrl = image.image_data?.imageUrl ? `${IMAGE_BASE_URL}${image.image_data.imageUrl}` : "";
    const isFav = image.favourite;
    const isSelected = selectedImageIds.has(image.id);

    return (
      <div
        key={image.id}
        className={`image-card ${isSelected ? "selected" : ""}`}
        onClick={() => {
          if (selectionMode) {
            toggleImageSelection(image.id);
          } else {
            openLightbox(imageArray, index);
          }
        }}
      >
        {selectionMode && (
          <div className={`image-select-checkbox ${isSelected ? "selected" : ""}`}>
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
          <img className="image-card-img" src={imgUrl} alt={image.image_data?.designName}
            onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.style.background = "#e5e7eb"; }}
          />
        ) : (
          <div className="image-card-placeholder">No Image</div>
        )}
        <div className="image-card-content">
          <h3>{image.image_data?.designName || "Untitled"}</h3>
          <ImageMeta data={image.image_data} />
          {canUpload && (
            <div className="image-card-actions">
              <button
                className="btn-image-edit"
                onClick={(e) => { e.stopPropagation(); handleEditImage(image); }}
              >
                Edit
              </button>
              <button
                className="btn-image-delete"
                onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id); }}
              >
                Delete
              </button>
            </div>
          )}
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
            <h2>Folders</h2>
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
              className={`btn btn-view-toggle ${view === "images" ? "active" : ""}`}
              onClick={handleSwitchToImagesView}
              title={view === "images" ? "Show Folder View" : "Show All Images"}
            >
              {view === "images" ? "📁 Folders" : "🖼 Images"}
            </button>
            <button
              className={`btn btn-favorites ${showFavorites ? "active" : ""}`}
              onClick={handleToggleFavorites}
            >
              ★ Favorites
            </button>
            <button
              className={`btn btn-filter-toggle ${showFiltersSidebar ? "active" : ""}`}
              onClick={() => setShowFiltersSidebar(!showFiltersSidebar)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </button>
            {canUpload && !showFavorites && (
              <button className="btn btn-primary btn-add-folder" onClick={() => setShowAddFolderModal(true)}>
                + Add Folder
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
          view === "images" ? renderAllImagesContent() :
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
        {selectionMode && renderSelectionToolbar()}
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
        {selectionMode && renderSelectionToolbar()}
        <div className="image-grid">
          {allImages.map((image, index) => renderImageCard(image, index, allImages))}
        </div>
      </>
    )
  );

  const renderFoldersContent = () => (
    folders.length === 0 ? (
      <div className="empty-state">
        <p>No folders yet. Create one to get started!</p>
      </div>
    ) : (
      <div className="folder-grid">
        {sortedFolders.map(folder => {
          const nameParts = folder.name ? folder.name.split("_") : [];
          const displayName = nameParts.slice(0, 2).join(" - ") || folder.name;
          return (
            <div
              key={folder.id}
              className="folder-item"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("drag-over"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over");
                const imageId = e.dataTransfer.getData("imageId");
                if (imageId) handleMoveImagesToFolder(folder.name);
              }}
              onClick={() => handleEnterFolder(folder)}
            >
              {renderFolderDate(folder)}
              <div className="folder-icon">
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <path d="M8 16h18l6 6h24v32H8z" fill="#F5C842" />
                  <path d="M8 22h48v28H8z" fill="#FFD54F" />
                  <path d="M8 16h18l6 6H8z" fill="#FFB300" />
                </svg>
              </div>
              <span className="folder-name">{displayName}</span>
              {canUpload && (
                <button className="folder-delete" onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    )
  );

  const renderFavoritesContent = () => (
    <div className="favorites-view">
      <div className="action-bar">
        <h2>{selectedFavFolder ? selectedFavFolder.name : "★ Favorites"}</h2>
        <div className="action-bar-buttons">
          {selectedFavFolder ? (
            <button className="btn btn-secondary" onClick={handleBackFromFavFolder}>Back</button>
          ) : (
            canUpload && (
              <button className="btn btn-primary btn-add-folder" onClick={() => setShowAddFavFolderModal(true)}>
                + Add Folder
              </button>
            )
          )}
        </div>
      </div>

      {!selectedFavFolder && favoriteFolders.length > 0 && (
        <div className="favorites-folders-row">
          {favoriteFolders.map(folder => (
            <div
              key={folder.id}
              className="folder-item"
              onClick={() => handleEnterFavoriteFolder(folder)}
            >
              {renderFolderDate(folder)}
              <div className="folder-icon">
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <path d="M8 16h18l6 6h24v32H8z" fill="#F5C842" />
                  <path d="M8 22h48v28H8z" fill="#FFD54F" />
                  <path d="M8 16h18l6 6H8z" fill="#FFB300" />
                </svg>
              </div>
              <span className="folder-name">{folder.name}</span>
            </div>
          ))}
        </div>
      )}

      {favoriteImages.length === 0 ? (
        <div className="empty-state"><p>No favorites yet. Star images to add them here.</p></div>
      ) : (
        <>
          {selectionMode && renderSelectionToolbar()}
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
      <button className="btn btn-secondary" onClick={() => { setSelectedImageIds(new Set()); setSelectionMode(false); }}>
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
        <h2>{currentFolder.name}</h2>
        <div className="folder-header-actions">
          <button
            className={`btn btn-select-toggle ${selectionMode ? "active" : ""}`}
            onClick={() => { setSelectionMode(!selectionMode); setSelectedImageIds(new Set()); }}
          >
            {selectionMode ? "Done" : "Select"}
          </button>
        </div>
      </div>

      {selectionMode && renderSelectionToolbar()}

      {loading ? (
        <div className="loading-state"><div className="spinner"></div></div>
      ) : !canUpload && images.length === 0 ? (
        <div className="empty-state"><p>No images in this folder.</p></div>
      ) : (
        <div className="image-grid">
          {canUpload && !selectionMode && (
            <div className="upload-box-card" onClick={() => { setUploadTab("single"); setShowUploadModal(true); }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Upload Image</span>
            </div>
          )}
          {images.map((image, index) => renderImageCard(image, index, images))}
        </div>
      )}
    </div>
  );

  return (
    <div className="image-management">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-brand">Event Management</div>
        </div>
        <div className="navbar-right">
          <div className="user-info">
            <span className="user-display">User: <strong>{displayName}</strong></span>
            <span className="user-role">Role: <strong>{role}</strong></span>
          </div>
          <button onClick={handleLogout} className="btn btn-logout">Logout</button>
        </div>
      </nav>

      <div className="main-content">
        {showFavorites && !currentFolder ? renderFavoritesContent() :
         currentFolder ? renderFolderContent() :
         renderFolderView()}
      </div>

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div className="modal-overlay" onClick={() => setShowAddFolderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Folder</h2>
              <button className="modal-close" onClick={() => setShowAddFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddFolder}>
              <div className="form-group">
                <label className="label">Customer Name (max 15 characters)</label>
                <input
                  type="text"
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.slice(0, 15))}
                  placeholder="Enter customer name"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Venue (max 15 characters)</label>
                <input
                  type="text"
                  className="input"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value.slice(0, 15))}
                  placeholder="Enter venue name"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Event Date</label>
                <input
                  type="date"
                  className="input"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Description (Optional)</label>
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
        <div className="modal-overlay" onClick={() => setShowAddFavFolderModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Folder in Favorites</h2>
              <button className="modal-close" onClick={() => setShowAddFavFolderModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateFavFolder}>
              <div className="form-group">
                <label className="label">Folder Name</label>
                <input
                  type="text"
                  className="input"
                  value={favFolderName}
                  onChange={(e) => setFavFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFavFolderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Images</h2>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>

            <div className="upload-tabs">
              <button className={`upload-tab ${uploadTab === "single" ? "active" : ""}`} onClick={() => setUploadTab("single")}>Single Image</button>
              <button className={`upload-tab ${uploadTab === "batch" ? "active" : ""}`} onClick={() => setUploadTab("batch")}>Batch Upload</button>
              <button className={`upload-tab ${uploadTab === "excel" ? "active" : ""}`} onClick={() => setUploadTab("excel")}>Excel Upload</button>
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

                <div className="form-group">
                  <label className="label">Design Name <span className="required">*</span></label>
                  <input type="text" className="input" value={imageData.designName}
                    onChange={(e) => setImageData({...imageData, designName: e.target.value})}
                    placeholder="Enter design name" required />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Event Type <span className="required">*</span></label>
                    <select className="input" value={imageData.eventType}
                      onChange={(e) => setImageData({...imageData, eventType: e.target.value})} required>
                      <option value="">Select Event Type</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Flower Type <span className="required">*</span></label>
                    <div className="checkbox-group-horizontal">
                      {FLOWER_TYPES.map(t => (
                        <label key={t} className="checkbox-item-inline">
                          <input type="radio" name="flowerType" value={t}
                            checked={imageData.flowerType === t}
                            onChange={(e) => setImageData({...imageData, flowerType: e.target.value})} />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">Decoration Type <span className="required">*</span></label>
                  <input type="text" className="input" list="decorTypeList" value={imageData.decorType}
                    onChange={(e) => setImageData({...imageData, decorType: e.target.value})}
                    placeholder="Search and select decoration type" required />
                  <datalist id="decorTypeList">
                    {DECOR_TYPES.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="label">Colour <span className="required">*</span></label>
                  <ColorPicker
                    selectedColors={imageData.colours}
                    onChange={(colors) => setImageData({...imageData, colours: colors})}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Size</label>
                  <div className="size-input-group-upload">
                    <input type="number" className="input size-input-sm" placeholder="Width"
                      value={imageData.sizeWidth} min="0"
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => setImageData({...imageData, sizeWidth: e.target.value})} />
                    <span className="size-sep">x</span>
                    <input type="number" className="input size-input-sm" placeholder="Length"
                      value={imageData.sizeLength} min="0"
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => setImageData({...imageData, sizeLength: e.target.value})} />
                    <span className="size-sep">x</span>
                    <input type="number" className="input size-input-sm" placeholder="Height"
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

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Customer Name</label>
                    <input type="text" className="input" value={imageData.venueCustomer}
                      onChange={(e) => setImageData({...imageData, venueCustomer: e.target.value})}
                      placeholder="Customer name" />
                  </div>
                  <div className="form-group">
                    <label className="label">Venue Name</label>
                    <input type="text" className="input" value={imageData.venue}
                      onChange={(e) => setImageData({...imageData, venue: e.target.value})}
                      placeholder="Venue name" />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Event Date</label>
                    <input type="date" className="input" value={imageData.venueDate}
                      onChange={(e) => setImageData({...imageData, venueDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="label">Price Range</label>
                    <div className="flex-gap">
                      <input type="number" className="input" placeholder="Min" value={imageData.priceMin}
                        onChange={(e) => setImageData({...imageData, priceMin: e.target.value})} />
                      <input type="number" className="input" placeholder="Max" value={imageData.priceMax}
                        onChange={(e) => setImageData({...imageData, priceMax: e.target.value})} />
                    </div>
                  </div>
                </div>

                {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Uploading..." : "Upload Image"}
                </button>
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
                            <th>Design Name</th>
                            <th>Event Type</th>
                            <th>Decor Type</th>
                            <th>Size</th>
                            <th>Unit</th>
                            <th>Colours</th>
                            <th>Flower</th>
                            <th>Customer</th>
                            <th>Venue</th>
                            <th>Date</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchImages.map((row, index) => (
                            <tr key={index}>
                              <td><div className="batch-thumbnail"><img src={row.preview} alt="" /></div></td>
                              <td><input type="text" className="batch-input" value={row.designName}
                                onChange={(e) => updateBatchRow(index, "designName", e.target.value)} placeholder="Design" /></td>
                              <td>
                                <select className="batch-select" value={row.eventType}
                                  onChange={(e) => updateBatchRow(index, "eventType", e.target.value)}>
                                  <option value="">Event</option>
                                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td><input type="text" className="batch-input" list="batchDecorList" value={row.decorType}
                                onChange={(e) => updateBatchRow(index, "decorType", e.target.value)} placeholder="Decor" />
                                <datalist id="batchDecorList">{DECOR_TYPES.map(t => <option key={t} value={t} />)}</datalist>
                              </td>
                              <td>
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
                              </td>
                              <td>
                                <select className="batch-select-sm" value={row.sizeUnit}
                                  onChange={(e) => updateBatchRow(index, "sizeUnit", e.target.value)}>
                                  {SIZE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td><input type="text" className="batch-input" value={row.colours}
                                onChange={(e) => updateBatchRow(index, "colours", e.target.value)} placeholder="Red,Gold" /></td>
                              <td>
                                <select className="batch-select" value={row.flowerType}
                                  onChange={(e) => updateBatchRow(index, "flowerType", e.target.value)}>
                                  <option value="">Flower</option>
                                  {FLOWER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td><input type="text" className="batch-input-sm" value={row.venueCustomer}
                                onChange={(e) => updateBatchRow(index, "venueCustomer", e.target.value)} placeholder="Cust" /></td>
                              <td><input type="text" className="batch-input-sm" value={row.venueName}
                                onChange={(e) => updateBatchRow(index, "venueName", e.target.value)} placeholder="Venue" /></td>
                              <td><input type="date" className="batch-input-date" value={row.venueDate}
                                onChange={(e) => updateBatchRow(index, "venueDate", e.target.value)} /></td>
                              <td><input type="number" className="batch-input-tiny" value={row.priceMin}
                                onChange={(e) => updateBatchRow(index, "priceMin", e.target.value)} placeholder="$" /></td>
                              <td><input type="number" className="batch-input-tiny" value={row.priceMax}
                                onChange={(e) => updateBatchRow(index, "priceMax", e.target.value)} placeholder="$" /></td>
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
                  </div>
                </div>
              </form>
            )}

            {uploadTab === "excel" && (
              <form onSubmit={handleUploadExcel}>
                <div className="form-group">
                  <label className="label">Select Excel File</label>
                  <div className="drop-zone" onClick={() => excelFileRef.current?.click()}>
                    <input ref={excelFileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelSelect} style={{ display: "none" }} />
                    {selectedExcelFile ? (
                      <p>{selectedExcelFile.name}</p>
                    ) : (
                      <div className="drop-text">
                        <p>Click to select Excel file</p>
                        <p className="drop-hint">Supports: .xlsx, .xls</p>
                      </div>
                    )}
                  </div>
                </div>
                {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}
                <button type="submit" className="btn btn-primary" disabled={loading || !selectedExcelFile}>
                  {loading ? "Uploading..." : "Upload Excel"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>X</button>
          <div className="lightbox-nav">
            <button className="lightbox-nav-btn prev" onClick={(e) => {
              e.stopPropagation();
              const all = lightboxImage.allImages;
              const idx = lightboxImage.currentIndex;
              if (all && idx > 0) openLightbox(all, idx - 1);
            }} disabled={!lightboxImage.allImages || lightboxImage.currentIndex <= 0}>&lt;</button>
            <button className="lightbox-nav-btn next" onClick={(e) => {
              e.stopPropagation();
              const all = lightboxImage.allImages;
              const idx = lightboxImage.currentIndex;
              if (all && idx < all.length - 1) openLightbox(all, idx + 1);
            }} disabled={!lightboxImage.allImages || lightboxImage.currentIndex >= (lightboxImage.allImages?.length || 1) - 1}>&gt;</button>
          </div>
          {lightboxImage.url ? (
            <img className="lightbox-image" src={lightboxImage.url} alt={lightboxImage.data?.designName}
              onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }} />
          ) : (
            <div className="lightbox-placeholder">Image not available</div>
          )}
          <div className="lightbox-info">
            <h3>{lightboxImage.data?.designName || "Untitled"}</h3>
            <ImageMeta data={lightboxImage.data} />
            <div className="lightbox-actions">
              <button className="btn btn-secondary btn-sm" onClick={(e) => {
                e.stopPropagation();
                handleEditImage({ id: lightboxImage.id, image_data: lightboxImage.data });
              }}>Edit</button>
              <button className="btn btn-secondary btn-sm" onClick={(e) => {
                e.stopPropagation();
                ApiService.downloadImage(lightboxImage.id);
              }}>Download</button>
              <button className={`btn btn-sm ${lightboxImage.data?.favourite ? "btn-fav-active" : "btn-secondary"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(lightboxImage.id, lightboxImage.data?.favourite);
                }}>
                {lightboxImage.data?.favourite ? "★ Unfavorite" : "☆ Favorite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Move to Folder</h2>
              <button className="modal-close" onClick={() => setShowMoveModal(false)}>X</button>
            </div>
            <div className="move-folder-list">
              {folders.length === 0 ? (
                <p className="empty-folder-message">No folders available.</p>
              ) : (
                folders.map(folder => (
                  <button key={folder.id} className="move-folder-item"
                    onClick={() => handleMoveImagesToFolder(folder.name)}>
                    <span className="folder-item-name">{folder.name}</span>
                  </button>
                ))
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)} style={{ marginTop: "16px", width: "100%" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
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
                  <select className="input" value={editData.eventType}
                    onChange={(e) => setEditData({...editData, eventType: e.target.value})}>
                    <option value="">Select</option>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
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
                <input type="text" className="input" list="editDecorList" value={editData.decorType}
                  onChange={(e) => setEditData({...editData, decorType: e.target.value})} />
                <datalist id="editDecorList">{DECOR_TYPES.map(t => <option key={t} value={t} />)}</datalist>
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
    </div>
  );
}

export default ImageManagement;
