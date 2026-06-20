import RNFS from "react-native-fs";
import { Platform, PermissionsAndroid } from "react-native";

const DEFAULT_DOWNLOAD_DIR = Platform.select({
  android: RNFS.DownloadDirectoryPath,
  ios: RNFS.DocumentDirectoryPath,
});

class DownloadService {
  async requestStoragePermission() {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        { title: "Storage Permission", message: "App needs storage access to download images." }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
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
    const filePath = this.getDownloadPath(destination, imageId, fileName);
    const exists = await this.fileExists(filePath);
    if (exists) {
      return { status: "exists", filePath };
    }
    await RNFS.mkdir(destination || DEFAULT_DOWNLOAD_DIR);
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
