import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import OptimizedImage from "./OptimizedImage";

const ImageCard = memo(({ item, imgUrl, cardWidth, selected, selectMode, isFav, onPress, onLongPress, onToggleFav, onDownload, showMove, onMove }) => {
  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.card, { width: cardWidth }, selected && styles.cardSelected]}>
        {imgUrl ? (
          <OptimizedImage uri={imgUrl} style={[styles.cardImg, { height: cardWidth * 0.75 }]} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, styles.placeholder, { height: cardWidth * 0.75 }]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {selectMode && (
          <View style={[styles.checkbox, selected && styles.checkboxActive]}>
            <Text style={styles.checkboxText}>{selected ? "\u2713" : ""}</Text>
          </View>
        )}

        {!selectMode && (
          <TouchableOpacity style={styles.favBtn} onPress={onToggleFav}>
            <Text style={[styles.favIcon, isFav && styles.favIconActive]}>
              {isFav ? "\u2665" : "\u2661"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.image_data?.designName || "Untitled"}
          </Text>
          <View style={styles.cardActions}>
            {!selectMode && showMove && (
              <TouchableOpacity style={styles.moveBtn} onPress={onMove}>
                <Text style={styles.moveBtnText}>Move</Text>
              </TouchableOpacity>
            )}
            {!selectMode && (
              <TouchableOpacity style={styles.dlBtn} onPress={onDownload}>
                <Text style={styles.dlBtnText}>Download</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.item.id === next.item.id && prev.imgUrl === next.imgUrl && prev.selected === next.selected && prev.selectMode === next.selectMode && prev.isFav === next.isFav && prev.showMove === next.showMove);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 10, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)", elevation: 2, position: "relative",
  },
  cardSelected: { borderWidth: 2, borderColor: "#ff6b8a", borderRadius: 10 },
  cardImg: { width: "100%" },
  placeholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 13 },
  checkbox: {
    position: "absolute", top: 8, left: 8, width: 28, height: 28,
    borderRadius: 14, borderWidth: 2, borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  checkboxActive: { backgroundColor: "#ff6b8a", borderColor: "#ff6b8a" },
  checkboxText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  favBtn: {
    position: "absolute", top: 8, right: 8, width: 32, height: 32,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  favIcon: { fontSize: 18, color: "#9ca3af" },
  favIconActive: { color: "#ef4444" },
  cardContent: { padding: 8 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  cardActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#fef3c7" },
  moveBtnText: { fontSize: 11, fontWeight: "600", color: "#d97706" },
  dlBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#dbeafe" },
  dlBtnText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
});

export default ImageCard;
