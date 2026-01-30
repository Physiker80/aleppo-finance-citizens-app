// Dynamic import with performance marks & error capture
(async function(){
  try {
    if (performance.mark) performance.mark('boot:import:start');
    await import('/index.tsx');
    if (performance.mark) performance.mark('boot:import:success');
    if (performance.measure) performance.measure('boot:import','boot:import:start','boot:import:success');
    if (localStorage.getItem('debugBoot') === '1') console.log('[BOOT] index.tsx imported');
  } catch (err) {
    if (performance.mark) performance.mark('boot:import:error');
    console.error('[BOOT] index.tsx failed to load', err);
    const r = document.getElementById('root');
    if (r && !r.dataset.mounted) {
      r.dataset.mountError = 'true';
      const pre = document.createElement('pre');
      pre.style.direction = 'ltr';
      pre.style.textAlign = 'left';
      pre.style.fontSize = '12px';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.padding = '1rem';
      pre.style.color = '#b91c1c';
      pre.style.background = '#fff';
      pre.style.border = '1px solid #fca5a5';
      pre.style.borderRadius = '8px';
      pre.textContent = 'index.tsx load error:\n' + (err && (err.stack || err.message) || String(err));
      r.appendChild(pre);
    }
  }
})();
