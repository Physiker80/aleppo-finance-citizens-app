import { initErrorTracking } from './errorTracking';
import { initPerformanceObservers } from './perf';
import { patchFetchForTracing } from './fetchTrace';
import { log } from '../logger';
import { initFrontendOTEL } from './otel';
import { initUXMonitoring } from './ux';

export function initFrontendInstrumentation() {
  initErrorTracking();
  initPerformanceObservers();
  patchFetchForTracing();
  initFrontendOTEL();
  initUXMonitoring();
  // One-time init log to verify instrumentation wiring
  try {
    log.info('sicherheit.init', { ok: true, ts: Date.now() });
  } catch {}
}
