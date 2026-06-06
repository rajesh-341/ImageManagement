import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "https://imagemanagement-dku8.onrender.com/api";

class ApiService {
  constructor() {
    this.isOnline = true;
  }

  setOnlineStatus(status) {
    this.isOnline = status;
  }

  async request(endpoint, options = {}, includeAuth = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = includeAuth ? await offlineStorage.getToken() : null;

    const config = {
      ...options,
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
    }, false);
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
  async getFolders(scope = "home") {
    return this.request(`/folders?scope=${encodeURIComponent(scope)}`);
  }

  async createFolder(folderName, description = "", eventTypes = []) {
    return this.request("/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description, eventTypes }),
    });
  }

  async updateFolder(id, name, eventTypes) {
    const body = { name };
    if (eventTypes !== undefined) body.eventTypes = eventTypes;
    return this.request(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async deleteFolder(id) {
    return this.request(`/folders/${id}`, {
      method: "DELETE",
    });
  }

  // Images
  async getImages(folder = null, page = 1, limit = 50) {
    const params = new URLSearchParams({ page, limit });
    if (folder) params.set("folder", folder);
    const result = await this.request(`/images?${params.toString()}`);
    return { images: result.images || [], hasMore: result.hasMore || false };
  }

  async getAllImages() {
    return this.getImages(null, 1, 200);
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

  async updateImage(id, imageData) {
    return this.request(`/images/${id}`, {
      method: "PUT",
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

  // Search
  async searchImages(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const result = await this.request(`/images?${params.toString()}`);
    return result.images || result;
  }

  async getSuggestions(field, query = "") {
    const params = new URLSearchParams({ field });
    if (query) params.set("query", query);
    return this.request(`/images/suggestions?${params.toString()}`);
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

  // Favorites
  async getFavorites(folder = null) {
    const endpoint = folder
      ? `/favorites?folder=${encodeURIComponent(folder)}`
      : "/favorites";
    return this.request(endpoint);
  }

  async addFavorite(imageId) {
    return this.request("/favorites", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
  }

  async removeFavorite(imageId) {
    return this.request(`/favorites/${imageId}`, {
      method: "DELETE",
    });
  }

  async getFavoriteFolders() {
    return this.request("/favorites/folders");
  }

  async createFavoriteFolder(folderName, description = "", eventTypes = []) {
    return this.request("/favorites/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description, eventTypes }),
    });
  }

  async addImagesToFavouriteFolder(folderId, imageIds) {
    return this.request("/favorites/folder-images/batch", {
      method: "POST",
      body: JSON.stringify({ folderId, imageIds }),
    });
  }

  // Users
  async getUsers() {
    const data = await this.request("/users");
    return data.users || [];
  }

  async createUser(userData) {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: "DELETE",
    });
  }

  // Download
  async downloadImage(imageId) {
    const url = `${API_BASE_URL}/download/${imageId}`;
    const token = await offlineStorage.getToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    return response.blob();
  }

  async downloadFolder(folderName) {
    const sanitized = folderName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const url = `${API_BASE_URL}/download-folder/${encodeURIComponent(sanitized)}`;
    const token = await offlineStorage.getToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    return response.blob();
  }

  async downloadAllImages() {
    const url = `${API_BASE_URL}/download-all`;
    const token = await offlineStorage.getToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    return response.blob();
  }

  // Dropdown config
  async getDropdownConfig() {
    return this.request("/dropdown/config");
  }

  async updateDropdownConfig(eventTypes, decorTypes) {
    return this.request("/dropdown/config", {
      method: "PUT",
      body: JSON.stringify({ eventTypes, decorTypes }),
    });
  }

  // Cloudinary sync
  async syncCloudinary(action = "import") {
    return this.request("/sync/cloudinary", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  }

  async getUploadSignature(folder = "uncategorized") {
    return this.request(`/upload-signature?folder=${encodeURIComponent(folder)}`);
  }

  async destroyCloudinaryImage(imageUrl) {
    return this.request("/destroy-cloudinary", {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    });
  }
}

export default new ApiService();