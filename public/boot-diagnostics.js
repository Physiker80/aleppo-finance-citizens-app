// Boot instrumentation & lightweight diagnostics
(function(){
  try {
    window.__bootTime = performance.now();
    const DEBUG_BOOT = localStorage.getItem('debugBoot') === '1';
    if (DEBUG_BOOT) console.log('[BOOT] index.html start @', window.__bootTime.toFixed(1),'ms');
    if (performance.mark) performance.mark('boot:index.html');
  } catch {}
})();
