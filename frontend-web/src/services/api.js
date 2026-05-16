const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getHeaders = (includeAuth = true) => {
  const headers = { "Content-Type": "application/json" };
  return headers;
};

const request = async (endpoint, options = {}, includeAuth = true) => {
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
    response = await fetch(url, config);
  } catch (err) {
    throw new Error(`Network error: unable to reach server. Check that the backend is running and CORS is configured.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (status ${response.status}). Check the backend logs.`);
  }

  if (!response.ok) {
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

  async createFolder(folderName, description = "") {
    return request("/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description }),
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

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Upload failed: ${response.status}`);
    }

    return data;
  },

  async searchImages(filters, page = 1, limit = 200) {
    const params = new URLSearchParams({ page, limit });
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

  async createFavoriteFolder(folderName, description = "") {
    return request("/favorites/folders", {
      method: "POST",
      body: JSON.stringify({ folderName, description }),
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

  async downloadImage(imageId) {
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
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true };
  }
};

export default ApiService;
