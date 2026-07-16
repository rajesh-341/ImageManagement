import React, { useRef, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Animated,
  StyleSheet, Modal, PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OptimizedImage from "./OptimizedImage";

const DOUBLE_TAP_DELAY = 300;
const MAX_SCALE = 4;

function ImageLightbox({ visible, image, index, totalCount, onClose, onPrevious, onNext }) {
  const insets = useSafeAreaInsets();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const txAnim = useRef(new Animated.Value(0)).current;
  const tyAnim = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(1);
  const baseTX = useRef(0);
  const baseTY = useRef(0);
  const lastTapTime = useRef(0);
  const pinchBaseDist = useRef(null);
  const pinchBaseScale = useRef(1);

  const resetTransforms = useCallback(() => {
    scaleAnim.setValue(1);
    txAnim.setValue(0);
    tyAnim.setValue(0);
    baseScale.current = 1;
    baseTX.current = 0;
    baseTY.current = 0;
    lastTapTime.current = 0;
    pinchBaseDist.current = null;
  }, [scaleAnim, txAnim, tyAnim]);

  useEffect(() => {
    resetTransforms();
  }, [index, resetTransforms]);

  useEffect(() => {
    if (visible) resetTransforms();
  }, [visible, resetTransforms]);

  const touchDistance = (t1, t2) => {
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onPrevRef = useRef(onPrevious);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrevious;
  onNextRef.current = onNext;

  const toggleZoom = useCallback(() => {
    if (baseScale.current > 1) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(txAnim, { toValue: 0, useNativeDriver: true }),
        Animated.spring(tyAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
      baseScale.current = 1;
      baseTX.current = 0;
      baseTY.current = 0;
    } else {
      Animated.spring(scaleAnim, { toValue: 2, useNativeDriver: true }).start();
      baseScale.current = 2;
    }
  }, [scaleAnim, txAnim, tyAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.numberActiveTouches === 2 ||
        (Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy)),
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          pinchBaseDist.current = touchDistance(touches[0], touches[1]);
          pinchBaseScale.current = baseScale.current;
        }
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && pinchBaseDist.current !== null) {
          const dist = touchDistance(touches[0], touches[1]);
          const newScale = Math.min(
            Math.max(pinchBaseScale.current * (dist / pinchBaseDist.current), 0.5),
            MAX_SCALE
          );
          scaleAnim.setValue(newScale);
          baseScale.current = newScale;
        } else if (touches.length === 1 && baseScale.current > 1) {
          txAnim.setValue(baseTX.current + gs.dx);
          tyAnim.setValue(baseTY.current + gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        pinchBaseDist.current = null;

        if (baseScale.current > 1) {
          baseTX.current += gs.dx;
          baseTY.current += gs.dy;
          return;
        }

        if (Math.abs(gs.dx) < 10 && Math.abs(gs.dy) < 10) {
          const now = Date.now();
          if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
            toggleZoom();
            lastTapTime.current = 0;
          } else {
            lastTapTime.current = now;
          }
          return;
        }

        if (gs.dx > 50 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5) {
          onPrevRef.current();
        } else if (gs.dx < -50 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5) {
          onNextRef.current();
        }
      },
    })
  ).current;

  const renderLightboxField = (label, value) => (
    <View style={styles.lbFieldRow}>
      <Text style={styles.lbFieldLabel}>{label}</Text>
      <Text style={styles.lbFieldValue}>{value || "Not Available"}</Text>
    </View>
  );

  const formatSize = (d) => {
    if (!d) return null;
    if (d.sizeDisplay) return d.sizeDisplay;
    const parts = [];
    if (d.sizeWidth) parts.push(`${d.sizeWidth} W`);
    if (d.sizeLength) parts.push(`${d.sizeLength} L`);
    if (d.sizeHeight) parts.push(`${d.sizeHeight} H`);
    if (parts.length > 0) return `${parts.join(" x ")} ${d.sizeUnit || ""}`.trim();
    if (d.size) return `${d.size} ${d.sizeUnit || ""}`.trim();
    return null;
  };

  const formatPrice = (d) => {
    if (!d) return null;
    if (d.priceMin != null && d.priceMax != null) return `\u20B9${d.priceMin} - \u20B9${d.priceMax}`;
    if (d.priceMin != null) return `\u20B9${d.priceMin}`;
    if (d.priceMax != null) return `\u20B9${d.priceMax}`;
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightboxOverlay} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[styles.lightboxClose, { top: insets.top + 10 }]}
          onPress={onClose}
        >
          <Text style={styles.lightboxCloseText}>{"\u2715"}</Text>
        </TouchableOpacity>

        {image?.url ? (
          <>
            <Animated.View
              style={[
                styles.lightboxImgContainer,
                {
                  transform: [
                    { scale: scaleAnim },
                    { translateX: txAnim },
                    { translateY: tyAnim },
                  ],
                },
              ]}
            >
              <OptimizedImage uri={image.url} style={styles.lightboxImg} resizeMode="contain" />
            </Animated.View>

            {index > 0 && (
              <TouchableOpacity
                style={[styles.lbArrow, styles.lbArrowLeft]}
                onPress={onPrevious}
              >
                <Text style={styles.lbArrowText}>{"\u2039"}</Text>
              </TouchableOpacity>
            )}
            {index < totalCount - 1 && (
              <TouchableOpacity
                style={[styles.lbArrow, styles.lbArrowRight]}
                onPress={onNext}
              >
                <Text style={styles.lbArrowText}>{"\u203A"}</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.lbCounter, { top: insets.top + 10 }]}>
              <Text style={styles.lbCounterText}>
                {index + 1} / {totalCount}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Image not available</Text>
          </View>
        )}

        {image?.data && (
          <View style={styles.lightboxInfo}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.lbDetailsScroll}>
              {renderLightboxField("Design Name", image.data.designName)}
              {renderLightboxField("Size", formatSize(image.data))}
              {renderLightboxField("Price", formatPrice(image.data))}
              {renderLightboxField("Decor", image.data.decorType)}
              {renderLightboxField("Event", image.data.eventType)}
              {renderLightboxField("Flower", image.data.flowerType)}
              {renderLightboxField("Customer", image.data.venueCustomer)}
              {renderLightboxField("Venue", image.data.venueName)}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    right: 20,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxImgContainer: { width: "90%", height: "60%" },
  lightboxImg: { width: "100%", height: "100%" },
  lbArrow: {
    position: "absolute",
    top: "50%",
    zIndex: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -24,
  },
  lbArrowLeft: { left: 12 },
  lbArrowRight: { right: 12 },
  lbArrowText: { color: "#fff", fontSize: 32, fontWeight: "300", lineHeight: 36 },
  lbCounter: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lbCounterText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" },
  lightboxInfo: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 16,
    borderRadius: 12,
    maxHeight: 280,
  },
  lbDetailsScroll: { maxHeight: 240 },
  lbFieldRow: { flexDirection: "row", marginVertical: 4, paddingVertical: 1 },
  lbFieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ff6b8a",
    width: 90,
  },
  lbFieldValue: { fontSize: 15, color: "#e5e7eb", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15, color: "#9ca3af", textAlign: "center", padding: 24 },
});

export default ImageLightbox;
