import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  Image, Dimensions, Platform,
} from "react-native";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import ImageMeta from "../components/ImageMeta";
import FilterSidebar from "../components/FilterSidebar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;

const API_BASE_URL = "http://localhost:5000/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

function FavouritesScreen({ navigation }) {
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

  const [lightboxImage, setLightboxImage] = useState(null);

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
    setCurrentFolder(folder);
    loadFolderImages(folder.name);
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setActiveTab("folders");
    loadFavourites();
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

  const getImgUrl = (img) => img?.image_data?.imageUrl ? `${IMAGE_BASE_URL}${img.image_data.imageUrl}` : "";

  const renderImageCard = ({ item }) => {
    const imgUrl = getImgUrl(item);
    const isFav = favouriteImages.some(img => img.id === item.id);

    return (
      <View style={styles.imageCard}>
        <TouchableOpacity onPress={() => setLightboxImage({ url: imgUrl, data: item.image_data, id: item.id })} activeOpacity={0.9}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.imageCardImg} resizeMode="cover" />
          ) : (
            <View style={[styles.imageCardImg, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.favToggle} onPress={() => handleToggleFavourite(item.id)}>
          <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
            {isFav ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>

        <View style={styles.imageCardContent}>
          <Text style={styles.imageCardTitle} numberOfLines={1}>
            {item.image_data?.designName || "Untitled"}
          </Text>
          <ImageMeta data={item.image_data} />
          {currentFolder && (
            <TouchableOpacity style={styles.moveBtn} onPress={() => {
              setSelectedImageForMove(item.id);
              setShowMoveModal(true);
            }}>
              <Text style={styles.moveBtnText}>Move to Folder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFolderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.folderCard}
      onPress={() => handleFolderPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.folderIcon}>
        <Text style={styles.folderIconText}>📁</Text>
      </View>
      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderImageContent = () => {
    const displayImages = activeFilters ? filteredImages : favouriteImages;

    if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>;
    }

    if (displayImages.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {activeFilters ? "No images match your filters." : "No favourite images yet. Tap ♡ on any image to add it."}
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
        numColumns={SCREEN_WIDTH >= 768 ? 3 : 2}
        key={`fav-folders-${SCREEN_WIDTH >= 768 ? 3 : 2}`}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => {
          if (currentFolder) {
            handleBackToFolders();
          } else {
            navigation.goBack();
          }
        }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>
          {currentFolder ? currentFolder.name : "Favourites"}
        </Text>
        <View style={styles.navbarRight}>
          {!currentFolder && (
            <TouchableOpacity style={styles.navBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.navBtnText}>Filter</Text>
            </TouchableOpacity>
          )}
          {activeTab === "folders" && !currentFolder && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFolderModal(true)}>
              <Text style={styles.addBtnText}>+ Add Folder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      {!currentFolder && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => { setActiveTab("all"); loadFavourites(); }}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All Favourites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "folders" && styles.tabActive]}
            onPress={() => { setActiveTab("folders"); loadFavouriteFolders(); }}
          >
            <Text style={[styles.tabText, activeTab === "folders" && styles.tabTextActive]}>
              Folders
            </Text>
          </TouchableOpacity>
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

      {/* Move to Folder Modal */}
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move to Folder</Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {favouriteFolders.length === 0 ? (
                <Text style={styles.emptyText}>No folders available. Create one first.</Text>
              ) : (
                favouriteFolders.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.moveItem, selectedTargetFolder?.id === f.id && styles.moveItemSelected]}
                    onPress={() => setSelectedTargetFolder(f)}
                  >
                    <Text style={styles.moveItemIcon}>📁</Text>
                    <Text style={styles.moveItemName}>{f.name}</Text>
                    {selectedTargetFolder?.id === f.id && (
                      <Text style={styles.moveItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMoveModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !selectedTargetFolder && styles.btnDisabled]}
                onPress={handleMoveToFolder}
                disabled={!selectedTargetFolder || loading}
              >
                <Text style={styles.primaryBtnText}>Move</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: Platform.OS === "ios" ? 50 : 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  backBtnText: { fontSize: 18, color: "#374151", fontWeight: "600" },
  navbarTitle: { fontSize: 18, fontWeight: "700", color: "#ff6b8a", flex: 1, marginLeft: 12 },
  navbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f3f4f6" },
  navBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  tabs: {
    flexDirection: "row", marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, backgroundColor: "#e5e7eb", padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#ff6b8a", fontWeight: "600" },
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
  imageCard: {
    width: cardWidth, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: "relative",
  },
  imageCardImg: { width: "100%", height: cardWidth * 0.75 },
  imagePlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  imageCardContent: { padding: 10 },
  imageCardTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  favToggle: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  favIcon: { fontSize: 18, color: "#9ca3af" },
  favIconActive: { color: "#ef4444" },
  folderCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16,
    alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  folderIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fef3c7", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  folderIconText: { fontSize: 28 },
  folderName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
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
  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  lightboxClose: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, right: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxImg: { width: "90%", height: "60%" },
  lightboxInfo: { position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: "rgba(0,0,0,0.7)", padding: 16, borderRadius: 12 },
  lightboxTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
});

export default FavouritesScreen;
