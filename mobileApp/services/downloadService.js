import RNFS from "react-native-fs";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "https://pv-gallery-backend.fly.dev/api";
const DEFAULT_DOWNLOAD_DIR = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: `${RNFS.DocumentDirectoryPath}/Downloads`,
  web: "/downloads",
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

function extractStatus(message) {
  const match = String(message || "").match(/status (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function sanitizeFileName(name, fallback) {
  const base = String(name || "").trim();
  if (!base) return fallback;
  const sanitized = base
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/, "")
    .trim();
  const safe = sanitized || fallback;
  return safe.length > 80 ? safe.slice(0, 80) : safe;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      resolve(dataUrl.split(",")[1] || dataUrl);
    };
    reader.onerror = () => reject(new Error("Failed to read download data"));
    reader.readAsDataURL(blob);
  });
}

function triggerWebDownload(blob, fileName) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Download is not supported in this environment");
  }
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName || `download_${Date.now()}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// RNFS.downloadFile cannot send POST/PUT requests or attach a request body.
// For endpoints that require a POST (PDF generation, multi-folder ZIP) we use
// fetch and persist the binary response to disk, so the request method and
// payload match the backend route contract exactly.
async function saveRemoteFile({ url, method = "GET", body, headers, filePath, fileName }) {
  const config = { method };
  if (headers) config.headers = headers;
  if (method !== "GET" && body !== undefined) config.body = body;

  const response = await fetch(url, config);
  if (!response.ok) {
    const message = await response
      .json()
      .then(d => d.message)
      .catch(() => "");
    throw new Error(
      message
        ? `${message} (status ${response.status})`
        : `Request failed with status ${response.status}`
    );
  }

  if (Platform.OS === "web") {
    const blob = await response.blob();
    triggerWebDownload(blob, fileName || (filePath ? String(filePath).split("/").pop() : ""));
    return { status: "downloaded", filePath };
  }

  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  await RNFS.writeFile(filePath, base64, "base64");
  return { status: "downloaded", filePath };
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

    // Offline mode: the image is already stored locally, so copy it instead of
    // trying to fetch a file:// URI over the network.
    if (Platform.OS !== "web" && remoteUrl && remoteUrl.startsWith("file://")) {
      const srcPath = remoteUrl.replace(/^file:\/\//, "");
      const srcExists = await this.fileExists(srcPath);
      if (!srcExists) throw new Error("Offline copy not found for this image");
      await RNFS.copyFile(srcPath, filePath);
      return { status: "downloaded", filePath };
    }

    if (Platform.OS === "web") {
      const result = await saveRemoteFile({
        url: remoteUrl,
        method: "GET",
        filePath,
        fileName: String(filePath).split("/").pop(),
      });
      return result;
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
        let result;
        if (Platform.OS === "web") {
          result = await saveRemoteFile({
            url,
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            filePath,
          });
        } else {
          result = await RNFS.downloadFile({
            fromUrl: url,
            toFile: filePath,
            headers: { Authorization: `Bearer ${token}` },
            background: true,
          }).promise;
          if (result.statusCode !== 200) {
            throw new Error(`Download failed with status ${result.statusCode}`);
          }
          result = { status: "downloaded", filePath };
        }
        return result;
      } catch (err) {
        lastError = err;
        const status = extractStatus(err.message);
        if (attempt < MAX_RETRIES - 1 && (
          isRetryableStatus(status) ||
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
        const result = await saveRemoteFile({
          url,
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderIds }),
          filePath,
        });
        return result;
      } catch (err) {
        lastError = err;
        const status = extractStatus(err.message);
        if (attempt < MAX_RETRIES - 1 && (
          isRetryableStatus(status) ||
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
    throw lastError || new Error("Folder download failed after multiple attempts");
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
        const result = await saveRemoteFile({
          url,
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageIds }),
          filePath,
        });
        return result;
      } catch (err) {
        lastError = err;
        const status = extractStatus(err.message);
        if (attempt < MAX_RETRIES - 1 && (
          isRetryableStatus(status) ||
          err.message.includes("network") ||
          err.message.includes("timeout") ||
          err.message.includes("connection") ||
          err.message.includes("abort")
        )) {
          onPhaseChange?.(`Retrying download (${attempt + 1}/${MAX_RETRIES - 1})...`);
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
        const fileName = `${sanitizeFileName(img.image_data?.designName, `image_${img.id}`)}.jpg`;
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
