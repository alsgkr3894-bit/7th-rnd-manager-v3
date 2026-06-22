import { disconnectPrismaClient, getPrismaClient } from '../lib/server/prisma.js';

async function main() {
  const prisma = getPrismaClient();
  try {
    const [databaseInfo] = await prisma.$queryRaw`
      SELECT current_database() AS database, current_schema() AS schema
    `;
    const [brandCount, storeCatalogCount, storeRowCount, localStorageCount, importJobCount] =
      await Promise.all([
        prisma.brand.count(),
        prisma.storeCatalog.count(),
        prisma.storeRow.count(),
        prisma.localStorageEntry.count(),
        prisma.dataImportJob.count(),
      ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          database: databaseInfo?.database || null,
          schema: databaseInfo?.schema || null,
          counts: {
            brands: brandCount,
            storeCatalog: storeCatalogCount,
            storeRows: storeRowCount,
            localStorageEntries: localStorageCount,
            dataImportJobs: importJobCount,
          },
        },
        null,
        2
      )
    );
  } finally {
    await disconnectPrismaClient();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
