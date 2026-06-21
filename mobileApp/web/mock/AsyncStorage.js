const store = {};

const AsyncStorage = {
  getItem: async (key) => store[key] ?? null,
  setItem: async (key, value) => { store[key] = value; },
  removeItem: async (key) => { delete store[key]; },
  multiRemove: async (keys) => { keys.forEach(k => delete store[k]); },
  clear: async () => { Object.keys(store).forEach(k => delete store[k]); },
  getAllKeys: async () => Object.keys(store),
};

export default AsyncStorage;
