import React, { useState, useCallback, useRef, useEffect } from "react";
import { Image, View, StyleSheet, Animated, Platform } from "react-native";

const OptimizedImage = ({ source, style, resizeMode = "cover", lazy = true, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(!lazy);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!lazy || Platform.OS === "web") {
      setVisible(true);
    }
  }, [lazy]);

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  const onError = useCallback(() => {
    setErrored(true);
  }, []);

  if (!visible) {
    return (
      <View ref={viewRef} style={[style, styles.placeholder]}>
        <View style={styles.skeleton} />
      </View>
    );
  }

  if (errored || !source?.uri) {
    return (
      <View style={[style, styles.placeholder]}>
        <View style={styles.errorIcon}>
          <View style={styles.errorLine} />
          <View style={[styles.errorLine, { width: "40%" }]} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[style, { opacity }]}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, { resizeMode }]}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
      {!loaded && <View style={[StyleSheet.absoluteFill, styles.skeleton]} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  skeleton: {
    backgroundColor: "#e0e0e0",
    ...StyleSheet.absoluteFill,
  },
  errorIcon: {
    alignItems: "center",
    opacity: 0.4,
  },
  errorLine: {
    width: "60%",
    height: 3,
    backgroundColor: "#999",
    borderRadius: 2,
    marginVertical: 3,
  },
});

export default OptimizedImage;
