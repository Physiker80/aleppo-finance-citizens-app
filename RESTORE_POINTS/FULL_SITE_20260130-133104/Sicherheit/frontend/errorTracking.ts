import { SECURITY_CONFIG } from '../config';

export function initErrorTracking() {
  const dsn = SECURITY_CONFIG.sentryDsn;
  if (!dsn) return; // No-op if not provided
  // Optional Sentry is disabled unless dependency is installed by the integrator.
  // To enable:
  //   1) npm i @sentry/browser
  //   2) set VITE_SENTRY_DSN in .env
  //   3) replace this stub with a dynamic import as documented in Sicherheit/README.md
  // We log a one-time warning to guide setup without breaking dev server.
  try { console.warn('[Sicherheit] Sentry DSN configured but @sentry/browser not installed. Skipping init.'); } catch {}
}
