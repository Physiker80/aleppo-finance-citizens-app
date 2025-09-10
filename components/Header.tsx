import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import LoginModal from './LoginModal';

const Header: React.FC = () => {
  const appContext = useContext(AppContext);
  const { theme, toggleTheme } = appContext || {};
  const notifications = appContext?.notifications || [];
  const currentEmployee = appContext?.currentEmployee;
  const markRead = appContext?.markNotificationsReadForDepartment;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  
  const handleLoginToggle = () => {
    if (appContext?.isEmployeeLoggedIn) {
      appContext.logout();
    } else {
      setIsLoginModalOpen(true);
    }
    closeMenu();
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const NavLink: React.FC<{ href: string; children: React.ReactNode; onClick?: () => void; isMobile?: boolean; }> = ({ href, children, onClick, isMobile = false }) => {
    const currentBase = (currentPath || '#/').split('?')[0];
    const isActive = currentBase === href || (href === '#/' && (currentBase === '#/' || currentBase === ''));
    
    const desktopClasses = `
      relative text-gray-600 dark:text-gray-300 font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105
      after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-[#0f3c35] dark:after:bg-emerald-400
      after:transition-transform after:duration-300
      ${isActive ? 'text-[#0f3c35] dark:text-emerald-400 after:scale-x-100' : 'hover:text-[#0f3c35] dark:hover:text-emerald-400 after:scale-x-0 hover:after:scale-x-100 after:origin-right hover:after:origin-left'}`;

    const mobileClasses = `text-gray-200 hover:text-white text-3xl font-bold py-3 transition-colors duration-300`;

    return (
      <a href={href} onClick={onClick} className={isMobile ? mobileClasses : `px-4 py-2 ${desktopClasses}`}>
        {children}
      </a>
    );
  };

  const HamburgerButton: React.FC<{ className?: string }> = ({ className }) => (
    <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" className={`relative z-[60] w-8 h-8 focus:outline-none ${className}`}>
      <div className="absolute w-full h-full transform transition-all duration-300 ease-in-out">
        <span className={`block absolute h-0.5 w-full bg-current transform transition duration-300 ease-in-out ${isMenuOpen ? 'rotate-45' : '-translate-y-2'}`}></span>
        <span className={`block absolute h-0.5 w-full bg-current transform transition duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block absolute h-0.5 w-full bg-current transform transition duration-300 ease-in-out ${isMenuOpen ? '-rotate-45' : 'translate-y-2'}`}></span>
      </div>
    </button>
  );

  const ThemeToggleButton: React.FC = () => {
    if (!toggleTheme) return null;
    return (
      <button
        onClick={toggleTheme}
        className="text-gray-600 dark:text-gray-300 hover:text-[#0f3c35] dark:hover:text-white transition-colors duration-300 p-2 rounded-full focus:outline-none"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        )}
      </button>
    );
  };

  const myDepartment = currentEmployee?.department;
  const myNotifs = useMemo(() => notifications.filter(n => n.department === myDepartment), [notifications, myDepartment]);
  const unreadCount = useMemo(() => myNotifs.filter(n => !n.read).length, [myNotifs]);

  const NotificationsButton: React.FC = () => {
    if (!appContext?.isEmployeeLoggedIn || !myDepartment) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setNotifOpen(o => !o)}
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7v3.586l-.707.707A1 1 0 005 15h14a1 1 0 00.707-1.707L19 12.586V9a7 7 0 00-7-7z"/><path d="M7 16a5 5 0 0010 0H7z"/></svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">{unreadCount}</span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[80]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold">تنبيهات قسم: {myDepartment}</div>
              <button
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => { if (markRead && myDepartment) markRead(myDepartment); }}
              >تحديد الكل كمقروء</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {myNotifs.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">لا توجد تنبيهات</div>
              ) : myNotifs.map(n => (
                <div key={n.id} className={`px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-700 ${n.read ? 'bg-white dark:bg-gray-800' : 'bg-amber-50 dark:bg-gray-900'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{n.kind === 'ticket-new' ? 'طلب جديد' : n.kind === 'ticket-moved' ? 'تحويل قسم' : 'إحالة قسم'}</span>
                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('ar-SY-u-nu-latn')}</span>
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-300">{n.message || ''}</div>
                  <div className="mt-1 text-xs text-gray-500">رقم: {n.ticketId}</div>
                  <div className="mt-2">
                    <a href={`#/requests?focus=${encodeURIComponent(n.ticketId)}`} className="text-xs text-blue-600 hover:underline">فتح الطلب</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const MenuOverlay: React.FC = () => {
  const navItems = [
        { href: '#/', label: 'الرئيسية' },
        { href: '#/submit', label: 'تقديم طلب جديد' },
        { href: '#/track', label: 'متابعة طلب' },
        { href: '#/faq', label: 'الأسئلة الشائعة' },
        { href: '#/news', label: 'الأخبار والإعلانات' },
  { href: '#/departments', label: 'الهيكل الإداري' },
    { href: '#/contact', label: 'تواصل معنا' },
    ];
    
    if (appContext?.isEmployeeLoggedIn) {
        navItems.push({ href: '#/dashboard', label: 'لوحة التحكم' });
        if (appContext?.currentEmployee?.role === 'مدير') {
          // إبقاء أدوات المدير فقط وإزالة رابط الموارد البشرية من القوائم
          navItems.push({ href: '#/tools', label: 'أدوات' });
        }
    }

    return (
        <div className={`fixed inset-0 z-50 bg-[#0f3c35] bg-opacity-95 dark:bg-gray-900/95 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="container mx-auto px-4 h-full flex flex-col items-center justify-center">
            <nav className="flex flex-col items-center space-y-6 text-center">
            {navItems.map((item, index) => (
                <div 
                    key={item.href}
                    className={`transition-all duration-500 ease-out ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    style={{ transitionDelay: `${isMenuOpen ? 150 + index * 75 : 0}ms` }}
                >
                    <NavLink href={item.href} onClick={closeMenu} isMobile>{item.label}</NavLink>
                </div>
            ))}

            <div 
                className={`transition-all duration-500 ease-out ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                style={{ transitionDelay: `${isMenuOpen ? 150 + navItems.length * 75 : 0}ms` }}
            >
                {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee && (
                  <div className="text-sm text-white/80 mb-4">
                    مرحباً، {appContext.currentEmployee.name}
                  </div>
                )}
                <button
                    onClick={handleLoginToggle}
                    className="text-lg font-semibold bg-white text-[#0f3c35] hover:bg-gray-200 px-6 py-3 rounded-full transition-colors mt-6"
                >
                    {appContext?.isEmployeeLoggedIn ? 'تسجيل الخروج' : 'دخول الموظفين'}
                </button>
            </div>
            </nav>
        </div>
        </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-700/80 transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <a href="#/" className="flex items-center space-x-4 rtl:space-x-reverse">
              <img 
                src="https://syrian.zone/syid/materials/logo.ai.svg" 
                alt="شعار الجمهورية العربية السورية" 
                className="h-14" 
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-[#0f3c35] dark:text-emerald-500 font-heading">مديرية مالية حلب</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">نظام الاستعلامات والشكاوى</span>
              </div>
            </a>
            
            <nav className="hidden md:flex items-center space-x-2 rtl:space-x-reverse">
              {/* تمت إزالة رابط "الموارد البشرية" من القائمة العلوية */}
              <NavLink href="#/">الرئيسية</NavLink>
              <NavLink href="#/submit">تقديم طلب جديد</NavLink>
              <NavLink href="#/track">متابعة طلب</NavLink>
              <NavLink href="#/faq">الأسئلة الشائعة</NavLink>
              <NavLink href="#/news">الأخبار والإعلانات</NavLink>
              <NavLink href="#/departments">الهيكل الإداري</NavLink>
              <NavLink href="#/contact">تواصل معنا</NavLink>
              {appContext?.isEmployeeLoggedIn && <NavLink href="#/dashboard">لوحة التحكم</NavLink>}
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee?.role === 'مدير' && (
                <>
                  <NavLink href="#/tools">أدوات</NavLink>
                </>
              )}
            </nav>
            
            <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
              <ThemeToggleButton />
              <NotificationsButton />
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  مرحباً، {appContext.currentEmployee.name}
                </div>
              )}
              <button
                onClick={handleLoginToggle}
                className="text-sm font-semibold bg-[#0f3c35] dark:bg-emerald-600 text-white hover:bg-opacity-90 dark:hover:bg-opacity-90 px-5 py-2.5 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                {appContext?.isEmployeeLoggedIn ? 'تسجيل الخروج' : 'دخول الموظفين'}
              </button>
            </div>

            <div className="md:hidden flex items-center space-x-4 rtl:space-x-reverse">
              <ThemeToggleButton />
              <NotificationsButton />
              <HamburgerButton className="text-[#0f3c35] dark:text-gray-200" />
            </div>
          </div>
        </div>
      </header>
      
      <MenuOverlay />
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
};

export default Header;