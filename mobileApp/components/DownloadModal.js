import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Platform,
} from "react-native";
import RNFS from "react-native-fs";
import ApiService from "../services/apiService";
import offlineStorage from "../offline/offlineStorage";

function DownloadModal({ visible, onClose, folder, imageId }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadPath, setDownloadPath] = useState("");
  const [type, setType] = useState(folder ? "folder" : imageId ? "single" : "all");

  useEffect(() => {
    if (visible) {
      setType(folder ? "folder" : imageId ? "single" : "all");
      loadDownloadPath();
    }
  }, [visible, folder, imageId]);

  const loadDownloadPath = async () => {
    const saved = await offlineStorage.getDownloadPath();
    setDownloadPath(saved || RNFS.DownloadDirectoryPath || RNFS.DocumentDirectoryPath);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (type === "single" && imageId) {
        const blob = await ApiService.downloadImage(imageId);
        const fileName = `image_${imageId}_${Date.now()}.jpg`;
        const filePath = `${downloadPath}/${fileName}`;
        await RNFS.writeFile(filePath, blob, "base64");
        Alert.alert("Downloaded", `Saved to ${filePath}`);
      } else if (type === "folder" && folder) {
        const blob = await ApiService.downloadFolder(folder.name);
        const safeName = folder.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
        const filePath = `${downloadPath}/${safeName}.zip`;
        await RNFS.writeFile(filePath, blob, "base64");
        Alert.alert("Downloaded", `Folder saved to ${filePath}`);
      } else {
        const blob = await ApiService.downloadAllImages();
        const filePath = `${downloadPath}/all_images_${Date.now()}.zip`;
        await RNFS.writeFile(filePath, blob, "base64");
        Alert.alert("Downloaded", `Saved to ${filePath}`);
      }
      onClose();
    } catch (err) {
      Alert.alert("Download failed", err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Download</Text>
          <Text style={styles.desc}>
            {type === "single" ? "Download this image" :
             type === "folder" ? `Download folder "${folder?.name}" as ZIP` :
             "Download all images as ZIP"}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} disabled={downloading}>
              <Text style={styles.downloadText}>{downloading ? "Downloading..." : "Download"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  desc: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  actions: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  downloadBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff6b8a", alignItems: "center" },
  downloadText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});

export default DownloadModal;