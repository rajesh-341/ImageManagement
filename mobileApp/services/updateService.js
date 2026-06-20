import { Platform, Alert } from "react-native";
import { NativeModules } from "react-native";
import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UPDATE_CONFIG from "../utils/updateConfig";

const CURRENT_APP_VERSION = require("../version.json");

const SKIP_VERSION_KEY = "update_skip_version";
const APK_FILENAME = "ImageManagement-update.apk";
const APK_DOWNLOAD_PATH = `${RNFS.CachesDirectoryPath}/${APK_FILENAME}`;

class UpdateService {
  async checkForUpdate() {
    if (Platform.OS === "web") return { available: false };
    try {
      const response = await fetch(UPDATE_CONFIG.updateUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        if (response.status === 404) return { available: false };
        throw new Error(`HTTP ${response.status}`);
      }

      const release = await response.json();
      const tagVersion = (release.tag_name || "").replace(/^v/, "");
      if (!tagVersion) return { available: false };

      const remoteVersionCode = this.parseVersionCode(tagVersion);
      const skipVersion = await AsyncStorage.getItem(SKIP_VERSION_KEY);

      if (
        remoteVersionCode > CURRENT_APP_VERSION.versionCode &&
        skipVersion !== String(remoteVersionCode)
      ) {
        const apkAsset = release.assets?.find(
          (a) => a.name.endsWith(".apk") || a.content_type === "application/vnd.android.package-archive"
        );

        return {
          available: true,
          versionCode: remoteVersionCode,
          versionName: tagVersion,
          apkUrl: apkAsset?.browser_download_url || `${UPDATE_CONFIG.apkBaseUrl}/v${tagVersion}/ImageManagement-v${tagVersion}.apk`,
          releaseNotes: release.body || "",
          releaseUrl: release.html_url,
        };
      }

      return { available: false };
    } catch (error) {
      console.error("Update check failed:", error);
      return { available: false, error };
    }
  }

  parseVersionCode(versionName) {
    const parts = versionName.split(".").map(Number);
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }

  async downloadUpdate(apkUrl, onProgress) {
    const exists = await RNFS.exists(APK_DOWNLOAD_PATH);
    if (exists) {
      await RNFS.unlink(APK_DOWNLOAD_PATH);
    }

    const download = RNFS.downloadFile({
      fromUrl: apkUrl,
      toFile: APK_DOWNLOAD_PATH,
      progressDivider: 5,
      progress: (res) => {
        if (onProgress) {
          const pct = res.bytesWritten / res.contentLength;
          onProgress(Math.min(pct, 1));
        }
      },
    });

    const result = await download.promise;
    if (result.statusCode === 200) {
      return APK_DOWNLOAD_PATH;
    }
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  async installUpdate(apkPath) {
    if (Platform.OS !== "android") return;

    try {
      await NativeModules.UpdateModule.installApk(apkPath);
    } catch (e) {
      Alert.alert(
        "Update Error",
        `Could not install the update automatically.\n\nYou can find the APK at:\n${apkPath}\n\nOpen it manually to install.`
      );
    }
  }

  async skipVersion(versionCode) {
    await AsyncStorage.setItem(SKIP_VERSION_KEY, String(versionCode));
  }

  async getCurrentVersion() {
    return { ...CURRENT_APP_VERSION };
  }
}

export default new UpdateService();
