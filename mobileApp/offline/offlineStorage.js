import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USER: "user",
  TOKEN: "token",
  IMAGES: "images",
  FOLDERS: "folders",
  OFFLINE_MODE: "offline_mode",
  DOWNLOAD_PATH: "download_path",
  FAVOURITES: "favourites",
  FAVOURITE_FOLDERS: "favourite_folders",
  FAVOURITE_FOLDER_IMAGES: "favourite_folder_images",
  IMAGE_CACHE_PATHS: "image_cache_paths",
  IMAGE_VERSIONS: "image_versions",
  LAST_SYNC: "last_sync",
  SYNC_IN_PROGRESS: "sync_in_progress",
  SYNC_QUEUE: "sync_queue",
};

export const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error("Error storing user:", error);
  }
};

export const getUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error("Error storing token:", error);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const clearAuth = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.TOKEN]);
  } catch (error) {
    console.error("Error clearing auth:", error);
  }
};

export const storeImages = async (images) => {
  try {
    await AsyncStorage.setItem(KEYS.IMAGES, JSON.stringify(images));
  } catch (error) {
    console.error("Error storing images:", error);
  }
};

export const getImages = async () => {
  try {
    const imagesData = await AsyncStorage.getItem(KEYS.IMAGES);
    return imagesData ? JSON.parse(imagesData) : null;
  } catch (error) {
    console.error("Error getting images:", error);
    return null;
  }
};

export const storeFolders = async (folders) => {
  try {
    await AsyncStorage.setItem(KEYS.FOLDERS, JSON.stringify(folders));
  } catch (error) {
    console.error("Error storing folders:", error);
  }
};

export const getFolders = async () => {
  try {
    const foldersData = await AsyncStorage.getItem(KEYS.FOLDERS);
    return foldersData ? JSON.parse(foldersData) : null;
  } catch (error) {
    console.error("Error getting folders:", error);
    return null;
  }
};

export const setOfflineMode = async (enabled) => {
  try {
    await AsyncStorage.setItem(KEYS.OFFLINE_MODE, JSON.stringify(enabled));
  } catch (error) {
    console.error("Error setting offline mode:", error);
  }
};

export const isOfflineMode = async () => {
  try {
    const mode = await AsyncStorage.getItem(KEYS.OFFLINE_MODE);
    return mode ? JSON.parse(mode) : false;
  } catch (error) {
    console.error("Error getting offline mode:", error);
    return false;
  }
};

export const storeDownloadPath = async (path) => {
  try {
    await AsyncStorage.setItem(KEYS.DOWNLOAD_PATH, path);
  } catch (error) {
    console.error("Error storing download path:", error);
  }
};

export const getDownloadPath = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.DOWNLOAD_PATH);
  } catch (error) {
    console.error("Error getting download path:", error);
    return null;
  }
};

export const storeFavourites = async (favourites) => {
  try {
    await AsyncStorage.setItem(KEYS.FAVOURITES, JSON.stringify(favourites));
  } catch (error) {
    console.error("Error storing favourites:", error);
  }
};

export const getFavourites = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.FAVOURITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting favourites:", error);
    return [];
  }
};

export const storeFavouriteFolders = async (folders) => {
  try {
    await AsyncStorage.setItem(KEYS.FAVOURITE_FOLDERS, JSON.stringify(folders));
  } catch (error) {
    console.error("Error storing favourite folders:", error);
  }
};

export const getFavouriteFolders = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.FAVOURITE_FOLDERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting favourite folders:", error);
    return [];
  }
};

export const storeFavouriteFolderImages = async (mapping) => {
  try {
    await AsyncStorage.setItem(KEYS.FAVOURITE_FOLDER_IMAGES, JSON.stringify(mapping));
  } catch (error) {
    console.error("Error storing favourite folder images:", error);
  }
};

export const getFavouriteFolderImages = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.FAVOURITE_FOLDER_IMAGES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting favourite folder images:", error);
    return {};
  }
};

export const addToSyncQueue = async (action) => {
  try {
    const queue = await getSyncQueue();
    queue.push({ ...action, timestamp: Date.now() });
    await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to sync queue:", error);
  }
};

export const getSyncQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting sync queue:", error);
    return [];
  }
};

export const clearSyncQueue = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.SYNC_QUEUE);
  } catch (error) {
    console.error("Error clearing sync queue:", error);
  }
};

export const storeImageCachePaths = async (cacheMap) => {
  try {
    await AsyncStorage.setItem(KEYS.IMAGE_CACHE_PATHS, JSON.stringify(cacheMap));
  } catch (error) {
    console.error("Error storing image cache paths:", error);
  }
};

export const getImageCachePaths = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.IMAGE_CACHE_PATHS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting image cache paths:", error);
    return {};
  }
};

export const storeImageVersions = async (versions) => {
  try {
    await AsyncStorage.setItem(KEYS.IMAGE_VERSIONS, JSON.stringify(versions));
  } catch (error) {
    console.error("Error storing image versions:", error);
  }
};

export const getImageVersions = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.IMAGE_VERSIONS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting image versions:", error);
    return {};
  }
};

export const setLastSync = async (timestamp) => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, JSON.stringify(timestamp));
  } catch (error) {
    console.error("Error setting last sync:", error);
  }
};

export const getLastSync = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting last sync:", error);
    return null;
  }
};

export const setSyncInProgress = async (inProgress) => {
  try {
    await AsyncStorage.setItem(KEYS.SYNC_IN_PROGRESS, JSON.stringify(inProgress));
  } catch (error) {
    console.error("Error setting sync in progress:", error);
  }
};

export const getSyncInProgress = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SYNC_IN_PROGRESS);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error("Error getting sync in progress:", error);
    return false;
  }
};

export const clearOfflineData = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.IMAGES,
      KEYS.FOLDERS,
      KEYS.OFFLINE_MODE,
      KEYS.FAVOURITES,
      KEYS.FAVOURITE_FOLDERS,
      KEYS.FAVOURITE_FOLDER_IMAGES,
      KEYS.IMAGE_CACHE_PATHS,
      KEYS.IMAGE_VERSIONS,
      KEYS.LAST_SYNC,
      KEYS.SYNC_IN_PROGRESS,
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
  storeFavourites,
  getFavourites,
  storeFavouriteFolders,
  getFavouriteFolders,
  storeFavouriteFolderImages,
  getFavouriteFolderImages,
  addToSyncQueue,
  getSyncQueue,
  clearSyncQueue,
  storeImageCachePaths,
  getImageCachePaths,
  storeImageVersions,
  getImageVersions,
  setLastSync,
  getLastSync,
  setSyncInProgress,
  getSyncInProgress,
  clearOfflineData,
};
