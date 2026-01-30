// Fail-safe timeout fallback content renderer
(function () {
  try {
    const BOOT_FAIL_TIMEOUT = 30000; // زيادة المهلة لـ 30 ثانية للملفات الكبيرة
    setTimeout(() => {
      const root = document.getElementById('root');
      // لا تظهر رسالة الخطأ إذا كانت شاشة التحميل موجودة
      const loader = document.getElementById('initial-loader');
      if (loader) return; // شاشة التحميل لا تزال تعمل
      if (!root || root.dataset.mounted || root.dataset.mountError) return;
      const elapsed = (performance.now() - (window.__bootTime || performance.timeOrigin || 0)).toFixed(0);
      if (localStorage.getItem('debugBoot') === '1') console.warn('[BOOT] Timeout fallback after', elapsed, 'ms');
      const container = document.createElement('div');
      container.dir = 'rtl';
      container.style.padding = '1.75rem';
      container.style.textAlign = 'center';
      container.style.fontFamily = 'Cairo, sans-serif';
      container.style.maxWidth = '640px';
      container.style.margin = '0 auto';
      container.innerHTML = `
        <h2 style="color:#b91c1c;margin:0 0 6px;font-size:1.3rem">تأخر بدء التطبيق</h2>
        <p style="color:#374151;margin:0 0 10px;font-size:.9rem">قد يكون السبب بطء الشبكة أو فشل تحميل مكتبة خارجية.</p>
        <div style="font-size:11px;direction:ltr;text-align:left;color:#555;margin:0 auto 10px;background:#f8fafc;border:1px solid #e2e8f0;padding:6px 8px;border-radius:6px;width:fit-content">
          elapsed: ${elapsed} ms
        </div>
        <details style="text-align:right;margin:0 0 10px">
          <summary style="cursor:pointer;font-size:.8rem;color:#0f3c35;font-weight:600">ماذا أفعل؟</summary>
          <ul style="font-size:.75rem;line-height:1.55;color:#444;margin:8px 0 0;padding:0 18px;list-style:disc">
            <li>تحقق من اتصال الإنترنت</li>
            <li>افتح Console وتحقق من الأخطاء</li>
            <li>أعد التحميل بعد مسح الكاش (Ctrl + F5)</li>
          </ul>
        </details>
        <button id="retryBtn" style="margin-top:4px;background:#0f3c35;color:#fff;padding:.55rem 1.15rem;border-radius:.55rem;font-size:.85rem">🔄 إعادة المحاولة</button>
      `;
      root.appendChild(container);
      const btn = document.getElementById('retryBtn');
      if (btn) btn.addEventListener('click', () => location.reload());
    }, BOOT_FAIL_TIMEOUT);
  } catch { }
})();
