// Content Security Policy (CSP) progressive middleware with nonce support
// - Two modes: reportOnly (monitoring) and enforce (strict)
// - Generates a per-request nonce and injects it to res.locals.nonce
// - Builds policy from configured directives and sets appropriate header

import crypto from 'crypto';

export const cspConfig = {
  // المرحلة 1: Report-Only (مراقبة فقط)
  reportOnly: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // مؤقتاً، سيتم إزالته
      'https://cdn.jsdelivr.net',
      'https://cdn.tailwindcss.com',
      'https://cdnjs.cloudflare.com',
      "'nonce-{NONCE}'" // للسكريبتات المضمنة الضرورية
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // مؤقتاً للأنماط المضمنة
      'https://fonts.googleapis.com'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    connectSrc: [
      "'self'",
      'wss://',
      'https://api.finance.gov.sy'
    ],
    mediaSrc: ["'none'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    reportUri: ['/api/csp-report']
  },

  // المرحلة 2: Enforce (تطبيق صارم)
  enforce: {
    defaultSrc: ["'none'"],
    scriptSrc: [
      "'self'",
      "'nonce-{NONCE}'",
      "'strict-dynamic'" // للسكريبتات الموثوقة فقط
    ],
    styleSrc: [
      "'self'",
      "'nonce-{NONCE}'"
    ],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    mediaSrc: ["'none'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"]
  }
};

export class CSPMiddleware {
  constructor(mode = 'reportOnly', overrides) {
    // Support auto-enforce via env date (e.g., 2025-10-01)
    const autoDate = process.env.CSP_AUTO_ENFORCE_DATE;
    let effectiveMode = mode === 'enforce' ? 'enforce' : 'reportOnly';
    if (autoDate) {
      const d = Date.parse(autoDate);
      if (!Number.isNaN(d) && Date.now() >= d) effectiveMode = 'enforce';
    }
    this.mode = effectiveMode;

    // Build base config and apply dynamic CDN allowances for report-only from env
    const base = cspConfig[this.mode] || {};
    const cfg = { ...base };
    if (this.mode === 'reportOnly') {
      // Allow extra CDNs via comma-separated envs
      const extraScripts = (process.env.CSP_EXTRA_SCRIPT_SRC || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const extraStyles = (process.env.CSP_EXTRA_STYLE_SRC || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const extraConnect = (process.env.CSP_EXTRA_CONNECT_SRC || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      if (extraScripts.length) cfg.scriptSrc = [...(cfg.scriptSrc || []), ...extraScripts];
      if (extraStyles.length) cfg.styleSrc = [...(cfg.styleSrc || []), ...extraStyles];
      if (extraConnect.length) cfg.connectSrc = [...(cfg.connectSrc || []), ...extraConnect];
    }
    this.config = { ...cfg, ...(overrides || {}) };
  }

  generateNonce() {
    return crypto.randomBytes(16).toString('base64');
  }

  camelToKebab(str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  buildPolicy(nonce) {
    const directives = [];
    for (const [directive, sources] of Object.entries(this.config)) {
      if (!Array.isArray(sources)) continue; // skip non-array like reportUri in enforce mode if absent
      let sourcesStr = sources.join(' ').replace(/{NONCE}/g, nonce);
      directives.push(`${this.camelToKebab(directive)} ${sourcesStr}`);
    }
    return directives.join('; ');
  }

  apply() {
    return (req, res, next) => {
      try {
        const nonce = this.generateNonce();
        res.locals = res.locals || {};
        res.locals.nonce = nonce;
        // Optional: expose nonce for SPA use if needed
        res.setHeader('X-Content-Security-Policy-Nonce', nonce);

        const policy = this.buildPolicy(nonce);
        const headerName = this.mode === 'reportOnly'
          ? 'Content-Security-Policy-Report-Only'
          : 'Content-Security-Policy';
        res.setHeader(headerName, policy);
      } catch {
        // best-effort; do not block requests
      }
      next();
    };
  }
}

export default CSPMiddleware;
