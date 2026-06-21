import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "https://imagemanagement-dku8.onrender.com/api";

class ApiService {
  constructor() {
    this.isOnline = true;
  }

  setOnlineStatus(status) {
    this.isOnline = status;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await offlineStorage.getToken();

    const config = {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (options.body && options.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  // Auth
  async login(username, password) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.success && data.user) {
      await offlineStorage.storeUser(data.user);
    }
    if (data.token) {
      await offlineStorage.storeToken(data.token);
    }
    return data;
  }

  async logout() {
    try {
      await this.request("/logout", { method: "POST" });
    } finally {
      await offlineStorage.clearAuth();
    }
  }

  getCurrentUser() {
    return offlineStorage.getUser();
  }

  // Folders
  async getFolders() {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const cached = await offlineStorage.getFolders();
      if (cached) return cached;
    }
    const data = await this.request("/folders");
    await offlineStorage.storeFolders(data || []);
    return data;
  }

  async createFolder(folderName, description = "") {
    return this.request("/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description }),
    });
  }

  async updateFolder(id, name) {
    return this.request(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(id) {
    return this.request(`/folders/${id}`, {
      method: "DELETE",
    });
  }

  // Images
  async getImages(folder = null) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const cached = await offlineStorage.getImages();
      if (cached) {
        if (folder) {
          return cached.filter(
            (img) => img.folder_name === folder
          );
        }
        return cached;
      }
    }
    const endpoint = folder
      ? `/images?folder=${encodeURIComponent(folder)}`
      : "/images";
    const data = await this.request(endpoint);
    const images = Array.isArray(data) ? data : data.images || [];
    if (!folder) {
      await offlineStorage.storeImages(images);
    }
    return images;
  }

  async getImageById(id) {
    return this.request(`/images/${id}`);
  }

  async uploadImage(imageData) {
    return this.request("/images", {
      method: "POST",
      body: JSON.stringify(imageData),
    });
  }

  async deleteImage(id) {
    return this.request(`/images/${id}`, {
      method: "DELETE",
    });
  }

  async uploadFile(file, folderName = "") {
    const formData = new FormData();
    formData.append("image", {
      uri: file.uri,
      type: file.type || "image/jpeg",
      name: file.fileName || `photo_${Date.now()}.jpg`,
    });
    if (folderName) {
      formData.append("folderName", folderName);
    }

    return this.request("/upload", {
      method: "POST",
      body: formData,
    });
  }

  async uploadExcel(file, folderName) {
    const formData = new FormData();
    formData.append("files", {
      uri: file.uri,
      type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: file.name || "upload.xlsx",
    });
    formData.append("folderName", folderName);

    return this.request("/upload-excel", {
      method: "POST",
      body: formData,
    });
  }

  // Search / Filters
  async searchImages(filters) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const cached = await offlineStorage.getImages();
      if (cached) {
        let results = [...cached];
        if (filters.searchText) {
          const q = filters.searchText.toLowerCase();
          results = results.filter(
            (img) =>
              img.image_data?.designName?.toLowerCase().includes(q) ||
              img.image_data?.decorType?.toLowerCase().includes(q) ||
              img.image_data?.eventType?.toLowerCase().includes(q)
          );
        }
        if (filters.eventType) {
          const types = filters.eventType.split(",");
          results = results.filter((img) =>
            types.includes(img.image_data?.eventType)
          );
        }
        if (filters.decorType) {
          const types = filters.decorType.split(",");
          results = results.filter((img) =>
            types.includes(img.image_data?.decorType)
          );
        }
        if (filters.placeOfEvent) {
          results = results.filter(
            (img) =>
              img.image_data?.venueName === filters.placeOfEvent
          );
        }
        if (filters.priceMin) {
          results = results.filter(
            (img) =>
              (img.image_data?.priceMin || 0) >=
              parseFloat(filters.priceMin)
          );
        }
        if (filters.priceMax) {
          results = results.filter(
            (img) =>
              (img.image_data?.priceMax || 0) <=
              parseFloat(filters.priceMax)
          );
        }
        return results;
      }
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return this.request(`/images?${params.toString()}`);
  }

  // Move
  async updateImageFolder(imageId, folderName) {
    return this.request(`/images/${imageId}/folder`, {
      method: "PUT",
      body: JSON.stringify({ folderName }),
    });
  }

  async moveImageToFolder(imageId, folderName) {
    return this.updateImageFolder(imageId, folderName);
  }

  // Favourites
  async getFavorites(folder = null) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const cached = await offlineStorage.getFavourites();
      if (cached) {
        if (folder) {
          return cached.filter(
            (fav) => fav.folder_name === folder
          );
        }
        return cached;
      }
    }
    const endpoint = folder
      ? `/favorites?folder=${encodeURIComponent(folder)}`
      : "/favorites";
    const data = await this.request(endpoint);
    const favs = Array.isArray(data) ? data : data.favourites || data.images || [];
    if (!folder) {
      await offlineStorage.storeFavourites(favs);
    }
    return favs;
  }

  async addFavorite(imageId) {
    const result = await this.request("/favorites", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const favs = await offlineStorage.getFavourites();
      const updated = favs.filter((f) => f.id !== imageId);
      updated.push(result.image || result);
      await offlineStorage.storeFavourites(updated);
    }
    return result;
  }

  async removeFavorite(imageId) {
    const result = await this.request(`/favorites/${imageId}`, {
      method: "DELETE",
    });
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const favs = await offlineStorage.getFavourites();
      await offlineStorage.storeFavourites(
        favs.filter((f) => f.id !== imageId)
      );
    }
    return result;
  }

  async getFavoriteFolders() {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const cached = await offlineStorage.getFavouriteFolders();
      if (cached && cached.length > 0) return cached;
    }
    const data = await this.request("/favorites/folders");
    const folders = Array.isArray(data) ? data : data.folders || data || [];
    await offlineStorage.storeFavouriteFolders(folders);
    return folders;
  }

  async createFavoriteFolder(folderName, description = "") {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      const tempId = `offline_${Date.now()}`;
      const newFolder = { id: tempId, name: folderName, description, _offline: true };
      const folders = await offlineStorage.getFavouriteFolders();
      folders.push(newFolder);
      await offlineStorage.storeFavouriteFolders(folders);
      await offlineStorage.addToSyncQueue({
        type: "create_favorite_folder",
        payload: { folderName, description },
      });
      return newFolder;
    }
    const result = await this.request("/favorites/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description }),
    });
    const folders = await offlineStorage.getFavouriteFolders();
    folders.push(result.folder || result);
    await offlineStorage.storeFavouriteFolders(folders);
    return result;
  }

  async updateFavoriteFolder(folderId, folderName) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      await offlineStorage.addToSyncQueue({
        type: "update_favorite_folder",
        payload: { folderId, folderName },
      });
      const folders = await offlineStorage.getFavouriteFolders();
      const idx = folders.findIndex(f => f.id === folderId);
      if (idx >= 0) { folders[idx].name = folderName; await offlineStorage.storeFavouriteFolders(folders); }
      return { success: true };
    }
    const result = await this.request(`/favorites/folders/${folderId}`, {
      method: "PUT",
      body: JSON.stringify({ folderName }),
    });
    const folders = await offlineStorage.getFavouriteFolders();
    const idx = folders.findIndex(f => f.id === folderId);
    if (idx >= 0) {
      folders[idx].name = folderName;
      await offlineStorage.storeFavouriteFolders(folders);
    }
    return result;
  }

  async deleteFavoriteFolder(folderId) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      await offlineStorage.addToSyncQueue({
        type: "delete_favorite_folder",
        payload: { folderId },
      });
      const folders = await offlineStorage.getFavouriteFolders();
      await offlineStorage.storeFavouriteFolders(folders.filter(f => f.id !== folderId));
      return { success: true };
    }
    const result = await this.request(`/favorites/folders/${folderId}`, {
      method: "DELETE",
    });
    const folders = await offlineStorage.getFavouriteFolders();
    await offlineStorage.storeFavouriteFolders(folders.filter(f => f.id !== folderId));
    return result;
  }

  async addImagesToFavouriteFolder(folderId, imageIds) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      await offlineStorage.addToSyncQueue({
        type: "add_to_favourite_folder",
        payload: { folderId, imageIds },
      });
      return { success: true };
    }
    return this.request("/favorites/folder-images/batch", {
      method: "POST",
      body: JSON.stringify({ folderId, imageIds }),
    });
  }

  async removeImageFromFavouriteFolder(folderId, imageId) {
    const offline = await offlineStorage.isOfflineMode();
    if (offline) {
      await offlineStorage.addToSyncQueue({
        type: "remove_from_favourite_folder",
        payload: { folderId, imageId },
      });
      return { success: true };
    }
    return this.request("/favorites/folder-images", {
      method: "DELETE",
      body: JSON.stringify({ folderId, imageId }),
    });
  }

  async processSyncQueue() {
    const queue = await offlineStorage.getSyncQueue();
    if (queue.length === 0) return;

    const results = { success: 0, failed: 0, errors: [] };
    for (const item of queue) {
      try {
        switch (item.type) {
          case "create_favorite_folder":
            await this.request("/favorites/folders", {
              method: "POST",
              body: JSON.stringify(item.payload),
            });
            break;
          case "add_to_favourite_folder":
            await this.request("/favorites/folder-images/batch", {
              method: "POST",
              body: JSON.stringify(item.payload),
            });
            break;
          case "remove_from_favourite_folder":
            await this.request("/favorites/folder-images", {
              method: "DELETE",
              body: JSON.stringify(item.payload),
            });
            break;
          case "update_favorite_folder":
            await this.request(`/favorites/folders/${item.payload.folderId}`, {
              method: "PUT",
              body: JSON.stringify({ folderName: item.payload.folderName }),
            });
            break;
          case "delete_favorite_folder":
            await this.request(`/favorites/folders/${item.payload.folderId}`, {
              method: "DELETE",
            });
            break;
        }
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ action: item.type, error: e.message });
      }
    }
    await offlineStorage.clearSyncQueue();
    return results;
  }
}

export default new ApiService();
