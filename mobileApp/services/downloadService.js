import RNFS from "react-native-fs";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "https://imagemanagement-dku8.onrender.com/api";
const DEFAULT_DOWNLOAD_DIR = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: `${RNFS.DocumentDirectoryPath}/Downloads`,
});

class DownloadService {
  async requestStoragePermission() {
    if (Platform.OS !== "android") return true;
    try {
      const apiLevel = Platform.Version;
      if (apiLevel >= 33) return true;
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage Permission",
          message: "This app needs storage access to save images to your device.",
          buttonPositive: "Grant",
          buttonNegative: "Deny",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
      Alert.alert(
        "Permission Denied",
        "Storage permission is required to save images. You can enable it later in Settings > Apps > ImageManagement > Permissions."
      );
      return false;
    } catch {
      return false;
    }
  }

  getDownloadPath(destination, imageId, fileName) {
    const dest = destination || DEFAULT_DOWNLOAD_DIR;
    return `${dest}/${fileName || `${imageId}.jpg`}`;
  }

  async fileExists(filePath) {
    try {
      return await RNFS.exists(filePath);
    } catch {
      return false;
    }
  }

  async downloadSingleImage(imageId, remoteUrl, destination, fileName, onProgress) {
    const dest = destination || DEFAULT_DOWNLOAD_DIR;
    const filePath = this.getDownloadPath(destination, imageId, fileName);
    const exists = await this.fileExists(filePath);
    if (exists) {
      return { status: "exists", filePath };
    }
    const dirExists = await RNFS.exists(dest);
    if (!dirExists) {
      await RNFS.mkdir(dest);
    }
    const result = await RNFS.downloadFile({
      fromUrl: remoteUrl,
      toFile: filePath,
      progress: onProgress ? (res) => onProgress(res.bytesWritten / res.contentLength) : undefined,
    }).promise;
    if (result.statusCode === 200) {
      return { status: "downloaded", filePath };
    }
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  async downloadFolderAsZip(folderId, destination) {
    const token = await offlineStorage.getToken();
    const dest = destination || DEFAULT_DOWNLOAD_DIR;
    const dirExists = await RNFS.exists(dest);
    if (!dirExists) await RNFS.mkdir(dest);
    const filePath = `${dest}/favorite_folder_${folderId}_${Date.now()}.zip`;
    const url = `${API_BASE_URL}/download-favorite-folder/${folderId}`;
    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: filePath,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      background: true,
    }).promise;
    if (result.statusCode === 200) return { status: "downloaded", filePath };
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  async downloadMultipleFoldersAsZip(folderIds, destination) {
    const token = await offlineStorage.getToken();
    const dest = destination || DEFAULT_DOWNLOAD_DIR;
    const dirExists = await RNFS.exists(dest);
    if (!dirExists) await RNFS.mkdir(dest);
    const filePath = `${dest}/Favourite_zip_${Date.now()}.zip`;
    const url = `${API_BASE_URL}/download-favorite-folders`;
    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: filePath,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folderIds }),
      background: true,
    }).promise;
    if (result.statusCode === 200) return { status: "downloaded", filePath };
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  async downloadMultipleImages(
    images,
    getImgUrlFn,
    destination,
    onProgress,
    onImageProgress
  ) {
    const results = { downloaded: [], exists: [], failed: [] };
    const total = images.length;
    let completed = 0;

    for (const img of images) {
      try {
        const remoteUrl = getImgUrlFn(img);
        if (!remoteUrl) {
          results.failed.push({ id: img.id, error: "No URL" });
          completed++;
          onProgress?.(completed / total, completed, total);
          continue;
        }
        const fileName = `${img.image_data?.designName || img.id}.jpg`;
        const result = await this.downloadSingleImage(
          img.id, remoteUrl, destination, fileName,
          (p) => onImageProgress?.(img.id, p)
        );
        if (result.status === "downloaded") {
          results.downloaded.push({ id: img.id, path: result.filePath });
        } else {
          results.exists.push({ id: img.id, path: result.filePath });
        }
      } catch (e) {
        results.failed.push({ id: img.id, error: e.message });
      }
      completed++;
      onProgress?.(completed / total, completed, total);
    }

    return results;
  }
}

export default new DownloadService();
