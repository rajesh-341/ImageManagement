const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const RETRY_DELAY = 1000;
const MAX_RETRIES = 2;

const getHeaders = (includeAuth = true) => {
  const headers = { "Content-Type": "application/json" };
  if (includeAuth) {
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth_token\s*=\s*([^;]*).*$)|^.*$/, "$1");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-Requested-With"] = "XMLHttpRequest";
    }
  }
  return headers;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const request = async (endpoint, options = {}, includeAuth = true, retries = MAX_RETRIES) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(includeAuth),
      ...options.headers,
    },
    credentials: "include",
  };

  let response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    config.signal = controller.signal;
    response = await fetch(url, config);
    clearTimeout(timeoutId);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    if (retries > 0) {
      await wait(RETRY_DELAY);
      return request(endpoint, options, includeAuth, retries - 1);
    }
    throw new Error(`Network error: unable to reach server. Check that the backend is running and CORS is configured.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (status ${response.status}). Check the backend logs.`);
  }

  if (!response.ok) {
    if (response.status >= 500 && retries > 0) {
      await wait(RETRY_DELAY);
      return request(endpoint, options, includeAuth, retries - 1);
    }
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const ApiService = {
  async login(username, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }, false);

    if (data.success && data.user) {
      sessionStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try {
      await request("/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("user");
    }
  },

  getCurrentUser() {
    const userData = sessionStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  },

  async getImages(folder = null, page = 1, limit = 50) {
    const params = new URLSearchParams({ page, limit });
    if (folder) params.set("folder", folder);
    const result = await request(`/images?${params.toString()}`);
    return { images: result.images || [], total: result.total || 0, hasMore: result.hasMore || false };
  },

  async getAllImages(folder = null) {
    return this.getImages(folder, 1, 200);
  },

  async getUploadSignature(folder = "uncategorized") {
    return request(`/upload-signature?folder=${encodeURIComponent(folder)}`);
  },

  async uploadDirectToCloudinary(file, signatureData) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", signatureData.timestamp);
    formData.append("signature", signatureData.signature);
    formData.append("folder", signatureData.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Cloudinary upload failed");
    return data;
  },

  async getFolders(scope = "home") {
    return request(`/folders?scope=${encodeURIComponent(scope)}`);
  },

  async createFolder(folderName, description = "", eventTypes = []) {
    return request("/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description, eventTypes }),
    });
  },

  async updateFolder(id, name, eventTypes = undefined) {
    const body = { name };
    if (eventTypes !== undefined) body.eventTypes = eventTypes;
    return request(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async deleteFolder(id) {
    return request(`/folders/${id}`, {
      method: "DELETE",
    });
  },

  async getImageById(id) {
    return request(`/images/${id}`);
  },

  async uploadImage(imageData) {
    return request("/images", {
      method: "POST",
      body: JSON.stringify(imageData),
    });
  },

  async updateImage(id, imageData) {
    return request(`/images/${id}`, {
      method: "PUT",
      body: JSON.stringify(imageData),
    });
  },

  async deleteImage(id) {
    return request(`/images/${id}`, {
      method: "DELETE",
    });
  },

  async uploadFile(file, folderName = "") {
    const formData = new FormData();
    formData.append("image", file);
    if (folderName) {
      formData.append("folderName", folderName);
    }

    const url = `${API_BASE_URL}/upload`;
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth_token\s*=\s*([^;]*).*$)|^.*$/, "$1");

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: token ? { "Authorization": `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" } : { "X-Requested-With": "XMLHttpRequest" },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Upload failed: ${response.status}`);
    }

    return data;
  },

  async searchImages(filters, page = 1, limit = 0) {
    const params = new URLSearchParams({ page, limit: limit || 0 });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const result = await request(`/images?${params.toString()}`);
    return result.images || result;
  },

  async updateImageFolder(imageId, folderName) {
    return request(`/images/${imageId}/folder`, {
      method: "PUT",
      body: JSON.stringify({ folderName }),
    });
  },

  async moveImageToFolder(imageId, folderName) {
    return this.updateImageFolder(imageId, folderName);
  },

  async getFavorites(folder = null) {
    const endpoint = folder
      ? `/favorites?folder=${encodeURIComponent(folder)}`
      : "/favorites";
    return request(endpoint);
  },

  async addFavorite(imageId) {
    return request("/favorites", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
  },

  async removeFavorite(imageId) {
    return request(`/favorites/${imageId}`, {
      method: "DELETE",
    });
  },

  async getFavoriteFolders() {
    return request("/favorites/folders");
  },

  async createFavoriteFolder(folderName, description = "", eventTypes = []) {
    return request("/favorites/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description, eventTypes }),
    });
  },

  async addImagesToFavouriteFolder(folderId, imageIds) {
    return request("/favorites/folder-images/batch", {
      method: "POST",
      body: JSON.stringify({ folderId, imageIds }),
    });
  },

  async getUsers() {
    const data = await request("/users");
    return data.users || [];
  },

  async createUser(userData) {
    return request("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id, userData) {
    return request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(id) {
    return request(`/users/${id}`, {
      method: "DELETE",
    });
  },

  async downloadImage(imageId, useCustomPath = false) {
    const url = `${API_BASE_URL}/download/${imageId}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Download failed");
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `image_${imageId}.webp`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    if (useCustomPath && window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: "Image file",
            accept: { "image/*": [".webp", ".jpg", ".png", ".jpeg"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, path: handle.name };
      } catch (err) {
        if (err.name === "AbortError") return { success: false, cancelled: true };
        throw new Error("Failed to save file: " + err.message);
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true };
  },

  async downloadFolder(folderName) {
    const sanitized = folderName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const url = `${API_BASE_URL}/download-folder/${encodeURIComponent(sanitized)}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `${sanitized}_${Date.now()}.zip`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true };
  },

  async downloadFavoriteFolder(folderId) {
    const url = `${API_BASE_URL}/download-favorite-folder/${folderId}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `favorite_folder_${folderId}_${Date.now()}.zip`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true };
  },

  async downloadAllImages() {
    const url = `${API_BASE_URL}/download-all`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Download failed");
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `all_images_${Date.now()}.zip`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true };
  },

  async getSuggestions(field, query = "") {
    const params = new URLSearchParams({ field });
    if (query) params.set("query", query);
    return request(`/images/suggestions?${params.toString()}`);
  },

  async destroyCloudinaryImage(imageUrl) {
    return request("/destroy-cloudinary", {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    });
  },

  async getDropdownConfig() {
    return request("/dropdown/config");
  },

  async updateDropdownConfig(eventTypes, decorTypes) {
    return request("/dropdown/config", {
      method: "PUT",
      body: JSON.stringify({ eventTypes, decorTypes }),
    });
  },

  async syncCloudinary(action = "import") {
    return request("/sync/cloudinary", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },
};

export default ApiService;
