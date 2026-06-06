import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

if (Platform.OS === 'web') {
  window.onerror = (msg, url, line, col, err) => {
    document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">${msg}\n${err?.stack || ''}</pre>`;
  };
  const rootTag = document.getElementById('root') || document.getElementById('app');
  if (rootTag) {
    try {
      AppRegistry.runApplication(appName, { rootTag });
    } catch (e) {
      document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">${e.stack || e}</pre>`;
    }
  }
}
