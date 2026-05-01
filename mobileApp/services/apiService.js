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
    const token = await this.getToken();
    
    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: token }),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  // Auth
  async login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  // Images
  async getImages(folder = null) {
    const endpoint = folder 
      ? `/images?folder=${encodeURIComponent(folder)}` 
      : "/images";
    return this.request(endpoint);
  }

  async getFolders() {
    return this.request("/images/folders");
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

  // Token helpers
  async getToken() {
    const offlineStorage = require("./offline/offlineStorage");
    return offlineStorage.getToken();
  }

  async clearToken() {
    const offlineStorage = require("./offline/offlineStorage");
    return offlineStorage.clearAuth();
  }
}

export default new ApiService();