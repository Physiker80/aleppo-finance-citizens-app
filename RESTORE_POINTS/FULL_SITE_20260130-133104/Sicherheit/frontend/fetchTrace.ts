import { SECURITY_CONFIG } from '../config';
import { log } from '../logger';

export function patchFetchForTracing() {
  if (!SECURITY_CONFIG.perf.traceFetch || !(window as any).fetch) return;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const request_id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const url = typeof input === 'string' ? input : (input as URL).toString();
    try {
      const res = await orig(input, {
        ...(init || {}),
        headers: { ...(init?.headers as any), 'x-request-id': request_id },
      });
      const dur = performance.now() - start;
      log.info('http.client', { path: url, request_id, status: (res as any).status, duration_ms: Math.round(dur) });
      return res;
    } catch (e: any) {
      const dur = performance.now() - start;
      log.error('http.client.error', { path: url, request_id, duration_ms: Math.round(dur), error: e?.message || String(e) });
      throw e;
    }
  };
}
