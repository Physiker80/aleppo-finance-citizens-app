import type { CapacitorConfig } from '@capacitor/cli';
import 'dotenv/config';
import os from 'os';

// Helper to obtain first non-internal IPv4 address for auto dev URL
const getLANIPv4 = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const adapters = nets[name] || [];
    for (const ni of adapters) {
      if (ni && ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return '127.0.0.1';
};

// Build a development server URL from env or fallback to LAN IP:5175 when CAP_USE_DEV_SERVER=1
const DEV_SERVER_URL =
  process.env.CAP_SERVER_URL ||
  process.env.DEV_SERVER_URL ||
  (process.env.CAP_USE_DEV_SERVER === '1'
    ? `http://${getLANIPv4()}:${process.env.DEV_SERVER_PORT || '5175'}`
    : undefined);

const config: CapacitorConfig = {
  appId: 'com.aleppo.finance.system',
  appName: 'نظام الاستعلامات والشكاوى',
  webDir: 'dist',
  server: DEV_SERVER_URL
    ? {
      // Development: point WebView to Vite dev server
      url: DEV_SERVER_URL,
      cleartext: true,
      allowNavigation: ['*'],
    }
    : {
      // Production (default): serve from local assets
      androidScheme: 'https',
      allowNavigation: ['*'],
    },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f3c35",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      splashFullScreen: true,
      splashImmersive: true,
      launchFadeOutDuration: 500
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0f3c35"
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Haptics: {
      selectionStartDuration: 25,
      selectionChangeDuration: 25
    },
    Camera: {
      saveToGallery: false,
      promptLabelHeader: "اختر مصدر الصورة",
      promptLabelPhoto: "من المعرض",
      promptLabelPicture: "التقاط صورة"
    }
  }
};

export default config;
