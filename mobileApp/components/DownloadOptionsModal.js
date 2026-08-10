import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

function DownloadOptionsModal({ visible, title, subtitle, options, onSelect, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.options}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.optionBtn}
                onPress={() => onSelect(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
                {!!opt.description && <Text style={styles.optionDesc}>{opt.description}</Text>}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
  },
  options: {
    marginTop: 20,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  optionDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ff6b8a",
  },
});

export default DownloadOptionsModal;
