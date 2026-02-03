/**
 * Platform Detection Utilities
 * 
 * Detects whether the app is running on:
 * - Native Android via Capacitor
 * - Native iOS via Capacitor  
 * - Web browser
 * 
 * Used to conditionally render mobile-specific UI components
 * and access native device features.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a native mobile platform (Android or iOS)
 */
export const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
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
