/**
 * Push Notifications Service for Mobile App
 * 
 * يستخدم Firebase Cloud Messaging (FCM) عبر Capacitor
 * لإرسال واستقبال الإشعارات على Android
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNativeMobile, isAndroid } from '../utils/platform';

// واجهة إعدادات الإشعارات
interface PushNotificationSettings {
  enabled: boolean;
  token: string | null;
  registeredAt: string | null;
}

// الحصول على إعدادات الإشعارات من localStorage
const getSettings = (): PushNotificationSettings => {
  try {
    const raw = localStorage.getItem('pushNotificationSettings');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { enabled: false, token: null, registeredAt: null };
};

// حفظ إعدادات الإشعارات
const saveSettings = (settings: PushNotificationSettings): void => {
  try {
    localStorage.setItem('pushNotificationSettings', JSON.stringify(settings));
  } catch {
    console.error('[PushNotifications] Failed to save settings');
  }
};

/**
 * طلب إذن الإشعارات من المستخدم
 */
export const requestPermission = async (): Promise<boolean> => {
  if (!isNativeMobile()) {
    console.log('[PushNotifications] Not on mobile platform, skipping');
    return false;
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    }
    
    return permStatus.receive === 'granted';
  } catch (error) {
    console.error('[PushNotifications] Permission request failed:', error);
    return false;
  }
};

/**
 * تسجيل الجهاز للحصول على الإشعارات
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!isNativeMobile()) {
    console.log('[PushNotifications] Not on mobile platform');
    return null;
  }

  try {
    // طلب الإذن أولاً
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.log('[PushNotifications] Permission denied');
      return null;
    }

    // تسجيل الجهاز
    await PushNotifications.register();

    // انتظار الحصول على الـ token
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('[PushNotifications] Registration successful, token:', token.value);
        
        // حفظ الـ token في localStorage
        const settings: PushNotificationSettings = {
          enabled: true,
          token: token.value,
          registeredAt: new Date().toISOString(),
        };
        saveSettings(settings);
        
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[PushNotifications] Registration error:', error);
        resolve(null);
      });

      // Timeout بعد 10 ثواني
      setTimeout(() => {
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error('[PushNotifications] Registration failed:', error);
    return null;
  }
};

/**
 * إعداد مستمعي الإشعارات
 */
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationAction?: (notification: ActionPerformed) => void
): void => {
  if (!isNativeMobile()) {
    return;
  }

  // عند استلام إشعار والتطبيق في المقدمة
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[PushNotifications] Notification received:', notification);
    
    // حفظ الإشعار في localStorage للعرض لاحقاً
    saveNotificationToHistory(notification);
    
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // عند الضغط على إشعار
  PushNotifications.addListener('pushNotificationActionPerformed', (actionPerformed: ActionPerformed) => {
    console.log('[PushNotifications] Action performed:', actionPerformed);
    
    // التنقل إلى الصفحة المناسبة بناءً على البيانات
    handleNotificationAction(actionPerformed);
    
    if (onNotificationAction) {
      onNotificationAction(actionPerformed);
    }
  });
};

/**
 * حفظ الإشعار في سجل التاريخ
 */
const saveNotificationToHistory = (notification: PushNotificationSchema): void => {
  try {
    const raw = localStorage.getItem('notificationHistory') || '[]';
    const history = JSON.parse(raw);
    
    history.unshift({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      receivedAt: new Date().toISOString(),
      read: false,
    });
    
    // الاحتفاظ بآخر 100 إشعار فقط
    if (history.length > 100) {
      history.pop();
    }
    
    localStorage.setItem('notificationHistory', JSON.stringify(history));
  } catch (error) {
    console.error('[PushNotifications] Failed to save notification to history:', error);
  }
};

/**
 * معالجة الضغط على الإشعار
 */
const handleNotificationAction = (action: ActionPerformed): void => {
  const data = action.notification.data;
  
  if (data?.ticketId) {
    // التنقل إلى صفحة متابعة الطلب مع رقم الطلب
    window.location.hash = `#/track?id=${encodeURIComponent(data.ticketId)}`;
  } else if (data?.appointmentId) {
    // التنقل إلى صفحة تأكيد الموعد
    window.location.hash = '#/appointment-booking';
  } else if (data?.route) {
    // التنقل إلى route محدد
    window.location.hash = data.route;
  } else {
    // التنقل إلى الصفحة الرئيسية
    window.location.hash = '#/';
  }
};

/**
 * إلغاء تسجيل الجهاز من الإشعارات
 */
export const unregisterFromPushNotifications = async (): Promise<void> => {
  if (!isNativeMobile()) return;

  try {
    await PushNotifications.removeAllListeners();
    
    // مسح الإعدادات
    const settings: PushNotificationSettings = {
      enabled: false,
      token: null,
      registeredAt: null,
    };
    saveSettings(settings);
    
    console.log('[PushNotifications] Unregistered successfully');
  } catch (error) {
    console.error('[PushNotifications] Unregister failed:', error);
  }
};

/**
 * الحصول على FCM token المحفوظ
 */
export const getSavedToken = (): string | null => {
  const settings = getSettings();
  return settings.token;
};

/**
 * التحقق من حالة الإشعارات
 */
export const isNotificationsEnabled = (): boolean => {
  const settings = getSettings();
  return settings.enabled && settings.token !== null;
};

/**
 * الحصول على سجل الإشعارات
 */
export const getNotificationHistory = (): any[] => {
  try {
    const raw = localStorage.getItem('notificationHistory') || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * تحديث حالة قراءة الإشعار
 */
export const markNotificationAsRead = (notificationId: string): void => {
  try {
    const raw = localStorage.getItem('notificationHistory') || '[]';
    const history = JSON.parse(raw);
    
    const updated = history.map((n: any) => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    
    localStorage.setItem('notificationHistory', JSON.stringify(updated));
  } catch {
    // ignore
  }
};

/**
 * مسح سجل الإشعارات
 */
export const clearNotificationHistory = (): void => {
  localStorage.removeItem('notificationHistory');
};

/**
 * تهيئة نظام الإشعارات عند بدء التطبيق
 */
export const initializePushNotifications = async (): Promise<void> => {
  if (!isNativeMobile()) {
    console.log('[PushNotifications] Web platform, skipping initialization');
    return;
  }

  console.log('[PushNotifications] Initializing...');

  // التحقق من الإعدادات المحفوظة
  const settings = getSettings();
  
  if (settings.enabled && settings.token) {
    console.log('[PushNotifications] Already registered, setting up listeners');
    setupNotificationListeners();
  } else {
    console.log('[PushNotifications] Not registered, will request permission on first use');
  }
};

export default {
  requestPermission,
  registerForPushNotifications,
  setupNotificationListeners,
  unregisterFromPushNotifications,
  getSavedToken,
  isNotificationsEnabled,
  getNotificationHistory,
  markNotificationAsRead,
  clearNotificationHistory,
  initializePushNotifications,
};
