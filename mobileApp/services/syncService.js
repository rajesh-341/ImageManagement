import offlineStorage from "../offline/offlineStorage";
import ApiService from "./apiService";

class SyncService {
  async processPendingChanges(onProgress) {
    const queue = await offlineStorage.getSyncQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const total = queue.length;

    for (const item of queue) {
      try {
        switch (item.type) {
          case "create_favorite_folder":
            await ApiService.createFavoriteFolder(
              item.payload.folderName,
              item.payload.description
            );
            break;
          case "add_to_favourite_folder":
            await ApiService.addImagesToFavouriteFolder(
              item.payload.folderId,
              item.payload.imageIds
            );
            break;
          case "remove_from_favourite_folder":
            await ApiService.removeImageFromFavouriteFolder(
              item.payload.folderId,
              item.payload.imageId
            );
            break;
        }
        processed++;
      } catch (e) {
        failed++;
        console.warn(`Sync failed for ${item.type}:`, e.message);
      }
      onProgress?.(processed / total, processed, total);
    }

    await offlineStorage.clearSyncQueue();
    return { processed, failed };
  }

  async hasPendingChanges() {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length > 0;
  }
}

export default new SyncService();
