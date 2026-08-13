import { Platform, Alert, NativeModules } from "react-native";
import RNFS from "react-native-fs";

const { DirectoryPicker } = NativeModules;

export const DEFAULT_DOWNLOAD_PATH = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: `${RNFS.DocumentDirectoryPath}/Downloads`,
  web: "/downloads",
});

export async function pickDownloadDirectory() {
  if (Platform.OS !== "android") {
    return { path: null, cancelled: false };
  }

  if (!DirectoryPicker) {
    Alert.alert("Error", "DirectoryPicker native module is not available.");
    return { path: null, cancelled: false };
  }

  try {
    const safUri = await DirectoryPicker.pickDirectory();
    if (!safUri) {
      return { path: null, cancelled: true };
    }

    const path = safUriToPath(safUri);
    if (!path || !path.startsWith("/")) {
      Alert.alert(
        "Selection Error",
        "Could not determine the selected folder path. The download will use the default folder instead."
      );
      return { path: null, cancelled: false };
    }

    const exists = await RNFS.exists(path);
    if (!exists) {
      try {
        await RNFS.mkdir(path);
      } catch {
        Alert.alert(
          "Folder Error",
          "Cannot create the selected folder. The download will use the default folder instead."
        );
        return { path: null, cancelled: false };
      }
    }

    return { path, cancelled: false };
  } catch (err) {
    Alert.alert("Selection Error", err.message || "Failed to pick directory.");
    return { path: null, cancelled: false };
  }
}

export function safUriToPath(safUri) {
  if (!safUri) return null;

  // Extract the tree path portion from the full SAF URI:
  // content://com.android.externalstorage.documents/tree/primary%3ADownload%2Ftest
  // or: tree/primary%3ADownload%2Ftest
  const treeMatch = safUri.match(/tree\/(.+)$/i);
  if (!treeMatch) {
    // If there's no /tree/ pattern, the URI might already be a direct path
    if (safUri.startsWith("/")) return safUri;
    return null;
  }

  const treePart = treeMatch[1];

  // Try to match both encoded (%3A) and decoded (:) separator patterns
  let storageType, relativePath;

  // Pattern 1: primary%3ADownload%2Ftest (encoded colon and slashes)
  const encodedMatch = treePart.match(/^([^%]+)%3A(.+)$/);
  if (encodedMatch) {
    storageType = decodeURIComponent(encodedMatch[1]);
    relativePath = decodeURIComponent(encodedMatch[2]);
  } else {
    // Pattern 2: primary:Download/test (already decoded)
    const decodedMatch = treePart.match(/^([^:]+):(.+)$/);
    if (decodedMatch) {
      storageType = decodedMatch[1];
      relativePath = decodedMatch[2];
    } else {
      // Pattern 3: just a path, no storage type prefix
      relativePath = treePart;
      storageType = "primary";
    }
  }

  if (storageType === "primary" || !storageType) {
    const basePath = RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath;
    return `${basePath}/${relativePath}`;
  }

  // For non-primary storage (SD card), try to construct the path
  if (storageType) {
    const basePath = RNFS.ExternalStorageDirectoryPath || RNFS.DocumentDirectoryPath;
    return `${basePath}/storage/${storageType}/${relativePath}`;
  }

  return null;
}
