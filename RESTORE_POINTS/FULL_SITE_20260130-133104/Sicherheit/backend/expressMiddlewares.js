// CommonJS for compatibility with current server.js (ESM import used, but Node can import CJS)
import crypto from 'crypto';

export function requestIdMiddleware(req, _res, next) {
  req.request_id = req.headers['x-request-id'] || crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  next();
}

export function logMiddleware(req, res, next) {
  const start = Date.now();
  const rid = req.request_id || req.headers['x-request-id'];
  res.on('finish', () => {
    const rec = {
      timestamp: new Date().toISOString(),
      service: 'email-server',
      level: res.statusCode >= 500 ? 'error' : 'info',
      message: 'http.server',
      request_id: rid,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      user_agent: req.headers['user-agent']
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(rec));
  });
  next();
}

export function metricsLiteHandler(_req, res) {
  // Minimal on-demand snapshot (placeholder for Prometheus later)
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    uptime_s: process.uptime(),
  });
}
