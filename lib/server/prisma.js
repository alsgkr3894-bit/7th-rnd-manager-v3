import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const PRISMA_CLIENT_KEY = Symbol.for('rnd-manager.prisma');

function getConnectionString(connectionString = process.env.DATABASE_URL) {
  const value = String(connectionString ?? '').trim();
  if (!value) {
    throw new Error('DATABASE_URL is required to create the Prisma client.');
  }
  return value;
}

export function createPrismaClient(options = {}) {
  const adapter = new PrismaPg({
    connectionString: getConnectionString(options.connectionString),
  });
  return new PrismaClient({ adapter });
}

export function getPrismaClient(options = {}) {
  if (options.connectionString) return createPrismaClient(options);
  if (!globalThis[PRISMA_CLIENT_KEY]) {
    globalThis[PRISMA_CLIENT_KEY] = createPrismaClient();
  }
  return globalThis[PRISMA_CLIENT_KEY];
}

export async function disconnectPrismaClient() {
  const client = globalThis[PRISMA_CLIENT_KEY];
  if (!client) return;
  delete globalThis[PRISMA_CLIENT_KEY];
  await client.$disconnect();
}
