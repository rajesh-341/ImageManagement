import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  useWindowDimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_DOWNLOAD_PATH } from "../utils/downloadPathPicker";
import ImageCard from "../components/ImageCard";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import offlineManager from "../offline/offlineManager";
import downloadService from "../services/downloadService";
import FilterSidebar from "../components/FilterSidebar";
import ImageLightbox from "../components/ImageLightbox";
import DownloadOptionsModal from "../components/DownloadOptionsModal";

const CARD_GAP = 12;

const API_BASE_URL = "https://pv-gallery-backend.fly.dev/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function FavouritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
  const folderColumns = SCREEN_WIDTH >= 768 ? 3 : 2;
  const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [favouriteImages, setFavouriteImages] = useState([]);
  const [favouriteFolders, setFavouriteFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedImageForMove, setSelectedImageForMove] = useState(null);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadOptionImages, setDownloadOptionImages] = useState([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const imagesRef = useRef([]);

  const [offlineMode, setOfflineMode] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [filteredImages, setFilteredImages] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const init = async () => {
      const userData = await offlineStorage.getUser();
      if (!userData) {
        navigation.replace("Login");
      } else {
        setUser(userData);
      }
      const isOff = await offlineStorage.isOfflineMode();
      setOfflineMode(isOff);
    };
    init();
  }, [navigation]);

  useEffect(() => {
    if (user) {
      loadFavourites();
      loadFavouriteFolders();
    }
  }, [user]);

  const loadFavourites = async () => {
    setLoading(true);
    try {
      const images = await ApiService.getFavorites();
      setFavouriteImages(images || []);
    } catch (err) {
      console.error("Failed to load favourites:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFavouriteFolders = async () => {
    try {
      const folders = await ApiService.getFavoriteFolders();
      setFavouriteFolders(folders || []);
    } catch (err) {
      console.error("Failed to load favourite folders:", err);
    }
  };

  const loadFolderImages = async (folder) => {
    setLoading(true);
    try {
      const images = await ApiService.getFavorites(folder);
      setFavouriteImages(images || []);
    } catch (err) {
      console.error("Failed to load folder images:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async () => {
    if (!folderName.trim()) { Alert.alert("Error", "Please enter a folder name"); return; }
    setLoading(true);
    try {
      await ApiService.createFavoriteFolder(folderName.trim(), folderDescription.trim());
      setFolderName(""); setFolderDescription("");
      setShowAddFolderModal(false);
      loadFavouriteFolders();
    } catch (err) {
      Alert.alert("Error", "Failed to create folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavourite = async (imageId) => {
    try {
      const isFav = favouriteImages.some(img => img.id === imageId);
      if (isFav) {
        await ApiService.removeFavorite(imageId);
      } else {
        await ApiService.addFavorite(imageId);
      }
      if (currentFolder) {
        loadFolderImages(currentFolder.name);
      } else {
        loadFavourites();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleMoveToFolder = async () => {
    if (!selectedImageForMove || !selectedTargetFolder) return;
    setLoading(true);
    try {
      await ApiService.addImagesToFavouriteFolder(selectedTargetFolder.id, [selectedImageForMove]);
      setShowMoveModal(false);
      setSelectedImageForMove(null);
      setSelectedTargetFolder(null);
      Alert.alert("Success", "Image moved to folder");
      if (currentFolder) {
        loadFolderImages(currentFolder.name);
      } else {
        loadFavourites();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderPress = (folder) => {
    if (selectMode) {
      toggleSelect(folder.id);
    } else {
      setCurrentFolder(folder);
      loadFolderImages(folder.name);
    }
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setActiveTab("folders");
    setSelectMode(false);
    setSelectedIds(new Set());
    loadFavouriteFolders();
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedIds(new Set());
    }
    setSelectMode(prev => !prev);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchMoveToFolder = () => {
    if (selectedIds.size === 0) {
      Alert.alert("No Selection", "Please select images to move.");
      return;
    }
    setSelectedImageForMove(null);
    setShowMoveModal(true);
  };

  const handleBatchMoveConfirm = async () => {
    if (!selectedTargetFolder || selectedIds.size === 0) return;
    setLoading(true);
    try {
      const imageIds = Array.from(selectedIds);
      await ApiService.addImagesToFavouriteFolder(selectedTargetFolder.id, imageIds);
      Alert.alert("Success", `${imageIds.length} image(s) moved to "${selectedTargetFolder.name}".`);
      setShowMoveModal(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      if (currentFolder) {
        loadFolderImages(currentFolder.name);
      } else {
        loadFavourites();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolderFromMove = async () => {
    if (!newFolderName.trim()) { Alert.alert("Error", "Enter a folder name"); return; }
    setLoading(true);
    try {
      const result = await ApiService.createFavoriteFolder(newFolderName.trim());
      const newFolder = result.folder || result;
      setSelectedTargetFolder(newFolder);
      setNewFolderName("");
      setShowNewFolderInput(false);
      await loadFavouriteFolders();
      Alert.alert("Success", `Folder "${newFolder.name}" created. Tap Move to proceed.`);
    } catch (err) {
      Alert.alert("Error", "Failed to create folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderOptions = (folder) => {
    Alert.alert(folder.name, "Choose an action", [
      {
        text: "Rename",
        onPress: () => {
          setRenameTarget(folder);
          setRenameFolderName(folder.name);
          setShowRenameModal(true);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Folder",
            `Are you sure you want to delete "${folder.name}"? Images in this folder will not be removed from your favourites.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  setLoading(true);
                  try {
                    await ApiService.deleteFavoriteFolder(folder.id);
                    await loadFavouriteFolders();
                    if (currentFolder?.id === folder.id) setCurrentFolder(null);
                  } catch (err) {
                    Alert.alert("Error", err.message);
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ]
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRenameFolder = async () => {
    if (!renameFolderName.trim()) { Alert.alert("Error", "Please enter a folder name"); return; }
    if (!renameTarget) return;
    setLoading(true);
    try {
      await ApiService.updateFavoriteFolder(renameTarget.id, renameFolderName.trim());
      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameFolderName("");
      if (currentFolder?.id === renameTarget.id) {
        setCurrentFolder(prev => ({ ...prev, name: renameFolderName.trim() }));
      }
      await loadFavouriteFolders();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDownload = (count, type) => {
    return new Promise((resolve) => {
      let message;
      if (type === "images") {
        message = `Do you want to download ${count} image(s)?`;
      } else if (type === "folders") {
        message = `Do you want to download ${count} folder(s)?`;
      } else {
        message = `Do you want to download ${count} item(s)?`;
      }
      Alert.alert("Download", message, [
        { text: "Yes", onPress: () => resolve(true) },
        { text: "No", style: "cancel", onPress: () => resolve(false) },
      ]);
    });
  };

  const executeDownload = async (images) => {
    setDownloading(true);
    setDownloadProgress({ total: images.length, completed: 0 });
    try {
      const results = await downloadService.downloadMultipleImages(
        images,
        (img) => offlineMode ? getEffectiveImgUrl(img) : getImgUrl(img),
        null,
        (progress, completed) => setDownloadProgress({ total: images.length, completed }),
      );
      const msg = [];
      if (results.downloaded.length > 0) msg.push(`${results.downloaded.length} downloaded`);
      if (results.exists.length > 0) msg.push(`${results.exists.length} already exist`);
      if (results.failed.length > 0) msg.push(`${results.failed.length} failed`);
      Alert.alert("Download Completed Successfully", msg.join("\n") + `\nFiles saved to: ${DEFAULT_DOWNLOAD_PATH}`);
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      Alert.alert("Download Failed", err.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const doDownload = async (images) => {
    if (images.length === 0) {
      Alert.alert("No Images", "No images to download.");
      return;
    }
    const confirmed = await confirmDownload(images.length, "images");
    if (!confirmed) return;
    const granted = await downloadService.requestStoragePermission();
    if (!granted) return;
    await executeDownload(images);
  };

  const handleDownloadSingleImage = async (img) => {
    setDownloadOptionImages([img]);
    setShowDownloadOptions(true);
  };

  const handleDownloadSelectedImages = async () => {
    if (selectedIds.size === 0) {
      Alert.alert("No Selection", "Please select images to download.");
      return;
    }
    const displayImages = activeFilters ? filteredImages : favouriteImages;
    const toDownload = displayImages.filter(img => selectedIds.has(img.id));
    setDownloadOptionImages(toDownload);
    setShowDownloadOptions(true);
  };

  const handleDownloadOptionSelect = async (optionId) => {
    setShowDownloadOptions(false);
    const images = downloadOptionImages;
    if (images.length === 0) return;
    if (optionId === "pdf") {
      await doPdfDownload(images);
    } else {
      await doDownload(images);
    }
  };

  const doPdfDownload = async (images) => {
    if (images.length === 0) {
      Alert.alert("No Images", "No images to download.");
      return;
    }
    const confirmed = await confirmDownload(images.length, "images");
    if (!confirmed) return;
    const granted = await downloadService.requestStoragePermission();
    if (!granted) return;
    await executePdfDownload(images);
  };

  const executePdfDownload = async (images) => {
    setDownloading(true);
    setDownloadProgress({ total: 1, completed: 0 });
    try {
      const result = await downloadService.downloadImagesAsPDF(
        images.map(img => img.id),
        null,
        (phase) => setDownloadProgress({ total: 1, completed: 0, phase })
      );
      Alert.alert("Download Completed Successfully", `PDF saved to: ${result.filePath}`);
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      Alert.alert("Download Failed", err.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadSelectedFolders = async () => {
    if (selectedIds.size === 0) {
      Alert.alert("No Selection", "Please select folders to download.");
      return;
    }
    const selectedFolders = favouriteFolders.filter(f => selectedIds.has(f.id));
    const confirmed = await confirmDownload(selectedFolders.length, "folders");
    if (!confirmed) return;
    const granted = await downloadService.requestStoragePermission();
    if (!granted) return;
    setDownloading(true);
    setDownloadProgress({ total: 1, completed: 0, phase: "Downloading folders as ZIP..." });
    const folderIds = selectedFolders.map(f => f.id);
    let lastErr = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const result = await downloadService.downloadMultipleFoldersAsZip(folderIds, null);
        Alert.alert("Download Completed Successfully", `Files saved to: ${result.filePath}`);
        setSelectMode(false);
        setSelectedIds(new Set());
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 2 && (
          err.message.includes("403") || err.message.includes("status 4") ||
          err.message.includes("network") || err.message.includes("timeout")
        )) {
          setDownloadProgress({ total: 1, completed: 0, phase: `Retrying download (${attempt + 1}/2)...` });
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      }
    }
    if (lastErr) {
      Alert.alert("Download Failed", lastErr.message);
    }
    setDownloading(false);
    setDownloadProgress(null);
  };

  const executeSingleFolderDownload = async (folder, retryCount = 0) => {
    setDownloading(true);
    setDownloadProgress({ total: 1, completed: 0, phase: "Downloading folder as ZIP..." });
    try {
      const result = await downloadService.downloadFolderAsZip(folder.id, null);
      Alert.alert("Download Completed Successfully", `Files saved to: ${result.filePath}`);
    } catch (err) {
      if (retryCount < 2 && (
        err.message.includes("403") || err.message.includes("status 4") ||
        err.message.includes("network") || err.message.includes("timeout")
      )) {
        setDownloadProgress({ total: 1, completed: 0, phase: `Retrying download (${retryCount + 1}/2)...` });
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return executeSingleFolderDownload(folder, retryCount + 1);
      }
      Alert.alert("Download Failed", err.message);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadFolderImages = async (folder) => {
    const confirmed = await confirmDownload(1, "folders");
    if (!confirmed) return;
    const granted = await downloadService.requestStoragePermission();
    if (!granted) return;
    await executeSingleFolderDownload(folder);
  };

  const handleApplyFilters = async (filterData) => {
    setActiveFilters(filterData);
    setLoading(true);
    try {
      const sf = {};
      if (filterData.searchText) sf.searchText = filterData.searchText;
      if (filterData.designName) sf.designName = filterData.designName;
      if (filterData.eventTypes?.length > 0) sf.eventType = filterData.eventTypes.join(",");
      if (filterData.decorTypes?.length > 0) sf.decorType = filterData.decorTypes.join(",");
      if (filterData.colors?.length > 0) sf.colors = filterData.colors.join(",");
      if (filterData.flowerTypes?.length > 0) sf.flowerType = filterData.flowerTypes.join(",");
      if (filterData.venueName) sf.placeOfEvent = filterData.venueName;
      else if (filterData.venueFilter) sf.placeOfEvent = filterData.venueFilter;
      if (filterData.folderName) sf.folderName = filterData.folderName;
      if (filterData.collectedBy) sf.collectedBy = filterData.collectedBy;
      if (filterData.priceRange) { sf.priceMin = filterData.priceRange[0]; sf.priceMax = filterData.priceRange[1]; }
      if (filterData.sizeFilters) {
        if (filterData.sizeFilters.width) sf.sizeWidth = filterData.sizeFilters.width;
        if (filterData.sizeFilters.length) sf.sizeLength = filterData.sizeFilters.length;
        if (filterData.sizeFilters.height) sf.sizeHeight = filterData.sizeFilters.height;
      }
      const data = await ApiService.searchImages(sf);
      setFilteredImages(Array.isArray(data) ? data : (data.images || []));
    } catch (err) {
      Alert.alert("Search failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setActiveFilters(null);
    setFilteredImages([]);
  };

  const getImgUrl = (img) => {
    const url = img?.image_data?.imageUrl;
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${IMAGE_BASE_URL}${url}`;
  };

  const getEffectiveImgUrl = (img) => {
    const remoteUrl = getImgUrl(img);
    if (!remoteUrl) return "";
    if (offlineMode && img?.id) {
      return `file://${offlineManager.getLocalImagePath(img.id)}`;
    }
    return remoteUrl;
  };

  const currentLightboxImage = lightboxVisible && imagesRef.current[lightboxIndex]
    ? { url: offlineMode ? getEffectiveImgUrl(imagesRef.current[lightboxIndex]) : getImgUrl(imagesRef.current[lightboxIndex]), data: imagesRef.current[lightboxIndex].image_data, id: imagesRef.current[lightboxIndex].id }
    : null;

  const goToPrevious = useCallback(() => {
    setLightboxIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setLightboxIndex(prev => Math.min(imagesRef.current.length - 1, prev + 1));
  }, []);

  const renderImageCard = useCallback(({ item, index }) => {
    const imgUrl = offlineMode ? getEffectiveImgUrl(item) : getImgUrl(item);
    const isFav = favouriteImages.some(img => img.id === item.id);
    const selected = selectedIds.has(item.id);
    const showMove = !!currentFolder && !selectMode;
    const currentDisplayImages = activeFilters ? filteredImages : favouriteImages;

    return (
      <ImageCard
        item={item}
        imgUrl={imgUrl}
        cardWidth={cardWidth}
        selected={selected}
        selectMode={selectMode}
        isFav={isFav}
        showMove={showMove}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else {
            imagesRef.current = currentDisplayImages;
            setLightboxIndex(index);
            setLightboxVisible(true);
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelectedIds(new Set([item.id]));
          }
        }}
        onToggleFav={() => handleToggleFavourite(item.id)}
        onDownload={() => handleDownloadSingleImage(item)}
        onMove={() => {
          setSelectedImageForMove(item.id);
          setShowMoveModal(true);
        }}
      />
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineMode, favouriteImages, selectedIds, selectMode, cardWidth, currentFolder, activeFilters, filteredImages]);

  const renderFolderItem = ({ item }) => {
    const selected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.folderCard, selected && styles.folderCardSelected]}
        onPress={() => handleFolderPress(item)}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelectedIds(new Set([item.id]));
          }
        }}
        activeOpacity={0.7}
      >
        {selectMode && (
          <View style={[styles.folderSelectCheckbox, selected && styles.folderSelectCheckboxActive]}>
            <Text style={styles.folderSelectCheckboxText}>{selected ? "\u2713" : ""}</Text>
          </View>
        )}
        <View style={styles.folderIcon}>
          <Text style={styles.folderIconText}>{selected ? "\uD83D\uDCC2" : "\uD83D\uDCC1"}</Text>
        </View>
        <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
        {!selectMode && (
          <View style={styles.folderActions}>
            <TouchableOpacity style={styles.folderDlBtn} onPress={() => handleDownloadFolderImages(item)}>
              <Text style={styles.folderDlBtnText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.folderOptionsBtn} onPress={() => handleFolderOptions(item)}>
              <Text style={styles.folderOptionsBtnText}>...</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderImageContent = () => {
    const displayImages = activeFilters ? filteredImages : favouriteImages;

    if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>;
    }

    if (displayImages.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {activeFilters ? "No images match your filters." : "No favourite images yet. Tap \u2661 on any image to add it."}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={displayImages}
        renderItem={renderImageCard}
        keyExtractor={item => item.id?.toString()}
        numColumns={numColumns}
        key={`fav-img-${numColumns}`}
        extraData={selectedIds}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderFolderContent = () => {
    if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>;
    }

    if (favouriteFolders.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No favourite folders yet. Create one!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={favouriteFolders}
        renderItem={renderFolderItem}
        keyExtractor={item => item.id?.toString()}
        numColumns={folderColumns}
        key={`fav-folders-${folderColumns}`}
        extraData={selectedIds}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => {
          if (currentFolder) {
            handleBackToFolders();
          } else {
            navigation.goBack();
          }
        }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>
          {currentFolder ? currentFolder.name : "Favourites"}
        </Text>
        <View style={styles.navbarRight}>
          {offlineMode && (
            <View style={styles.offlineIndicator}>
              <Text style={styles.offlineIndicatorText}>Offline</Text>
            </View>
          )}
          {!currentFolder && (
            <TouchableOpacity style={styles.navBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.navBtnText}>Filter</Text>
            </TouchableOpacity>
          )}
          {!currentFolder && (
            <TouchableOpacity
              style={[styles.navBtn, selectMode && styles.navBtnActive]}
              onPress={toggleSelectMode}
            >
              <Text style={[styles.navBtnText, selectMode && styles.navBtnTextActive]}>
                {selectMode ? "Cancel" : "Select"}
              </Text>
            </TouchableOpacity>
          )}
          {activeTab === "folders" && !currentFolder && !selectMode && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFolderModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      {!currentFolder && !selectMode && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => { setActiveTab("all"); setSelectedIds(new Set()); setSelectMode(false); loadFavourites(); }}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All Favourites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "folders" && styles.tabActive]}
            onPress={() => { setActiveTab("folders"); setSelectedIds(new Set()); setSelectMode(false); loadFavouriteFolders(); }}
          >
            <Text style={[styles.tabText, activeTab === "folders" && styles.tabTextActive]}>
              Folders
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selection Action Bar */}
      {selectMode && (
        <View style={styles.selectionBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          </View>
          <View style={styles.selectionActions}>
            {activeTab === "all" && (
              <TouchableOpacity style={styles.selActionBtn} onPress={handleBatchMoveToFolder}>
                <Text style={styles.selActionText}>Move</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.selActionBtn}
              onPress={activeTab === "all" ? handleDownloadSelectedImages : handleDownloadSelectedFolders}
            >
              <Text style={styles.selActionText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selActionBtnClear} onPress={() => { setSelectedIds(new Set()); }}>
              <Text style={styles.selActionClearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      {currentFolder ? (
        renderImageContent()
      ) : activeTab === "all" ? (
        renderImageContent()
      ) : (
        renderFolderContent()
      )}

      {/* Add Folder Modal */}
      <Modal visible={showAddFolderModal} transparent animationType="fade" onRequestClose={() => setShowAddFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Favourite Folder</Text>
              <TouchableOpacity onPress={() => setShowAddFolderModal(false)}>
                <Text style={styles.modalClose}>{"\u00D7"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Folder Name</Text>
              <TextInput style={styles.input} value={folderName}
                onChangeText={setFolderName} placeholder="Enter folder name" />
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput style={[styles.input, styles.textArea]} value={folderDescription}
                onChangeText={setFolderDescription} placeholder="Enter description" multiline numberOfLines={3} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddFolderModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddFolder} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? "Creating..." : "Create Folder"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rename Folder</Text>
              <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalClose}>{"\u00D7"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>New Folder Name</Text>
              <TextInput style={styles.input} value={renameFolderName}
                onChangeText={setRenameFolderName} placeholder="Enter new name" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRenameModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRenameFolder} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? "Saving..." : "Rename"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Sidebar */}
      <FilterSidebar
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Move to Folder Modal */}
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectMode ? `Move ${selectedIds.size} Image(s)` : "Move to Folder"}
              </Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Text style={styles.modalClose}>{"\u00D7"}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {favouriteFolders.length === 0 ? (
                <Text style={styles.emptyText}>No folders available.</Text>
              ) : (
                favouriteFolders.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.moveItem, selectedTargetFolder?.id === f.id && styles.moveItemSelected]}
                    onPress={() => setSelectedTargetFolder(f)}
                  >
                    <Text style={styles.moveItemIcon}>{"\uD83D\uDCC1"}</Text>
                    <Text style={styles.moveItemName}>{f.name}</Text>
                    {selectedTargetFolder?.id === f.id && (
                      <Text style={styles.moveItemCheck}>{"\u2713"}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
              {!showNewFolderInput ? (
                <TouchableOpacity
                  style={styles.createFolderOption}
                  onPress={() => setShowNewFolderInput(true)}
                >
                  <Text style={styles.createFolderOptionText}>+ Create New Folder</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.newFolderRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    placeholder="New folder name"
                  />
                  <TouchableOpacity style={styles.primaryBtnSmall} onPress={handleCreateFolderFromMove} disabled={loading}>
                    <Text style={styles.primaryBtnTextSmall}>Create</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMoveModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !selectedTargetFolder && styles.btnDisabled]}
                onPress={selectMode ? handleBatchMoveConfirm : handleMoveToFolder}
                disabled={!selectedTargetFolder || loading}
              >
                <Text style={styles.primaryBtnText}>{loading ? "Moving..." : "Move"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Download Progress Modal */}
      <Modal visible={downloading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { alignItems: "center", padding: 24 }]}>
            <ActivityIndicator size="large" color="#ff6b8a" />
            <Text style={styles.dlProgressText}>
              {downloadProgress?.phase || (
                downloadProgress
                  ? `Downloading ${downloadProgress.completed + 1} of ${downloadProgress.total}...`
                  : "Preparing download..."
              )}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Download Options Modal */}
      <DownloadOptionsModal
        visible={showDownloadOptions}
        title={downloadOptionImages.length > 1
          ? `Download ${downloadOptionImages.length} images`
          : "Download image"}
        subtitle="Choose a download format"
        options={[
          { id: "jpg", label: "Download as Image", description: "Save as .jpg files" },
          { id: "pdf", label: "Download as PDF", description: "Specification sheet with image details" },
        ]}
        onSelect={handleDownloadOptionSelect}
        onCancel={() => setShowDownloadOptions(false)}
      />

      {/* Lightbox */}
      <ImageLightbox
        visible={lightboxVisible}
        image={currentLightboxImage}
        index={lightboxIndex}
        totalCount={imagesRef.current.length}
        onClose={() => setLightboxVisible(false)}
        onPrevious={goToPrevious}
        onNext={goToNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  navbar: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  backBtnText: { fontSize: 16, color: "#374151", fontWeight: "600" },
  navbarTitle: { fontSize: 16, fontWeight: "700", color: "#ff6b8a", flex: 1, marginLeft: 8 },
  navbarRight: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  navBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#f3f4f6" },
  navBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  tabs: {
    flexDirection: "row", marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, backgroundColor: "#e5e7eb", padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#ff6b8a", fontWeight: "600" },
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
  imageCard: {
    backgroundColor: "#fff", borderRadius: 10, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)", elevation: 2, position: "relative",
  },
  imageCardImg: { width: "100%" },
  imagePlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 13 },
  imageCardContent: { padding: 8 },
  imageCardTitle: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  favToggle: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  favIcon: { fontSize: 18, color: "#9ca3af" },
  favIconActive: { color: "#ef4444" },
  folderCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16,
    alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", elevation: 3, position: "relative",
  },
  folderCardSelected: {
    borderWidth: 2, borderColor: "#ff6b8a", borderRadius: 14,
  },
  folderIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  folderIconText: { fontSize: 28 },
  folderName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", textAlign: "center", marginBottom: 8 },
  folderActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  folderDlBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: "#dbeafe" },
  folderDlBtnText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
  folderOptionsBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  folderOptionsBtnText: { fontSize: 14, fontWeight: "700", color: "#6b7280", lineHeight: 16 },
  folderSelectCheckbox: {
    position: "absolute", top: 8, left: 8, width: 28, height: 28,
    borderRadius: 14, borderWidth: 2, borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  folderSelectCheckboxActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  folderSelectCheckboxText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  modalBody: { padding: 16 },
  modalActions: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10, padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb" },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff6b8a", alignItems: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
  moveItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  moveItemSelected: { backgroundColor: "#fef3c7", borderRadius: 8 },
  moveItemIcon: { fontSize: 20 },
  moveItemName: { fontSize: 15, color: "#1a1a1a", fontWeight: "500", flex: 1 },
  moveItemCheck: { fontSize: 18, color: "#22c55e", fontWeight: "700" },
  imageCardSelected: { borderWidth: 2, borderColor: "#ff6b8a", borderRadius: 10 },
  selectCheckbox: {
    position: "absolute", top: 8, left: 8, width: 28, height: 28,
    borderRadius: 14, borderWidth: 2, borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  selectCheckboxActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  selectCheckboxText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#fef3c7" },
  moveBtnText: { fontSize: 11, fontWeight: "600", color: "#d97706" },
  dlBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#dbeafe" },
  dlBtnText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
  navBtnActive: { backgroundColor: "#ff6b8a" },
  navBtnTextActive: { color: "#fff" },
  offlineIndicator: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#22c55e" },
  offlineIndicatorText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  selectionBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  selectionCount: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  selectionActions: { flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" },
  selActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#ff6b8a" },
  selActionText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  selActionBtnClear: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fee2e2" },
  selActionClearText: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  createFolderOption: { paddingVertical: 14, paddingHorizontal: 8, marginTop: 4 },
  createFolderOptionText: { fontSize: 15, fontWeight: "600", color: "#ff6b8a" },
  newFolderRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  primaryBtnSmall: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ff6b8a", alignItems: "center" },
  primaryBtnTextSmall: { fontSize: 14, fontWeight: "600", color: "#fff" },
  dlProgressText: { fontSize: 15, color: "#374151", marginTop: 16, textAlign: "center" },
});

export default FavouritesScreen;
