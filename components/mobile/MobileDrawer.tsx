/**
 * MobileDrawer - القائمة الجانبية للموبايل
 * 
 * قائمة جانبية منزلقة من اليمين (RTL) تحتوي على:
 * - شعار التطبيق
 * - روابط التنقل للمواطنين فقط
 * - زر تبديل الثيم
 * 
 * لا تتضمن أي روابط لصفحات الموظفين
 */

import React, { useContext, useEffect } from 'react';
import { AppContext } from '../../App';
import { FiHome, FiFileText, FiSearch, FiCalendar, FiHelpCircle, FiPhone, FiSun, FiMoon, FiX } from 'react-icons/fi';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, currentRoute }) => {
  const appContext = useContext(AppContext);
  const { theme, toggleTheme } = appContext || {};

  // منع التمرير عند فتح القائمة
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // إغلاق القائمة بالضغط على Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // عناصر التنقل للمواطنين فقط
  const navItems: NavItem[] = [
    { href: '#/', label: 'الرئيسية', icon: <FiHome className="w-5 h-5" /> },
    { href: '#/submit', label: 'تقديم طلب جديد', icon: <FiFileText className="w-5 h-5" /> },
    { href: '#/track', label: 'متابعة طلب', icon: <FiSearch className="w-5 h-5" /> },
    { href: '#/appointment-booking', label: 'حجز موعد', icon: <FiCalendar className="w-5 h-5" /> },
    { href: '#/faq', label: 'الأسئلة الشائعة', icon: <FiHelpCircle className="w-5 h-5" /> },
    { href: '#/contact', label: 'تواصل معنا', icon: <FiPhone className="w-5 h-5" /> },
  ];

  const handleNavClick = (href: string) => {
    window.location.hash = href.replace('#', '');
    onClose();
  };

  const isActive = (href: string) => {
    const currentBase = currentRoute.split('?')[0];
    return currentBase === href || (href === '#/' && (currentBase === '#/' || currentBase === '' || currentBase === '#'));
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`drawer-container ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="القائمة الرئيسية"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src="/icon-512.png"
              alt="شعار التطبيق"
              className="w-10 h-10 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/favicon.ico';
              }}
            />
            <div>
              <h2 className="text-sm font-bold text-[#0f3c35] dark:text-emerald-400">
                مديرية مالية حلب
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                بوابة المواطنين
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
            aria-label="إغلاق القائمة"
          >
            <FiX className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => handleNavClick(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right
                    transition-all duration-200 touch-target
                    ${isActive(item.href)
                      ? 'bg-[#0f3c35] text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className={isActive(item.href) ? 'text-white' : 'text-[#0f3c35] dark:text-emerald-400'}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer - Theme Toggle */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
              hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-target"
          >
            {theme === 'light' ? (
              <>
                <FiMoon className="w-5 h-5" />
                <span>الوضع الليلي</span>
              </>
            ) : (
              <>
                <FiSun className="w-5 h-5" />
                <span>الوضع النهاري</span>
              </>
            )}
          </button>

          {/* App Version */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            الإصدار 1.0.0
          </p>
        </div>
      </aside>
    </>
  );
};

export default MobileDrawer;
