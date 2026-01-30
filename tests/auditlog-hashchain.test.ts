import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./dev-test.db';
process.env.ADMIN_DEFAULT_PASSWORD = 'admin123';

import { app, prisma, baselineReady } from '../server.js';

let agent = request.agent(app);
let departmentId: string;
let ticketId: string;

/*
 Hash Chain Integrity Test
 1. Login (creates Session)
 2. Create first ticket -> AuditLog A (ticket.create)
 3. Create second ticket -> AuditLog B (ticket.create) should reference A.hashChainCurr
 4. Verify hashChainPrev/link consistency and recompute B.hashChainCurr from stored prev + payload
*/

async function recomputeHash(after: any, prev: string | null) {
  const crypto = await import('crypto');
  const payload = { action: 'ticket.create', entity: 'Ticket', entityId: after.id, after: JSON.stringify(after) };
  const base = (prev || '') + JSON.stringify(payload);
  return crypto.createHash('sha256').update(base).digest('hex');
}

beforeAll(async () => {
  // ensure baseline
  await baselineReady;
  // create a department for tickets
  const dept = await prisma.department.create({ data: { name: `قسم السلسلة ${Date.now()}` } });
  departmentId = dept.id;
  // login
  const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  expect(res.status).toBe(200);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AuditLog hash chain integrity', () => {
  it('creates two tickets and validates hash chain linkage', async () => {
    // first ticket
    const t1 = await agent.post('/api/tickets').send({ departmentId, citizenName: 'مواطن1', type: 'استعلام' });
    expect(t1.status).toBe(201);
    const id1 = t1.body.ticket.id;

    // second ticket
    const t2 = await agent.post('/api/tickets').send({ departmentId, citizenName: 'مواطن2', type: 'استعلام' });
    expect(t2.status).toBe(201);
    const id2 = t2.body.ticket.id;

    // fetch logs ordered by createdAt asc
  const logs = await prisma.auditLog.findMany({ where: { action: 'ticket.create', entity: 'Ticket' }, orderBy: { createdAt: 'asc' } });
  // find the two we just made (approx by entityId)
  const log1 = logs.find((l: any) => l.entityId === id1);
  const log2 = logs.find((l: any) => l.entityId === id2);
    expect(log1).toBeTruthy();
    expect(log2).toBeTruthy();

    // Ensure second references first (or some earlier link if other logs existed). If there were pre-existing logs,
    // we ensure simply that log2.hashChainPrev === log1.hashChainCurr when log1.createdAt < log2.createdAt.
    if (log1 && log2) {
      // Only assert direct link if no other create logs were inserted between them.
  const intervening = logs.filter((l: any) => l.createdAt > log1.createdAt && l.createdAt < log2.createdAt && l.action === 'ticket.create');
      if (intervening.length === 0) {
        expect(log2.hashChainPrev).toBe(log1.hashChainCurr);
      }
      // Recompute hash of log2
      const after2 = JSON.parse(log2.after || '{}');
      const recomputed = await recomputeHash(after2, log2.hashChainPrev);
      expect(recomputed).toBe(log2.hashChainCurr);
    }
  });
});
