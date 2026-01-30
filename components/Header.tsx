import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { formatArabicNumber } from '../constants';
import LoginModal from './LoginModal';
import UiBadge from './ui/Badge';

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
  const notifRef = useRef<HTMLDivElement | null>(null);
  // قائمة الملف الشخصي: دمج الملف الشخصي + تسجيل الخروج + روابط الأقسام
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  // القائمة اليسارية المنسدلة لتحسين تنسيق القوائم
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const leftMenuRef = useRef<HTMLDivElement | null>(null);
  const leftMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const leftMenuMenuRef = useRef<HTMLDivElement | null>(null);
  // أدوات سريعة للمسؤول لإصلاح المشكلات الشائعة (مسح أعلام الواجهة وإعادة التحميل)
  const [adminUtilsOpen, setAdminUtilsOpen] = useState(false);
  const adminUtilsRef = useRef<HTMLDivElement | null>(null);
  // متغيرات البحث والفلترة للتنبيهات الموحدة
  const [notifSearch, setNotifSearch] = useState('');
  const [notifPriority, setNotifPriority] = useState<string>('');
  const [notifSort, setNotifSort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [notifType, setNotifType] = useState<'all' | 'system' | 'internal'>('all');

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
    <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" aria-expanded={isMenuOpen} className={`relative z-[60] w-9 h-9 focus:outline-none rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${className}`}>
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
        className="text-[#0f3c35] dark:text-gray-200 hover:text-[#0c302a] dark:hover:text-white transition-colors duration-300 p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        aria-label="Toggle theme"
        title="تبديل النمط"
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        )}
      </button>
    );
  };

  const isAdmin = currentEmployee?.role === 'مدير';
  const myDepartment = currentEmployee?.department;
  const myNotifs = useMemo(() => {
    if (isAdmin) return notifications; // المدير يرى كل التنبيهات
    return notifications.filter(n => n.department === myDepartment);
  }, [notifications, myDepartment, isAdmin]);
  const notifUnreadCount = useMemo(() => myNotifs.filter(n => !n.read).length, [myNotifs]);

  // إدارة المراسلات الداخلية داخل القائمة
  const [internalMsgVersion, setInternalMsgVersion] = useState(0);
  const internalMessages = useMemo(() => {
    try {
      const raw = localStorage.getItem('internalMessages');
      if (!raw) return [] as any[];
      return JSON.parse(raw) as any[];
    } catch { return []; }
  }, [internalMsgVersion, notifOpen]);

  const myInternalBulk = useMemo(() => internalMessages.filter(m => m.kind === 'bulk-doc-panel' && (
    isAdmin || (myDepartment && (m.toDepartments || []).includes(myDepartment))
  )), [internalMessages, isAdmin, myDepartment]);

  const internalBulkUnread = useMemo(() => myInternalBulk.filter(m => !m.read).length, [myInternalBulk]);

  const filteredInternalBulk = useMemo(() => {
    const base = myInternalBulk.filter(m => {
      if (notifPriority && (m.priority || '') !== notifPriority) return false;
      if (notifSearch.trim()) {
        const q = notifSearch.trim();
        const hay = [m.subject || '', m.body || '', m.id, (m.templateName || '')];
        if (!hay.some(h => h.includes(q))) return false;
      }
      return true;
    });
    // فرز
    const arr = base.slice();
    if (notifSort === 'newest') arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (notifSort === 'oldest') arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (notifSort === 'priority') {
      const order: Record<string, number> = { 'عاجل': 1, 'هام': 2, 'متوسط': 3, 'عادي': 4 };
      arr.sort((a, b) => (order[a.priority || 'عادي'] || 99) - (order[b.priority || 'عادي'] || 99));
    }
    return arr;
  }, [myInternalBulk, notifPriority, notifSearch, notifSort]);

  const highlight = (text: string) => {
    const q = notifSearch.trim();
    if (!q) return text;
    const parts = text.split(q);
    if (parts.length === 1) return text;
    return parts.map((p, i) => i === parts.length - 1 ? p : (<React.Fragment key={i}>{p}<span className="bg-yellow-300 dark:bg-yellow-600 text-gray-900 dark:text-gray-900 px-0.5 rounded-sm">{q}</span></React.Fragment>));
  };

  const unreadCount = notifUnreadCount; // إبقاء أيقونة الجرس لعدد التنبيهات النظامية فقط حالياً

  const markInternalMessageRead = (id: string) => {
    try {
      const raw = localStorage.getItem('internalMessages');
      if (!raw) return;
      const list = JSON.parse(raw) as any[];
      const updated = list.map(m => m.id === id ? { ...m, read: true } : m);
      localStorage.setItem('internalMessages', JSON.stringify(updated));
      setInternalMsgVersion(v => v + 1);
    } catch {/* ignore */ }
  };

  const markAllInternalBulkRead = () => {
    try {
      const raw = localStorage.getItem('internalMessages');
      if (!raw) return;
      const list = JSON.parse(raw) as any[];
      let changed = false;
      const updated = list.map(m => {
        if (m.kind === 'bulk-doc-panel' && !m.read && (
          isAdmin || (myDepartment && (m.toDepartments || []).includes(myDepartment))
        )) { changed = true; return { ...m, read: true }; }
        return m;
      });
      if (changed) {
        localStorage.setItem('internalMessages', JSON.stringify(updated));
        setInternalMsgVersion(v => v + 1);
      }
    } catch {/* ignore */ }
  };

  const NotificationsButton: React.FC = () => {
    if (!appContext?.isEmployeeLoggedIn) return null;

    // Reload events badge (from reload guard instrumentation)
    const [reloadEventsCount, setReloadEventsCount] = useState<number>(() => {
      try { const raw = localStorage.getItem('reload_guard_events'); if (!raw) return 0; const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.length : 0; } catch { return 0; }
    });
    useEffect(() => {
      const update = () => {
        try { const raw = localStorage.getItem('reload_guard_events'); if (!raw) { setReloadEventsCount(0); return; } const arr = JSON.parse(raw); setReloadEventsCount(Array.isArray(arr) ? arr.length : 0); } catch { setReloadEventsCount(0); }
      };
      window.addEventListener('storage', (e) => { if (e.key === 'reload_guard_events') update(); });
      // Poll lightly in case same tab updates (storage not fired in same tab)
      const id = setInterval(update, 3000);
      return () => { clearInterval(id); };
    }, []);

    // فلترة التنبيهات والمراسلات حسب النوع المحدد
    const filteredSystemNotifs = myNotifs.filter(n => {
      if (notifType === 'internal') return false;
      return true;
    });

    const filteredInternalMessages = filteredInternalBulk.filter(m => {
      if (notifType === 'system') return false;
      return true;
    });

    const allNotificationsCount = (notifType === 'system' ? 0 : internalBulkUnread) +
      (notifType === 'internal' ? 0 : notifUnreadCount);

    return (
      <div className="relative" ref={notifRef} data-dropdown-root>
        <button
          onClick={() => setNotifOpen(o => !o)}
          className="relative p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0f3c35] dark:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          aria-label="Notifications"
          title="التنبيهات"
          aria-expanded={notifOpen}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7v3.586l-.707.707A1 1 0 005 15h14a1 1 0 00.707-1.707L19 12.586V9a7 7 0 00-7-7z" /><path d="M7 16a5 5 0 0010 0H7z" /></svg>
          {allNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">{formatArabicNumber(allNotificationsCount)}</span>
          )}
          {reloadEventsCount > 0 && (
            <span
              title={`عدد محاولات إعادة التحميل المكتشفة: ${reloadEventsCount}`}
              className="absolute -bottom-0.5 -left-0.5 bg-amber-600 text-white text-[9px] rounded-full px-1 min-w-[14px] text-center shadow"
            >{reloadEventsCount}</span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-[32rem] max-w-[95vw] max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[80] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold">
                {isAdmin ? 'التنبيهات والمراسلات' : `تنبيهات ومراسلات قسم: ${myDepartment}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => {
                    // تنبيهات النظام
                    if (isAdmin && appContext.markAllNotificationsRead) appContext.markAllNotificationsRead();
                    else if (!isAdmin && markRead && myDepartment) markRead(myDepartment);
                    // المراسلات الداخلية
                    markAllInternalBulkRead();
                  }}
                >تحديد الكل</button>
                <a
                  href="#/internal-messages"
                  className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-700 hover:bg-blue-200 dark:hover:bg-blue-600 text-blue-800 dark:text-blue-200"
                  onClick={() => setNotifOpen(false)}
                >المراسلات</a>
                <a
                  href="#/message-analytics"
                  className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-700 hover:bg-purple-200 dark:hover:bg-purple-600 text-purple-800 dark:text-purple-200"
                  onClick={() => setNotifOpen(false)}
                >إحصائيات المراسلات</a>
                <a
                  href="#/ticket-analytics"
                  className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-700 hover:bg-green-200 dark:hover:bg-green-600 text-green-800 dark:text-green-200"
                  onClick={() => setNotifOpen(false)}
                >إحصائيات الطلبات</a>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="Close notifications"
                  onClick={() => setNotifOpen(false)}
                >إغلاق</button>
              </div>
            </div>

            {/* أدوات البحث والفلترة */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center text-[11px]">
              <input
                type="text"
                value={notifSearch}
                onChange={e => setNotifSearch(e.target.value)}
                placeholder="بحث في المراسلات..."
                className="flex-1 min-w-[140px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                style={{ direction: 'rtl' }}
              />
              <select
                value={notifType}
                onChange={e => setNotifType(e.target.value as any)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                title="نوع الإشعارات"
              >
                <option value="all">الكل</option>
                <option value="system">تنبيهات النظام</option>
                <option value="internal">المراسلات الداخلية</option>
              </select>
              <select
                value={notifPriority}
                onChange={e => setNotifPriority(e.target.value)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                title="فلترة حسب الأولوية"
              >
                <option value="">كل الأولويات</option>
                <option value="عاجل">عاجل</option>
                <option value="هام">هام</option>
                <option value="متوسط">متوسط</option>
                <option value="عادي">عادي</option>
              </select>
              <select
                value={notifSort}
                onChange={e => setNotifSort(e.target.value as any)}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                title="فرز"
              >
                <option value="newest">أحدث</option>
                <option value="oldest">أقدم</option>
                <option value="priority">حسب الأولوية</option>
              </select>
              {(notifSearch || notifPriority || notifType !== 'all') && (
                <button
                  onClick={() => { setNotifSearch(''); setNotifPriority(''); setNotifType('all'); }}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >مسح</button>
              )}
            </div>

            <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700" style={{ maxHeight: 'calc(80vh - 92px)' }}>
              {filteredSystemNotifs.length === 0 && filteredInternalMessages.length === 0 && (
                <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">لا توجد تنبيهات أو مراسلات</div>
              )}

              {/* تنبيهات النظام */}
              {filteredSystemNotifs.length > 0 && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    تنبيهات النظام ({filteredSystemNotifs.length})
                  </div>
                  {filteredSystemNotifs.map(n => (
                    <div key={n.id} className={`px-3 py-2 text-sm ${n.read ? 'bg-white dark:bg-gray-800' : 'bg-amber-50 dark:bg-gray-900'}`}>
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
                </>
              )}

              {/* المراسلات الداخلية */}
              {filteredInternalMessages.length > 0 && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-900 px-3 py-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    المراسلات الداخلية ({filteredInternalMessages.length})
                  </div>
                  {filteredInternalMessages.map(m => (
                    <div key={m.id} className={`px-4 py-3 text-sm ${m.read ? 'bg-white dark:bg-gray-800' : 'bg-violet-50 dark:bg-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate max-w-[12rem]" title={m.subject}>{highlight(m.subject || 'مراسلة جماعية')}</span>
                            {(m.priority === 'عاجل') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white">عاجل</span>}
                            {(m.priority === 'هام') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white">هام</span>}
                            {(m.priority === 'متوسط') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white">متوسط</span>}
                            {(m.priority === 'عادي') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-400 text-white">عادي</span>}
                          </div>
                          <div className="mt-0.5 text-gray-700 dark:text-gray-300 text-[12px] leading-snug line-clamp-2">{highlight((m.body || '').replace(/\n+/g, ' ').slice(0, 170))}{(m.body || '').length > 170 ? '...' : ''}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            <span>{new Date(m.createdAt).toLocaleString('ar-SY-u-nu-latn')}</span>
                            <span>أقسام: {(m.toDepartments || []).length}</span>
                            <span>وثائق: {(m.docIds || []).length}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!m.read && (
                            <button
                              onClick={() => markInternalMessageRead(m.id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                            >مقروء</button>
                          )}
                          <a
                            href={`#/internal-messages?focus=${encodeURIComponent(m.id)}`}
                            className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700"
                            onClick={() => setNotifOpen(false)}
                          >فتح</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const InternalMessagesButton: React.FC = () => {
    // تم دمج هذه الوظيفة في NotificationsButton - لم تعد هناك حاجة لهذا الزر
    return null;
  };

  // إغلاق القوائم عند النقر خارجها (مع حماية النقرات داخل القائمتين)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const root = target.closest('[data-dropdown-root]');
      // إذا النقرة داخل أي dropdown root لا نغلق
      if (root) return;
      if (notifOpen) setNotifOpen(false);
      if (adminUtilsOpen) setAdminUtilsOpen(false);
      if (leftMenuOpen) setLeftMenuOpen(false);
      if (profileMenuOpen) setProfileMenuOpen(false);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [notifOpen, adminUtilsOpen, leftMenuOpen, profileMenuOpen]);

  // Close left menu on focus moving outside; focus first item when opened
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (!leftMenuOpen) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const within = target.closest('[data-leftmenu-root]');
      if (!within) setLeftMenuOpen(false);
    };
    document.addEventListener('focusin', onFocusIn as any);
    return () => document.removeEventListener('focusin', onFocusIn as any);
  }, [leftMenuOpen]);

  useEffect(() => {
    if (leftMenuOpen) {
      // Focus first menu item on open
      const first = leftMenuMenuRef.current?.querySelector<HTMLAnchorElement>('a[role="menuitem"]');
      first?.focus();
    }
  }, [leftMenuOpen]);

  const handleLeftMenuButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setLeftMenuOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLeftMenuOpen(true);
      setTimeout(() => {
        const items = Array.from(leftMenuMenuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]') || []);
        items[items.length - 1]?.focus();
      }, 0);
    }
  };

  const handleLeftMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(leftMenuMenuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]') || []);
    const currentIndex = items.findIndex(el => el === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(currentIndex + 1 + items.length) % items.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(currentIndex - 1 + items.length) % items.length];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLeftMenuOpen(false);
      leftMenuButtonRef.current?.focus();
    }
  };

  // Close menus on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuOpen) setIsMenuOpen(false);
        if (notifOpen) setNotifOpen(false);
        if (adminUtilsOpen) setAdminUtilsOpen(false);
        if (leftMenuOpen) setLeftMenuOpen(false);
        if (profileMenuOpen) setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen, notifOpen, adminUtilsOpen, leftMenuOpen, profileMenuOpen]);

  // تركيز أول عنصر ضمن قائمة الملف الشخصي عند الفتح
  useEffect(() => {
    if (profileMenuOpen) {
      const first = profileMenuRef.current?.querySelector<HTMLAnchorElement>('a[role="menuitem"], button[role="menuitem"]');
      first?.focus();
    }
  }, [profileMenuOpen]);

  // حالة تعطيل أزرار إعادة التحميل الإدارية (تُضبط من صفحة المراقبة ObservabilityPage)
  const [adminReloadDisabled, setAdminReloadDisabled] = useState<boolean>(() => {
    try { return (localStorage.getItem('admin_disable_reload_actions') || 'false') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const listener = () => {
      try { setAdminReloadDisabled((localStorage.getItem('admin_disable_reload_actions') || 'false') === 'true'); } catch { }
    };
    window.addEventListener('adminReloadSettingsChanged', listener);
    // احتياط في حال تم التغيير من تبويب آخر
    const storageListener = (e: StorageEvent) => {
      if (e.key === 'admin_disable_reload_actions') listener();
    };
    window.addEventListener('storage', storageListener);
    return () => {
      window.removeEventListener('adminReloadSettingsChanged', listener);
      window.removeEventListener('storage', storageListener);
    };
  }, []);

  // مسح أعلام واجهة المستخدم الشائعة التي قد تعطل أقساماً أو بطاقات بشكل غير مقصود
  const clearUiFlagsAndReload = () => {
    if (adminReloadDisabled) {
      alert('⚠️ تم تعطيل أزرار إعادة التحميل من إعدادات المراقبة. ألغ التعطيل أولاً.');
      setAdminUtilsOpen(false);
      return;
    }
    try {
      const toRemove = new Set<string>();
      const keep = new Set<string>([
        'tickets', 'contactMessages', 'notifications', 'employees', 'currentUser', 'citizenSurveys', 'departmentsList', 'pdfTemplates'
      ]);
      const suspect = /(flag|feature|disable|disabled|hide|hidden|maintenance|paused|deactivate|cancel|canceled|cancelled|section|card)/i;
      // مفاتيح معروفة نريد تنظيفها إن وجدت
      const known = [
        'showSummaryStats', 'manualTicketId', 'ticketIdConfig', 'ticketSeq', 'tracked_ids', 'ai_analysis_enabled', 'last_ai_analysis'
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (keep.has(k)) continue;
        if (known.includes(k)) { toRemove.add(k); continue; }
        if (suspect.test(k) || /complaints.*(hide|disable)/i.test(k)) {
          toRemove.add(k);
        }
      }
      // إزالة العدادات اليومية للديوان ليست ضرورية عادةً؛ نتجنبها للحفاظ على الترقيم
      let removed = 0;
      toRemove.forEach(k => { try { localStorage.removeItem(k); removed++; } catch { } });
      // إغلاق وحدث إعادة تحميل للتأكد من زوال أي حالة عالقة
      setAdminUtilsOpen(false);
      alert(`تم تنظيف ${removed} إعداد/علم واجهة محتمل. سيُعاد تحميل التطبيق الآن.`);
      window.location.reload();
    } catch {
      // في حال حدوث خطأ نحاول إعادة التحميل فقط
      window.location.reload();
    }
  };

  const forceHardReload = () => {
    if (adminReloadDisabled) {
      alert('⚠️ تم تعطيل أزرار إعادة التحميل من إعدادات المراقبة. ألغ التعطيل أولاً.');
      setAdminUtilsOpen(false);
      return;
    }
    try {
      setAdminUtilsOpen(false);
      // إعادة تحميل قياسية تكفي مع Vite أثناء التطوير؛ للبناء الإنتاجي توجد تواقيع ملفات هاشية تلقائياً
      window.location.reload();
    } catch { }
  };

  const MenuOverlay: React.FC = () => {
    const currentBase = (currentPath || '#/').split('?')[0];
    const canShowSensitive = (href: string) => currentBase === href;
    const navItems = [
      { href: '#/', label: 'الرئيسية' },
      { href: '#/submit', label: 'تقديم طلب جديد' },
      { href: '#/track', label: 'متابعة طلب' },
      { href: '#/appointment-booking', label: 'حجز موعد' },
      { href: '#/faq', label: 'الأسئلة الشائعة' },
      { href: '#/news', label: 'الأخبار والإعلانات' },
      { href: '#/survey', label: 'استبيان الرضا' },
      { href: '#/contact', label: 'تواصل معنا' },
    ];

    if (appContext?.isEmployeeLoggedIn) {
      navItems.push({ href: '#/dashboard', label: 'لوحة التحكم' });
      navItems.push({ href: '#/appointment-dashboard', label: 'إدارة المواعيد' });
      // إدارة الاستعلامات والشكاوى (مخفية بشكل عام إلا إذا كانت مسموحة أو الصفحة الحالية)
      if (canShowSensitive('#/complaints-management')) navItems.push({ href: '#/complaints-management', label: 'إدارة الاستعلامات والشكاوى' });
      // تم إخفاء رابط "الديوان الموحد" من قائمة الموبايل
      if (appContext?.currentEmployee?.role === 'مدير') {
        // إبقاء أدوات المدير فقط وإزالة رابط الموارد البشرية من القوائم
        if (canShowSensitive('#/security-governance')) navItems.push({ href: '#/security-governance', label: 'حوكمة الأمن' });
        if (canShowSensitive('#/security-ops')) navItems.push({ href: '#/security-ops', label: 'لوحة العمليات الأمنية' });
        if (canShowSensitive('#/daily-ops')) navItems.push({ href: '#/daily-ops', label: 'العمليات اليومية' });
        if (canShowSensitive('#/observability')) navItems.push({ href: '#/observability', label: 'مراقبة وتتبع النظام' });
        if (canShowSensitive('#/role-management')) navItems.push({ href: '#/role-management', label: 'إدارة الصلاحيات' });
      }
    }

    return (
      <div className={`fixed inset-0 z-50 bg-[#0f3c35] bg-opacity-95 dark:bg-gray-900/95 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="container mx-auto px-4 h-full flex flex-col">
          <div className="flex items-center justify-between py-4">
            <a href="#/" className="flex items-center gap-3" onClick={closeMenu}>
              <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="شعار" className="h-10" />
              <span className="text-white text-lg font-bold">مديرية مالية حلب</span>
            </a>
            <button onClick={closeMenu} aria-label="إغلاق القائمة" className="text-white/90 hover:text-white p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M6.225 4.811L4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586z" /></svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto flex flex-col items-center space-y-4 text-center pb-8">
            {navItems.map((item, index) => (
              <div
                key={item.href}
                className={`w-full max-w-sm transition-all duration-500 ease-out ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                style={{ transitionDelay: `${isMenuOpen ? 150 + index * 75 : 0}ms` }}
              >
                {item.href === '#/security-governance' && appContext?.currentEmployee?.role === 'مدير' ? (
                  <NavLink href={item.href} onClick={closeMenu} isMobile>
                    <span className="inline-flex items-center gap-2">
                      <span>حوكمة الأمن</span>
                      {(appContext?.governanceState?.violations?.length || 0) > 0 && (
                        <UiBadge
                          variant="default"
                          className="!px-2 !py-0.5 !text-xs bg-red-600 text-white"
                          title="الانتهاكات"
                          aria-label={`الانتهاكات: ${formatArabicNumber(appContext?.governanceState?.violations?.length || 0)}`}
                        >{formatArabicNumber(appContext?.governanceState?.violations?.length || 0)}</UiBadge>
                      )}
                      {((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length) > 0 && (
                        <UiBadge
                          variant="default"
                          className="!px-2 !py-0.5 !text-xs bg-indigo-600 text-white"
                          title="استثناءات موافق عليها"
                          aria-label={`استثناءات موافق عليها: ${formatArabicNumber((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length)}`}
                        >{formatArabicNumber((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length)}</UiBadge>
                      )}
                    </span>
                  </NavLink>
                ) : (
                  <NavLink href={item.href} onClick={closeMenu} isMobile>
                    <span className="block w-full text-2xl">{item.label}</span>
                  </NavLink>
                )}
              </div>
            ))}

            <div
              className={`transition-all duration-500 ease-out ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${isMenuOpen ? 150 + navItems.length * 75 : 0}ms` }}
            >
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee ? (
                <div className="w-full max-w-sm mx-auto mt-4 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-block w-10 h-10 rounded-full overflow-hidden bg-white/20 border border-white/30">
                      {appContext.currentEmployee.avatarDataUrl ? (
                        <img src={appContext.currentEmployee.avatarDataUrl} alt="صورة الموظف" className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-2 text-white/80">
                          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.761-3.582-5-8-5Z" />
                        </svg>
                      )}
                    </span>
                    <div className="text-sm">
                      <div className="font-semibold">مرحباً، {isAdmin ? 'مدير النظام' : appContext.currentEmployee.name}</div>
                      <div className="text-white/70 text-[12px]">{appContext.currentEmployee.department || '—'}</div>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl divide-y divide-white/10 overflow-hidden">
                    <a href="#/employee/profile" onClick={closeMenu} className="block px-4 py-3 text-sm hover:bg-white/15">الملف الشخصي</a>
                    <a href="#/employee/profile?tab=info" onClick={closeMenu} className="block px-4 py-3 text-sm hover:bg-white/15">المعلومات الشخصية</a>
                    <a href="#/employee/profile?tab=security" onClick={closeMenu} className="block px-4 py-3 text-sm hover:bg-white/15">أمان الحساب</a>
                    <a href="#/employee/profile?tab=inbox" onClick={closeMenu} className="block px-4 py-3 text-sm hover:bg-white/15">الرسائل الداخلية</a>
                    <a href="#/mfa-management" onClick={closeMenu} className="block px-4 py-3 text-sm hover:bg-white/15">إدارة المصادقة متعددة العوامل</a>
                  </div>
                  <button
                    onClick={() => { handleLoginToggle(); }}
                    className="w-full text-lg font-semibold bg-white text-[#0f3c35] hover:bg-gray-200 px-6 py-3 rounded-full transition-colors mt-4"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm mx-auto mt-4">
                  <button
                    onClick={handleLoginToggle}
                    className="w-full text-lg font-semibold bg-white text-[#0f3c35] hover:bg-gray-200 px-6 py-3 rounded-full transition-colors"
                  >
                    دخول الموظفين
                  </button>
                </div>
              )}
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
          <div className="flex items-center justify-between min-h-20 py-2">
            <div className="flex items-center gap-2 rtl:space-x-reverse">
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
              {/* قائمة منسدلة يسارية لروابط ثانوية - سطح المكتب فقط */}
              <div className="relative hidden md:block" ref={leftMenuRef} data-dropdown-root data-leftmenu-root>
                <button
                  onClick={() => setLeftMenuOpen(o => !o)}
                  aria-haspopup="true"
                  aria-expanded={leftMenuOpen}
                  className="px-3 py-2 rounded-full text-[#0f3c35] dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  title="قوائم"
                  aria-label="قوائم"
                  onKeyDown={handleLeftMenuButtonKeyDown}
                  ref={leftMenuButtonRef}
                >
                  <span className="inline-flex items-center gap-1">
                    {/* أيقونة قائمة (≡) */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M4 6h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2z" />
                    </svg>
                  </span>
                </button>
                {leftMenuOpen && (
                  <div
                    role="menu"
                    aria-label="قائمة الروابط"
                    className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[80] py-1"
                    ref={leftMenuMenuRef}
                    onKeyDown={handleLeftMenuKeyDown}
                  >
                    <a href="#/faq" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 outline-none" onClick={() => setLeftMenuOpen(false)}>الأسئلة الشائعة</a>
                    <a href="#/news" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 outline-none" onClick={() => setLeftMenuOpen(false)}>الأخبار والإعلانات</a>
                    <a href="#/survey" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 outline-none" onClick={() => setLeftMenuOpen(false)}>استبيان الرضا</a>
                    <a href="#/contact" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 outline-none" onClick={() => setLeftMenuOpen(false)}>تواصل معنا</a>
                  </div>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center flex-wrap gap-x-2 gap-y-1 rtl:space-x-reverse max-w-[56vw]">
              {/* تمت إزالة رابط "الموارد البشرية" من القائمة العلوية */}
              <NavLink href="#/">الرئيسية</NavLink>
              <NavLink href="#/submit">تقديم طلب جديد</NavLink>
              <NavLink href="#/track">متابعة طلب</NavLink>
              <NavLink href="#/appointment-booking">حجز موعد</NavLink>
              {/* الروابط الثانوية (الأسئلة الشائعة/الأخبار/الاستبيان/تواصل) أصبحت ضمن القائمة اليسارية المنسدلة */}
              {appContext?.isEmployeeLoggedIn && <NavLink href="#/dashboard">لوحة التحكم</NavLink>}
              {appContext?.isEmployeeLoggedIn && <NavLink href="#/appointment-dashboard">إدارة المواعيد</NavLink>}
              {appContext?.isEmployeeLoggedIn && (currentPath.split('?')[0] === '#/complaints-management') && (
                <NavLink href="#/complaints-management">إدارة الاستعلامات والشكاوى</NavLink>
              )}
              {/* تم إخفاء رابط "الديوان الموحد" من القائمة العلوية */}
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee?.role === 'مدير' && (
                <>
                  <div className="flex items-center gap-1">
                    {(currentPath.split('?')[0] === '#/security-governance') && (
                      <NavLink href="#/security-governance">
                        <span className="inline-flex items-center gap-2">
                          <span>حوكمة الأمن</span>
                          {(appContext?.governanceState?.violations?.length || 0) > 0 && (
                            <UiBadge
                              variant="default"
                              className="!px-1.5 !py-0.5 !text-[10px] bg-red-600 text-white leading-none"
                              title="الانتهاكات"
                              aria-label={`الانتهاكات: ${formatArabicNumber(appContext?.governanceState?.violations?.length || 0)}`}
                            >{formatArabicNumber(appContext?.governanceState?.violations?.length || 0)}</UiBadge>
                          )}
                          {((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length) > 0 && (
                            <UiBadge
                              variant="default"
                              className="!px-1.5 !py-0.5 !text-[10px] bg-indigo-600 text-white leading-none"
                              title="استثناءات موافق عليها"
                              aria-label={`استثناءات موافق عليها: ${formatArabicNumber((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length)}`}
                            >{formatArabicNumber((appContext?.governanceState?.exceptions || []).filter(e => e.status === 'approved').length)}</UiBadge>
                          )}
                        </span>
                      </NavLink>
                    )}
                  </div>
                  {(currentPath.split('?')[0] === '#/security-ops') && (
                    <NavLink href="#/security-ops">لوحة العمليات الأمنية</NavLink>
                  )}
                  {(currentPath.split('?')[0] === '#/daily-ops') && (
                    <NavLink href="#/daily-ops">العمليات اليومية</NavLink>
                  )}
                  {(currentPath.split('?')[0] === '#/observability') && (
                    <NavLink href="#/observability">مراقبة وتتبع</NavLink>
                  )}
                  {(currentPath.split('?')[0] === '#/role-management') && (
                    <NavLink href="#/role-management">إدارة الصلاحيات</NavLink>
                  )}
                </>
              )}
            </nav>

            <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
              <ThemeToggleButton />
              <NotificationsButton />
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee?.role === 'مدير' && (
                <div className="relative" ref={adminUtilsRef} data-dropdown-root>
                  <button
                    onClick={() => setAdminUtilsOpen(o => !o)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="أدوات سريعة للمسؤول"
                    aria-label="Quick admin tools"
                  >
                    {/* أيقونة ترس الإعدادات */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                      <path fill-rule="evenodd" d="M20.03 12.92c.05-.3.07-.62.07-.92s-.02-.62-.07-.92l2.02-1.56a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.38.95c-.5-.37-1.03-.67-1.6-.9l-.37-2.53A.5.5 0 0 0 14.75 2h-3.5a.5.5 0 0 0-.49.41l-.37 2.53c-.57.23-1.1.53-1.6.9l-2.38-.95a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L3.03 11.08c-.05.3-.08.62-.08.92s.03.62.08.92L1 14.48a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.38-.95c.5.37 1.03.67 1.6.9l.37 2.53c.05.24.25.41.49.41h3.5c.24 0 .45-.17.49-.41l.37-2.53c.57-.23 1.1-.53 1.6-.9l2.38.95a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.02-1.56Zm-8.03 2.58a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  {adminUtilsOpen && (
                    <div className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[80]">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold">أدوات الصيانة</div>
                      <button
                        onClick={() => { window.location.hash = '#/observability'; setAdminUtilsOpen(false); }}
                        className="w-full text-right px-3 py-2 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                      >
                        مراقبة وتتبع النظام
                      </button>
                      <button
                        onClick={() => { window.location.hash = '#/privacy-editor'; setAdminUtilsOpen(false); }}
                        className="w-full text-right px-3 py-2 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                      >
                        محرر سياسة الخصوصية
                      </button>
                      <button
                        onClick={clearUiFlagsAndReload}
                        disabled={adminReloadDisabled}
                        className={`w-full text-right px-3 py-2 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 ${adminReloadDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={adminReloadDisabled ? 'معطّل من إعدادات المراقبة' : undefined}
                      >
                        مسح أعلام الواجهة وإعادة التحميل
                      </button>
                      <button
                        onClick={forceHardReload}
                        disabled={adminReloadDisabled}
                        className={`w-full text-right px-3 py-2 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 ${adminReloadDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={adminReloadDisabled ? 'معطّل من إعدادات المراقبة' : undefined}
                      >
                        تحديث التطبيق الآن
                      </button>
                      <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                        استخدم هذا إذا ظهرت رسالة تفيد بأن قسماً ملغي/موقوف بسبب حالة قديمة.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {appContext?.isEmployeeLoggedIn && appContext?.currentEmployee ? (
                <div className="relative" ref={profileRef} data-dropdown-root>
                  <button
                    onClick={() => setProfileMenuOpen(o => !o)}
                    className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-[#0f3c35] hover:bg-gray-100 px-4 py-2 rounded-full border border-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                    title="القائمة الشخصية"
                    aria-haspopup="true"
                    aria-expanded={profileMenuOpen}
                  >
                    <span className="truncate max-w-[14rem]" title={isAdmin ? 'مدير النظام' : appContext.currentEmployee.name}>
                      {`مرحباً، ${isAdmin ? 'مدير النظام' : appContext.currentEmployee.name}`}
                    </span>
                    <span className="inline-block w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      {appContext.currentEmployee.avatarDataUrl ? (
                        <img src={appContext.currentEmployee.avatarDataUrl} alt="صورة الموظف" className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full p-1 text-gray-500">
                          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.761-3.582-5-8-5Z" />
                        </svg>
                      )}
                    </span>
                  </button>
                  {profileMenuOpen && (
                    <div
                      ref={profileMenuRef}
                      role="menu"
                      aria-label="قائمة الملف الشخصي"
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[80] py-2"
                    >
                      <div className="px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">الملف الشخصي</div>
                      <a href="#/employee/profile" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setProfileMenuOpen(false)}>فتح الملف الشخصي</a>
                      <a href="#/employee/profile?tab=info" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setProfileMenuOpen(false)}>المعلومات الشخصية</a>
                      <a href="#/employee/profile?tab=security" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setProfileMenuOpen(false)}>أمان الحساب</a>
                      <a href="#/employee/profile?tab=inbox" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setProfileMenuOpen(false)}>الرسائل الداخلية</a>
                      <a href="#/mfa-management" role="menuitem" className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setProfileMenuOpen(false)}>إدارة المصادقة متعددة العوامل</a>
                      <div className="my-2 h-px bg-gray-200 dark:bg-gray-700" />
                      <button
                        role="menuitem"
                        onClick={() => { setProfileMenuOpen(false); handleLoginToggle(); }}
                        className="w-full text-right px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLoginToggle}
                  className="text-sm font-semibold bg-[#0f3c35] dark:bg-emerald-600 text-white hover:bg-opacity-90 dark:hover:bg-opacity-90 px-5 py-2.5 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  دخول الموظفين
                </button>
              )}
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