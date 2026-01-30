
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initFrontendInstrumentation } from './Sicherheit/frontend';

// --- Reload Guard (لإيقاف الوميض الناتج عن إعادة تحميل متكررة غير مقصودة) ---
(() => {
  try {
    if ((window as any).__reloadGuardInstalled) return;
    (window as any).__reloadGuardInstalled = true;
    const MAX_WITHIN_MS = 4000; // نافذة زمنية للفحص
    const MAX_COUNT = 3;        // أقصى عدد إعادة تحميل مسموح ضمن النافذة قبل الإيقاف
    const KEY = 'reload_guard_events';
    const FLAG_DISABLE = 'reload_guard_disabled';
    const originalReload = window.location.reload.bind(window.location);
    function readList(): any[] {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }
    function writeList(list: any[]) {
      try { localStorage.setItem(KEY, JSON.stringify(list.slice(-25))); } catch {}
    }
    function log(kind: string, info: any = {}) {
      const list = readList();
      list.push({ t: Date.now(), kind, ...info });
      writeList(list);
      if (localStorage.getItem('debugReloadGuard') === '1') {
        console.log('[ReloadGuard]', kind, info);
      }
    }
    (window as any).debugReloadEvents = () => readList();
    (window as any).disableReloadGuard = () => { localStorage.setItem(FLAG_DISABLE,'1'); alert('تم تعطيل حارس إعادة التحميل مؤقتاً'); };
    (window as any).enableReloadGuard = () => { localStorage.removeItem(FLAG_DISABLE); alert('تم تفعيل حارس إعادة التحميل'); };
    window.location.reload = function(force?: boolean) {
      if (localStorage.getItem(FLAG_DISABLE) === '1') {
        log('bypass-disabled-flag', { force });
        return originalReload(force as any);
      }
      const list = readList().filter(e => Date.now() - e.t < MAX_WITHIN_MS);
      const reloadsInWindow = list.filter(e => e.kind === 'reload-call');
      if (reloadsInWindow.length >= MAX_COUNT) {
        log('blocked', { force, reloadsInWindow: reloadsInWindow.length });
        // عرض رسالة لمرة واحدة فقط
        if (!sessionStorage.getItem('reload_guard_block_msg')) {
          sessionStorage.setItem('reload_guard_block_msg','1');
          alert('تم إيقاف إعادة التحميل المتكرر لتجنب الوميض. يمكنك تعطيل الحارس مؤقتاً عبر window.disableReloadGuard() من الكونسول.');
        }
        return; // منع إعادة التحميل
      }
      log('reload-call', { force });
      return originalReload(force as any);
    } as any;
    log('installed');
  } catch (e) {
    console.warn('[ReloadGuard] failed to install', e);
  }
})();

// Diagnostics listeners (will run even if mount fails partially)
if (!(window as any).__diagnosticsInstalled) {
  (window as any).__diagnosticsInstalled = true;
  window.addEventListener('error', (e) => {
    console.error('[GLOBAL ERROR]', e.message, e.error);
    const root = document.getElementById('root');
    if (root && !root.dataset.mounted) {
      const div = document.createElement('div');
      div.style.cssText = 'direction:rtl;background:#fef2f2;border:1px solid #dc2626;color:#991b1b;padding:12px;margin:12px;font:14px Cairo,sans-serif;white-space:pre-wrap;';
      div.textContent = 'خطأ أثناء التمهيد: '+ e.message;
      root.appendChild(div);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED REJECTION]', e.reason);
    const root = document.getElementById('root');
    if (root && !root.dataset.mounted) {
      const div = document.createElement('div');
      div.style.cssText = 'direction:rtl;background:#fefce8;border:1px solid #ca8a04;color:#854d0e;padding:12px;margin:12px;font:14px Cairo,sans-serif;white-space:pre-wrap;';
      div.textContent = 'وعد مرفوض بدون معالجة: ' + (e.reason?.message || String(e.reason));
      root.appendChild(div);
    }
  });
  console.log('[DIAG] Global diagnostics listeners attached');
}

// Sanity check for React version
try {
  // @ts-ignore
  console.log('[DIAG] React version', React?.version);
} catch (_) {}

// Initialize Sicherheit instrumentation (error tracking, perf, fetch tracing)
try {
  initFrontendInstrumentation();
  console.log('[Sicherheit] Frontend instrumentation initialized');
} catch (e) {
  console.warn('[Sicherheit] init failed', e);
}

// Optional Sentry init (frontend) - dynamic import to avoid hard dependency
// Controlled by VITE_SENTRY_ENABLED and VITE_SENTRY_DSN
try {
  // @ts-ignore
  const enableSentry = (import.meta?.env?.VITE_SENTRY_ENABLED || 'false') === 'true';
  // @ts-ignore
  const dsn = import.meta?.env?.VITE_SENTRY_DSN;
  if (enableSentry && dsn) {
    import('@sentry/react').then((Sentry) => {
      try {
        // @ts-ignore optional tracing sample rate from env
        const rate = Number(import.meta?.env?.VITE_SENTRY_TRACES_SAMPLE_RATE || 0);
        // @ts-ignore optional replays sample rate
        const rrate = Number(import.meta?.env?.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0);
        // @ts-ignore optional replays on error
        const rerr = Number(import.meta?.env?.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 1);
        Sentry.init({ dsn, tracesSampleRate: rate, replaysSessionSampleRate: rrate, replaysOnErrorSampleRate: rerr });
        (window as any).Sentry = Sentry;
        console.log('[Sentry] Frontend initialized');
      } catch (e) { console.warn('[Sentry] frontend init failed', e); }
    }).catch((e) => console.warn('[Sentry] frontend import failed', e));
  }
} catch (_) {}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  if (rootElement) {
    const elapsed = (performance.now() - (window as any).__bootTime).toFixed(1);
    (rootElement as HTMLElement).dataset.mounted = 'true';
    rootElement.dispatchEvent(new CustomEvent('app:mounted', { detail: { elapsed }}));
    if (localStorage.getItem('debugBoot') === '1') console.log('[BOOT] Mounted in', elapsed,'ms');
    try {
      localStorage.setItem('lastBootElapsedMs', elapsed);
      localStorage.setItem('lastBootAt', new Date().toISOString());
    } catch {}
  }
} catch (error) {
  console.error('Error rendering React app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; text-align: center; background: #ffeeee; border: 2px solid red; margin: 20px;">
      <h1>💥 خطأ في تحميل التطبيق</h1>
      <p><strong>Error:</strong> ${error}</p>
      <button onclick="window.location.reload()">🔄 إعادة التحميل</button>
    </div>
  `;
  (rootElement as HTMLElement).dataset.mountError = 'true';
  rootElement.dispatchEvent(new CustomEvent('app:mount:error', { detail: { message: String(error) }}));
}
