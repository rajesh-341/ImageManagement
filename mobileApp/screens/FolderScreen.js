import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, useWindowDimensions,
  PanResponder, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary } from "react-native-image-picker";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import offlineManager from "../offline/offlineManager";
import { UPLOAD_ROLES } from "../utils/constants";

const CARD_GAP = 12;

function FolderScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
  const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;
  const { folder, imageBaseUrl } = route.params;
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const imagesRef = useRef([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      const u = await offlineStorage.getUser();
      setUser(u);
      const isOff = await offlineStorage.isOfflineMode();
      setOfflineMode(isOff);
      loadFavouriteIds();
    };
    init();
  }, []);

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

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const list = await ApiService.getImages(folder.name);
        setImages(list);
      } catch (err) {
        Alert.alert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, folder.name]);

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

  const reloadImages = async () => {
    setLoading(true);
    try {
      const list = await ApiService.getImages(folder.name);
      setImages(list);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) { Alert.alert("Error", "Please select an image"); return; }
    setLoading(true);
    setUploadProgress("Uploading...");
    try {
      const uploadResult = await ApiService.uploadFile(
        { uri: selectedImage.uri, type: selectedImage.type, fileName: selectedImage.fileName },
        folder.name
      );
      await ApiService.uploadImage({ folderName: folder.name, imageUrl: uploadResult.imageUrl });
      setUploadProgress("Uploaded!");
      setSelectedImage(null); setImagePreview("");
      setTimeout(() => { setShowUploadModal(false); setUploadProgress(""); reloadImages(); }, 1500);
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Delete this image?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await ApiService.deleteImage(id); reloadImages(); }
        catch (err) { Alert.alert("Error", err.message); }
      }},
    ]);
  };

  const canUpload = user && UPLOAD_ROLES.map(r => r.toLowerCase()).includes(user.role?.toLowerCase());

  const getImgUrl = (img) => {
    const url = img?.image_data?.imageUrl;
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${imageBaseUrl}${url}`;
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

  const renderItem = ({ item, index }) => {
    const imgUrl = offlineMode ? getEffectiveImgUrl(item) : getImgUrl(item);
    const isFav = favouriteIds.has(item.id);

    return (
      <View style={[styles.card, { width: cardWidth }]}>
        <TouchableOpacity onPress={() => { imagesRef.current = images; setLightboxIndex(index); setLightboxVisible(true); }} activeOpacity={0.9}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={[styles.cardImg, { height: cardWidth * 0.75 }]} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImg, styles.cardPlaceholder, { height: cardWidth * 0.75 }]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.favToggleOnCard} onPress={() => handleToggleFavourite(item.id)}>
          <Text style={[styles.favToggleText, isFav && styles.favToggleTextActive]}>
            {isFav ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.image_data?.designName || "Untitled"}
          </Text>
          {canUpload && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#ff6b8a" /></View>
      ) : !canUpload && images.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>No images in this folder.</Text></View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={item => item.id?.toString()}
          numColumns={numColumns}
          key={`img-${numColumns}`}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            canUpload ? (
              <TouchableOpacity style={styles.uploadBox} onPress={() => setShowUploadModal(true)}>
                <Text style={styles.uploadBoxIcon}>+</Text>
                <Text style={styles.uploadBoxText}>Upload Image</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.uploadModal}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Upload to {folder.name}</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.uploadForm}>
            <TouchableOpacity style={styles.pickerBtn} onPress={handleImageSelect}>
              {imagePreview ? (
                <Image source={{ uri: imagePreview }} style={styles.preview} />
              ) : (
                <View style={styles.pickPlaceholder}>
                  <Text style={styles.pickText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>
            {uploadProgress ? <Text style={styles.progress}>{uploadProgress}</Text> : null}
            <TouchableOpacity style={[styles.primaryBtn, styles.fullBtn]} onPress={handleUpload} disabled={loading}>
              <Text style={styles.primaryBtnText}>{loading ? "Uploading..." : "Upload"}</Text>
            </TouchableOpacity>
          </View>
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
              <Image source={{ uri: currentLightboxImage.url }} style={styles.lightboxImg} resizeMode="contain" />
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
              <View style={[styles.lbCounter, { top: insets.top + 10 }]}>
                <Text style={styles.lbCounterText}>{lightboxIndex + 1} / {imagesRef.current.length}</Text>
              </View>
            </>
          ) : (
            <View style={styles.center}><Text style={styles.emptyText}>Not available</Text></View>
          )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  backBtnText: { fontSize: 16, color: "#374151", fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
  grid: { paddingHorizontal: CARD_GAP, paddingBottom: 24 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  // Upload Box
  uploadBox: {
    width: "100%", paddingVertical: 32, borderRadius: 14,
    borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed",
    alignItems: "center", marginBottom: CARD_GAP, backgroundColor: "#f9fafb",
  },
  uploadBoxIcon: { fontSize: 36, color: "#9ca3af", marginBottom: 4 },
  uploadBoxText: { fontSize: 14, fontWeight: "500", color: "#9ca3af" },
  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 10, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)", elevation: 2, position: "relative",
  },
  cardImg: { width: "100%" },
  cardPlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 13 },
  cardContent: { padding: 8 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  deleteBtn: { marginTop: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: "#fef2f2", alignItems: "center" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  favToggleOnCard: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  favToggleText: { fontSize: 18, color: "#9ca3af" },
  favToggleTextActive: { color: "#ef4444" },
  // Upload Modal
  uploadModal: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  modalClose: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  uploadForm: { flex: 1, padding: 16 },
  pickerBtn: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  preview: { width: "100%", height: 200, borderRadius: 12 },
  pickPlaceholder: { width: "100%", height: 150, borderRadius: 12, borderWidth: 2, borderColor: "#d1d5db", borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  pickText: { fontSize: 14, color: "#9ca3af" },
  progress: { textAlign: "center", color: "#22c55e", fontSize: 14, fontWeight: "500", marginBottom: 12 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: "#ff6b8a", alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  fullBtn: { marginTop: "auto", marginBottom: 32 },
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
});

export default FolderScreen;
