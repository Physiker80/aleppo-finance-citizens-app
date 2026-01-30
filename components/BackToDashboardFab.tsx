import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../App';

// زر عائم للرجوع إلى لوحة التحكم يظهر فقط في المسارات الحساسة، ويبقى ثابتاً أثناء التمرير
const BackToDashboardFab: React.FC = () => {
  const appContext = useContext(AppContext);
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/');

  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const currentBase = useMemo(() => (hash || '#/').split('?')[0], [hash]);
  // اعتبر كل المسارات غير العامة مسارات داخلية تحتاج زر الرجوع
  const isInternal = useMemo(() => {
    const publicRoutes = new Set([
      '#/', '#/submit', '#/track', '#/faq', '#/news', '#/contact', '#/privacy', '#/terms', '#/about-system', '#/about', '#/survey', '#/login', '#/confirmation'
    ]);
    if (publicRoutes.has(currentBase)) return false;
    if (currentBase === '#/dashboard') return false;
    return true;
  }, [currentBase]);

  if (!isInternal) return null;
  if (!appContext?.isEmployeeLoggedIn) return null;

  // نمط موحّد: كبسولة داكنة مع حدود خفيفة وسهم يسار النص
  const classes = 'bg-gray-800/95 hover:bg-gray-800 text-white border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.35)]';

  return (
    <a
      href="#/dashboard"
      className={`fixed z-[45] bottom-6 right-6 rtl:right-auto rtl:left-6 rounded-full border backdrop-blur px-4 py-2.5 text-sm font-semibold transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400/40 ${classes}`}
      title="رجوع إلى لوحة التحكم"
      aria-label="رجوع إلى لوحة التحكم"
    >
      <span className="inline-flex items-center gap-2">
        <span>رجوع إلى لوحة التحكم</span>
        <span aria-hidden>←</span>
      </span>
    </a>
  );
};

export default BackToDashboardFab;
