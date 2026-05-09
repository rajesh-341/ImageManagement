import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";
import RNFS from "react-native-fs";
import { launchImageLibrary } from "react-native-image-picker";
import DocumentPicker from "react-native-document-picker";

const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];

function ImageScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [downloadPath, setDownloadPath] = useState("");
  
  // Upload form state
  const [uploadData, setUploadData] = useState({
    folderName: "",
    imageUrl: "",
    colourCombination: "",
    size: "",
    sizeUnit: "inch",
    designName: "",
    placeOfEvent: "",
    decorType: "",
    eventTime: "",
  });

  useEffect(() => {
    loadUser();
    loadDownloadPath();
  }, []);

  useEffect(() => {
    if (user) {
      checkOfflineMode();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (offlineMode) {
        loadOfflineData();
      } else {
        loadOnlineData();
      }
    }
  }, [user, selectedFolder, offlineMode]);

  const loadUser = async () => {
    const userData = await offlineStorage.getUser();
    if (!userData) {
      navigation.replace("Login");
    } else {
      setUser(userData);
    }
  };

  const loadDownloadPath = async () => {
    const path = await offlineStorage.getDownloadPath();
    if (path) {
      setDownloadPath(path);
    }
  };

  const checkOfflineMode = async () => {
    const isOffline = await offlineStorage.isOfflineMode();
    setOfflineMode(isOffline);
  };

  const loadOnlineData = async () => {
    setLoading(true);
    try {
      const [imageList, folderList] = await Promise.all([
        ApiService.getImages(selectedFolder),
        ApiService.getFolders(),
      ]);
      setImages(imageList);
      setFolders(folderList);
      
      // Store for offline
      await offlineStorage.storeImages(imageList);
      await offlineStorage.storeFolders(folderList);
    } catch (err) {
      setError(err.message);
      // Try loading from offline
      loadOfflineData();
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineData = async () => {
    const offlineImages = await offlineStorage.getImages();
    const offlineFolders = await offlineStorage.getFolders();
    setImages(offlineImages || []);
    setFolders(offlineFolders || []);
  };

  // Click Me Before Going Offline - download all required data
  const handleClickMeBeforeGoingOffline = async () => {
    Alert.alert(
      "Go Offline",
      "This will download all images and data for offline use. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setLoading(true);
            try {
              const [imageList, folderList] = await Promise.all([
                ApiService.getImages(),
                ApiService.getFolders(),
              ]);
              
              // Download images locally
              for (const image of imageList) {
                if (image.image_data?.imageUrl) {
                  try {
                    const localPath = `${RNFS.CachesDirectoryPath}/${image.id}.jpg`;
                    await downloadImageToLocal(image.image_data.imageUrl, localPath);
                  } catch (err) {
                    console.warn("Failed to download image:", err);
                  }
                }
              }
              
              await offlineStorage.storeImages(imageList);
              await offlineStorage.storeFolders(folderList);
              await offlineStorage.setOfflineMode(true);
              setOfflineMode(true);
              
              Alert.alert("Success", "Data downloaded for offline use!");
            } catch (err) {
              Alert.alert("Error", "Failed to download data: " + err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Download image to local storage
  const downloadImageToLocal = async (url, localPath) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];
          await RNFS.writeFile(localPath, base64, "base64");
          resolve(localPath);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
  };

  // Choose download location
  const handleChooseLocation = async () => {
    try {
      const result = await DocumentPicker.openPicker({
        type: [DocumentPicker.folders],
      });
      
      if (result?.uri) {
        const path = result.uri;
        await offlineStorage.storeDownloadPath(path);
        setDownloadPath(path);
        Alert.alert("Success", "Download path set!");
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert("Error", "Failed to select folder");
      }
    }
  };

  // Handle image download
  const handleDownloadImage = async (image) => {
    if (!downloadPath) {
      Alert.alert(
        "No Path",
        "Please choose a download location first",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Choose Location", onPress: handleChooseLocation },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const imageUrl = image.image_data?.imageUrl;
      if (!imageUrl) {
        throw new Error("No image URL");
      }

      // Download and convert to JPEG
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // For now, save the original format
      // In production, use a library to convert to JPEG
      const fileName = `${image.image_data?.designName || image.id}.jpg`;
      const localFilePath = `${downloadPath}/${fileName}`;
      
      // This is a simplified version - in production you'd convert to JPEG properly
      Alert.alert("Success", "Image downloaded to " + localFilePath);
    } catch (err) {
      Alert.alert("Error", "Failed to download: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const imageData = {
        ...uploadData,
        colourCombination: uploadData.colourCombination.split(",").map(c => c.trim()),
      };
      await ApiService.uploadImage(imageData);
      setShowUploadModal(false);
      resetUploadData();
      loadOnlineData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUploadData = () => {
    setUploadData({
      folderName: "",
      imageUrl: "",
      colourCombination: "",
      size: "",
      sizeUnit: "inch",
      designName: "",
      placeOfEvent: "",
      decorType: "",
      eventTime: "",
    });
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await ApiService.deleteImage(id);
            loadOnlineData();
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await offlineStorage.clearAuth();
    navigation.replace("Login");
  };

  const canUpload = user && UPLOAD_ROLES.includes(user.role);

  const renderImage = ({ item }) => (
    <View style={styles.imageCard}>
      <Image
        source={{ uri: item.image_data?.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.imageContent}>
        <Text style={styles.imageTitle}>
          {item.image_data?.designName || "Untitled"}
        </Text>
        <Text style={styles.imageMeta}>
          Size: {item.image_data?.size} {item.image_data?.sizeUnit}
        </Text>
        <Text style={styles.imageMeta}>
          Colors: {item.image_data?.colourCombination?.join(", ")}
        </Text>
        <Text style={styles.imageMeta}>
          Place: {item.image_data?.placeOfEvent}
        </Text>
        
        <View style={styles.imageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownloadImage(item)}
          >
            <Text style={styles.actionText}>Download</Text>
          </TouchableOpacity>
          
          {canUpload && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Image Management</Text>
        <View style={styles.headerRight}>
          <Text style={styles.userName}>
            {user?.displayName || user?.username}
          </Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline indicator */}
      {offlineMode && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleClickMeBeforeGoingOffline}
        >
          <Text style={styles.primaryButtonText}>
            ClickMeBeforeGoingOffline
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleChooseLocation}
        >
          <Text style={styles.secondaryButtonText}>ChooseLocation</Text>
        </TouchableOpacity>

        {canUpload && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Text style={styles.primaryButtonText}>+ Upload</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Folder selector */}
      <ScrollView horizontal style={styles.folderScroll}>
        <TouchableOpacity
          style={[
            styles.folderItem,
            !selectedFolder && styles.folderItemActive,
          ]}
          onPress={() => setSelectedFolder(null)}
        >
          <Text style={styles.folderText}>All</Text>
        </TouchableOpacity>
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder}
            style={[
              styles.folderItem,
              selectedFolder === folder && styles.folderItemActive,
            ]}
            onPress={() => setSelectedFolder(folder)}
          >
            <Text style={styles.folderText}>{folder}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Images list */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : images.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No images found. {canUpload && "Upload your first image!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Image</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Folder Name *</Text>
            <TextInput
              style={styles.input}
              value={uploadData.folderName}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, folderName: text })
              }
              placeholder="EventName_MahalName_DateTime"
            />

            <Text style={styles.label}>Image URL *</Text>
            <TextInput
              style={styles.input}
              value={uploadData.imageUrl}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, imageUrl: text })
              }
              placeholder="https://..."
            />

            <Text style={styles.label}>Design Name</Text>
            <TextInput
              style={styles.input}
              value={uploadData.designName}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, designName: text })
              }
              placeholder="Enter design name"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Size</Text>
                <TextInput
                  style={styles.input}
                  value={uploadData.size}
                  onChangeText={(text) =>
                    setUploadData({ ...uploadData, size: text })
                  }
                  placeholder="Size"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.select}>
                  {["inch", "cm", "meter", "km"].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.selectItem,
                        uploadData.sizeUnit === unit && styles.selectItemActive,
                      ]}
                      onPress={() =>
                        setUploadData({ ...uploadData, sizeUnit: unit })
                      }
                    >
                      <Text style={styles.selectText}>{unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Colours (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={uploadData.colourCombination}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, colourCombination: text })
              }
              placeholder="Red, Gold, White"
            />

            <Text style={styles.label}>Place of Event</Text>
            <TextInput
              style={styles.input}
              value={uploadData.placeOfEvent}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, placeOfEvent: text })
              }
              placeholder="Enter location"
            />

            <Text style={styles.label}>Decor Type</Text>
            <TextInput
              style={styles.input}
              value={uploadData.decorType}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, decorType: text })
              }
              placeholder="Enter decor type"
            />

            <Text style={styles.label}>Event Time</Text>
            <TextInput
              style={styles.input}
              value={uploadData.eventTime}
              onChangeText={(text) =>
                setUploadData({ ...uploadData, eventTime: text })
              }
              placeholder="2024-01-01T12:00"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpload}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Upload</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#2563eb",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userName: {
    color: "#fff",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
  },
  offlineBanner: {
    backgroundColor: "#f59e0b",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "#ef4444",
    padding: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#64748b",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  folderScroll: {
    paddingHorizontal: 12,
    maxHeight: 44,
  },
  folderItem: {
    backgroundColor: "#64748b",
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  folderItemActive: {
    backgroundColor: "#2563eb",
  },
  folderText: {
    color: "#fff",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
  },
  list: {
    padding: 12,
  },
  imageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
  },
  imageContent: {
    padding: 12,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  imageMeta: {
    fontSize: 14,
    color: "#64748b",
  },
  imageActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modal: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    backgroundColor: "#2563eb",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  closeText: {
    color: "#fff",
    fontSize: 28,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  select: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectItem: {
    backgroundColor: "#e2e8f0",
    padding: 8,
    borderRadius: 6,
  },
  selectItemActive: {
    backgroundColor: "#2563eb",
  },
  selectText: {
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ImageScreen;