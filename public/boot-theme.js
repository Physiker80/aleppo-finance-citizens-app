// Apply theme from local storage to prevent FOUC
(function(){
  try {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && prefersDark);
    const root = document.documentElement;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
  } catch {}
})();
