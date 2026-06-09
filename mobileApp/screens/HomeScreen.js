import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  Image, Dimensions, Platform,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import ImageMeta from "../components/ImageMeta";
import FilterSidebar from "../components/FilterSidebar";
import { UPLOAD_ROLES, SIZE_UNIT_OPTIONS } from "../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const isTablet = SCREEN_WIDTH >= 768;
const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;

const API_BASE_URL = "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [activeFilters, setActiveFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("folders");
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState("single");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState({
    designName: "", size: "", sizeUnit: "inch", colours: "",
    placeOfEvent: "", decorType: "", eventName: "",
  });
  const [batchImages, setBatchImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedImagesForMove, setSelectedImagesForMove] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState(new Set());

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
      loadFolders();
      loadFavouriteIds();
    }
  }, [user]);

  const loadFolders = async () => {
    try {
      const list = await ApiService.getFolders();
      setFolders(list);
    } catch (err) {
      console.error("Failed to load folders:", err);
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

  const handleAddFolder = async () => {
    if (!folderName.trim()) { Alert.alert("Error", "Please enter a folder name"); return; }
    setLoading(true);
    try {
      await ApiService.createFolder(folderName.trim(), folderDescription.trim());
      setFolderName(""); setFolderDescription("");
      setShowAddFolderModal(false);
      loadFolders();
    } catch (err) {
      Alert.alert("Error", "Failed to create folder: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = (id, name) => {
    Alert.alert("Delete Folder", `Delete "${name}" and all its images?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setLoading(true);
        try {
          await ApiService.deleteFolder(id);
          loadFolders();
        } catch (err) {
          Alert.alert("Error", err.message);
        } finally {
          setLoading(false);
        }
      }},
    ]);
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
      setFilteredImages(data);
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
      setTimeout(() => { setShowUploadModal(false); setUploadProgress(""); }, 1500);
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToFolder = async (targetFolder) => {
    if (selectedImagesForMove.size === 0) return;
    setLoading(true);
    try {
      for (const id of selectedImagesForMove) {
        await ApiService.moveImageToFolder(id, targetFolder.name);
      }
      setSelectedImagesForMove(new Set());
      setShowMoveModal(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());

  const getImgUrl = (img) => img?.image_data?.imageUrl ? `${IMAGE_BASE_URL}${img.image_data.imageUrl}` : "";

  const renderFolderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.folderCard}
      onPress={() => navigation.navigate("Folder", { folder: item, imageBaseUrl: IMAGE_BASE_URL })}
      activeOpacity={0.7}
    >
      <View style={styles.folderIcon}>
        <Text style={styles.folderIconText}>📁</Text>
      </View>
      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
      {canUpload && (
        <TouchableOpacity
          style={styles.folderDeleteBtn}
          onPress={() => handleDeleteFolder(item.id, item.name)}
        >
          <Text style={styles.folderDeleteBtnText}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderImageCard = ({ item, isFilteredView = false }) => {
    const imgUrl = getImgUrl(item);
    const isSelected = selectedImagesForMove.has(item.id);
    const isFav = favouriteIds.has(item.id);

    return (
      <View style={[styles.imageCard, isSelected && styles.imageCardSelected]}>
        <TouchableOpacity onPress={() => setLightboxImage({ url: imgUrl, data: item.image_data, id: item.id })} activeOpacity={0.9}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.imageCardImg} resizeMode="cover" />
          ) : (
            <View style={[styles.imageCardImg, styles.imagePlaceholder]}>
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
          <ImageMeta data={item.image_data} />
        </View>
      </View>
    );
      };

  const renderMainContent = () => {
    return (
      <View style={styles.page}>
        <View style={styles.actionBar}>
          <Text style={styles.pageTitle}>Folders</Text>
          <View style={styles.actionBarBtns}>
            <TouchableOpacity style={styles.filterToggleBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.filterToggleText}>Filters</Text>
            </TouchableOpacity>
            {canUpload && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFolderModal(true)}>
                <Text style={styles.addBtnText}>+ Add Folder</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activeFilters ? (
          loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
          ) : filteredImages.length === 0 ? (
            <View style={styles.center}><Text style={styles.emptyText}>No images match your filters.</Text></View>
          ) : (
            <FlatList
              data={filteredImages}
              renderItem={(props) => renderImageCard({ ...props, isFilteredView: true })}
              keyExtractor={item => item.id?.toString()}
              numColumns={numColumns}
              key={`filter-${numColumns}`}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={styles.gridRow}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          <>
            {folders.length === 0 ? (
              <View style={styles.center}><Text style={styles.emptyText}>No folders yet. Create one to get started!</Text></View>
            ) : (
              <FlatList
                data={folders}
                renderItem={renderFolderItem}
                keyExtractor={item => item.id?.toString()}
                numColumns={isTablet ? 3 : 2}
                key={`folder-${isTablet ? 3 : 2}`}
                contentContainerStyle={styles.grid}
                columnWrapperStyle={styles.gridRow}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Event Management</Text>
        <View style={styles.navbarRight}>
          <Text style={styles.userText} numberOfLines={1}>
            {user?.displayName || user?.username}
          </Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate("Favourites")}>
            <Text style={styles.navBtnText}>♥ Favourites</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => { await ApiService.logout(); navigation.replace("Login"); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderMainContent()}

      {/* Add Folder Modal */}
      <Modal visible={showAddFolderModal} transparent animationType="fade" onRequestClose={() => setShowAddFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Folder</Text>
              <TouchableOpacity onPress={() => setShowAddFolderModal(false)}>
                <Text style={styles.modalClose}>×</Text>
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
      <Modal visible={!!lightboxImage} transparent animationType="fade" onRequestClose={() => setLightboxImage(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}>
            <Text style={styles.lightboxCloseText}>X</Text>
          </TouchableOpacity>
          {lightboxImage?.url ? (
            <Image source={{ uri: lightboxImage.url }} style={styles.lightboxImg} resizeMode="contain" />
          ) : (
            <View style={styles.center}><Text style={styles.emptyText}>Image not available</Text></View>
          )}
          <View style={styles.lightboxInfo}>
            <Text style={styles.lightboxTitle}>{lightboxImage?.data?.designName || "Untitled"}</Text>
            <ImageMeta data={lightboxImage?.data} />
          </View>
        </View>
      </Modal>

      {/* Move to Folder Modal */}
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move to Folder</Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {folders.length === 0 ? (
                <Text style={styles.emptyText}>No folders available.</Text>
              ) : (
                folders.map(f => (
                  <TouchableOpacity key={f.id} style={styles.moveItem} onPress={() => handleMoveToFolder(f)}>
                    <Text style={styles.moveItemIcon}>📁</Text>
                    <Text style={styles.moveItemName}>{f.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMoveModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  // Navbar
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: Platform.OS === "ios" ? 50 : 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  navbarTitle: { fontSize: 18, fontWeight: "700", color: "#ff6b8a" },
  navbarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6" },
  navBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  userText: { fontSize: 13, color: "#6b7280", maxWidth: 100 },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  // Page
  page: { flex: 1 },
  actionBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  actionBarBtns: { flexDirection: "row", gap: 8 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  filterToggleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f3f4f6" },
  filterToggleText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  moveBtn: { marginHorizontal: 16, padding: 12, borderRadius: 10, backgroundColor: "#f59e0b", alignItems: "center", marginBottom: 8 },
  moveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  // Grid
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  // Folder Card
  folderCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16,
    alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, position: "relative",
  },
  folderIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  folderIconText: { fontSize: 28 },
  folderName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
  folderDeleteBtn: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  folderDeleteBtnText: { fontSize: 16, color: "#6b7280", fontWeight: "700" },
  // Image Card
  imageCard: {
    width: cardWidth, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: "relative",
  },
  imageCardSelected: { borderWidth: 2, borderColor: "#f59e0b" },
  imageCardImg: { width: "100%", height: cardWidth * 0.75 },
  imagePlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  imageCardContent: { padding: 10 },
  imageCardTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
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
  textArea: { minHeight: 60, textAlignVertical: "top" },
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
  uploadTabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
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
  lightboxClose: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, right: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxImg: { width: "90%", height: "60%" },
  lightboxInfo: { position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: "rgba(0,0,0,0.7)", padding: 16, borderRadius: 12 },
  lightboxTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  // Move
  moveItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  moveItemIcon: { fontSize: 20 },
  moveItemName: { fontSize: 15, color: "#1a1a1a", fontWeight: "500" },
});

export default HomeScreen;
