const RNFS = {
  DocumentDirectoryPath: '/documents',
  DownloadDirectoryPath: '/downloads',
  ExternalStorageDirectoryPath: '/storage/emulated/0',
  CachesDirectoryPath: '/caches',
  readDir: async () => [],
  readFile: async () => '',
  writeFile: async () => {},
  unlink: async () => {},
  exists: async () => false,
  mkdir: async () => {},
  downloadFile: () => ({ promise: Promise.resolve({ statusCode: 200 }) }),
};

export default RNFS;
