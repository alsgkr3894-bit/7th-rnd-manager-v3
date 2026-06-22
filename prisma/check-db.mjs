import { disconnectPrismaClient, getPrismaClient } from '../lib/server/prisma.js';
import { readDbHealth } from '../lib/server/db-health.js';

async function main() {
  const prisma = getPrismaClient();
  try {
    console.log(JSON.stringify(await readDbHealth(prisma), null, 2));
  } finally {
    await disconnectPrismaClient();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
