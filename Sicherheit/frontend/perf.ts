import { SECURITY_CONFIG } from '../config';
import { log } from '../logger';

export function initPerformanceObservers() {
  if (!SECURITY_CONFIG.perf.enablePerformanceObserver || typeof PerformanceObserver === 'undefined') return;

  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) log.info('perf.lcp', { value: last.startTime });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as any);

    // Cumulative Layout Shift (CLS)
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      log.info('perf.cls', { value: cls });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true } as any);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const first = list.getEntries()[0] as any;
      if (first) log.info('perf.fid', { value: first.processingStart - first.startTime });
    });
    fidObserver.observe({ type: 'first-input', buffered: true } as any);

    // Navigation timing
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      log.info('perf.navigation', {
        domContentLoaded: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd,
        transferSize: (nav as any).transferSize,
      });
    }
  } catch (_) {}
}
