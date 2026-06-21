const RNFS = {
  DocumentDirectoryPath: '/documents',
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
