export const useNetInfo = () => ({ isConnected: true, isInternetReachable: true });
export function fetch() {
  return Promise.resolve({ isConnected: true, isInternetReachable: true });
}
export function addEventListener(handler) {
  handler({ isConnected: true, isInternetReachable: true });
  return () => {};
}
export default { useNetInfo, fetch, addEventListener };
