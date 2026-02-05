import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartinventorypro.app',
  appName: 'SmartInventoryPro',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Camera: {
      permissions: {
        camera: {
          prompt: 'SmartInventoryPro needs camera access to scan barcodes and QR codes'
        }
      }
    }
  }
};

export default config;
