import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

if (Platform.OS === 'web') {
  const rootTag = document.getElementById('root');
  try {
    AppRegistry.runApplication(appName, {
      rootTag,
    });
  } catch (e) {
    rootTag.innerHTML = `<pre style="color:red;padding:20px;font-size:14px">${e.stack || e.message || e}</pre>`;
  }
}
