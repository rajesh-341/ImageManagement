import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";

function AutocompleteInput({ options = [], value, onChange, placeholder = "", required = false }) {
  const [input, setInput] = useState(value || "");
  const [show, setShow] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const filtered = input.trim()
    ? options.filter(o => o.toLowerCase().includes(input.toLowerCase()))
    : options;

  const select = (option) => {
    setInput(option);
    onChange(option);
    setShow(false);
    setActiveIdx(-1);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={(t) => { setInput(t); setShow(true); setActiveIdx(-1); onChange(t); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoComplete="off"
      />
      {show && filtered.length > 0 ? (
        <View style={styles.list}>
          {filtered.map((option, idx) => (
            <TouchableOpacity
              key={option}
              style={[styles.item, idx === activeIdx && styles.itemActive]}
              onPress={() => select(option)}
            >
              <Text style={[styles.itemText, idx === activeIdx && styles.itemTextActive]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 100 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 8,
    padding: 10, fontSize: 14, color: "#1a1a1a", backgroundColor: "#f9fafb",
  },
  list: {
    position: "absolute", top: "100%", left: 0, right: 0,
    backgroundColor: "#fff", borderRadius: 8, elevation: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, maxHeight: 180, zIndex: 999,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  itemActive: { backgroundColor: "#fef2f3" },
  itemText: { fontSize: 14, color: "#374151" },
  itemTextActive: { color: "#ff6b8a", fontWeight: "600" },
});

export default AutocompleteInput;