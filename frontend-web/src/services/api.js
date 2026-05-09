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

  const response = await fetch(url, config);
  const data = await response.json();

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

  async getImages(folder = null) {
    const endpoint = folder
      ? `/images?folder=${encodeURIComponent(folder)}`
      : "/images";
    return request(endpoint);
  },

  async getFolders() {
    return request("/folders");
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

  async uploadExcel(file, folderName) {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("folderName", folderName);

    const url = `${API_BASE_URL}/upload-excel`;

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

  async getFavorites() {
    return request("/favorites");
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

  async getFavoriteStatus() {
    return request("/favorites/status");
  },

  async searchImages(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return request(`/images?${params.toString()}`);
  },

  async updateImageFolder(imageId, folderName) {
    return request(`/images/${imageId}/folder`, {
      method: "PUT",
      body: JSON.stringify({ folderName }),
    });
  },

  async moveImageToFolder(imageId, folderName) {
    return this.updateImageFolder(imageId, folderName);
  }
};

export default ApiService;
