import { Platform, Alert } from "react-native";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";

export const DEFAULT_DOWNLOAD_PATH = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: `${RNFS.DocumentDirectoryPath}/Downloads`,
});

export async function pickDownloadDirectory() {
  if (Platform.OS !== "android") {
    return { path: null, cancelled: false };
  }

  try {
    const result = await DocumentPicker.pickDirectory();
    const safUri = result.uri;

    const path = safUriToPath(safUri);
    if (!path) {
      Alert.alert(
        "Selection Error",
        "Could not determine the selected folder path. Please try again or choose a different folder."
      );
      return { path: null, cancelled: false };
    }

    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
    }

    return { path, cancelled: false };
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      return { path: null, cancelled: true };
    }
    Alert.alert("Selection Error", err.message || "Failed to pick directory.");
    return { path: null, cancelled: false };
  }
}

export function safUriToPath(safUri) {
  if (!safUri) return null;

  const match = safUri.match(/tree\/([^%]+)%3A(.+)$/);
  if (!match) return null;

  const storageType = decodeURIComponent(match[1]);
  const relativePath = decodeURIComponent(match[2]);

  if (storageType === "primary") {
    return `${RNFS.ExternalStorageDirectoryPath}/${relativePath}`;
  }

  return null;
}
