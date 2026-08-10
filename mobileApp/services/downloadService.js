import RNFS from "react-native-fs";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "https://pv-gallery-backend.fly.dev/api";
const DEFAULT_DOWNLOAD_DIR = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: `${RNFS.DocumentDirectoryPath}/Downloads`,
});

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

function normalizePath(dirPath) {
  if (!dirPath) return dirPath;
  return dirPath.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableStatus(statusCode) {
  return [403, 408, 429, 502, 503, 504].includes(statusCode);
}

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
    const dest = normalizePath(destination || DEFAULT_DOWNLOAD_DIR);
    return `${dest}/${fileName || `${imageId}.jpg`}`;
  }

  async fileExists(filePath) {
    try {
      return await RNFS.exists(filePath);
    } catch {
      return false;
    }
  }

  async ensureDir(dirPath) {
    const normalized = normalizePath(dirPath);
    if (!normalized || !normalized.startsWith("/")) {
      throw new Error(`Invalid download path: "${dirPath}". Path must be absolute.`);
    }
    try {
      const exists = await RNFS.exists(normalized);
      if (!exists) {
        await RNFS.mkdir(normalized);
      }
      return normalized;
    } catch (err) {
      throw new Error(`Cannot create or access directory: ${dirPath}. ${err.message}`);
    }
  }

  async downloadSingleImage(imageId, remoteUrl, destination, fileName, onProgress) {
    const dest = await this.ensureDir(destination || DEFAULT_DOWNLOAD_DIR);
    const filePath = this.getDownloadPath(dest, imageId, fileName);
    const exists = await this.fileExists(filePath);
    if (exists) {
      return { status: "exists", filePath };
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
    if (!token) throw new Error("Authentication required. Please log in again.");

    const dest = await this.ensureDir(destination || DEFAULT_DOWNLOAD_DIR);
    const filePath = `${dest}/favorite_folder_${folderId}_${Date.now()}.zip`;
    const url = `${API_BASE_URL}/download-favorite-folder/${folderId}`;

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: filePath,
          headers: { Authorization: `Bearer ${token}` },
          background: true,
        }).promise;

        if (result.statusCode === 200) return { status: "downloaded", filePath };
        if (isRetryableStatus(result.statusCode) && attempt < MAX_RETRIES - 1) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Download failed with status ${result.statusCode}`);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1 && (
          err.message.includes("network") ||
          err.message.includes("timeout") ||
          err.message.includes("connection") ||
          err.message.includes("abort")
        )) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("Download failed after multiple attempts");
  }

  async downloadMultipleFoldersAsZip(folderIds, destination) {
    const token = await offlineStorage.getToken();
    if (!token) throw new Error("Authentication required. Please log in again.");

    const dest = await this.ensureDir(destination || DEFAULT_DOWNLOAD_DIR);
    const filePath = `${dest}/Favourite_zip_${Date.now()}.zip`;
    const url = `${API_BASE_URL}/download-favorite-folders`;

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: filePath,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderIds }),
          background: true,
        }).promise;

        if (result.statusCode === 200) return { status: "downloaded", filePath };
        if (isRetryableStatus(result.statusCode) && attempt < MAX_RETRIES - 1) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Download failed with status ${result.statusCode}`);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1 && (
          err.message.includes("network") ||
          err.message.includes("timeout") ||
          err.message.includes("connection") ||
          err.message.includes("abort")
        )) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("Download failed after multiple attempts");
  }

  async downloadImagesAsPDF(imageIds, destination, onPhaseChange) {
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new Error("No images selected for PDF download.");
    }
    const token = await offlineStorage.getToken();
    if (!token) throw new Error("Authentication required. Please log in again.");

    const dest = await this.ensureDir(destination || DEFAULT_DOWNLOAD_DIR);
    const filePath = `${dest}/image_specifications_${Date.now()}.pdf`;
    const url = `${API_BASE_URL}/download-images-pdf`;

    onPhaseChange?.("Generating PDF...");

    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await RNFS.downloadFile({
          fromUrl: url,
          toFile: filePath,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageIds }),
          background: true,
        }).promise;

        if (result.statusCode === 200) return { status: "downloaded", filePath };
        if (isRetryableStatus(result.statusCode) && attempt < MAX_RETRIES - 1) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`PDF generation failed with status ${result.statusCode}`);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1 && (
          err.message.includes("network") ||
          err.message.includes("timeout") ||
          err.message.includes("connection") ||
          err.message.includes("abort")
        )) {
          await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("PDF download failed after multiple attempts");
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
    let dest = null;

    try {
      dest = await this.ensureDir(destination || DEFAULT_DOWNLOAD_DIR);
    } catch (err) {
      return { downloaded: [], exists: [], failed: images.map(img => ({ id: img.id, error: err.message })) };
    }

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
          img.id, remoteUrl, dest, fileName,
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
