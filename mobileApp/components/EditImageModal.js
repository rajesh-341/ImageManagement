import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, Platform, Alert,
} from "react-native";
import ColorPicker from "./ColorPicker";
import AutocompleteInput from "./AutocompleteInput";
import { DECOR_TYPES, EVENT_TYPES, FLOWER_TYPES, SIZE_UNITS } from "../utils/constants";

function EditImageModal({ visible, onClose, image, onSave, saving }) {
  const [data, setData] = useState({});

  useEffect(() => {
    if (image) {
      const img = image.image_data || {};
      setData({
        designName: img.designName || "",
        eventType: img.eventType || "",
        decorType: img.decorType || "",
        sizeWidth: img.sizeWidth?.toString() || "",
        sizeLength: img.sizeLength?.toString() || "",
        sizeHeight: img.sizeHeight?.toString() || "",
        sizeUnit: img.sizeUnit || "sq.ft",
        colourCombination: img.colourCombination || [],
        flowerType: img.flowerType || "",
        priceMin: img.priceMin?.toString() || "",
        priceMax: img.priceMax?.toString() || "",
        venueCustomer: img.venueCustomer || "",
        venueName: img.venueName || "",
        venueDate: img.venueDate || "",
      });
    }
  }, [image]);

  const handleSave = () => {
    if (!data.designName.trim()) {
      Alert.alert("Error", "Design name is required");
      return;
    }
    onSave(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Image</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
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
            <TextInput style={[styles.input, styles.sizeInput]} value={data.sizeWidth}
              onChangeText={t => setData({...data, sizeWidth: t})} placeholder="W" keyboardType="numeric" />
            <Text style={styles.sizeSep}>×</Text>
            <TextInput style={[styles.input, styles.sizeInput]} value={data.sizeLength}
              onChangeText={t => setData({...data, sizeLength: t})} placeholder="L" keyboardType="numeric" />
            <Text style={styles.sizeSep}>×</Text>
            <TextInput style={[styles.input, styles.sizeInput]} value={data.sizeHeight}
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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
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
  form: { flex: 1, padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    padding: Platform.OS === "ios" ? 12 : 8, fontSize: 14, color: "#1a1a1a",
    backgroundColor: "#f9fafb",
  },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sizeInput: { flex: 1, textAlign: "center" },
  sizeSep: { fontSize: 16, color: "#6b7280" },
  chipRow: { flexDirection: "row", marginVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f3f4f6", marginRight: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  chipText: { fontSize: 12, color: "#6b7280" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  half: { flex: 1 },
  priceSep: { fontSize: 16, color: "#6b7280" },
  footer: {
    flexDirection: "row", gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff",
  },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#ff6b8a", alignItems: "center" },
  saveText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});

export default EditImageModal;