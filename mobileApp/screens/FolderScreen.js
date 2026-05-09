import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, Dimensions, Platform,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import ImageMeta from "../components/ImageMeta";
import { UPLOAD_ROLES } from "../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;

function FolderScreen({ route, navigation }) {
  const { folder, imageBaseUrl } = route.params;
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favoritesSet, setFavoritesSet] = useState(new Set());
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  useEffect(() => {
    const init = async () => {
      const u = await offlineStorage.getUser();
      setUser(u);
    };
    init();
  }, []);

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
      try {
        const favList = await ApiService.getFavorites();
        setFavoritesSet(new Set(favList.map(f => f.id)));
      } catch (err) {
        console.error("Failed to load favorites:", err);
      }
    };
    loadData();
  }, [user, folder.name]);

  const toggleFavorite = async (imageId) => {
    try {
      if (favoritesSet.has(imageId)) {
        await ApiService.removeFavorite(imageId);
        setFavoritesSet(prev => { const n = new Set(prev); n.delete(imageId); return n; });
      } else {
        await ApiService.addFavorite(imageId);
        setFavoritesSet(prev => new Set([...prev, imageId]));
      }
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
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

  const getImgUrl = (img) => img?.image_data?.imageUrl ? `${imageBaseUrl}${img.image_data.imageUrl}` : "";

  const renderItem = ({ item }) => {
    const imgUrl = getImgUrl(item);
    const isFav = favoritesSet.has(item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.favBtnText, isFav && styles.favBtnActive]}>
            {isFav ? "★" : "☆"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setLightboxImage({ url: imgUrl, data: item.image_data, id: item.id })} activeOpacity={0.9}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.cardImg} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImg, styles.cardPlaceholder]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.image_data?.designName || "Untitled"}
          </Text>
          <ImageMeta data={item.image_data} />
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
      <View style={styles.header}>
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
          <View style={styles.modalHeader}>
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
      <Modal visible={!!lightboxImage} transparent animationType="fade" onRequestClose={() => setLightboxImage(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}>
            <Text style={styles.lightboxCloseText}>X</Text>
          </TouchableOpacity>
          {lightboxImage?.id && (
            <TouchableOpacity style={styles.lightboxFav} onPress={() => toggleFavorite(lightboxImage.id)}>
              <Text style={[styles.lightboxFavText, favoritesSet.has(lightboxImage.id) && styles.lightboxFavActive]}>
                {favoritesSet.has(lightboxImage.id) ? "★" : "☆"}
              </Text>
            </TouchableOpacity>
          )}
          {lightboxImage?.url ? (
            <Image source={{ uri: lightboxImage.url }} style={styles.lightboxImg} resizeMode="contain" />
          ) : (
            <View style={styles.center}><Text style={styles.emptyText}>Not available</Text></View>
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
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, paddingTop: Platform.OS === "ios" ? 50 : 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  backBtnText: { fontSize: 18, color: "#374151", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 },
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
    width: cardWidth, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: "relative",
  },
  favBtn: { position: "absolute", top: 8, right: 8, zIndex: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center" },
  favBtnText: { fontSize: 18, color: "#d1d5db" },
  favBtnActive: { color: "#f59e0b" },
  cardImg: { width: "100%", height: cardWidth * 0.75 },
  cardPlaceholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  deleteBtn: { marginTop: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: "#fef2f2", alignItems: "center" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  // Upload Modal
  uploadModal: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: Platform.OS === "ios" ? 50 : 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
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
  lightboxClose: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, right: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxFav: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, left: 20, zIndex: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  lightboxFavText: { fontSize: 20, color: "#d1d5db" },
  lightboxFavActive: { color: "#f59e0b" },
  lightboxImg: { width: "90%", height: "60%" },
  lightboxInfo: { position: "absolute", bottom: 40, left: 20, right: 20, backgroundColor: "rgba(0,0,0,0.7)", padding: 16, borderRadius: 12 },
  lightboxTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
});

export default FolderScreen;
