import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, useWindowDimensions, Platform,
} from "react-native";
import { COLORS, DECOR_TYPES, VENUES, EVENT_TYPES, FLOWER_TYPES } from "../utils/constants";

function FilterSidebar({ visible, onClose, onApply, onClear, filters, onFilterChange }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const [selectedColors, setSelectedColors] = useState(filters?.colors || []);
  const [selectedVenues, setSelectedVenues] = useState(filters?.venues || []);
  const [selectedDecorTypes, setSelectedDecorTypes] = useState(filters?.decorTypes || []);
  const [selectedEventTypes, setSelectedEventTypes] = useState(filters?.eventTypes || []);
  const [selectedFlowerTypes, setSelectedFlowerTypes] = useState(filters?.flowerTypes || []);
  const [priceRange, setPriceRange] = useState(filters?.priceRange || [0, 100000]);
  const [venueFilter, setVenueFilter] = useState(filters?.venueFilter || "");
  const [searchText, setSearchText] = useState(filters?.searchText || "");
  const [decorTypeSearch, setDecorTypeSearch] = useState("");

  const toggleArray = (value, arr, setArr) => {
    setArr(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const handleApply = () => {
    onApply({
      searchText,
      colors: selectedColors,
      venues: selectedVenues,
      venueFilter,
      decorTypes: selectedDecorTypes,
      priceRange,
      eventTypes: selectedEventTypes,
      flowerTypes: selectedFlowerTypes,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedColors([]);
    setSelectedVenues([]);
    setSelectedDecorTypes([]);
    setSelectedEventTypes([]);
    setSelectedFlowerTypes([]);
    setPriceRange([0, 100000]);
    setVenueFilter("");
    setSearchText("");
    onClear();
    onClose();
  };

  const filteredDecorTypes = DECOR_TYPES.filter(t =>
    t.toLowerCase().includes(decorTypeSearch.toLowerCase())
  );

  const chipStyle = (arr, val) => [
    styles.chip,
    arr.includes(val) && styles.chipActive,
  ];
  const chipTextStyle = (arr, val) => [
    styles.chipText,
    arr.includes(val) && styles.chipTextActive,
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={isTablet} onRequestClose={onClose}>
      <View style={[styles.overlay, isTablet && styles.overlayTablet]}>
        <View style={[styles.container, isTablet && styles.containerTablet]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Search */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search</Text>
              <TextInput
                style={styles.input}
                placeholder="Search designs..."
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Event Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Type</Text>
              <View style={styles.chipRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t} style={chipStyle(selectedEventTypes, t)}
                    onPress={() => toggleArray(t, selectedEventTypes, setSelectedEventTypes)}
                  >
                    <Text style={chipTextStyle(selectedEventTypes, t)}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Decor Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Decoration Type</Text>
              <TextInput
                style={styles.input}
                placeholder="Search decoration..."
                value={decorTypeSearch}
                onChangeText={setDecorTypeSearch}
              />
              <View style={styles.chipRow}>
                {filteredDecorTypes.map(t => (
                  <TouchableOpacity
                    key={t} style={chipStyle(selectedDecorTypes, t)}
                    onPress={() => toggleArray(t, selectedDecorTypes, setSelectedDecorTypes)}
                  >
                    <Text style={chipTextStyle(selectedDecorTypes, t)}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Venue */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue / Customer</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer_Venue_Date"
                value={venueFilter}
                onChangeText={setVenueFilter}
              />
              <View style={styles.chipRow}>
                {VENUES.map(v => (
                  <TouchableOpacity
                    key={v} style={chipStyle(selectedVenues, v)}
                    onPress={() => toggleArray(v, selectedVenues, setSelectedVenues)}
                  >
                    <Text style={chipTextStyle(selectedVenues, v)}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Colour */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Colour</Text>
              <View style={styles.chipRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c} style={chipStyle(selectedColors, c)}
                    onPress={() => toggleArray(c, selectedColors, setSelectedColors)}
                  >
                    <Text style={chipTextStyle(selectedColors, c)}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Flower Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flower Type</Text>
              <View style={styles.chipRow}>
                {FLOWER_TYPES.map(t => (
                  <TouchableOpacity
                    key={t} style={chipStyle(selectedFlowerTypes, t)}
                    onPress={() => toggleArray(t, selectedFlowerTypes, setSelectedFlowerTypes)}
                  >
                    <Text style={chipTextStyle(selectedFlowerTypes, t)}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Min"
                  keyboardType="numeric"
                  value={priceRange[0]?.toString()}
                  onChangeText={t => setPriceRange([Number(t) || 0, priceRange[1]])}
                />
                <Text style={styles.priceSep}>-</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Max"
                  keyboardType="numeric"
                  value={priceRange[1]?.toString()}
                  onChangeText={t => setPriceRange([priceRange[0], Number(t) || 0])}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  overlayTablet: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "60%",
  },
  containerTablet: {
    width: 400,
    maxHeight: "80%",
    borderRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  closeBtnText: { fontSize: 18, color: "#6b7280", fontWeight: "600" },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    padding: Platform.OS === "ios" ? 14 : 10, fontSize: 14,
    color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  chipText: { fontSize: 12, color: "#6b7280" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  priceInput: { flex: 1 },
  priceSep: { fontSize: 16, color: "#6b7280" },
  footer: {
    flexDirection: "row", gap: 12,
    padding: 20, borderTopWidth: 1, borderTopColor: "#e5e7eb",
  },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#f3f4f6", alignItems: "center",
  },
  clearBtnText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  applyBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#ff6b8a", alignItems: "center",
  },
  applyBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});

export default FilterSidebar;
