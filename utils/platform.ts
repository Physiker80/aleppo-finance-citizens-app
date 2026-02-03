/**
 * Platform Detection Utilities
 * 
 * Detects whether the app is running on:
 * - Native Android via Capacitor
 * - Native iOS via Capacitor  
 * - Web browser (with mobile detection)
 * 
 * Used to conditionally render mobile-specific UI components
 * and access native device features.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Force mobile view for testing (can be set via localStorage or URL param)
 */
const FORCE_MOBILE_KEY = 'force_mobile_view';

/**
 * Check if mobile view is forced via localStorage or URL
 */
const isForcedMobile = (): boolean => {
  // Check URL param: ?mobile=true
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mobile') === 'true') {
    return true;
  }
  // Check localStorage
  return localStorage.getItem(FORCE_MOBILE_KEY) === 'true';
};

/**
 * Enable/disable forced mobile view for testing
 */
export const setForceMobileView = (enabled: boolean): void => {
  if (enabled) {
    localStorage.setItem(FORCE_MOBILE_KEY, 'true');
  } else {
    localStorage.removeItem(FORCE_MOBILE_KEY);
  }
  // Reload to apply changes
  window.location.reload();
};

/**
 * Check if running on mobile browser (not native)
 */
const isMobileBrowser = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'windows phone', 'opera mini', 'mobile'
  ];
  return mobileKeywords.some(keyword => userAgent.includes(keyword));
};

/**
 * Check if screen is mobile-sized (less than 768px)
 */
const isMobileScreen = (): boolean => {
  return window.innerWidth < 768;
};

/**
 * Check if running on a native mobile platform (Android or iOS)
 */
export const isNativeMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if should show mobile UI
 * Returns true for:
 * - Native Capacitor app
 * - Mobile browser
 * - Forced mobile view (for testing)
 * - Small screen size
 */
export const isMobile = (): boolean => {
  return isNativeMobile() || isForcedMobile() || isMobileBrowser() || isMobileScreen();
};

/**
 * Check if running specifically on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running specifically on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on web browser
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 * @returns 'android' | 'ios' | 'web'
 */
export const getPlatform = (): 'android' | 'ios' | 'web' => {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
};

/**
 * Check if the device has a notch (iPhone X style)
 * Uses CSS environment variables for detection
 */
export const hasNotch = (): boolean => {
  // Check if safe-area-inset-top is greater than 0
  const safeAreaTop = getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-top');
  return safeAreaTop !== '0px' && safeAreaTop !== '';
};

/**
 * Get device info for analytics/debugging
 */
export const getDeviceInfo = () => {
  return {
    platform: getPlatform(),
    isNative: isMobile(),
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio,
    language: navigator.language,
  };
};

/**
 * Check network connectivity status
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Subscribe to online/offline events
 */
export const onConnectivityChange = (
  callback: (isOnline: boolean) => void
): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
