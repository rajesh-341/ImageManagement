import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  Image, useWindowDimensions, Platform, PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import OptimizedImage from "../components/OptimizedImage";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import offlineManager from "../offline/offlineManager";
import FilterSidebar from "../components/FilterSidebar";
import UpdateService from "../services/updateService";
import { UPLOAD_ROLES, SIZE_UNIT_OPTIONS } from "../utils/constants";

const CARD_GAP = 12;

const API_BASE_URL = "https://imagemanagement-dku8.onrender.com/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
  const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;
  const [user, setUser] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [activeFilters, setActiveFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState("single");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState({
    designName: "", size: "", sizeUnit: "inch", colours: "",
    placeOfEvent: "", decorType: "", eventName: "", folderName: "",
  });
  const [batchImages, setBatchImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const imagesRef = useRef([]);
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState(null);
  const [offlineStatus, setOfflineStatus] = useState("");
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const userData = await offlineStorage.getUser();
      if (!userData) {
        navigation.replace("Login");
      } else {
        setUser(userData);
      }
    };
    init();
  }, [navigation]);

  useEffect(() => {
    if (user) {
      (async () => {
        const isOff = await offlineStorage.isOfflineMode();
        setOfflineMode(isOff);
      })();
      loadAllImages();
      loadFavouriteIds();
      checkForUpdates();
    }
  }, [user]);

  const checkForUpdates = async () => {
    const result = await UpdateService.checkForUpdate();
    if (result.available) {
      setUpdateInfo(result);
    }
  };

  const handleUpdateNow = async () => {
    if (!updateInfo?.apkUrl) return;
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Updates are only available on the Android app.");
      return;
    }
    setUpdateDownloading(true);
    setUpdateProgress(0);
    try {
      const apkPath = await UpdateService.downloadUpdate(
        updateInfo.apkUrl,
        (pct) => setUpdateProgress(pct)
      );
      setUpdateProgress(1);
      await UpdateService.installUpdate(apkPath);
      setUpdateInfo(null);
    } catch (err) {
      Alert.alert("Update Failed", err.message || "Could not download the update. Try again later.");
    } finally {
      setUpdateDownloading(false);
      setUpdateProgress(null);
    }
  };

  const handleSkipUpdate = async () => {
    if (updateInfo?.versionCode) {
      await UpdateService.skipVersion(updateInfo.versionCode);
    }
    setUpdateInfo(null);
  };

  const loadAllImages = async () => {
    try {
      const result = await ApiService.getImages();
      const images = Array.isArray(result) ? result : (result.images || []);
      setAllImages(images);
    } catch (err) {
      console.error("Failed to load images:", err);
    }
  };

  const loadFavouriteIds = async () => {
    try {
      const favs = await ApiService.getFavorites();
      setFavouriteIds(new Set((favs || []).map(f => f.id)));
    } catch (err) {
      console.error("Failed to load favourite ids:", err);
    }
  };

  const handleToggleFavourite = async (imageId) => {
    try {
      if (favouriteIds.has(imageId)) {
        await ApiService.removeFavorite(imageId);
        favouriteIds.delete(imageId);
      } else {
        await ApiService.addFavorite(imageId);
        favouriteIds.add(imageId);
      }
      setFavouriteIds(new Set(favouriteIds));
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleApplyFilters = async (filterData) => {
    setActiveFilters(filterData);
    setLoading(true);
    try {
      const sf = {};
      if (filterData.searchText) sf.searchText = filterData.searchText;
      if (filterData.eventTypes?.length > 0) sf.eventType = filterData.eventTypes.join(",");
      if (filterData.decorTypes?.length > 0) sf.decorType = filterData.decorTypes.join(",");
      if (filterData.colors?.length > 0) sf.colors = filterData.colors.join(",");
      if (filterData.flowerTypes?.length > 0) sf.flowerType = filterData.flowerTypes.join(",");
      if (filterData.venueFilter) sf.placeOfEvent = filterData.venueFilter;
      if (filterData.priceRange) { sf.priceMin = filterData.priceRange[0]; sf.priceMax = filterData.priceRange[1]; }
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
    loadAllImages();
  };

  const handleImageSelect = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.8 }, (res) => {
      if (res.didCancel) return;
      if (res.assets?.[0]) {
        const file = res.assets[0];
        setSelectedImage(file);
        setImagePreview(file.uri);
      }
    });
  };

  const handleUploadSingle = async () => {
    if (!selectedImage) { Alert.alert("Error", "Please select an image"); return; }
    setLoading(true);
    setUploadProgress("Uploading...");
    try {
      const uploadResult = await ApiService.uploadFile(
        { uri: selectedImage.uri, type: selectedImage.type, fileName: selectedImage.fileName },
        null
      );
      const metaData = {
        folderName: imageData.folderName || "General",
        imageUrl: uploadResult.imageUrl,
        colourCombination: imageData.colours.split(",").map(c => c.trim()).filter(c => c),
        size: imageData.size,
        sizeUnit: imageData.sizeUnit,
        designName: imageData.designName,
        placeOfEvent: imageData.placeOfEvent,
        decorType: imageData.decorType,
        eventName: imageData.eventName,
      };
      await ApiService.uploadImage(metaData);
      setUploadProgress("Uploaded!");
      setSelectedImage(null);
      setImagePreview("");
      setImageData({ designName: "", size: "", sizeUnit: "inch", colours: "", placeOfEvent: "", decorType: "", eventName: "", folderName: "" });
      setTimeout(() => { setShowUploadModal(false); setUploadProgress(""); loadAllImages(); }, 1500);
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffline = async () => {
    if (offlineMode) {
      setOfflineStatus("Syncing with server...");
      setOfflineProgress(0);
      try {
        await offlineManager.syncWithServer(
          ApiService,
          (img) => getImgUrl(img),
          (pct) => setOfflineProgress(pct)
        );
        await offlineStorage.setOfflineMode(false);
        setOfflineMode(false);
        setOfflineStatus("Sync complete");
        loadAllImages();
        loadFavouriteIds();
      } catch (err) {
        Alert.alert("Sync Failed", err.message);
      } finally {
        setOfflineProgress(null);
        setOfflineStatus("");
      }
    } else {
      setOfflineStatus("Downloading images...");
      setOfflineProgress(0);
      try {
        const images = await ApiService.getImages();
        const allImgs = Array.isArray(images) ? images : images.images || [];
        await offlineManager.downloadAllImages(
          allImgs,
          (img) => getImgUrl(img),
          (pct) => setOfflineProgress(pct)
        );
        await offlineStorage.storeImages(allImgs);
        await offlineStorage.setOfflineMode(true);
        setOfflineMode(true);
        setOfflineStatus("Offline ready");
        const favs = await ApiService.getFavorites();
        await offlineStorage.storeFavourites(favs || []);
        const folders = await ApiService.getFolders();
        await offlineStorage.storeFolders(folders || []);
        const favFolders = await ApiService.getFavoriteFolders();
        await offlineStorage.storeFavouriteFolders(favFolders || []);
      } catch (err) {
        Alert.alert("Download Failed", err.message);
      } finally {
        setOfflineProgress(null);
        setOfflineStatus("");
      }
    }
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());

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

  const lightboxPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 50) goToPrevious();
        else if (gs.dx < -50) goToNext();
      },
    })
  ).current;

  const renderLightboxField = (label, value) => (
    <View style={styles.lbFieldRow}>
      <Text style={styles.lbFieldLabel}>{label}</Text>
      <Text style={styles.lbFieldValue}>{value || "Not Available"}</Text>
    </View>
  );

  const formatSize = (d) => {
    if (!d) return null;
    if (d.sizeDisplay) return d.sizeDisplay;
    const parts = [];
    if (d.sizeWidth) parts.push(d.sizeWidth);
    if (d.sizeLength) parts.push(d.sizeLength);
    if (d.sizeHeight) parts.push(d.sizeHeight);
    if (parts.length > 0) return `${parts.join(" x ")} ${d.sizeUnit || ""}`.trim();
    if (d.size) return `${d.size} ${d.sizeUnit || ""}`.trim();
    return null;
  };

  const formatPrice = (d) => {
    if (!d) return null;
    if (d.priceMin != null && d.priceMax != null) return `₹${d.priceMin} - ₹${d.priceMax}`;
    if (d.priceMin != null) return `₹${d.priceMin}`;
    if (d.priceMax != null) return `₹${d.priceMax}`;
    return null;
  };

  const renderImageCard = ({ item, index, isFilteredView = false }) => {
    const imgUrl = offlineMode ? getEffectiveImgUrl(item) : getImgUrl(item);
    const isFav = favouriteIds.has(item.id);

    return (
      <View style={[styles.imageCard, { width: cardWidth }]}>
        <TouchableOpacity onPress={() => { imagesRef.current = activeFilters ? filteredImages : allImages; setLightboxIndex(index); setLightboxVisible(true); }} activeOpacity={0.9}>
          {imgUrl ? (
            <OptimizedImage source={{ uri: imgUrl }} style={[styles.imageCardImg, { height: cardWidth * 0.75 }]} resizeMode="cover" />
          ) : (
            <View style={[styles.imageCardImg, styles.imagePlaceholder, { height: cardWidth * 0.75 }]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.favToggleOnCard} onPress={() => handleToggleFavourite(item.id)}>
          <Text style={[styles.favToggleText, isFav && styles.favToggleTextActive]}>
            {isFav ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>

        <View style={styles.imageCardContent}>
          <Text style={styles.imageCardTitle} numberOfLines={1}>
            {item.image_data?.designName || "Untitled"}
          </Text>
        </View>
      </View>
    );
      };

  const renderMainContent = () => {
    const displayImages = activeFilters ? filteredImages : allImages;

    return (
      <View style={styles.page}>
        <View style={styles.actionBar}>
          <Text style={styles.pageTitle}>{activeFilters ? "Filtered Images" : "All Images"}</Text>
          <View style={styles.actionBarBtns}>
            <TouchableOpacity style={styles.filterToggleBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.filterToggleText}>Filters</Text>
            </TouchableOpacity>
            {canUpload && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowUploadModal(true)}>
                <Text style={styles.addBtnText}>+ Upload</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
        ) : displayImages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {activeFilters ? "No images match your filters." : "No images yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayImages}
            renderItem={(props) => renderImageCard({ ...props, isFilteredView: true })}
            keyExtractor={item => item.id?.toString()}
            numColumns={numColumns}
            key={`img-${numColumns}`}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Text style={styles.navbarTitle}>Event Management</Text>
        <View style={styles.navbarRight}>
          <Text style={styles.userText} numberOfLines={1}>
            {user?.displayName || user?.username}
          </Text>
          <TouchableOpacity
            style={[styles.navBtn, offlineMode && styles.offlineBtnActive]}
            onPress={handleToggleOffline}
            disabled={offlineProgress !== null}
          >
            <Text style={[styles.navBtnText, offlineMode && styles.offlineBtnTextActive]}>
              {offlineMode ? "✓ Offline" : "Offline"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate("Favourites")}>
            <Text style={styles.navBtnText}>♥ Favourites</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => { await ApiService.logout(); navigation.replace("Login"); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderMainContent()}

      {/* Filter Sidebar */}
      <FilterSidebar
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.uploadModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Images</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.uploadTabs}>
            {["single", "batch"].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.uploadTab, uploadTab === tab && styles.uploadTabActive]}
                onPress={() => setUploadTab(tab)}
              >
                <Text style={[styles.uploadTabText, uploadTab === tab && styles.uploadTabTextActive]}>
                  {tab === "single" ? "Single Image" : "Batch Upload"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.uploadForm}>
            {uploadTab === "single" ? (
              <>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={handleImageSelect}>
                  {imagePreview ? (
                    <Image source={{ uri: imagePreview }} style={styles.previewImg} />
                  ) : (
                    <View style={styles.pickPlaceholder}>
                      <Text style={styles.pickPlaceholderText}>Tap to select image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Design Name</Text>
                <TextInput style={styles.input} value={imageData.designName}
                  onChangeText={t => setImageData({...imageData, designName: t})} placeholder="Enter design name" />

                <View style={styles.row2}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Size</Text>
                    <TextInput style={styles.input} value={imageData.size}
                      onChangeText={t => setImageData({...imageData, size: t})} placeholder="Size" />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Unit</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {SIZE_UNIT_OPTIONS.map(u => (
                        <TouchableOpacity key={u} style={[styles.unitChip, imageData.sizeUnit === u && styles.unitChipActive]}
                          onPress={() => setImageData({...imageData, sizeUnit: u})}>
                          <Text style={[styles.unitChipText, imageData.sizeUnit === u && styles.unitChipTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <Text style={styles.label}>Colours (comma separated)</Text>
                <TextInput style={styles.input} value={imageData.colours}
                  onChangeText={t => setImageData({...imageData, colours: t})} placeholder="Red, Gold, White" />

                <View style={styles.row2}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Place of Event</Text>
                    <TextInput style={styles.input} value={imageData.placeOfEvent}
                      onChangeText={t => setImageData({...imageData, placeOfEvent: t})} placeholder="Location" />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Event Name</Text>
                    <TextInput style={styles.input} value={imageData.eventName}
                      onChangeText={t => setImageData({...imageData, eventName: t})} placeholder="Event name" />
                  </View>
                </View>

                <Text style={styles.label}>Folder (optional)</Text>
                <TextInput style={styles.input} value={imageData.folderName}
                  onChangeText={t => setImageData({...imageData, folderName: t})} placeholder="Folder name (default: General)" />

                <Text style={styles.label}>Decor Name</Text>
                <TextInput style={styles.input} value={imageData.decorType}
                  onChangeText={t => setImageData({...imageData, decorType: t})} placeholder="Decor name" />

                {uploadProgress ? (
                  <Text style={styles.progressText}>{uploadProgress}</Text>
                ) : null}

                <TouchableOpacity style={[styles.primaryBtn, styles.fullBtn]} onPress={handleUploadSingle} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? "Uploading..." : "Upload Image"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.batchSection}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
                  launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 0 }, (res) => {
                    if (res.didCancel) return;
                    if (res.assets) {
                      const totalAfterAdd = batchImages.length + res.assets.length;
                      if (totalAfterAdd > 100) {
                        Alert.alert("Limit Reached", `Maximum 100 images allowed per batch. You can add ${100 - batchImages.length} more.`);
                        return;
                      }
                      setBatchImages(prev => [...prev, ...res.assets.map(f => ({
                        file: f, preview: f.uri, designName: "", size: "",
                        sizeUnit: "inch", colours: "", placeOfEvent: "", decorType: "", eventName: "",
                      }))]);
                    }
                  });
                }}>
                  <Text style={styles.secondaryBtnText}>+ Add Images</Text>
                </TouchableOpacity>

                {batchImages.map((row, i) => (
                  <View key={i} style={styles.batchRow}>
                    {row.preview ? (
                      <Image source={{ uri: row.preview }} style={styles.batchThumb} />
                    ) : null}
                    <TextInput style={styles.batchInput} value={row.designName}
                      onChangeText={t => {
                        setBatchImages(prev => { const u = [...prev]; u[i] = {...u[i], designName: t}; return u; });
                      }} placeholder="Design" />
                    <TouchableOpacity onPress={() => {
                      setBatchImages(prev => prev.filter((_, idx) => idx !== i));
                    }}>
                      <Text style={styles.removeBtn}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {batchImages.length > 0 ? (
                  <TouchableOpacity style={[styles.primaryBtn, styles.fullBtn]} onPress={async () => {
                    setLoading(true);
                    let success = 0, errors = 0;
                    const batchStartTime = Date.now();
                    for (let i = 0; i < batchImages.length; i++) {
                      try {
                        const row = batchImages[i];
                        const uploadResult = await ApiService.uploadFile(
                          { uri: row.file.uri, type: row.file.type, fileName: row.file.fileName },
                          null
                        );
                        await ApiService.uploadImage({
                          folderName: "General",
                          imageUrl: uploadResult.imageUrl,
                          colourCombination: row.colours?.split(",").map(c => c.trim()).filter(c => c) || [],
                          size: row.size, sizeUnit: row.sizeUnit,
                          designName: row.designName, placeOfEvent: row.placeOfEvent,
                          decorType: row.decorType, eventName: row.eventName,
                          flowerType: null,
                        });
                        success++;
                      } catch { errors++; }
                    }
                    const totalTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
                    setBatchImages([]);
                    setLoading(false);
                    Alert.alert("Upload Complete", `${success} uploaded, ${errors} failed in ${totalTime}s`);
                    setShowUploadModal(false);
                    loadAllImages();
                  }} disabled={loading}>
                    <Text style={styles.primaryBtnText}>{loading ? "Uploading..." : `Upload ${batchImages.length} Image(s)`}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
        <View style={styles.lightboxOverlay} {...lightboxPanResponder.panHandlers}>
          <TouchableOpacity style={[styles.lightboxClose, { top: insets.top + 10 }]} onPress={() => setLightboxVisible(false)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>

          {currentLightboxImage?.url ? (
            <>
              <OptimizedImage
                source={{ uri: currentLightboxImage.url }}
                style={styles.lightboxImg}
                resizeMode="contain"
                lazy={false}
              />

              {/* Navigation arrows */}
              {lightboxIndex > 0 && (
                <TouchableOpacity style={[styles.lbArrow, styles.lbArrowLeft]} onPress={goToPrevious}>
                  <Text style={styles.lbArrowText}>‹</Text>
                </TouchableOpacity>
              )}
              {lightboxIndex < imagesRef.current.length - 1 && (
                <TouchableOpacity style={[styles.lbArrow, styles.lbArrowRight]} onPress={goToNext}>
                  <Text style={styles.lbArrowText}>›</Text>
                </TouchableOpacity>
              )}

              {/* Counter */}
              <View style={[styles.lbCounter, { top: insets.top + 10 }]}>
                <Text style={styles.lbCounterText}>{lightboxIndex + 1} / {imagesRef.current.length}</Text>
              </View>
            </>
          ) : (
            <View style={styles.center}><Text style={styles.emptyText}>Image not available</Text></View>
          )}

          {/* Details */}
          {currentLightboxImage?.data && (
            <View style={styles.lightboxInfo}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.lbDetailsScroll}>
                {renderLightboxField("Design Name", currentLightboxImage.data.designName)}
                {renderLightboxField("Size", formatSize(currentLightboxImage.data))}
                {renderLightboxField("Price", formatPrice(currentLightboxImage.data))}
                {renderLightboxField("Decor", currentLightboxImage.data.decorType)}
                {renderLightboxField("Event", currentLightboxImage.data.eventType)}
                {renderLightboxField("Flower", currentLightboxImage.data.flowerType)}
                {renderLightboxField("Customer", currentLightboxImage.data.venueCustomer)}
                {renderLightboxField("Venue", currentLightboxImage.data.venueName)}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Update Modal */}
      {updateInfo && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Available v{updateInfo.versionName}</Text>
              </View>
              <View style={styles.modalBody}>
                {updateProgress !== null && updateProgress < 1 ? (
                  <>
                    <Text style={styles.updateProgressLabel}>
                      Downloading... {(updateProgress * 100).toFixed(0)}%
                    </Text>
                    <View style={styles.updateProgressBar}>
                      <View style={[styles.updateProgressFill, { width: `${(updateProgress * 100).toFixed(0)}%` }]} />
                    </View>
                  </>
                ) : updateProgress === 1 ? (
                  <Text style={styles.updateProgressLabel}>Installing...</Text>
                ) : (
                  <>
                    <Text style={styles.updateReleaseNotes}>
                      {updateInfo.releaseNotes || "A new version is available. Tap Update to get the latest features and fixes."}
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={handleSkipUpdate} disabled={updateDownloading}>
                        <Text style={styles.cancelBtnText}>Skip</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateNow} disabled={updateDownloading}>
                        <Text style={styles.primaryBtnText}>{updateDownloading ? "Downloading..." : "Update"}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Offline Progress Modal */}
      {offlineProgress !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.offlineModal}>
              <Text style={styles.offlineModalTitle}>{offlineStatus}</Text>
              <View style={styles.updateProgressBar}>
                <View style={[styles.updateProgressFill, { width: `${(offlineProgress * 100).toFixed(0)}%` }]} />
              </View>
              <Text style={styles.offlineModalPct}>{(offlineProgress * 100).toFixed(0)}%</Text>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  // Navbar
  navbar: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  navbarTitle: { fontSize: 18, fontWeight: "700", color: "#ff6b8a" },
  navbarRight: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  navBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#f3f4f6" },
  navBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  userText: { fontSize: 12, color: "#6b7280", maxWidth: 80 },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  // Page
  page: { flex: 1 },
  actionBar: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  actionBarBtns: { flexDirection: "row", gap: 6 },
  pageTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  filterToggleBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#f3f4f6" },
  filterToggleText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  // Grid
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  // Image Card
  imageCard: {
    backgroundColor: "#fff", borderRadius: 10, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)", elevation: 2, position: "relative",
  },
  imageCardImg: { width: "100%" },
  imagePlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 13 },
  imageCardContent: { padding: 8 },
  imageCardTitle: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  favToggleOnCard: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  favToggleText: { fontSize: 18, color: "#9ca3af" },
  favToggleTextActive: { color: "#ef4444" },
  // Center
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  modalBody: { padding: 16 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  // Form
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10, padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb" },
  row2: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, backgroundColor: "#f3f4f6" },
  unitChipActive: { backgroundColor: "#ff6b8a" },
  unitChipText: { fontSize: 12, color: "#6b7280" },
  unitChipTextActive: { color: "#fff", fontWeight: "600" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  primaryBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff6b8a", alignItems: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", alignSelf: "flex-start" },
  secondaryBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  fullBtn: { marginTop: 16, marginBottom: 32 },
  progressText: { textAlign: "center", color: "#22c55e", fontSize: 14, fontWeight: "500", marginTop: 12 },
  // Upload Modal
  uploadModal: { flex: 1, backgroundColor: "#f5f5f5" },
  uploadTabs: { flexDirection: "row", margin: 16, borderRadius: 12, backgroundColor: "#e5e7eb", padding: 3 },
  uploadTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  uploadTabActive: { backgroundColor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", elevation: 2 },
  uploadTabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  uploadTabTextActive: { color: "#ff6b8a", fontWeight: "600" },
  uploadForm: { flex: 1, paddingHorizontal: 16 },
  imagePickerBtn: { borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  previewImg: { width: "100%", height: 200, borderRadius: 12 },
  pickPlaceholder: { width: "100%", height: 150, borderRadius: 12, borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  pickPlaceholderText: { fontSize: 14, color: "#9ca3af" },
  // Batch
  batchSection: { paddingBottom: 32 },
  batchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: "#fff", padding: 8, borderRadius: 10 },
  batchThumb: { width: 40, height: 40, borderRadius: 6 },
  batchInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 6, fontSize: 13 },
  removeBtn: { fontSize: 20, color: "#ef4444", fontWeight: "700", paddingHorizontal: 8 },
  // Lightbox
  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  lightboxClose: { position: "absolute", right: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxImg: { width: "90%", height: "60%" },
  lbArrow: { position: "absolute", top: "50%", zIndex: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginTop: -24 },
  lbArrowLeft: { left: 12 },
  lbArrowRight: { right: 12 },
  lbArrowText: { color: "#fff", fontSize: 32, fontWeight: "300", lineHeight: 36 },
  lbCounter: { position: "absolute", left: 20, zIndex: 20, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  lbCounterText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" },
  lightboxInfo: { position: "absolute", bottom: 30, left: 16, right: 16, backgroundColor: "rgba(0,0,0,0.75)", padding: 14, borderRadius: 12, maxHeight: 240 },
  lbDetailsScroll: { maxHeight: 200 },
  lbFieldRow: { flexDirection: "row", marginVertical: 3 },
  lbFieldLabel: { fontSize: 12, fontWeight: "700", color: "#ff6b8a", width: 80 },
  lbFieldValue: { fontSize: 12, color: "#e5e7eb", flex: 1 },
  // Offline
  offlineBtnActive: { backgroundColor: "#22c55e" },
  offlineBtnTextActive: { color: "#fff" },
  offlineModal: { backgroundColor: "#fff", borderRadius: 16, width: "80%", maxWidth: 300, padding: 24, alignItems: "center" },
  offlineModalTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginBottom: 16, textAlign: "center" },
  offlineModalPct: { fontSize: 14, color: "#6b7280", marginTop: 8, fontWeight: "500" },
  // Update
  updateProgressLabel: { fontSize: 14, color: "#374151", textAlign: "center", marginBottom: 8, fontWeight: "500" },
  updateProgressBar: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginBottom: 16 },
  updateProgressFill: { height: "100%", backgroundColor: "#ff6b8a", borderRadius: 4 },
  updateReleaseNotes: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginBottom: 16 },
});

export default HomeScreen;
