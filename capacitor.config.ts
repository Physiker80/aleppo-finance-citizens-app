import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aleppo.finance.system',
  appName: 'مديرية مالية حلب',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f3c35",
      showSpinner: false,
      androidSpinnerStyle: "large",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0f3c35"
    }
  }
};

export default config;
