// Centralized config & feature flags for instrumentation
const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
const getLS = (k: string) => {
  try { return ls?.getItem(k) ?? '' } catch { return '' }
};
const getFlag = (kEnv: string, kLS: string, def: boolean) => {
  const lsVal = getLS(kLS);
  if (lsVal) return lsVal === 'true';
  const envVal = (import.meta as any)?.env?.[kEnv];
  return String(envVal ?? (def ? 'true' : 'false')) === 'true';
};

export const SECURITY_CONFIG = {
  sentryDsn: (import.meta as any)?.env?.VITE_SENTRY_DSN || '',
  sentryRelease: (import.meta as any)?.env?.VITE_RELEASE || '',
  sentryEnv: (import.meta as any)?.env?.VITE_ENV || 'production',
  analytics: {
    ga4MeasurementId: (import.meta as any)?.env?.VITE_GA4_ID || '',
    matomoUrl: (import.meta as any)?.env?.VITE_MATOMO_URL || '',
    matomoSiteId: (import.meta as any)?.env?.VITE_MATOMO_SITE_ID || '',
    enable: true,
  },
  logs: {
    enableConsoleJson: true,
    endpoint: (import.meta as any)?.env?.VITE_LOG_ENDPOINT || '', // e.g. /api/logs -> forward to Loki/Fluentd
    sampleRate: 1.0,
  },
  tracing: {
    enable: getFlag('VITE_TRACING_ENABLED', 'VITE_TRACING_ENABLED', false),
    serviceName: (import.meta as any)?.env?.VITE_SERVICE_NAME || 'frontend',
    otlpHttpUrl: (import.meta as any)?.env?.VITE_OTLP_HTTP_URL || '/otel/v1/traces', // proxy path or full URL
    resourceAttributes: (import.meta as any)?.env?.VITE_OTEL_RESOURCE || '', // key1=val1,key2=val2
  },
  ux: {
    clarityId: (import.meta as any)?.env?.VITE_CLARITY_ID || '',
    hotjarId: (import.meta as any)?.env?.VITE_HOTJAR_ID || '',
    hotjarSv: (import.meta as any)?.env?.VITE_HOTJAR_SV || '6',
    enable: getFlag('VITE_UX_ENABLED', 'VITE_UX_ENABLED', false),
  },
  perf: {
    enablePerformanceObserver: true,
    traceFetch: true,
  },
  privacy: {
    maskPII: true,
  },
};
