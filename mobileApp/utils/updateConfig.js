// Configure these with your GitHub repo details
const UPDATE_CONFIG = {
  GITHUB_OWNER: "rajesh-341",
  GITHUB_REPO: "ImageManagement",

  // Optional: Use a custom server URL instead of GitHub
  CUSTOM_UPDATE_URL: null,

  get updateUrl() {
    if (this.CUSTOM_UPDATE_URL) return this.CUSTOM_UPDATE_URL;
    return `https://api.github.com/repos/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/releases/latest`;
  },

  get apkBaseUrl() {
    return `https://github.com/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/releases/download`;
  },
};

export default UPDATE_CONFIG;
