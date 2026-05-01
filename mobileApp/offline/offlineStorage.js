import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USER: "user",
  TOKEN: "token",
  IMAGES: "images",
  FOLDERS: "folders",
  OFFLINE_MODE: "offline_mode",
  DOWNLOAD_PATH: "download_path",
};

// Store user data
export const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error("Error storing user:", error);
  }
};

// Get stored user
export const getUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Store token
export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error("Error storing token:", error);
  }
};

// Get stored token
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// Clear auth data
export const clearAuth = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.TOKEN]);
  } catch (error) {
    console.error("Error clearing auth:", error);
  }
};

// Store images for offline
export const storeImages = async (images) => {
  try {
    await AsyncStorage.setItem(KEYS.IMAGES, JSON.stringify(images));
  } catch (error) {
    console.error("Error storing images:", error);
  }
};

// Get stored images
export const getImages = async () => {
  try {
    const imagesData = await AsyncStorage.getItem(KEYS.IMAGES);
    return imagesData ? JSON.parse(imagesData) : null;
  } catch (error) {
    console.error("Error getting images:", error);
    return null;
  }
};

// Store folders for offline
export const storeFolders = async (folders) => {
  try {
    await AsyncStorage.setItem(KEYS.FOLDERS, JSON.stringify(folders));
  } catch (error) {
    console.error("Error storing folders:", error);
  }
};

// Get stored folders
export const getFolders = async () => {
  try {
    const foldersData = await AsyncStorage.getItem(KEYS.FOLDERS);
    return foldersData ? JSON.parse(foldersData) : null;
  } catch (error) {
    console.error("Error getting folders:", error);
    return null;
  }
};

// Set offline mode
export const setOfflineMode = async (enabled) => {
  try {
    await AsyncStorage.setItem(KEYS.OFFLINE_MODE, JSON.stringify(enabled));
  } catch (error) {
    console.error("Error setting offline mode:", error);
  }
};

// Get offline mode status
export const isOfflineMode = async () => {
  try {
    const mode = await AsyncStorage.getItem(KEYS.OFFLINE_MODE);
    return mode ? JSON.parse(mode) : false;
  } catch (error) {
    console.error("Error getting offline mode:", error);
    return false;
  }
};

// Store download path
export const storeDownloadPath = async (path) => {
  try {
    await AsyncStorage.setItem(KEYS.DOWNLOAD_PATH, path);
  } catch (error) {
    console.error("Error storing download path:", error);
  }
};

// Get download path
export const getDownloadPath = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.DOWNLOAD_PATH);
  } catch (error) {
    console.error("Error getting download path:", error);
    return null;
  }
};

// Clear all offline data
export const clearOfflineData = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.IMAGES,
      KEYS.FOLDERS,
      KEYS.OFFLINE_MODE,
    ]);
  } catch (error) {
    console.error("Error clearing offline data:", error);
  }
};

export default {
  storeUser,
  getUser,
  storeToken,
  getToken,
  clearAuth,
  storeImages,
  getImages,
  storeFolders,
  getFolders,
  setOfflineMode,
  isOfflineMode,
  storeDownloadPath,
  getDownloadPath,
  clearOfflineData,
};