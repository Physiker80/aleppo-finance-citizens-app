/**
 * 📱 Hook لتهيئة تطبيق المحمول
 * يقوم بإعداد الإشعارات والمزامنة والتخزين المحلي
 */

import { useEffect, useRef, useState } from 'react';
import { isMobile } from '../utils/platform';
import { 
  registerForPushNotifications, 
  setupNotificationListeners 
} from '../services/mobilePushNotifications';
import { 
  registerSyncOnReconnect, 
  cleanupExpiredData,
  getPendingCount 
} from '../services/offlineStorage';

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
    // فقط على المحمول
    if (!isMobile()) {
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
        
        // 5. تسجيل المزامنة عند عودة الاتصال
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
    };
  }, []);
  
  /**
   * تحديث عدد الطلبات المعلقة
   */
  const refreshPendingCount = async () => {
    if (!isMobile()) return;
    const pending = await getPendingCount();
    setState(prev => ({ ...prev, pendingRequests: pending }));
  };
  
  return {
    ...state,
    refreshPendingCount,
  };
}

export default useMobileInit;
