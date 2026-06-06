import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, Image, Alert, Platform,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import ColorPicker from "./ColorPicker";
import AutocompleteInput from "./AutocompleteInput";
import { EVENT_TYPES, DECOR_TYPES, FLOWER_TYPES, SIZE_UNITS, UPLOAD_ROLES } from "../utils/constants";
import ApiService from "../services/apiService";

function UploadModal({ visible, onClose, folderName: initialFolder, onUploadComplete }) {
  const [tab, setTab] = useState("single");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [folderName, setFolderName] = useState(initialFolder || "");
  const [data, setData] = useState({
    designName: "",
    eventType: "",
    decorType: "",
    sizeWidth: "",
    sizeLength: "",
    sizeHeight: "",
    sizeUnit: "sq.ft",
    colourCombination: [],
    flowerType: "",
    priceMin: "",
    priceMax: "",
    venueCustomer: "",
    venueName: "",
    venueDate: "",
  });
  const [batchImages, setBatchImages] = useState([]);

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

  const resetForm = () => {
    setSelectedImage(null);
    setImagePreview("");
    setData({
      designName: "", eventType: "", decorType: "",
      sizeWidth: "", sizeLength: "", sizeHeight: "",
      sizeUnit: "sq.ft", colourCombination: [],
      flowerType: "", priceMin: "", priceMax: "",
      venueCustomer: "", venueName: "", venueDate: "",
    });
    setBatchImages([]);
    setProgress("");
  };

  const handleUploadSingle = async () => {
    if (!selectedImage) { Alert.alert("Error", "Please select an image"); return; }
    if (!data.designName.trim() && !data.venueCustomer.trim()) {
      Alert.alert("Error", "Please enter at least a design name or customer name");
      return;
    }
    setUploading(true);
    setProgress("Uploading...");
    try {
      const uploadResult = await ApiService.uploadFile(
        { uri: selectedImage.uri, type: selectedImage.type, fileName: selectedImage.fileName },
        folderName
      );
      await ApiService.uploadImage({
        folderName: folderName || "General",
        imageUrl: uploadResult.imageUrl,
        designName: data.designName,
        eventType: data.eventType,
        decorType: data.decorType,
        sizeWidth: data.sizeWidth,
        sizeLength: data.sizeLength,
        sizeHeight: data.sizeHeight,
        sizeUnit: data.sizeUnit,
        colourCombination: data.colourCombination,
        flowerType: data.flowerType,
        priceMin: data.priceMin ? Number(data.priceMin) : null,
        priceMax: data.priceMax ? Number(data.priceMax) : null,
        venueCustomer: data.venueCustomer,
        venueName: data.venueName,
        venueDate: data.venueDate,
      });
      setProgress("Uploaded successfully!");
      setTimeout(() => {
        resetForm();
        onClose();
        if (onUploadComplete) onUploadComplete();
      }, 1500);
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddBatchImages = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 0 }, (res) => {
      if (res.didCancel) return;
      if (res.assets) {
        const totalAfterAdd = batchImages.length + res.assets.length;
        if (totalAfterAdd > 100) {
          Alert.alert("Limit Reached", `Maximum 100 images per batch. You can add ${100 - batchImages.length} more.`);
          return;
        }
        setBatchImages(prev => [...prev, ...res.assets.map(f => ({
          file: f,
          preview: f.uri,
          designName: "",
          eventType: "",
          decorType: "",
          sizeWidth: "",
          sizeLength: "",
          sizeHeight: "",
          sizeUnit: "sq.ft",
          colourCombination: [],
          flowerType: "",
          priceMin: "",
          priceMax: "",
        }))]);
      }
    });
  };

  const handleBatchUpload = async () => {
    if (batchImages.length === 0) { Alert.alert("Error", "Add at least one image"); return; }
    setUploading(true);
    let success = 0, errors = 0;
    for (let i = 0; i < batchImages.length; i++) {
      try {
        const row = batchImages[i];
        const uploadResult = await ApiService.uploadFile(
          { uri: row.file.uri, type: row.file.type, fileName: row.file.fileName },
          folderName
        );
        await ApiService.uploadImage({
          folderName: folderName || "General",
          imageUrl: uploadResult.imageUrl,
          designName: row.designName,
          eventType: row.eventType,
          decorType: row.decorType,
          sizeWidth: row.sizeWidth,
          sizeLength: row.sizeLength,
          sizeHeight: row.sizeHeight,
          sizeUnit: row.sizeUnit,
          colourCombination: row.colourCombination,
          flowerType: row.flowerType,
          priceMin: row.priceMin ? Number(row.priceMin) : null,
          priceMax: row.priceMax ? Number(row.priceMax) : null,
        });
        success++;
      } catch { errors++; }
    }
    Alert.alert("Upload Complete", `${success} uploaded, ${errors} failed`);
    resetForm();
    onClose();
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Images</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>×</Text></TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {["single", "batch"].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "single" ? "Single Image" : "Batch Upload"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Folder Name (optional)</Text>
          <TextInput style={styles.input} value={folderName}
            onChangeText={setFolderName} placeholder="e.g. Customer_Venue_Date" />

          {tab === "single" ? (
            <>
              <TouchableOpacity style={styles.pickerBtn} onPress={handleImageSelect}>
                {imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.preview} />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Text style={styles.placeholderText}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Design Name *</Text>
              <TextInput style={styles.input} value={data.designName}
                onChangeText={t => setData({...data, designName: t})} placeholder="Enter design name" />

              <Text style={styles.label}>Event Type</Text>
              <AutocompleteInput options={EVENT_TYPES} value={data.eventType}
                onChange={v => setData({...data, eventType: v})} placeholder="Select event type" />

              <Text style={styles.label}>Decoration Type</Text>
              <AutocompleteInput options={DECOR_TYPES} value={data.decorType}
                onChange={v => setData({...data, decorType: v})} placeholder="Select decor type" />

              <Text style={styles.label}>Size (W x L x H)</Text>
              <View style={styles.sizeRow}>
                <TextInput style={[styles.input, styles.sizeInp]} value={data.sizeWidth}
                  onChangeText={t => setData({...data, sizeWidth: t})} placeholder="W" keyboardType="numeric" />
                <Text style={styles.sizeSep}>×</Text>
                <TextInput style={[styles.input, styles.sizeInp]} value={data.sizeLength}
                  onChangeText={t => setData({...data, sizeLength: t})} placeholder="L" keyboardType="numeric" />
                <Text style={styles.sizeSep}>×</Text>
                <TextInput style={[styles.input, styles.sizeInp]} value={data.sizeHeight}
                  onChangeText={t => setData({...data, sizeHeight: t})} placeholder="H" keyboardType="numeric" />
              </View>

              <Text style={styles.label}>Size Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {SIZE_UNITS.map(u => (
                  <TouchableOpacity key={u} style={[styles.chip, data.sizeUnit === u && styles.chipActive]}
                    onPress={() => setData({...data, sizeUnit: u})}>
                    <Text style={[styles.chipText, data.sizeUnit === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ColorPicker selectedColors={data.colourCombination}
                onChange={colors => setData({...data, colourCombination: colors})} label="Colours" />

              <Text style={styles.label}>Flower Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {FLOWER_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, data.flowerType === t && styles.chipActive]}
                    onPress={() => setData({...data, flowerType: t})}>
                    <Text style={[styles.chipText, data.flowerType === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Price Range</Text>
              <View style={styles.priceRow}>
                <TextInput style={[styles.input, styles.half]} value={data.priceMin}
                  onChangeText={t => setData({...data, priceMin: t})} placeholder="Min" keyboardType="numeric" />
                <Text style={styles.priceSep}>-</Text>
                <TextInput style={[styles.input, styles.half]} value={data.priceMax}
                  onChangeText={t => setData({...data, priceMax: t})} placeholder="Max" keyboardType="numeric" />
              </View>

              <Text style={styles.label}>Venue / Customer</Text>
              <TextInput style={styles.input} value={data.venueCustomer}
                onChangeText={t => setData({...data, venueCustomer: t})} placeholder="Customer name" />

              <Text style={styles.label}>Venue Name</Text>
              <TextInput style={styles.input} value={data.venueName}
                onChangeText={t => setData({...data, venueName: t})} placeholder="Venue name" />

              <Text style={styles.label}>Venue Date</Text>
              <TextInput style={styles.input} value={data.venueDate}
                onChangeText={t => setData({...data, venueDate: t})} placeholder="YYYY-MM-DD" />

              {progress ? <Text style={styles.progress}>{progress}</Text> : null}

              <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadSingle} disabled={uploading}>
                <Text style={styles.uploadBtnText}>{uploading ? "Uploading..." : "Upload Image"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.batchSection}>
              <TouchableOpacity style={styles.addBatchBtn} onPress={handleAddBatchImages}>
                <Text style={styles.addBatchBtnText}>+ Add Images</Text>
              </TouchableOpacity>
              {batchImages.map((row, i) => (
                <View key={i} style={styles.batchRow}>
                  {row.preview ? <Image source={{ uri: row.preview }} style={styles.batchThumb} /> : null}
                  <View style={styles.batchFields}>
                    <TextInput style={styles.batchInput} value={row.designName}
                      onChangeText={t => { const u = [...batchImages]; u[i] = {...u[i], designName: t}; setBatchImages(u); }}
                      placeholder="Design name" />
                  </View>
                  <TouchableOpacity onPress={() => setBatchImages(prev => prev.filter((_, idx) => idx !== i))}>
                    <Text style={styles.removeBtn}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {batchImages.length > 0 ? (
                <TouchableOpacity style={styles.uploadBtn} onPress={handleBatchUpload} disabled={uploading}>
                  <Text style={styles.uploadBtnText}>{uploading ? "Uploading..." : `Upload ${batchImages.length} Image(s)`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  close: { fontSize: 24, color: "#6b7280", paddingHorizontal: 8 },
  tabs: { flexDirection: "row", margin: 16, borderRadius: 12, backgroundColor: "#e5e7eb", padding: 3 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#ff6b8a", fontWeight: "600" },
  form: { flex: 1, paddingHorizontal: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  pickerBtn: { borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  preview: { width: "100%", height: 200, borderRadius: 12 },
  placeholderBox: {
    width: "100%", height: 150, borderRadius: 12, borderWidth: 2, borderColor: "#d1d5db",
    borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb",
  },
  placeholderText: { fontSize: 14, color: "#9ca3af" },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sizeInp: { flex: 1, textAlign: "center" },
  sizeSep: { fontSize: 16, color: "#6b7280" },
  chipRow: { flexDirection: "row", marginVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6", marginRight: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  chipText: { fontSize: 12, color: "#6b7280" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  half: { flex: 1 },
  priceSep: { fontSize: 16, color: "#6b7280" },
  progress: { textAlign: "center", color: "#22c55e", fontSize: 14, fontWeight: "500", marginTop: 12 },
  uploadBtn: {
    marginTop: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#ff6b8a", alignItems: "center",
  },
  uploadBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  batchSection: { paddingBottom: 32 },
  addBatchBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", alignSelf: "flex-start", marginBottom: 12 },
  addBatchBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  batchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: "#fff", padding: 8, borderRadius: 10 },
  batchThumb: { width: 40, height: 40, borderRadius: 6 },
  batchFields: { flex: 1 },
  batchInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 6, fontSize: 13 },
  removeBtn: { fontSize: 20, color: "#ef4444", fontWeight: "700", paddingHorizontal: 8 },
});

export default UploadModal;