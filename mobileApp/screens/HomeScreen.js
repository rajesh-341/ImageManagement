import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  Image, Dimensions, Platform,
} from "react-native";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import Toast from "../components/Toast";
import FolderCard from "../components/FolderCard";
import ImageCard from "../components/ImageCard";
import FilterSidebar from "../components/FilterSidebar";
import UploadModal from "../components/UploadModal";
import EditImageModal from "../components/EditImageModal";
import UserModal from "../components/UserModal";
import DownloadModal from "../components/DownloadModal";
import { UPLOAD_ROLES, EDIT_DELETE_ROLES, EVENT_TYPES, DECOR_TYPES } from "../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const isTablet = SCREEN_WIDTH >= 768;
const gridColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;

const COMMON_SEARCH_FIELDS = [
  { key: "venue", label: "Venue" },
  { key: "eventType", label: "Event Type" },
  { key: "decorType", label: "Decoration Type" },
  { key: "designName", label: "Design Name" },
  { key: "all", label: "All Fields" },
];

const formatPrice = (min, max) => {
  if (!min && !max) return "";
  if (min && max) return `₹${min} - ₹${max}`;
  if (min) return `From ₹${min}`;
  return `Up to ₹${max}`;
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notif, setNotif] = useState(null);

  // Views
  const [view, setView] = useState("folders"); // folders | images | favorites
  const [showOtherServices, setShowOtherServices] = useState(false);

  // Folders
  const [folders, setFolders] = useState([]);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderEventTypes, setFolderEventTypes] = useState([]);
  const [editFolderName, setEditFolderName] = useState("");

  // Images
  const [images, setImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Favorites
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favFolders, setFavFolders] = useState([]);
  const [showAddFavFolderModal, setShowAddFavFolderModal] = useState(false);
  const [favCustName, setFavCustName] = useState("");
  const [favVenue, setFavVenue] = useState("");
  const [favEventDate, setFavEventDate] = useState("");
  const [selectedFavFolder, setSelectedFavFolder] = useState(null);

  // Search
  const [commonSearch, setCommonSearch] = useState("");
  const [commonSearchField, setCommonSearchField] = useState("venue");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Modals
  const [showFilter, setShowFilter] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadingFolder, setDownloadingFolder] = useState(null);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Other services
  const [customEventTypes, setCustomEventTypes] = useState([]);
  const [customDecorTypes, setCustomDecorTypes] = useState([]);
  const [newEventType, setNewEventType] = useState("");
  const [newDecorType, setNewDecorType] = useState("");

  const allEventTypes = [...EVENT_TYPES, ...customEventTypes.filter(t => !EVENT_TYPES.includes(t))];
  const allDecorTypes = [...DECOR_TYPES, ...customDecorTypes.filter(t => !DECOR_TYPES.includes(t))];

  const showNotif = (message, type = "error") => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // Auth check
  useEffect(() => {
    (async () => {
      const u = await offlineStorage.getUser();
      if (!u) { navigation.replace("Login"); return; }
      setUser(u);
      const offline = await offlineStorage.isOfflineMode();
      setOfflineMode(offline);
    })();
  }, []);

  // Load data when user is available
  useEffect(() => {
    if (!user) return;
    loadFolders();
    if (view === "images") loadAllImages();
    if (view === "favorites" || showFavorites) loadFavorites();
  }, [user, view, showFavorites]);

  const loadFolders = async () => {
    try {
      const list = await ApiService.getFolders();
      setFolders(list);
      await offlineStorage.storeFolders(list);
    } catch (err) {
      const cached = await offlineStorage.getFolders();
      if (cached) setFolders(cached);
      showNotif("Failed to load folders");
    }
  };

  const loadAllImages = async (p = 1) => {
    setLoading(true);
    try {
      const result = await ApiService.getImages(null, p, 50);
      if (p === 1) setAllImages(result.images || []);
      else setAllImages(prev => [...prev, ...(result.images || [])]);
      setHasMore(result.hasMore);
      setPage(p);
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const favData = await ApiService.getFavorites();
      setFavorites(favData.images || favData);
      const folders = await ApiService.getFavoriteFolders();
      setFavFolders(folders);
    } catch (err) {
      showNotif(err.message);
    }
  };

  // Common search
  const handleCommonSearch = useCallback(async (text, field) => {
    if (!text.trim()) { setFilteredImages([]); setSuggestions([]); return; }
    try {
      const sf = {};
      if (field === "all") sf.searchText = text;
      else if (field === "venue") sf.placeOfEvent = text;
      else if (field === "eventType") sf.eventType = text;
      else if (field === "decorType") sf.decorType = text;
      else if (field === "designName") sf.designName = text;
      const results = await ApiService.searchImages(sf);
      setFilteredImages(results);
    } catch (err) {
      showNotif(err.message);
    }
  }, []);

  useEffect(() => {
    if (commonSearchTimer) clearTimeout(commonSearchTimer);
    commonSearchTimer = setTimeout(() => {
      handleCommonSearch(commonSearch, commonSearchField);
    }, 400);
    return () => clearTimeout(commonSearchTimer);
  }, [commonSearch, commonSearchField]);

  // Suggestions
  useEffect(() => {
    if (commonSearch.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const fieldMap = { venue: "placeOfEvent", eventType: "eventType", decorType: "decorType", designName: "designName" };
        const field = fieldMap[commonSearchField] || commonSearchField;
        const data = await ApiService.getSuggestions(field, commonSearch);
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(data.length > 0);
      } catch { }
    }, 300);
    return () => clearTimeout(timer);
  }, [commonSearch, commonSearchField]);

  const selectSuggestion = (val) => {
    setCommonSearch(val);
    setShowSuggestions(false);
    handleCommonSearch(val, commonSearchField);
  };

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleMoveToFolder = async (folder) => {
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await ApiService.moveImageToFolder(id, folder.name);
      }
      setSelectedIds(new Set());
      setShowMoveModal(false);
      showNotif(`Moved ${selectedIds.size} image(s) to "${folder.name}"`, "success");
      loadAllImages(page);
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CRUD
  const handleAddFolder = async () => {
    if (!folderName.trim()) { Alert.alert("Error", "Enter a folder name"); return; }
    setLoading(true);
    try {
      await ApiService.createFolder(folderName.trim(), folderDescription.trim(), folderEventTypes);
      setFolderName(""); setFolderDescription(""); setFolderEventTypes([]);
      setShowAddFolderModal(false);
      loadFolders();
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFolder = async () => {
    if (!editFolderName.trim() || !editingFolder) return;
    setLoading(true);
    try {
      await ApiService.updateFolder(editingFolder.id, editFolderName.trim(), folderEventTypes);
      setShowEditFolderModal(false);
      setEditingFolder(null);
      loadFolders();
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = (id, name) => {
    Alert.alert("Delete Folder", `Delete "${name}" and all its images?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await ApiService.deleteFolder(id);
          loadFolders();
        } catch (err) { showNotif(err.message); }
      }},
    ]);
  };

  const handleDeleteImage = (id) => {
    Alert.alert("Delete Image", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await ApiService.deleteImage(id);
          loadAllImages(page);
          if (showFavorites) loadFavorites();
        } catch (err) { showNotif(err.message); }
      }},
    ]);
  };

  const handleEditImage = (image) => {
    setEditingImage(image);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (data) => {
    setLoading(true);
    try {
      await ApiService.updateImage(editingImage.id, { image_data: data });
      setShowEditModal(false);
      setEditingImage(null);
      showNotif("Image updated", "success");
      loadAllImages(page);
      if (showFavorites) loadFavorites();
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Favorites
  const toggleFav = async (imageId, isFav) => {
    try {
      if (isFav) await ApiService.removeFavorite(imageId);
      else await ApiService.addFavorite(imageId);
      if (showFavorites) loadFavorites();
    } catch (err) {
      showNotif(err.message);
    }
  };

  const handleCreateFavFolder = async () => {
    if (!favCustName.trim()) { Alert.alert("Error", "Enter customer name"); return; }
    const folderName = [favCustName.trim(), favVenue.trim(), favEventDate.trim()].filter(Boolean).join("_");
    try {
      await ApiService.createFavoriteFolder(folderName);
      setFavCustName(""); setFavVenue(""); setFavEventDate("");
      setShowAddFavFolderModal(false);
      loadFavorites();
    } catch (err) { showNotif(err.message); }
  };

  // Filters
  const handleApplyFilters = async (filterData) => {
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
      const results = await ApiService.searchImages(sf);
      setFilteredImages(results);
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilteredImages([]);
    setCommonSearch("");
  };

  // Other services
  const handleAddEventType = async () => {
    if (!newEventType.trim()) return;
    try {
      await ApiService.updateDropdownConfig([...allEventTypes, newEventType.trim()], allDecorTypes);
      setCustomEventTypes(prev => [...prev, newEventType.trim()]);
      setNewEventType("");
      showNotif("Event type added", "success");
    } catch (err) { showNotif(err.message); }
  };

  const handleAddDecorType = async () => {
    if (!newDecorType.trim()) return;
    try {
      await ApiService.updateDropdownConfig(allEventTypes, [...allDecorTypes, newDecorType.trim()]);
      setCustomDecorTypes(prev => [...prev, newDecorType.trim()]);
      setNewDecorType("");
      showNotif("Decor type added", "success");
    } catch (err) { showNotif(err.message); }
  };

  // Offline mode
  const toggleOffline = async () => {
    const next = !offlineMode;
    setOfflineMode(next);
    await offlineStorage.setOfflineMode(next);
    ApiService.setOnlineStatus(!next);
    showNotif(next ? "Offline mode enabled" : "Online mode enabled", "success");
  };

  // Lightbox navigation
  const currentImageList = view === "favorites" ? favorites : filteredImages.length > 0 ? filteredImages : allImages;

  const goToLightbox = (imageArray, index) => {
    setLightboxImages(imageArray);
    setLightboxIdx(index);
  };

  const navLightbox = (direction) => {
    setLightboxIdx(prev => {
      const next = prev + direction;
      if (next < 0) return lightboxImages.length - 1;
      if (next >= lightboxImages.length) return 0;
      return next;
    });
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canEditDelete = user && EDIT_DELETE_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());
  const canManageUsers = user && ["captain", "vicecaptain", "owner"].includes(user.role?.toLowerCase());

  const renderFolderGrid = () => (
    <View style={styles.grid}>
      {folders.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>No folders yet.</Text></View>
      ) : (
        <View style={styles.folderGrid}>
          {folders.map(f => (
            <View key={f.id} style={styles.folderCol}>
              <FolderCard
                folder={f}
                canDelete={canUpload}
                onClick={() => navigation.navigate("Folder", { folder: f })}
                onDelete={handleDeleteFolder}
                onEdit={(fold) => { setEditingFolder(fold); setEditFolderName(fold.name); setShowEditFolderModal(true); }}
                onDownload={(fold) => { setDownloadingFolder(fold); setShowDownloadModal(true); }}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderImageGrid = (imageList, showFavToggle = false) => (
    <FlatList
      data={imageList}
      renderItem={({ item, index }) => (
        <ImageCard
          image={item}
          isFav={showFavToggle && favorites.some(f => f.id === item.id)}
          isSelected={selectedIds.has(item.id)}
          canEditDelete={canEditDelete}
          formatPrice={formatPrice}
          formatEventDate={formatEventDate}
          onPress={() => goToLightbox(imageList, index)}
          onToggleFav={showFavToggle ? toggleFav : undefined}
          onSelect={toggleSelect}
          onEdit={handleEditImage}
          onDelete={handleDeleteImage}
        />
      )}
      keyExtractor={item => item.id?.toString()}
      numColumns={gridColumns}
      key={`grid-${gridColumns}`}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.gridRow}
      showsVerticalScrollIndicator={false}
      onEndReached={() => { if (hasMore && view === "images") loadAllImages(page + 1); }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 20 }} color="#ff6b8a" /> : null}
    />
  );

  return (
    <View style={styles.container}>
      <Toast message={notif?.message} type={notif?.type} visible={!!notif} onHide={() => setNotif(null)} />

      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>Event Management</Text>
        <View style={styles.navRight}>
          <TouchableOpacity style={styles.offlineBtn} onPress={toggleOffline}>
            <Text style={[styles.offlineBtnText, offlineMode && styles.offlineActive]}>
              {offlineMode ? "Offline" : "Online"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.userText} numberOfLines={1}>{user?.displayName || user?.username}</Text>
          <TouchableOpacity onPress={async () => { await ApiService.logout(); navigation.replace("Login"); }}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Tabs */}
      <View style={styles.tabs}>
        {[
          { key: "folders", label: "Folders" },
          { key: "images", label: "All Images" },
          { key: "favorites", label: "Favorites" },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, view === t.key && styles.tabActive]}
            onPress={() => { setView(t.key); if (t.key === "images") loadAllImages(); if (t.key === "favorites") loadFavorites(); }}>
            <Text style={[styles.tabText, view === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {view === "folders" ? (
          <>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.filterBtnText}>Filters</Text>
            </TouchableOpacity>
            <View style={styles.actionBtns}>
              {canUpload ? (
                <>
                  <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFolderModal(true)}>
                    <Text style={styles.addBtnText}>+ Folder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addBtn} onPress={() => setShowUpload(true)}>
                    <Text style={styles.addBtnText}>+ Upload</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity style={styles.moreBtn} onPress={() => setShowOtherServices(true)}>
                <Text style={styles.moreBtnText}>⚙</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.viewTitle}>
              {view === "favorites" ? "My Favorites" : "All Images"}
            </Text>
            <View style={styles.actionBtns}>
              {canUpload && view === "images" ? (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowUpload(true)}>
                  <Text style={styles.addBtnText}>+ Upload</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </View>

      {/* Common Search (for images/favorites) */}
      {view !== "folders" ? (
        <View style={styles.commonSearch}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search by ${COMMON_SEARCH_FIELDS.find(f => f.key === commonSearchField)?.label || "field"}...`}
              placeholderTextColor="#9ca3af"
              value={commonSearch}
              onChangeText={t => { setCommonSearch(t); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
            />
            {commonSearch ? (
              <TouchableOpacity onPress={() => { setCommonSearch(""); setFilteredImages([]); setSuggestions([]); }}>
                <Text style={styles.clearSearch}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldRow}>
            {COMMON_SEARCH_FIELDS.map(f => (
              <TouchableOpacity key={f.key} style={[styles.fieldChip, commonSearchField === f.key && styles.fieldChipActive]}
                onPress={() => setCommonSearchField(f.key)}>
                <Text style={[styles.fieldChipText, commonSearchField === f.key && styles.fieldChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {showSuggestions && suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {suggestions.map(s => (
                <TouchableOpacity key={s} style={styles.suggestionItem} onPress={() => selectSuggestion(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Content */}
      {view === "folders" ? (
        filteredImages.length > 0 ? (
          renderImageGrid(filteredImages, true)
        ) : loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
        ) : (
          renderFolderGrid()
        )
      ) : view === "favorites" ? (
        loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
        ) : filteredImages.length > 0 ? (
          renderImageGrid(filteredImages, true)
        ) : favorites.length > 0 ? (
          renderImageGrid(favorites, true)
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No favorites yet.</Text>
            {canUpload ? (
              <TouchableOpacity style={styles.favFolderBtn}
                onPress={() => { setFavCustName(""); setFavVenue(""); setFavEventDate(""); setShowAddFavFolderModal(true); }}>
                <Text style={styles.favFolderBtnText}>+ Create Favorites Folder</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )
      ) : (
        <>
          {selectedIds.size > 0 ? (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selectedIds.size} selected</Text>
              <TouchableOpacity style={styles.bulkBtn} onPress={() => setShowMoveModal(true)}>
                <Text style={styles.bulkBtnText}>Move</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkBtn} onPress={clearSelection}>
                <Text style={styles.bulkBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {filteredImages.length > 0 ? renderImageGrid(filteredImages, true) : renderImageGrid(allImages, true)}
        </>
      )}

      {/* Upload Modal */}
      <UploadModal visible={showUpload} onClose={() => setShowUpload(false)}
        onUploadComplete={() => { loadAllImages(); loadFolders(); }} />

      {/* Edit Image Modal */}
      <EditImageModal visible={showEditModal} onClose={() => { setShowEditModal(false); setEditingImage(null); }}
        image={editingImage} onSave={handleSaveEdit} saving={loading} />

      {/* Filter Sidebar */}
      <FilterSidebar visible={showFilter} onClose={() => setShowFilter(false)}
        onApply={handleApplyFilters} onClear={handleClearFilters} filters={{}} onFilterChange={() => {}} />

      {/* Add Folder Modal */}
      <Modal visible={showAddFolderModal} transparent animationType="fade" onRequestClose={() => setShowAddFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Folder</Text>
              <TouchableOpacity onPress={() => setShowAddFolderModal(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Folder Name</Text>
              <TextInput style={styles.input} value={folderName} onChangeText={setFolderName} placeholder="Customer_Venue_Date" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={folderDescription} onChangeText={setFolderDescription} placeholder="Description" multiline />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddFolderModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAddFolder} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? "Creating..." : "Create"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal visible={showEditFolderModal} transparent animationType="fade" onRequestClose={() => setShowEditFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Folder</Text>
              <TouchableOpacity onPress={() => setShowEditFolderModal(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Folder Name</Text>
              <TextInput style={styles.input} value={editFolderName} onChangeText={setEditFolderName} placeholder="Folder name" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditFolderModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleEditFolder} disabled={loading}>
                  <Text style={styles.primaryBtnText}>{loading ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Favorites Folder Modal */}
      <Modal visible={showAddFavFolderModal} transparent animationType="fade" onRequestClose={() => setShowAddFavFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Favorites Folder</Text>
              <TouchableOpacity onPress={() => setShowAddFavFolderModal(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Customer Name</Text>
              <TextInput style={styles.input} value={favCustName} onChangeText={setFavCustName} placeholder="Customer" />
              <Text style={styles.label}>Venue</Text>
              <TextInput style={styles.input} value={favVenue} onChangeText={setFavVenue} placeholder="Venue" />
              <Text style={styles.label}>Event Date</Text>
              <TextInput style={styles.input} value={favEventDate} onChangeText={setFavEventDate} placeholder="YYYY-MM-DD" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddFavFolderModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateFavFolder} disabled={loading}>
                  <Text style={styles.primaryBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move to Folder Modal */}
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move to Folder</Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {folders.length === 0 ? (
                <Text style={styles.emptyText}>No folders available.</Text>
              ) : (
                folders.map(f => (
                  <TouchableOpacity key={f.id} style={styles.moveItem} onPress={() => handleMoveToFolder(f)}>
                    <Text style={styles.moveItemName}>{f.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Modal */}
      <UserModal visible={showUserModal} onClose={() => setShowUserModal(false)} />

      {/* Download Modal */}
      <DownloadModal visible={showDownloadModal} onClose={() => { setShowDownloadModal(false); setDownloadingFolder(null); }}
        folder={downloadingFolder} />

      {/* Other Services Modal */}
      <Modal visible={showOtherServices} transparent animationType="slide" onRequestClose={() => setShowOtherServices(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Other Services</Text>
              <TouchableOpacity onPress={() => setShowOtherServices(false)}><Text style={styles.modalClose}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {canManageUsers ? (
                <TouchableOpacity style={styles.serviceItem} onPress={() => { setShowOtherServices(false); setShowUserModal(true); }}>
                  <Text style={styles.serviceItemText}>👥 User Management</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.serviceItem} onPress={() => { setShowOtherServices(false); setShowDownloadModal(true); }}>
                <Text style={styles.serviceItemText}>⬇ Download All Images</Text>
              </TouchableOpacity>
              <View style={styles.serviceDivider} />
              <Text style={styles.label}>Add Event Type</Text>
              <View style={styles.serviceAddRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={newEventType}
                  onChangeText={setNewEventType} placeholder="New event type" />
                <TouchableOpacity style={styles.addRowBtn} onPress={handleAddEventType}>
                  <Text style={styles.addRowBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Add Decoration Type</Text>
              <View style={styles.serviceAddRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={newDecorType}
                  onChangeText={setNewDecorType} placeholder="New decor type" />
                <TouchableOpacity style={styles.addRowBtn} onPress={handleAddDecorType}>
                  <Text style={styles.addRowBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightboxImages.length > 0} transparent animationType="fade" onRequestClose={() => setLightboxImages([])}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lbClose} onPress={() => setLightboxImages([])}>
            <Text style={styles.lbCloseText}>✕</Text>
          </TouchableOpacity>

          {lightboxImages.length > 1 ? (
            <View style={styles.lbNav}>
              <TouchableOpacity style={styles.lbNavBtn} onPress={() => navLightbox(-1)}>
                <Text style={styles.lbNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.lbCounter}>{lightboxIdx + 1} / {lightboxImages.length}</Text>
              <TouchableOpacity style={styles.lbNavBtn} onPress={() => navLightbox(1)}>
                <Text style={styles.lbNavText}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.lbImgWrap}>
            {lightboxImages[lightboxIdx] ? (
              <Image
                source={{ uri: `https://imagemanagement-dku8.onrender.com${lightboxImages[lightboxIdx].image_data?.imageUrl || ""}` }}
                style={styles.lbImg} resizeMode="contain"
              />
            ) : (
              <Text style={styles.lbNoImg}>Image not available</Text>
            )}
          </View>

          {lightboxImages[lightboxIdx] ? (
            <View style={styles.lbInfo}>
              <View style={styles.lbInfoRow}>
                <Text style={styles.lbTitle}>{lightboxImages[lightboxIdx].image_data?.designName || "Untitled"}</Text>
                <TouchableOpacity
                  style={styles.lbFavBtn}
                  onPress={() => toggleFav(lightboxImages[lightboxIdx].id, favorites.some(f => f.id === lightboxImages[lightboxIdx].id))}>
                  <Text style={styles.lbFavBtnText}>
                    {favorites.some(f => f.id === lightboxImages[lightboxIdx].id) ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              </View>
              {(() => {
                const d = lightboxImages[lightboxIdx].image_data || {};
                const lines = [];
                if (d.decorType) lines.push(`Decor: ${d.decorType}`);
                if (d.eventType) lines.push(`Event: ${d.eventType}`);
                if (d.sizeDisplay || d.sizeWidth) {
                  const sz = d.sizeDisplay || [d.sizeWidth, d.sizeLength, d.sizeHeight].filter(Boolean).join("×") + (d.sizeUnit ? ` ${d.sizeUnit}` : "");
                  lines.push(`Size: ${sz}`);
                }
                if (d.priceMin || d.priceMax) lines.push(`Price: ${formatPrice(d.priceMin, d.priceMax)}`);
                if (d.colourCombination?.length) lines.push(`Colors: ${d.colourCombination.join(", ")}`);
                if (d.flowerType) lines.push(`Flower: ${d.flowerType}`);
                if (d.venueCustomer) lines.push(`Customer: ${d.venueCustomer}`);
                if (d.venueName) lines.push(`Venue: ${d.venueName}`);
                if (d.venueDate) lines.push(`Date: ${formatEventDate(d.venueDate)}`);
                return lines.map((line, i) => <Text key={i} style={styles.lbDetail}>{line}</Text>);
              })()}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

let commonSearchTimer;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  navbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  navTitle: { fontSize: 18, fontWeight: "700", color: "#ff6b8a" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  offlineBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "#f3f4f6" },
  offlineBtnText: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  offlineActive: { color: "#22c55e" },
  userText: { fontSize: 12, color: "#6b7280", maxWidth: 80 },
  logoutText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  // Tabs
  tabs: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6" },
  tabActive: { backgroundColor: "#ff6b8a" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#fff" },
  // Action bar
  actionBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f3f4f6" },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  actionBtns: { flexDirection: "row", gap: 8 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  moreBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  moreBtnText: { fontSize: 16 },
  // View title
  viewTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  // Common search
  commonSearch: { paddingHorizontal: 16, paddingBottom: 8, zIndex: 100 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#1a1a1a" },
  clearSearch: { fontSize: 20, color: "#6b7280", paddingLeft: 8 },
  fieldRow: { flexDirection: "row", marginTop: 6, gap: 6 },
  fieldChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "#f3f4f6", marginRight: 6 },
  fieldChipActive: { backgroundColor: "#ff6b8a" },
  fieldChipText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  fieldChipTextActive: { color: "#fff" },
  suggestions: { backgroundColor: "#fff", borderRadius: 10, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, maxHeight: 200, borderWidth: 1, borderColor: "#e5e7eb" },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  suggestionText: { fontSize: 14, color: "#374151" },
  // Bulk bar
  bulkBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fef3c7",
    borderBottomWidth: 1, borderBottomColor: "#fde68a",
  },
  bulkText: { fontSize: 14, fontWeight: "600", color: "#92400e", flex: 1 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#f59e0b" },
  bulkBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  // Grid
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  folderGrid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  folderCol: { width: isTablet ? (SCREEN_WIDTH - CARD_GAP * 4) / 3 : (SCREEN_WIDTH - CARD_GAP * 3) / 2 },
  // Center
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  modalBody: { padding: 16 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff6b8a", alignItems: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  moveItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  moveItemName: { fontSize: 15, color: "#1a1a1a", fontWeight: "500" },
  // Services
  serviceItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  serviceItemText: { fontSize: 15, color: "#374151" },
  serviceDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 },
  serviceAddRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  addRowBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ff6b8a" },
  addRowBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  // Favorites
  favFolderBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff6b8a" },
  favFolderBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  // Lightbox
  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  lbClose: { position: "absolute", top: 50, right: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lbCloseText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  lbNav: { position: "absolute", top: 50, left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", zIndex: 15, gap: 20 },
  lbNavBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lbNavText: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -2 },
  lbCounter: { color: "#fff", fontSize: 14, fontWeight: "500" },
  lbImgWrap: { width: "90%", height: "50%", justifyContent: "center", alignItems: "center" },
  lbImg: { width: "100%", height: "100%" },
  lbNoImg: { color: "#9ca3af", fontSize: 16 },
  lbInfo: { position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: "rgba(0,0,0,0.7)", padding: 16, borderRadius: 12 },
  lbInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  lbTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  lbFavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lbFavBtnText: { fontSize: 18, color: "#f59e0b" },
  lbDetail: { fontSize: 13, color: "#e5e7eb", marginTop: 2 },
});

export default HomeScreen;