import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const isTablet = SCREEN_WIDTH >= 768;
const numColumns = SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2;
const cardWidth = (SCREEN_WIDTH - CARD_GAP * (numColumns + 1)) / numColumns;

const API_BASE_URL = "https://imagemanagement-dku8.onrender.com/api";
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const LIGHT_COLORS = new Set(["White","Yellow","Light Blue","Light Green","Sky Blue","Beige","Cream","Silver","Gold","Rose Gold","Gray","Bronze","Copper"]);

const getThumbUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) {
    return rawUrl.replace("/upload/", "/upload/w_300,h_200,c_fill,f_auto,q_auto/");
  }
  return `${IMAGE_BASE_URL}${rawUrl}`;
};

function ImageCard({
  image, isFav, isSelected, canEditDelete, formatPrice, formatEventDate,
  onPress, onToggleFav, onSelect, onEdit, onDelete,
}) {
  const rawUrl = image.image_data?.imageUrl || "";
  const thumbUrl = getThumbUrl(rawUrl);
  const data = image.image_data || {};

  const buildSizeLabeled = (w, l, h) => {
    const parts = [];
    if (w && w !== "0") parts.push(`W:${w}`);
    if (l && l !== "0") parts.push(`L:${l}`);
    if (h && h !== "0") parts.push(`H:${h}`);
    return parts.join(" ") + (data.sizeUnit ? ` ${data.sizeUnit}` : "");
  };

  const sizeDisplay = data.sizeDisplay || buildSizeLabeled(data.sizeWidth, data.sizeLength, data.sizeHeight);
  const priceDisplay = formatPrice ? formatPrice(data.priceMin, data.priceMax) : "";
  const colorsDisplay = data.colourCombination?.length > 0 ? data.colourCombination.join(", ") : "";

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imgWrap}>
        {isSelected ? (
          <TouchableOpacity style={styles.checkbox} onPress={() => onSelect && onSelect(image.id)}>
            <Text style={styles.checkboxText}>✓</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => onToggleFav && onToggleFav(image.id, isFav)}
        >
          <Text style={styles.favBtnText}>{isFav ? "★" : "☆"}</Text>
        </TouchableOpacity>
        {thumbUrl ? (
          <Image
            source={{ uri: thumbUrl }}
            style={styles.img}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.img, styles.placeholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {canEditDelete ? (
          <View style={styles.hoverActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit && onEdit(image)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete && onDelete(image.id)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <View style={styles.hoverDetails}>
        {data.designName ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Design</Text><Text style={styles.detailValue}>{data.designName}</Text></View> : null}
        {data.decorType ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Decor</Text><Text style={styles.detailValue}>{data.decorType}</Text></View> : null}
        {data.eventType ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Event</Text><Text style={styles.detailValue}>{data.eventType}</Text></View> : null}
        {sizeDisplay ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Size</Text><Text style={styles.detailValue}>{sizeDisplay}</Text></View> : null}
        {priceDisplay ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Price</Text><Text style={styles.detailValue}>{priceDisplay}</Text></View> : null}
        {colorsDisplay ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Colors</Text><Text style={styles.detailValue}>{colorsDisplay}</Text></View> : null}
        {data.flowerType ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Flower</Text><Text style={styles.detailValue}>{data.flowerType}</Text></View> : null}
        {data.venueCustomer ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Customer</Text><Text style={styles.detailValue}>{data.venueCustomer}</Text></View> : null}
        {data.venueName ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Venue</Text><Text style={styles.detailValue}>{data.venueName}</Text></View> : null}
        {data.venueDate ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatEventDate ? formatEventDate(data.venueDate) : data.venueDate}</Text></View> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.infoText} numberOfLines={1}>
          <Text style={styles.infoLabel}>Design Name - </Text>
          {data.designName || "Untitled"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selected: { borderWidth: 2, borderColor: "#ff6b8a" },
  imgWrap: { position: "relative" },
  checkbox: {
    position: "absolute", top: 6, left: 6, zIndex: 10,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#ff6b8a", justifyContent: "center", alignItems: "center",
  },
  checkboxText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  favBtn: {
    position: "absolute", top: 6, right: 6, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
  },
  favBtnText: { fontSize: 16, color: "#f59e0b" },
  img: { width: "100%", height: cardWidth * 0.75 },
  placeholder: { backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#9ca3af", fontSize: 14 },
  hoverActions: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", opacity: 0, backgroundColor: "rgba(0,0,0,0.6)",
  },
  // Show on the card always since mobile has no hover
  editBtn: { flex: 1, paddingVertical: 6, alignItems: "center" },
  editBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  deleteBtn: { flex: 1, paddingVertical: 6, alignItems: "center", backgroundColor: "rgba(239,68,68,0.8)" },
  deleteBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  hoverDetails: { padding: 8, backgroundColor: "#f9fafb" },
  detailRow: { flexDirection: "row", marginBottom: 2 },
  detailLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280", width: 50 },
  detailValue: { fontSize: 11, color: "#374151", flex: 1 },
  info: { padding: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  infoLabel: { fontSize: 11, color: "#9ca3af" },
  infoText: { fontSize: 12, color: "#1a1a1a", fontWeight: "600" },
});

export default React.memo(ImageCard);