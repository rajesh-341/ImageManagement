import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 768;

const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2,"0")} · ${monthsShort[d.getMonth()]} · ${d.getFullYear()}`;
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${monthsShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const parseFolderName = (name) => {
  if (!name) return { customerName: "", venue: "", eventDate: "" };
  const parts = name.split("_");
  return {
    customerName: parts[0] || "",
    venue: parts[1] || "",
    eventDate: parts.slice(2).join("_") || "",
  };
};

function FolderCard({ folder, onClick, onDelete, onEdit, canDelete, onDownload }) {
  const { customerName, venue, eventDate } = parseFolderName(folder.name);
  const createdDate = formatDate(folder.created_at || folder.createdAt);

  return (
    <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <View style={styles.iconTab} />
          <View style={styles.iconFolder} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>CREATED</Text>
          <Text style={styles.metaDate}>{createdDate}</Text>
        </View>
      </View>
      {canDelete ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation; if (onEdit) onEdit(folder); }}>
            <Text style={styles.actionIcon}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation; if (onDownload) onDownload(folder); }}>
            <Text style={styles.actionIcon}>⬇</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation; if (onDelete) onDelete(folder.id, folder.name); }}>
            <Text style={styles.actionIconDel}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>CUSTOMER</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{customerName || "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>VENUE</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{venue || "—"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>EVENT DATE</Text>
          {eventDate ? (
            <Text style={styles.dateBadge}>{formatEventDate(eventDate)}</Text>
          ) : (
            <Text style={styles.rowValue}>—</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  icon: { position: "relative", width: 24, height: 20 },
  iconTab: {
    position: "absolute", top: 0, left: 2,
    width: 10, height: 5, backgroundColor: "#E6B73A",
    borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  iconFolder: {
    position: "absolute", top: 3, left: 0,
    width: 24, height: 17, backgroundColor: "#FFD54F",
    borderRadius: 2,
  },
  meta: { alignItems: "flex-end" },
  metaLabel: { fontSize: 9, color: "#9ca3af", fontWeight: "600", letterSpacing: 1 },
  metaDate: { fontSize: 11, color: "#6b7280" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 8 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  actionIcon: { fontSize: 14, color: "#6b7280" },
  actionIconDel: { fontSize: 16, color: "#ef4444", fontWeight: "700" },
  body: {},
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rowLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600", letterSpacing: 0.5 },
  rowValue: { fontSize: 13, color: "#374151", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: "#f3f4f6" },
  dateBadge: {
    fontSize: 12, color: "#6B4E00", fontWeight: "600",
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: "#fef3c7", borderRadius: 6, overflow: "hidden",
  },
});

export default React.memo(FolderCard);