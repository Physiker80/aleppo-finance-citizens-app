// Real-time Security Monitor: threat detection, IP blocking, and metrics
// ESM module
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function ensureDir(dir) {
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
}

export class SecurityMonitor {
  constructor(options = {}) {
    const env = (k, d) => {
      try { const v = process.env[k]; return (v == null || v === '') ? d : v; } catch { return d; }
    };
    this.config = {
      failedLoginCount: Number(env('SEC_MON_FAILED_LOGIN_THRESHOLD', 5)),
      failedLoginWindowSec: Number(env('SEC_MON_FAILED_LOGIN_WINDOW_SEC', 300)),
      apiMaxRpm: Number(env('SEC_MON_MAX_RPM', 100)),
      apiRpmWindowSec: Number(env('SEC_MON_RPM_WINDOW_SEC', 60)),
      blockDurationSec: Number(env('SEC_MON_BLOCK_DURATION_SEC', 3600)),
      bruteBlockDurationSec: Number(env('SEC_MON_BRUTE_BLOCK_DURATION_SEC', 86400)),
      slowRequestMs: Number(env('SEC_MON_SLOW_REQUEST_MS', 1000)),
      verySlowRequestMs: Number(env('SEC_MON_VERY_SLOW_MS', 5000)),
    };

    this.thresholds = {
      failedLogins: { count: this.config.failedLoginCount, window: this.config.failedLoginWindowSec },
      apiRate: { count: this.config.apiMaxRpm, window: this.config.apiRpmWindowSec },
      errorRate: { percentage: 5, window: 300 },    // 5% errors in 5 minutes (informational)
      suspiciousPatterns: {
        sqlInjection: /(\bUNION\b|\bSELECT\b.*\bFROM\b|\bDROP\b|\bDELETE\b.*\bFROM\b)/i,
        xssAttempt: /<script|javascript:|on\w+\s*=/i,
        pathTraversal: /\.\.[\/\\]/,
        commandInjection: /[;&|`$]/
      }
    };

    this.alerts = [];
    this.metricsMap = new Map();
    this.recentAttempts = new Map(); // key -> number[] timestamps (seconds)
    this.requestBuckets = new Map(); // ip -> number[] timestamps (seconds)
    this.blockedIps = new Map(); // ip -> expiresAt (ms)

    this.promClient = options.promClient || null;
    this.metrics = this.promClient ? this.createMetrics(this.promClient) : null;
    this.saveDir = options.saveDir || path.join(process.cwd(), 'observability');
    ensureDir(this.saveDir);
    this.alertsFile = path.join(this.saveDir, 'security-alerts.json');
    this.eventsFile = path.join(this.saveDir, 'security-events.log');
    this.onAlert = typeof options.onAlert === 'function' ? options.onAlert : null;
  }

  createMetrics(promClient) {
    const ns = 'alf_sec_';
    return {
      requestsTotal: new promClient.Counter({ name: `${ns}requests_total`, help: 'Total HTTP requests observed by SecurityMonitor' }),
      errorsTotal: new promClient.Counter({ name: `${ns}errors_total`, help: 'Total error responses (>=400) observed by SecurityMonitor' }),
      statusCounter: new promClient.Counter({ name: `${ns}status_code_total`, help: 'Responses by status code', labelNames: ['code'] }),
      durationMs: new promClient.Histogram({ name: `${ns}request_duration_ms`, help: 'Request duration (ms) observed by SecurityMonitor', buckets: [50,100,200,400,800,1600,3200,6400] })
    };
  }

  getRequestId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return crypto.createHash('sha256').update(String(Date.now()) + Math.random()).digest('hex').slice(0, 32);
  }

  getIp(req) {
    try {
      return (req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown').replace('::ffff:', '');
    } catch { return 'unknown'; }
  }

  blocklistMiddleware = (req, res, next) => {
    try {
      const ip = this.getIp(req);
      const until = this.blockedIps.get(ip);
      const now = Date.now();
      if (until && until > now) {
        res.status(403).json({ ok: false, error: 'IP temporarily blocked', blockedUntil: new Date(until).toISOString() });
        return;
      }
      if (until && until <= now) this.blockedIps.delete(ip);
    } catch {}
    next();
  }

  async monitorRequest(req, res) {
    const start = Date.now();
    const requestId = this.getRequestId();
    this.trackMetric('requests_total', 1);
    if (this.metrics) this.metrics.requestsTotal.inc();

    // detect suspicious patterns early
    try {
      const threats = this.detectThreats(req);
      if (threats.length) await this.handleThreats(threats, req, requestId);
    } catch {}

    // very lightweight per-IP rate observation
    this.observeRequestRate(this.getIp(req));

    res.on('finish', async () => {
      const duration = Date.now() - start;
      const code = res.statusCode;
      if (this.metrics) {
        this.metrics.durationMs.observe(duration);
        this.metrics.statusCounter.inc({ code: String(code) }, 1);
        if (code >= 400) this.metrics.errorsTotal.inc();
      }
      this.trackMetric('request_duration_ms', duration);
      this.trackMetric(`status_${code}`, 1);

      if (code >= 400) {
        this.trackMetric('errors_total', 1);
        if (code === 401) await this.checkBruteForce(req);
      }

      if (duration > this.config.slowRequestMs) {
        await this.reportSlowRequest(req, duration, requestId);
      }
    });
  }

  detectThreats(req) {
    const threats = [];
    let checkString = '';
    try {
      checkString = JSON.stringify({ body: req.body, query: req.query, params: req.params });
    } catch { checkString = ''; }

    for (const [type, pattern] of Object.entries(this.thresholds.suspiciousPatterns)) {
      try {
        if (pattern.test(checkString)) {
          threats.push({
            type,
            severity: this.getThreatSeverity(type),
            pattern: pattern.toString(),
            timestamp: new Date(),
            request: { method: req.method, path: req.path, ip: this.getIp(req), userAgent: req.headers['user-agent'] }
          });
        }
      } catch {}
    }
    return threats;
  }

  getThreatSeverity(type) {
    switch (type) {
      case 'sqlInjection': return 'CRITICAL';
      case 'xssAttempt': return 'HIGH';
      case 'pathTraversal': return 'HIGH';
      case 'commandInjection': return 'CRITICAL';
      default: return 'MEDIUM';
    }
  }

  async handleThreats(threats, req, requestId) {
    for (const t of threats) {
      await this.logSecurityEvent({ type: 'THREAT_DETECTED', threat: t, requestId, userId: req.authUser?.id || null, action: 'OBSERVED' });
      if (t.severity === 'CRITICAL') {
        const ip = this.getIp(req);
        await this.blockIP(ip, this.config.blockDurationSec); // configurable
        await this.sendAlert({ level: 'CRITICAL', title: `تهديد أمني حرج: ${t.type}`, details: t, requestId });
      } else if (t.severity === 'HIGH') {
        await this.sendAlert({ level: 'HIGH', title: `تهديد أمني: ${t.type}`, details: t, requestId });
      }
    }
  }

  async checkBruteForce(req) {
    const key = `failed_login_${this.getIp(req)}`;
    const attempts = this.getRecentAttempts(key, this.thresholds.failedLogins.window);
    if (attempts >= this.thresholds.failedLogins.count) {
      await this.handleBruteForce(this.getIp(req));
    } else {
      this.addAttempt(key);
    }
  }

  addAttempt(key) {
    const now = Math.floor(Date.now() / 1000);
    const arr = this.recentAttempts.get(key) || [];
    arr.push(now);
    this.recentAttempts.set(key, arr);
  }

  getRecentAttempts(key, windowSec) {
    const now = Math.floor(Date.now() / 1000);
    const arr = this.recentAttempts.get(key) || [];
    const pruned = arr.filter(ts => ts >= now - windowSec);
    this.recentAttempts.set(key, pruned);
    return pruned.length;
  }

  async handleBruteForce(ip) {
    await this.blockIP(ip, this.config.bruteBlockDurationSec);
    await this.logSecurityEvent({ type: 'BRUTE_FORCE_DETECTED', ip, action: 'IP_BLOCKED', durationSec: this.config.bruteBlockDurationSec });
    await this.sendAlert({ level: 'HIGH', title: 'محاولة اختراق بالقوة الغاشمة', details: { ip, blockedUntil: new Date(Date.now() + this.config.bruteBlockDurationSec * 1000) } });
  }

  async blockIP(ip, seconds) {
    const until = Date.now() + (seconds * 1000);
    this.blockedIps.set(ip, until);
    try {
      await this.logSecurityEvent({ type: 'IP_BLOCKED', ip, until: new Date(until).toISOString() });
    } catch {}
  }

  async unblockIP(ip) {
    this.blockedIps.delete(ip);
    await this.logSecurityEvent({ type: 'IP_UNBLOCKED', ip });
  }

  async sendAlert(alert) {
    try {
      const withMeta = { id: this.getRequestId(), at: new Date().toISOString(), ...alert };
      this.alerts.push(withMeta);
      if (this.alerts.length > 500) this.alerts.splice(0, this.alerts.length - 500);
      ensureDir(this.saveDir);
      fs.writeFileSync(this.alertsFile, JSON.stringify(this.alerts, null, 2), 'utf-8');
      // Also log to console for immediate visibility
      const lvl = String(alert.level || 'INFO').toUpperCase();
      // eslint-disable-next-line no-console
      console[lvl === 'CRITICAL' || lvl === 'HIGH' ? 'warn' : 'log']('[SEC-ALERT]', lvl, alert.title || '', alert.details || '');
      if (this.onAlert && (lvl === 'CRITICAL' || lvl === 'HIGH')) {
        try { await this.onAlert(withMeta); } catch {}
      }
    } catch {}
  }

  async logSecurityEvent(event) {
    try {
      const line = JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n';
      ensureDir(this.saveDir);
      fs.appendFileSync(this.eventsFile, line, 'utf-8');
    } catch {}
  }

  async reportSlowRequest(req, durationMs, requestId) {
    await this.logSecurityEvent({ type: 'SLOW_REQUEST', requestId, path: req.path, method: req.method, durationMs, ip: this.getIp(req) });
    if (durationMs > this.config.verySlowRequestMs) {
      await this.sendAlert({ level: 'WARN', title: 'طلب بطيء جداً', details: { path: req.path, durationMs } });
    }
  }

  trackMetric(name, value) {
    const v = Number(value) || 0;
    const curr = this.metricsMap.get(name) || 0;
    this.metricsMap.set(name, curr + v);
  }

  observeRequestRate(ip) {
    if (!ip) return;
    const now = Math.floor(Date.now() / 1000);
    const arr = this.requestBuckets.get(ip) || [];
    const pruned = arr.filter(ts => ts >= now - this.thresholds.apiRate.window);
    pruned.push(now);
    this.requestBuckets.set(ip, pruned);
    if (pruned.length > this.thresholds.apiRate.count) {
      // Exceeded soft limit → alert (do not block automatically here)
      this.sendAlert({ level: 'WARN', title: 'معدل طلبات مرتفع من IP', details: { ip, count: pruned.length, windowSec: this.thresholds.apiRate.window } });
    }
  }

  // Admin views (defensive: never throw)
  getAlerts() {
    try {
      const list = Array.isArray(this.alerts) ? this.alerts : [];
      return list.slice().reverse();
    } catch { return []; }
  }
  getBlocklist() {
    try {
      const now = Date.now();
      const arr = [];
      const it = this.blockedIps && typeof this.blockedIps.entries === 'function'
        ? this.blockedIps.entries()
        : [];
      for (const [ip, until] of it) {
        if (!(Number(until) > 0)) continue;
        if (until <= now) { try { this.blockedIps.delete(ip); } catch {} continue; }
        arr.push({ ip, blockedUntil: new Date(Number(until)).toISOString() });
      }
      return arr;
    } catch { return []; }
  }
}

export default SecurityMonitor;
