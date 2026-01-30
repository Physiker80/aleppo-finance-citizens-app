import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./dev-test.db';
process.env.ADMIN_DEFAULT_PASSWORD = 'admin123';

import { app, prisma, baselineReady } from '../server.js';

let agent = request.agent(app);
let departmentId: string;
let cookie: string | undefined;
let createdTicketId: string;

beforeAll(async () => {
  const uniqueName = `قسم التدقيق ${Date.now()}`;
  const dept = await prisma.department.create({ data: { name: uniqueName } });
  departmentId = dept.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth + Ticket Flow', () => {
  it('logs in with default admin', async () => {
    await baselineReady;
    const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  cookie = res.headers['set-cookie']?.find((c: string) => c.startsWith('sid='));
    expect(cookie).toBeDefined();
  });

  it('creates ticket with authenticated user and writes history + audit log', async () => {
    const res = await agent
      .post('/api/tickets')
      .set('Cookie', cookie!)
      .send({ departmentId, citizenName: 'مواطن', type: 'استعلام' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    createdTicketId = res.body.ticket.id;
    // History
    const history = await prisma.ticketHistory.findMany({ where: { ticketId: createdTicketId } });
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('CREATE');
    // Audit log
    const audit = await prisma.auditLog.findMany({ where: { entityId: createdTicketId, action: 'ticket.create' } });
    expect(audit.length).toBe(1);
  });
});
