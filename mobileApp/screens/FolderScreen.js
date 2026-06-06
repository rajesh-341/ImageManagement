import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
  Image, Dimensions, Platform,
} from "react-native";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import Toast from "../components/Toast";
import ImageCard from "../components/ImageCard";
import UploadModal from "../components/UploadModal";
import EditImageModal from "../components/EditImageModal";
import DownloadModal from "../components/DownloadModal";
import { UPLOAD_ROLES, EDIT_DELETE_ROLES } from "../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const gridColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;

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

function FolderScreen({ route, navigation }) {
  const { folder } = route.params;
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [folders, setFolders] = useState([]);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const showNotif = (message, type = "error") => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const u = await offlineStorage.getUser();
      setUser(u);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadImages();
    loadFavorites();
  }, [user]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getImages(folder.name);
      setImages(list.images || list);
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
    } catch {}
  };

  const loadFolders = async () => {
    try {
      const list = await ApiService.getFolders();
      setFolders(list);
    } catch {}
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteImage = (id) => {
    Alert.alert("Delete Image", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await ApiService.deleteImage(id);
          loadImages();
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
      loadImages();
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = async (imageId, isFav) => {
    try {
      if (isFav) await ApiService.removeFavorite(imageId);
      else await ApiService.addFavorite(imageId);
      loadFavorites();
    } catch (err) {
      showNotif(err.message);
    }
  };

  const handleMoveToFolder = async (targetFolder) => {
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await ApiService.moveImageToFolder(id, targetFolder.name);
      }
      setSelectedIds(new Set());
      setShowMoveModal(false);
      showNotif(`Moved to "${targetFolder.name}"`, "success");
      loadImages();
    } catch (err) {
      showNotif(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const isFav = (imageId) => favorites.some(f => f.id === imageId);

  return (
    <View style={styles.container}>
      <Toast message={notif?.message} type={notif?.type} visible={!!notif} onHide={() => setNotif(null)} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => setShowDownloadModal(true)}>
          <Text style={styles.downloadBtnText}>⬇</Text>
        </TouchableOpacity>
      </View>

      {/* Bulk bar */}
      {selectedIds.size > 0 ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkText}>{selectedIds.size} selected</Text>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => { loadFolders(); setShowMoveModal(true); }}>
            <Text style={styles.bulkBtnText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={clearSelection}>
            <Text style={styles.bulkBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
      ) : (
        <FlatList
          data={images}
          renderItem={({ item, index }) => (
            <ImageCard
              image={item}
              isFav={isFav(item.id)}
              isSelected={selectedIds.has(item.id)}
              canEditDelete={canEditDelete}
              formatPrice={formatPrice}
              formatEventDate={formatEventDate}
              onPress={() => goToLightbox(images, index)}
              onToggleFav={toggleFav}
              onSelect={toggleSelect}
              onEdit={handleEditImage}
              onDelete={handleDeleteImage}
            />
          )}
          keyExtractor={item => item.id?.toString()}
          numColumns={gridColumns}
          key={`fs-${gridColumns}`}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            canUpload ? (
              <TouchableOpacity style={styles.uploadBox} onPress={() => setShowUpload(true)}>
                <Text style={styles.uploadBoxIcon}>+</Text>
                <Text style={styles.uploadBoxText}>Upload Image</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No images in this folder.</Text>
            </View>
          }
        />
      )}

      {/* Upload Modal */}
      <UploadModal visible={showUpload} onClose={() => setShowUpload(false)}
        folderName={folder.name} onUploadComplete={loadImages} />

      {/* Edit Image Modal */}
      <EditImageModal visible={showEditModal} onClose={() => { setShowEditModal(false); setEditingImage(null); }}
        image={editingImage} onSave={handleSaveEdit} saving={loading} />

      {/* Download Modal */}
      <DownloadModal visible={showDownloadModal} onClose={() => setShowDownloadModal(false)}
        folder={folder} />

      {/* Move Modal */}
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

      {/* Lightbox */}
      <Modal visible={lightboxImages.length > 0} transparent animationType="fade" onRequestClose={() => setLightboxImages([])}>
        <View style={styles.lbOverlay}>
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
              <Text style={styles.lbNoImg}>Not available</Text>
            )}
          </View>

          {lightboxImages[lightboxIdx] ? (
            <View style={styles.lbInfo}>
              <View style={styles.lbInfoRow}>
                <Text style={styles.lbTitle}>{lightboxImages[lightboxIdx].image_data?.designName || "Untitled"}</Text>
                <TouchableOpacity style={styles.lbFavBtn}
                  onPress={() => toggleFav(lightboxImages[lightboxIdx].id, isFav(lightboxImages[lightboxIdx].id))}>
                  <Text style={styles.lbFavBtnText}>{isFav(lightboxImages[lightboxIdx].id) ? "★" : "☆"}</Text>
                </TouchableOpacity>
              </View>
              {(() => {
                const d = lightboxImages[lightboxIdx].image_data || {};
                const lines = [];
                if (d.decorType) lines.push(`Decor: ${d.decorType}`);
                if (d.eventType) lines.push(`Event: ${d.eventType}`);
                const sz = d.sizeDisplay || [d.sizeWidth, d.sizeLength, d.sizeHeight].filter(Boolean).join("×") + (d.sizeUnit ? ` ${d.sizeUnit}` : "");
                if (sz) lines.push(`Size: ${sz}`);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  backBtnText: { fontSize: 18, color: "#374151", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  downloadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  downloadBtnText: { fontSize: 16 },
  // Bulk
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
  // Upload box
  uploadBox: {
    width: "100%", paddingVertical: 32, borderRadius: 14,
    borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed",
    alignItems: "center", marginBottom: CARD_GAP, backgroundColor: "#f9fafb",
  },
  uploadBoxIcon: { fontSize: 36, color: "#9ca3af", marginBottom: 4 },
  uploadBoxText: { fontSize: 14, fontWeight: "500", color: "#9ca3af" },
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
  moveItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  moveItemName: { fontSize: 15, color: "#1a1a1a", fontWeight: "500" },
  // Lightbox
  lbOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
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

export default FolderScreen;