/**
 * 📱 Hook لتهيئة تطبيق المحمول
 * يقوم بإعداد الإشعارات والمزامنة والتخزين المحلي
 */

import { useEffect, useRef, useState } from 'react';
import { isNativeMobile } from '../utils/platform';
import { 
  registerForPushNotifications, 
  setupNotificationListeners 
} from '../services/mobilePushNotifications';
import { 
  registerSyncOnReconnect, 
  cleanupExpiredData,
  getPendingCount 
} from '../services/offlineStorage';
import {
  registerDeviceForNotifications,
  startListeningForNotifications,
  stopListeningForNotifications,
  onNotificationReceived,
} from '../services/notificationBridge';

interface MobileInitState {
  isInitialized: boolean;
  pushEnabled: boolean;
  pendingRequests: number;
  error: string | null;
}

/**
 * Hook لتهيئة جميع ميزات المحمول
 */
export function useMobileInit() {
  const [state, setState] = useState<MobileInitState>({
    isInitialized: false,
    pushEnabled: false,
    pendingRequests: 0,
    error: null,
  });
  
  const cleanupRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // فقط على المنصة الأصلية (Capacitor)
    if (!isNativeMobile()) {
      setState(prev => ({ ...prev, isInitialized: true }));
      return;
    }
    
    const initMobile = async () => {
      try {
        console.log('[MobileInit] Starting mobile initialization...');
        
        // 1. تنظيف البيانات المنتهية الصلاحية
        await cleanupExpiredData();
        
        // 2. جلب عدد الطلبات المعلقة
        const pending = await getPendingCount();
        setState(prev => ({ ...prev, pendingRequests: pending }));
        
        // 3. إعداد الإشعارات
        try {
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            setState(prev => ({ ...prev, pushEnabled: true }));
            console.log('[MobileInit] Push notifications enabled');
          }
        } catch (pushError) {
          console.warn('[MobileInit] Push notifications failed:', pushError);
        }
        
        // 4. إعداد مستمعي الإشعارات
        setupNotificationListeners();
        
        // 5. تسجيل الجهاز في نظام الإشعارات المركزي
        try {
          const currentUser = localStorage.getItem('currentUser');
          let employeeUsername: string | undefined;
          let department: string | undefined;
          
          if (currentUser) {
            const user = JSON.parse(currentUser);
            employeeUsername = user.username;
            department = user.department;
          }
          
          await registerDeviceForNotifications(employeeUsername, department);
          console.log('[MobileInit] Device registered for cross-platform notifications');
          
          // بدء الاستماع للإشعارات من Supabase
          startListeningForNotifications(employeeUsername, department);
          
        } catch (bridgeError) {
          console.warn('[MobileInit] Notification bridge setup failed:', bridgeError);
        }
        
        // 6. تسجيل المزامنة عند عودة الاتصال
        cleanupRef.current = registerSyncOnReconnect(async () => {
          console.log('[MobileInit] Connection restored, syncing...');
          const newPending = await getPendingCount();
          setState(prev => ({ ...prev, pendingRequests: newPending }));
        });
        
        setState(prev => ({ ...prev, isInitialized: true }));
        console.log('[MobileInit] Mobile initialization complete');
        
      } catch (error) {
        console.error('[MobileInit] Initialization failed:', error);
        setState(prev => ({ 
          ...prev, 
          isInitialized: true, 
          error: error instanceof Error ? error.message : 'فشل في التهيئة' 
        }));
      }
    };
    
    initMobile();
    
    // تنظيف عند إلغاء التثبيت
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      // إيقاف الاستماع للإشعارات
      stopListeningForNotifications();
    };
  }, []);
  
  /**
   * تحديث عدد الطلبات المعلقة
   */
  const refreshPendingCount = async () => {
    if (!isNativeMobile()) return;
    const pending = await getPendingCount();
    setState(prev => ({ ...prev, pendingRequests: pending }));
  };
  
  return {
    ...state,
    refreshPendingCount,
  };
}

export default useMobileInit;
