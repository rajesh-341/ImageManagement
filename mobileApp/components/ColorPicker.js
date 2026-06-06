import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from "react-native";

const COLORS_LIST = [
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Brown", hex: "#92400e" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Light Blue", hex: "#93c5fd" },
  { name: "Dark Blue", hex: "#1e40af" },
  { name: "Light Green", hex: "#86efac" },
  { name: "Dark Green", hex: "#166534" },
  { name: "Sky Blue", hex: "#38bdf8" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Olive Green", hex: "#808000" },
  { name: "Beige", hex: "#f5f5dc" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#9ca3af" },
  { name: "Bronze", hex: "#cd7f32" },
  { name: "Copper", hex: "#b87333" },
  { name: "Rose Gold", hex: "#fda4af" },
];

const LIGHT_COLORS = new Set(["White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold","Rose Gold","Gray","Bronze","Copper"]);
const MAX_COLORS = 3;

function ColorPicker({ selectedColors = [], onChange, label = "Color" }) {
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? COLORS_LIST.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : COLORS_LIST;

  const toggleColor = (colorName) => {
    setError("");
    if (selectedColors.includes(colorName)) {
      onChange(selectedColors.filter(c => c !== colorName));
    } else {
      if (selectedColors.length >= MAX_COLORS) {
        setError(`Maximum ${MAX_COLORS} colors allowed`);
        return;
      }
      onChange([...selectedColors, colorName]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search colours..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchesScroll}>
        {filtered.map((color) => {
          const isSelected = selectedColors.includes(color.name);
          const isLight = LIGHT_COLORS.has(color.name);
          return (
            <TouchableOpacity key={color.name} onPress={() => toggleColor(color.name)} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: color.hex }, isSelected && { borderWidth: 2, borderColor: "#ff6b8a" }]}>
                {isSelected ? (
                  <Text style={[styles.check, { color: isLight ? "#374151" : "#fff" }]}>✓</Text>
                ) : null}
              </View>
              <Text style={[styles.swatchName, isSelected && styles.swatchNameSelected]}>{color.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {filtered.length === 0 ? <Text style={styles.noResults}>No colours found</Text> : null}
      {selectedColors.length > 0 ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>Selected: </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedColors.map(cn => (
              <View key={cn} style={[styles.tag, { backgroundColor: COLORS_LIST.find(x => x.name === cn)?.hex || "#ccc" }]}>
                <Text style={[styles.tagText, { color: LIGHT_COLORS.has(cn) ? "#374151" : "#fff" }]}>{cn}</Text>
                <TouchableOpacity onPress={() => toggleColor(cn)}>
                  <Text style={[styles.tagRemove, { color: LIGHT_COLORS.has(cn) ? "#374151" : "#fff" }]}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  error: { color: "#ef4444", fontSize: 12, marginBottom: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  searchInput: {
    flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 8,
    padding: 8, fontSize: 13, color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  clearBtn: { position: "absolute", right: 8, padding: 4 },
  clearBtnText: { fontSize: 18, color: "#6b7280" },
  swatchesScroll: { marginBottom: 6 },
  swatchItem: { alignItems: "center", marginRight: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  check: { fontSize: 16, fontWeight: "700" },
  swatchName: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  swatchNameSelected: { color: "#ff6b8a", fontWeight: "600" },
  noResults: { color: "#9ca3af", fontSize: 12, fontStyle: "italic" },
  selectedRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  selectedLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginRight: 6 },
  tag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6 },
  tagText: { fontSize: 11, fontWeight: "600" },
  tagRemove: { fontSize: 14, marginLeft: 4, fontWeight: "700" },
});

export default ColorPicker;
export { COLORS_LIST };