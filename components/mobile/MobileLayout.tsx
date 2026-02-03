/**
 * MobileLayout - Wrapper للتطبيق على الموبايل
 * 
 * يجمع MobileHeader و MobileDrawer ويوفر:
 * - تخطيط متوافق مع الموبايل
 * - Safe areas للهواتف ذات الـ notch
 * - إدارة حالة القائمة الجانبية
 * - تهيئة ميزات المحمول (إشعارات، تخزين)
 */

import React, { useState, useEffect } from 'react';
import MobileHeader from './MobileHeader';
import MobileDrawer from './MobileDrawer';
import MobileStatsBar from './MobileStatsBar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isMobile, isOnline } from '../../utils/platform';
import useMobileInit from '../../hooks/useMobileInit';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/');
  const [online, setOnline] = useState(isOnline());
  
  // تهيئة ميزات المحمول
  const { isInitialized, pendingRequests, error } = useMobileInit();

  // تتبع تغييرات الـ route
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash || '#/');
      // إغلاق القائمة عند التنقل
      setIsDrawerOpen(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // تتبع حالة الاتصال
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // فتح القائمة مع haptic feedback
  const handleMenuOpen = async () => {
    setIsDrawerOpen(true);
    
    // Haptic feedback على الموبايل
    if (isMobile()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Haptics غير متاح
      }
    }
  };

  // إغلاق القائمة
  const handleMenuClose = () => {
    setIsDrawerOpen(false);
  };
  
  // عرض شاشة التحميل أثناء التهيئة
  if (!isInitialized) {
    return (
      <div className="mobile-full-height flex items-center justify-center bg-[#0f3c35]">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-full-height flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* شريط عدم الاتصال */}
      {!online && (
        <div className="offline-banner bg-amber-500 text-white text-center py-2 text-sm flex items-center justify-center gap-2">
          <span>📡</span>
          <span>أنت غير متصل بالإنترنت</span>
          {pendingRequests > 0 && (
            <span className="bg-white text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingRequests} طلب معلق
            </span>
          )}
        </div>
      )}
      
      {/* خطأ في التهيئة */}
      {error && (
        <div className="bg-red-500 text-white text-center py-2 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Header */}
      <MobileHeader
        onMenuClick={handleMenuOpen}
        currentRoute={currentRoute}
      />

      {/* Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={handleMenuClose}
        currentRoute={currentRoute}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto mobile-safe-bottom pb-28">
        {children}
      </main>

      {/* Stats Bar */}
      <MobileStatsBar />
    </div>
  );
};

export default MobileLayout;
