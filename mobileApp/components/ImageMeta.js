import React from "react";
import { View, Text, StyleSheet } from "react-native";

function ImageMeta({ data }) {
  if (!data) return null;

  const rows = [];

  if (data.size) rows.push({ label: "Size", value: `${data.size} ${data.sizeUnit || ""}` });
  if (data.colourCombination?.length > 0) rows.push({ label: "Colours", value: data.colourCombination.join(", ") });
  if (data.placeOfEvent) rows.push({ label: "Place", value: data.placeOfEvent });
  if (data.decorType) rows.push({ label: "Decor", value: data.decorType });
  if (data.eventName) rows.push({ label: "Event", value: data.eventName });
  if (data.designName) rows.push({ label: "Design", value: data.designName });
  if (data.flowerType) rows.push({ label: "Flower", value: data.flowerType });

  if (rows.length === 0) return null;

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{row.label}:</Text>
          <Text style={styles.value} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginRight: 4 },
  value: { fontSize: 12, color: "#374151", flex: 1 },
});

export default React.memo(ImageMeta);
