import React, { useEffect, useState } from 'react';

// زر عائم للرجوع إلى أعلى الصفحة، يظهر بعد التمرير بمقدار معين
const BackToTopFab: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      try {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setVisible(y > 300);
      } catch {}
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed z-[44] bottom-24 right-6 rtl:right-auto rtl:left-6 w-11 h-11 rounded-full border border-white/20 bg-gray-900/90 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      aria-label="الرجوع إلى بداية الصفحة"
      title="الرجوع إلى بداية الصفحة"
    >
      <span className="inline-block text-lg" aria-hidden>↑</span>
    </button>
  );
};

export default BackToTopFab;
