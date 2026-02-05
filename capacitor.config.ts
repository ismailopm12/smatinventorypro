import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartinventorypro.app',
  appName: 'SmartInventoryPro',
  webDir: 'dist',
  plugins: {
    Camera: {
      quality: 90,
      allowEditing: true,
      resultType: 'uri',
      saveToGallery: false,
      width: 1920,
      height: 1080,
      correctOrientation: true
    }
  },
  server: {
    allowNavigation: ['localhost'],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
