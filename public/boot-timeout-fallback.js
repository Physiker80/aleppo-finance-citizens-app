// Fail-safe timeout fallback content renderer
(function () {
  try {
    const BOOT_FAIL_TIMEOUT = 15000; // 15 ثانية

    // مراقبة أخطاء JavaScript
    window.onerror = function (msg, url, line, col, error) {
      console.error('[BOOT ERROR]', msg, url, line);
      var loader = document.getElementById('initial-loader');
      if (loader) {
        loader.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;max-width:500px;direction:rtl;"><h2 style="color:#b91c1c;margin:0 0 10px;">❌ خطأ في تحميل التطبيق</h2><p style="color:#666;font-size:0.9rem;">' + msg + '</p><p style="font-size:0.7rem;color:#999;direction:ltr;">' + url + ':' + line + '</p><button onclick="location.reload()" style="margin-top:15px;background:#0f3c35;color:white;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;">🔄 إعادة المحاولة</button></div>';
      }
    };

    setTimeout(() => {
      const root = document.getElementById('root');
      const loader = document.getElementById('initial-loader');

      // إذا كانت شاشة التحميل لا تزال موجودة بعد 15 ثانية، أظهر رسالة
      if (loader && (!root || !root.dataset.mounted)) {
        const elapsed = (performance.now() - (window.__bootTime || 0)).toFixed(0);
        loader.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;max-width:500px;direction:rtl;"><h2 style="color:#b91c1c;margin:0 0 10px;">⏱️ تأخر تحميل التطبيق</h2><p style="color:#666;font-size:0.9rem;margin-bottom:15px;">الوقت المنقضي: ' + elapsed + ' مللي ثانية</p><p style="color:#888;font-size:0.8rem;">تحقق من Console للأخطاء</p><button onclick="location.reload()" style="margin-top:15px;background:#0f3c35;color:white;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;">🔄 إعادة المحاولة</button></div>';
      }

      if (!root || root.dataset.mounted || root.dataset.mountError) return;
    }, BOOT_FAIL_TIMEOUT);
  } catch (e) { console.error('[BOOT]', e); }
})();
