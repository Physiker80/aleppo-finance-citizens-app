import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';

// Ensure test env
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./dev-test.db';

// Import after env setup
import { app, prisma } from '../server.js';

let departmentId: string;

beforeAll(async () => {
  let dept = await prisma.department.findFirst({ where: { name: 'قسم الاختبار' } });
  if (!dept) {
    dept = await prisma.department.create({ data: { name: 'قسم الاختبار' } });
  }
  departmentId = dept.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/tickets', () => {
  it('creates a ticket with minimal valid payload', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ departmentId, citizenName: 'مواطن', citizenNationalId: '123456789', type: 'شكوى' })
      .set('content-type', 'application/json');
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.departmentId).toBe(departmentId);
    expect(res.body.ticket.status).toBe('NEW');
  });

  it('rejects missing departmentId', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ citizenName: 'مواطن' })
      .set('content-type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
