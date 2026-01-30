import { PrismaClient } from '@prisma/client';

// Singleton Prisma client (avoid hot-reload multiple connection warnings)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV === 'development') globalForPrisma.prisma = prisma;

export async function healthCheck() {
  // Simple query to ensure DB connectivity
  await prisma.$queryRaw`SELECT 1;`;
  return true;
}
