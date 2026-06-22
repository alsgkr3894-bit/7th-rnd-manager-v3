import { fileURLToPath } from 'node:url';

import { disconnectPrismaClient, getPrismaClient } from '../lib/server/prisma.js';
import { DEFAULT_BRAND_SEED, STORE_CATALOG_SEED } from './store-catalog.mjs';

function splitId(record) {
  const { id, ...data } = record;
  return { id, data };
}

function splitName(record) {
  const { name, ...data } = record;
  return { name, data };
}

export async function seedBrands(prisma) {
  for (const brand of DEFAULT_BRAND_SEED) {
    const { id, data } = splitId(brand);
    await prisma.brand.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
}

export async function seedStoreCatalog(prisma) {
  for (const store of STORE_CATALOG_SEED) {
    const { name, data } = splitName(store);
    await prisma.storeCatalog.upsert({
      where: { name },
      update: data,
      create: { name, ...data },
    });
  }
}

export async function seedStoreCatalogDefaults(prisma) {
  await seedBrands(prisma);
  await seedStoreCatalog(prisma);
  return {
    brandCount: DEFAULT_BRAND_SEED.length,
    storeCount: STORE_CATALOG_SEED.length,
  };
}

async function main() {
  const prisma = getPrismaClient();
  const result = await seedStoreCatalogDefaults(prisma);
  console.log(`Seeded ${result.brandCount} brands and ${result.storeCount} store catalog rows.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectPrismaClient();
    });
}
