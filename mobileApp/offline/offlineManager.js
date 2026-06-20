import RNFS from "react-native-fs";
import { Platform } from "react-native";
import offlineStorage from "./offlineStorage";

const IMAGE_CACHE_DIR = `${RNFS.DocumentDirectoryPath}/offline/images`;
const CONCURRENCY_LIMIT = 5;

class OfflineManager {
  async ensureCacheDir() {
    const exists = await RNFS.exists(IMAGE_CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(IMAGE_CACHE_DIR);
    }
  }

  getLocalImagePath(imageId) {
    return `${IMAGE_CACHE_DIR}/${imageId}.jpg`;
  }

  async isImageCached(imageId) {
    const localPath = this.getLocalImagePath(imageId);
    return RNFS.exists(localPath);
  }

  async getImageUri(imageId, remoteUrl) {
    const localPath = this.getLocalImagePath(imageId);
    const cached = await RNFS.exists(localPath);
    if (cached) {
      return Platform.OS === "android" ? `file://${localPath}` : localPath;
    }
    return remoteUrl;
  }

  async downloadImage(imageId, remoteUrl, onProgress) {
    await this.ensureCacheDir();
    const localPath = this.getLocalImagePath(imageId);
    const result = await RNFS.downloadFile({
      fromUrl: remoteUrl,
      toFile: localPath,
      progress: onProgress
        ? (res) => onProgress(res.bytesWritten / res.contentLength)
        : undefined,
    }).promise;
    return result.statusCode === 200;
  }

  async downloadAllImages(images, getImgUrlFn, onProgress) {
    await this.ensureCacheDir();
    const total = images.length;
    let completed = 0;
    const cachePaths = {};
    const versions = {};
    const errors = [];

    const queue = [...images];
    const workers = Array(Math.min(CONCURRENCY_LIMIT, total))
      .fill()
      .map(async () => {
        while (queue.length > 0) {
          const img = queue.shift();
          const remoteUrl = getImgUrlFn(img);
          if (!remoteUrl) {
            completed++;
            onProgress?.(completed / total, completed, total);
            continue;
          }
          try {
            const localPath = this.getLocalImagePath(img.id);
            const result = await RNFS.downloadFile({
              fromUrl: remoteUrl,
              toFile: localPath,
            }).promise;
            if (result.statusCode === 200) {
              cachePaths[img.id] = localPath;
              versions[img.id] = img.updated_at || new Date().toISOString();
            } else {
              errors.push(img.id);
            }
          } catch (e) {
            errors.push(img.id);
          }
          completed++;
          onProgress?.(completed / total, completed, total);
        }
      });

    await Promise.all(workers);

    await offlineStorage.storeImageCachePaths(cachePaths);
    await offlineStorage.storeImageVersions(versions);

    return { success: total - errors.length, errors: errors.length };
  }

  async syncWithServer(apiService, getImgUrlFn, onProgress) {
    const serverImages = await apiService.getImages();
    const images = Array.isArray(serverImages)
      ? serverImages
      : serverImages.images || [];

    const cachedPaths = await offlineStorage.getImageCachePaths();
    const cachedVersions = await offlineStorage.getImageVersions();
    const serverIds = new Set(images.map((i) => i.id));
    const cachedIds = Object.keys(cachedPaths);

    const toDelete = cachedIds.filter((id) => !serverIds.has(id));
    const toDownload = [];
    const unchanged = [];

    for (const img of images) {
      const serverVersion = img.updated_at || "";
      const cachedVersion = cachedVersions[img.id] || "";
      const isCached = cachedPaths[img.id];
      if (!isCached) {
        toDownload.push(img);
      } else if (serverVersion && serverVersion !== cachedVersion) {
        toDownload.push(img);
      } else {
        unchanged.push(img.id);
      }
    }

    const total = toDownload.length + toDelete.length + unchanged.length;
    let completed = 0;

    const reportProgress = () => {
      completed++;
      onProgress?.(completed / total, completed, total);
    };

    // Delete removed images
    for (const id of toDelete) {
      try {
        const localPath = this.getLocalImagePath(id);
        const exists = await RNFS.exists(localPath);
        if (exists) await RNFS.unlink(localPath);
        delete cachedPaths[id];
        delete cachedVersions[id];
      } catch (e) {
        console.warn("Failed to delete cached image:", id, e);
      }
      reportProgress();
    }

    // Download new/changed images
    const queue = [...toDownload];
    const workers = Array(Math.min(CONCURRENCY_LIMIT, queue.length || 1))
      .fill()
      .map(async () => {
        while (queue.length > 0) {
          const img = queue.shift();
          const remoteUrl = getImgUrlFn(img);
          if (remoteUrl) {
            try {
              const localPath = this.getLocalImagePath(img.id);
              const result = await RNFS.downloadFile({
                fromUrl: remoteUrl,
                toFile: localPath,
              }).promise;
              if (result.statusCode === 200) {
                cachedPaths[img.id] = localPath;
                cachedVersions[img.id] =
                  img.updated_at || new Date().toISOString();
              }
            } catch (e) {
              console.warn("Failed to download image during sync:", img.id, e);
            }
          }
          reportProgress();
        }
      });

    await Promise.all(workers);

    unchanged.forEach(() => reportProgress());

    await offlineStorage.storeImageCachePaths(cachedPaths);
    await offlineStorage.storeImageVersions(cachedVersions);
    await offlineStorage.storeImages(images);

    // Fetch and store favourites
    try {
      const favs = await apiService.getFavorites();
      await offlineStorage.storeFavourites(favs || []);
    } catch (e) {
      console.warn("Failed to sync favourites:", e);
    }

    // Fetch and store folders
    try {
      const folders = await apiService.getFolders();
      await offlineStorage.storeFolders(folders || []);
    } catch (e) {
      console.warn("Failed to sync folders:", e);
    }

    // Fetch and store favourite folders
    try {
      const favFolders = await apiService.getFavoriteFolders();
      await offlineStorage.storeFavouriteFolders(favFolders || []);
    } catch (e) {
      console.warn("Failed to sync favourite folders:", e);
    }

    // Process any pending sync queue
    try {
      await apiService.processSyncQueue();
    } catch (e) {
      console.warn("Failed to process sync queue:", e);
    }

    await offlineStorage.setLastSync(new Date().toISOString());
  }

  async clearAllCachedImages() {
    try {
      const exists = await RNFS.exists(IMAGE_CACHE_DIR);
      if (exists) {
        const items = await RNFS.readDir(IMAGE_CACHE_DIR);
        await Promise.all(
          items.map((item) => RNFS.unlink(item.path))
        );
      }
      await offlineStorage.storeImageCachePaths({});
      await offlineStorage.storeImageVersions({});
    } catch (e) {
      console.error("Error clearing cached images:", e);
    }
  }

  async getOfflineImageUri(imageId, remoteUrl) {
    const localPath = this.getLocalImagePath(imageId);
    const cached = await RNFS.exists(localPath);
    if (cached) {
      return Platform.OS === "android" ? `file://${localPath}` : localPath;
    }
    return remoteUrl;
  }
}

export default new OfflineManager();
