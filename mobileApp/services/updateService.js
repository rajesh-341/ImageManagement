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

    const skipVersion = await AsyncStorage.getItem(SKIP_VERSION_KEY);

    const result = await this._checkFromLatestJson(skipVersion);
    if (result) return result;

    return this._checkFromGitHubApi(skipVersion);
  }

  async _checkFromLatestJson(skipVersion) {
    const url = UPDATE_CONFIG.latestJsonUrl;
    if (!url) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = await response.json();
      const remoteVersionCode = data.versionCode;
      if (!remoteVersionCode || !data.versionName || !data.apkUrl) return null;

      if (
        remoteVersionCode > CURRENT_APP_VERSION.versionCode &&
        skipVersion !== String(remoteVersionCode)
      ) {
        return {
          available: true,
          versionCode: remoteVersionCode,
          versionName: data.versionName,
          apkUrl: data.apkUrl,
          releaseNotes: "",
          releaseUrl: data.releaseUrl || "",
        };
      }

      return { available: false, message: "You're on the latest version." };
    } catch {
      return null;
    }
  }

  async _checkFromGitHubApi(skipVersion) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(UPDATE_CONFIG.updateUrl, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          return { available: false, message: "No releases found on GitHub." };
        }
        if (response.status === 403) {
          return { available: false, message: "GitHub API rate limit reached. Try again later." };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const release = await response.json();
      const tagVersion = (release.tag_name || "").replace(/^v/, "");
      if (!tagVersion) return { available: false, message: "Invalid release tag." };

      const remoteVersionCode = this.parseVersionCode(tagVersion);

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

      return { available: false, message: "You're on the latest version." };
    } catch (error) {
      console.error("GitHub API update check failed:", error);
      const message = error.name === "AbortError"
        ? "Update check timed out. Check your internet connection."
        : `Update check failed: ${error.message}`;
      return { available: false, error, message };
    }
  }

  parseVersionCode(versionName) {
    const parts = versionName.split(".");
    const major = parseInt(parts[0] || "0", 10);
    const minor = parseInt(parts[1] || "0", 10);
    const patch = parseInt(parts[2] || "0", 10);
    if (patch >= 100000) {
      return patch;
    }
    return major * 10000 + minor * 100 + patch;
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
