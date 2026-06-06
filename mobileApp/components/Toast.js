import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";

function Toast({ message, type = "error", visible, onHide, duration = 4000 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible, message]);

  if (!visible || !message) return null;

  return (
    <Animated.View style={[styles.container, { opacity }, type === "error" ? styles.error : styles.success]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", top: 60, left: 16, right: 16,
    padding: 14, borderRadius: 12, zIndex: 9999,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  error: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  success: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  text: { fontSize: 14, fontWeight: "500", color: "#1a1a1a", textAlign: "center" },
});

export default Toast;