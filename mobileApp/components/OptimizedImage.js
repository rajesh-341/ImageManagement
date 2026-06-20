import React, { useState, useCallback } from "react";
import { Image, View, StyleSheet } from "react-native";

const OptimizedImage = ({ source, style, resizeMode = "cover", ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const onError = useCallback(() => {
    setErrored(true);
  }, []);

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
    <View style={style}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, { resizeMode }]}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
      {!loaded && <View style={[StyleSheet.absoluteFill, styles.skeleton]} />}
    </View>
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
