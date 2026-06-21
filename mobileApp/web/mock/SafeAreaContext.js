import React from 'react';
import { View } from 'react-native-web';

const defaultInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export const SafeAreaProvider = ({ children, initialMetrics }) => {
  return React.createElement(View, { style: { flex: 1 } }, children);
};

export const SafeAreaView = ({ children, style, ...props }) => {
  return React.createElement(View, { style: [{ flex: 1 }, style], ...props }, children);
};

export function useSafeAreaInsets() {
  return defaultInsets;
}

export const SafeAreaInsetsContext = React.createContext(defaultInsets);
export const SafeAreaFrameContext = React.createContext(null);

export default { SafeAreaProvider, SafeAreaView, useSafeAreaInsets };
