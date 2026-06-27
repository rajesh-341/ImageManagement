import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, useWindowDimensions, Platform,
} from "react-native";
import ApiService from "../services/apiService";
import { COLORS, DECOR_TYPES, VENUES, EVENT_TYPES, FLOWER_TYPES, SIZE_UNITS } from "../utils/constants";

const SUGGESTION_DELAY = 300;

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

  const [designName, setDesignName] = useState(filters?.designName || "");
  const [designNameSuggestions, setDesignNameSuggestions] = useState([]);
  const [showDesignNameSugs, setShowDesignNameSugs] = useState(false);
  const designNameSugTimer = useRef(null);
  const designNameRef = useRef(null);

  const [venueName, setVenueName] = useState(filters?.venueName || "");
  const [venueSuggestions, setVenueSuggestions] = useState([]);
  const [showVenueSugs, setShowVenueSugs] = useState(false);
  const venueSugTimer = useRef(null);
  const venueRef = useRef(null);

  const [folderName, setFolderName] = useState(filters?.folderName || "");
  const [folderNameSuggestions, setFolderNameSuggestions] = useState([]);
  const [showFolderNameSugs, setShowFolderNameSugs] = useState(false);
  const folderNameSugTimer = useRef(null);
  const folderNameRef = useRef(null);

  const [collectedByFilter, setCollectedByFilter] = useState(filters?.collectedBy || "");
  const [collectedBySuggestions, setCollectedBySuggestions] = useState([]);
  const [showCollectedBySugs, setShowCollectedBySugs] = useState(false);
  const collectedBySugTimer = useRef(null);
  const collectedByRef = useRef(null);

  const [sizeFilters, setSizeFilters] = useState(filters?.sizeFilters || { width: "", length: "", height: "", unit: "sq.ft" });

  const fetchSugs = async (field, query, setter, showSetter, timerRef) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const results = await ApiService.getSuggestions(field, query);
      setter(results);
      showSetter(true);
    }, SUGGESTION_DELAY);
  };

  const handleDesignNameChange = (val) => {
    setDesignName(val);
    if (!val.trim()) { setDesignNameSuggestions([]); setShowDesignNameSugs(false); return; }
    fetchSugs("designName", val, setDesignNameSuggestions, setShowDesignNameSugs, designNameSugTimer);
  };

  const handleVenueChange = (val) => {
    setVenueName(val);
    if (!val.trim()) { setVenueSuggestions([]); setShowVenueSugs(false); return; }
    fetchSugs("venueName", val, setVenueSuggestions, setShowVenueSugs, venueSugTimer);
  };

  const handleFolderNameChange = (val) => {
    setFolderName(val);
    if (!val.trim()) { setFolderNameSuggestions([]); setShowFolderNameSugs(false); return; }
    fetchSugs("folderName", val, setFolderNameSuggestions, setShowFolderNameSugs, folderNameSugTimer);
  };

  const handleCollectedByChange = (val) => {
    setCollectedByFilter(val);
    if (!val.trim()) { setCollectedBySuggestions([]); setShowCollectedBySugs(false); return; }
    fetchSugs("collectedBy", val, setCollectedBySuggestions, setShowCollectedBySugs, collectedBySugTimer);
  };

  const loadInitialSuggestions = async (field, setter, showSetter) => {
    const results = await ApiService.getSuggestions(field, "");
    setter(results);
    if (results.length > 0) showSetter(true);
  };

  const toggleArray = (value, arr, setArr) => {
    setArr(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const handleApply = () => {
    onApply({
      searchText,
      designName,
      venueName,
      folderName,
      collectedBy: collectedByFilter,
      colors: selectedColors,
      venues: selectedVenues,
      venueFilter,
      decorTypes: selectedDecorTypes,
      priceRange,
      eventTypes: selectedEventTypes,
      flowerTypes: selectedFlowerTypes,
      sizeFilters,
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
    setDesignName("");
    setDesignNameSuggestions([]);
    setVenueName("");
    setVenueSuggestions([]);
    setFolderName("");
    setFolderNameSuggestions([]);
    setCollectedByFilter("");
    setCollectedBySuggestions([]);
    setSizeFilters({ width: "", length: "", height: "", unit: "sq.ft" });
    setDecorTypeSearch("");
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

  const renderSuggestionList = (suggestions, show, onSelect, ref) => {
    if (!show || suggestions.length === 0) return null;
    return (
      <View style={styles.suggestionContainer} ref={ref}>
        {suggestions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.suggestionItem}
            onPress={() => onSelect(s)}
          >
            <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
            {/* Design Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Design Name</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Search design name..."
                  value={designName}
                  onChangeText={handleDesignNameChange}
                  onFocus={() => loadInitialSuggestions("designName", setDesignNameSuggestions, setShowDesignNameSugs)}
                />
                {renderSuggestionList(designNameSuggestions, showDesignNameSugs, (val) => {
                  setDesignName(val);
                  setShowDesignNameSugs(false);
                  setDesignNameSuggestions([]);
                }, designNameRef)}
              </View>
            </View>

            {/* Venue */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Search venue..."
                  value={venueName}
                  onChangeText={handleVenueChange}
                  onFocus={() => loadInitialSuggestions("venueName", setVenueSuggestions, setShowVenueSugs)}
                />
                {renderSuggestionList(venueSuggestions, showVenueSugs, (val) => {
                  setVenueName(val);
                  setShowVenueSugs(false);
                  setVenueSuggestions([]);
                }, venueRef)}
              </View>
            </View>

            {/* Folder Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Folder Name</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Search folder name..."
                  value={folderName}
                  onChangeText={handleFolderNameChange}
                  onFocus={() => loadInitialSuggestions("folderName", setFolderNameSuggestions, setShowFolderNameSugs)}
                />
                {renderSuggestionList(folderNameSuggestions, showFolderNameSugs, (val) => {
                  setFolderName(val);
                  setShowFolderNameSugs(false);
                  setFolderNameSuggestions([]);
                }, folderNameRef)}
              </View>
            </View>

            {/* Collected By */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collected By</Text>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Search collected by..."
                  value={collectedByFilter}
                  onChangeText={handleCollectedByChange}
                  onFocus={() => loadInitialSuggestions("collectedBy", setCollectedBySuggestions, setShowCollectedBySugs)}
                />
                {renderSuggestionList(collectedBySuggestions, showCollectedBySugs, (val) => {
                  setCollectedByFilter(val);
                  setShowCollectedBySugs(false);
                  setCollectedBySuggestions([]);
                }, collectedByRef)}
              </View>
            </View>

            {/* Venue / Customer (original) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue / Customer (Legacy)</Text>
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

            {/* Size */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Size</Text>
              <View style={styles.sizeRow}>
                <TextInput
                  style={[styles.input, styles.sizeInput]}
                  placeholder="W"
                  keyboardType="numeric"
                  value={sizeFilters.width}
                  onChangeText={t => setSizeFilters({ ...sizeFilters, width: t })}
                />
                <Text style={styles.sizeSep}>x</Text>
                <TextInput
                  style={[styles.input, styles.sizeInput]}
                  placeholder="L"
                  keyboardType="numeric"
                  value={sizeFilters.length}
                  onChangeText={t => setSizeFilters({ ...sizeFilters, length: t })}
                />
                <Text style={styles.sizeSep}>x</Text>
                <TextInput
                  style={[styles.input, styles.sizeInput]}
                  placeholder="H"
                  keyboardType="numeric"
                  value={sizeFilters.height}
                  onChangeText={t => setSizeFilters({ ...sizeFilters, height: t })}
                />
              </View>
              <View style={styles.sizeUnitRow}>
                {SIZE_UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, sizeFilters.unit === u && styles.unitChipActive]}
                    onPress={() => setSizeFilters({ ...sizeFilters, unit: u })}
                  >
                    <Text style={[styles.unitChipText, sizeFilters.unit === u && styles.unitChipTextActive]}>{u}</Text>
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

            {/* Price Range (UNCHANGED) */}
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
  suggestionContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    maxHeight: 180,
    marginTop: 4,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  suggestionText: { fontSize: 14, color: "#374151" },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  sizeInput: { flex: 1, textAlign: "center" },
  sizeSep: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  sizeUnitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, backgroundColor: "#f3f4f6",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  unitChipActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  unitChipText: { fontSize: 11, color: "#6b7280" },
  unitChipTextActive: { color: "#fff", fontWeight: "600" },
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
