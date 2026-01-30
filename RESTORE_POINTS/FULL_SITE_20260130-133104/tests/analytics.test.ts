import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./dev-test.db';

import { app } from '../server.js';

describe('Analytics API', () => {
  it('returns series', async () => {
    const res = await request(app).get('/api/analytics/series?minutes=5');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.series)).toBe(true);
  });

  it('returns anomalies (may be empty)', async () => {
    const res = await request(app).get('/api/analytics/anomalies?window=5&z=2');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('returns out-of-hours events summary', async () => {
    const res = await request(app).get('/api/analytics/out-of-hours');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('returns behavior summary', async () => {
    const res = await request(app).get('/api/analytics/behavior-summary');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('returns dashboard summary', async () => {
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.series)).toBe(true);
    expect(Array.isArray(res.body.topRoutes)).toBe(true);
  });
});
