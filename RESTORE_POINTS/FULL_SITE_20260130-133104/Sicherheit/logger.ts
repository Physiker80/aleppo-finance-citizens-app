// Minimal JSON logger with PII masking and optional POST forwarding
import { SECURITY_CONFIG } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  request_id?: string;
  user_id?: string;
  path?: string;
  duration_ms?: number;
  [key: string]: any;
}

const mask = (val: unknown) => {
  if (!SECURITY_CONFIG.privacy.maskPII) return val;
  if (typeof val !== 'string') return val;
  // Basic masking for emails and national ids
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
    const [u, d] = val.split('@');
    return u.slice(0,2) + '***@' + d;
  }
  if (/\b\d{11}\b/.test(val)) return val.substring(0,3) + '*********';
  return val;
};

const emit = (rec: LogRecord) => {
  const out = { ...rec };
  if (out.user_id) out.user_id = String(mask(out.user_id));
  if (SECURITY_CONFIG.logs.enableConsoleJson) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(out));
  }
  if (SECURITY_CONFIG.logs.endpoint && Math.random() <= SECURITY_CONFIG.logs.sampleRate) {
    try {
      fetch(SECURITY_CONFIG.logs.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(out),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }
};

export const log = {
  debug: (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: 'debug', message: msg, ...extra }),
  info:  (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: 'info',  message: msg, ...extra }),
  warn:  (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: 'warn',  message: msg, ...extra }),
  error: (msg: string, extra?: Record<string, any>) => emit({ timestamp: new Date().toISOString(), level: 'error', message: msg, ...extra }),
};
