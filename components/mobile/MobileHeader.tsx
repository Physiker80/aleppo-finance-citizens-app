/**
 * MobileHeader - الهيدر العلوي للموبايل
 * 
 * يحتوي على:
 * - زر hamburger لفتح القائمة الجانبية
 * - عنوان الصفحة الحالية
 * - مؤشر حالة الاتصال
 * - شعار مصغر
 */

import React, { useState, useEffect } from 'react';
import { FiMenu, FiWifi, FiWifiOff } from 'react-icons/fi';
import { isOnline, onConnectivityChange } from '../../utils/platform';

interface MobileHeaderProps {
  onMenuClick: () => void;
  currentRoute: string;
}

// خريطة عناوين الصفحات
const pageTitles: Record<string, string> = {
  '#/': '',
  '#': '',
  '': '',
  '#/submit': 'تقديم طلب جديد',
  '#/track': 'متابعة طلب',
  '#/appointment-booking': 'حجز موعد',
  '#/confirmation': 'تأكيد الطلب',
  '#/faq': 'الأسئلة الشائعة',
  '#/news': 'الأخبار والإعلانات',
  '#/survey': 'استبيان الرضا',
  '#/contact': 'تواصل معنا',
};

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, currentRoute }) => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = onConnectivityChange((status) => {
      setOnline(status);
    });
    return cleanup;
  }, []);

  // الحصول على عنوان الصفحة
  const getPageTitle = () => {
    const baseRoute = currentRoute.split('?')[0];
    return pageTitles[baseRoute] || 'بوابة المواطنين';
  };

  // هل نحن في الصفحة الرئيسية؟
  const isHomePage = () => {
    const baseRoute = currentRoute.split('?')[0];
    return baseRoute === '#/' || baseRoute === '#' || baseRoute === '';
  };

  return (
    <>
      {/* Offline Banner */}
      {!online && (
        <div className="offline-banner flex items-center justify-center gap-2">
          <FiWifiOff className="w-4 h-4" />
          <span>لا يوجد اتصال بالإنترنت</span>
        </div>
      )}

      {/* Header */}
      <header className="mobile-header">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full hover:bg-white/10 transition-colors touch-target"
            aria-label="فتح القائمة"
          >
            <FiMenu className="w-6 h-6 text-white" />
          </button>

          {/* Page Title or Logo */}
          {isHomePage() ? (
            <div className="flex-1 flex items-center justify-center">
              <img
                src="/header-title.png"
                alt="مديرية مالية حلب - نظام الاستعلامات والشكاوى"
                className="h-12 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <h1 className="text-lg font-bold text-white flex-1 text-center">
              {getPageTitle()}
            </h1>
          )}

          {/* Connection Status & Logo */}
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            <div
              className={`p-1.5 rounded-full ${online ? 'bg-green-500/20' : 'bg-red-500/20'}`}
              title={online ? 'متصل بالإنترنت' : 'غير متصل'}
            >
              {online ? (
                <FiWifi className="w-4 h-4 text-green-400" />
              ) : (
                <FiWifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>

            {/* Mini Logo */}
            <img
              src="/syrian-eagle.png"
              alt="شعار"
              className="w-8 h-8 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.ico';
              }}
            />
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
