import offlineStorage from "../offline/offlineStorage";

const API_BASE_URL = "http://localhost:5000/api";

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
    return this.request("/folders");
  }

  async createFolder(folderName, description = "") {
    return this.request("/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description }),
    });
  }

  async deleteFolder(id) {
    return this.request(`/folders/${id}`, {
      method: "DELETE",
    });
  }

  // Images
  async getImages(folder = null) {
    const endpoint = folder
      ? `/images?folder=${encodeURIComponent(folder)}`
      : "/images";
    return this.request(endpoint);
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
}

export default new ApiService();
