import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native-web';

function createNativeStackNavigator() {
  function Navigator({ initialRouteName, screenOptions, children }) {
    const screens = useMemo(() => {
      const map = {};
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.props) {
          map[child.props.name] = {
            component: child.props.component,
            options: child.props.options,
          };
        }
      });
      return map;
    }, [children]);

    const [stack, setStack] = useState([initialRouteName]);
    const [params, setParams] = useState({});

    const currentRoute = stack[stack.length - 1];
    const currentScreen = screens[currentRoute];

    const navigation = useMemo(() => ({
      navigate: (name, p) => {
        setStack(prev => [...prev, name]);
        if (p) setParams(prev => ({ ...prev, [name]: p }));
      },
      replace: (name, p) => {
        setStack(prev => [...prev.slice(0, -1), name]);
        if (p) setParams(prev => ({ ...prev, [name]: p }));
      },
      goBack: () => {
        setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
      },
      setParams: (p) => setParams(prev => ({ ...prev, [currentRoute]: { ...prev[currentRoute], ...p } })),
      addListener: () => () => {},
      removeListener: () => {},
      reset: (state) => {
        if (state?.routes?.length) {
          setStack(state.routes.map(r => r.name));
        }
      },
      isFocused: () => true,
      getState: () => ({ routes: stack.map(name => ({ name, key: name })), index: stack.length - 1 }),
    }), [stack, currentRoute]);

    const route = { name: currentRoute, params: params[currentRoute] || {}, key: currentRoute };

    if (!currentScreen) {
      return React.createElement(View, { style: styles.container },
        React.createElement('pre', { style: { padding: 20, color: 'red', fontSize: 16 } },
          `Screen '${currentRoute}' not found. Available: ${Object.keys(screens).join(', ')}`
        )
      );
    }

    const combinedOptions = { ...(screenOptions || {}), ...(currentScreen.options || {}) };

    return React.createElement(View, { style: styles.container },
      React.createElement(currentScreen.component, { navigation, route })
    );
  }

  function Screen(_props) {
    return null;
  }

  return { Navigator, Screen };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});

export { createNativeStackNavigator };
