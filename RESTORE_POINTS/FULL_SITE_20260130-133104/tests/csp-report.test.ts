import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('CSP report ingestion', () => {
  it('accepts report to /api/csp-report and returns 204', async () => {
    const body = {
      'csp-report': {
        'document-uri': 'http://example.test',
        'violated-directive': 'script-src-elem',
        'blocked-uri': 'inline',
        'original-policy': "default-src 'self'"
      }
    };
    const res = await request(app)
      .post('/api/csp-report')
      .set('content-type', 'application/csp-report')
      .send(JSON.stringify(body));
    expect(res.status).toBe(204);
  });

  it('lists recent violations via /api/csp-violations', async () => {
    const res = await request(app)
      .get('/api/csp-violations?limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
