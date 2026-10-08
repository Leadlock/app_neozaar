import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neozaarios.app',
  appName: 'NeoZaar',
  webDir: 'public',
  overrideUserAgent: 'NeoZaarMobileApp',
  server: {
    url: 'https://www.neozaar.com',
    allowNavigation: ['www.neozaar.com', 'neozaar.com', 'app.neozaar.skilladders.com'],
    errorPath: 'error.html'
  },
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#000000'
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: true,
      setAccessoryBarVisible: false,
    },
  },
};

export default config;
