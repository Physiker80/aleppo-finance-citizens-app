// Boot Diagnostics - يساعد في تشخيص مشاكل التحميل
(function () {
  window.__bootTime = performance.now();
  console.log('[BOOT] 🚀 Boot diagnostics started at', window.__bootTime.toFixed(0), 'ms');

  // مراقبة أخطاء تحميل الموارد
  window.addEventListener('error', function (e) {
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      console.error('[BOOT] ❌ Failed to load resource:', e.target.src || e.target.href);
      var loader = document.getElementById('initial-loader');
      if (loader) {
        var msg = 'فشل تحميل: ' + (e.target.src || e.target.href).split('/').pop();
        loader.innerHTML = '<div style="background:white;border-radius:16px;padding:40px;text-align:center;max-width:500px;direction:rtl;"><h2 style="color:#b91c1c;margin:0 0 10px;">❌ خطأ في تحميل الموارد</h2><p style="color:#666;font-size:0.9rem;">' + msg + '</p><button onclick="location.reload()" style="margin-top:15px;background:#0f3c35;color:white;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;">🔄 إعادة المحاولة</button></div>';
      }
    }
  }, true);

  // مراقبة أخطاء JavaScript
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[BOOT] ❌ Unhandled Promise rejection:', e.reason);
  });

  // مراقبة تحميل الصفحة
  window.addEventListener('DOMContentLoaded', function () {
    console.log('[BOOT] ✅ DOMContentLoaded at', (performance.now() - window.__bootTime).toFixed(0), 'ms');
  });

  window.addEventListener('load', function () {
    console.log('[BOOT] ✅ Window load at', (performance.now() - window.__bootTime).toFixed(0), 'ms');
    var root = document.getElementById('root');
    console.log('[BOOT] 📊 Root mounted:', root ? root.dataset.mounted : 'no root');
  });

  // تحقق دوري من حالة التطبيق
  var checkCount = 0;
  var bootCheck = setInterval(function () {
    checkCount++;
    var root = document.getElementById('root');
    var loader = document.getElementById('initial-loader');
    var mounted = root ? root.dataset.mounted : 'undefined';

    if (mounted === 'true') {
      console.log('[BOOT] ✅ App mounted successfully after', checkCount, 'checks');
      clearInterval(bootCheck);
      return;
    }

    if (checkCount >= 150) { // 15 ثانية
      console.error('[BOOT] ⏱️ Timeout - App not mounted after 15 seconds');
      console.log('[BOOT] 📊 Debug info:', {
        rootExists: !!root,
        rootMounted: mounted,
        loaderExists: !!loader,
        rootChildren: root ? root.children.length : 0
      });
      clearInterval(bootCheck);
    }
  }, 100);
})();
