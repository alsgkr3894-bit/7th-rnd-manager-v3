export async function readDbHealth(prisma) {
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

  return {
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
    checkedAt: new Date().toISOString(),
  };
}
