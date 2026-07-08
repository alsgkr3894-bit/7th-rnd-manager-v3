export async function readDbHealth(prisma) {
  const [databaseInfo] = await prisma.$queryRaw`
    SELECT current_database() AS database, current_schema() AS schema
  `;
  const [
    brandCount,
    storeCatalogCount,
    storeRowCount,
    localStorageCount,
    importJobCount,
    brands,
    recentImportJobs,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.storeCatalog.count(),
    prisma.storeRow.count(),
    prisma.localStorageEntry.count(),
    prisma.dataImportJob.count(),
    prisma.brand.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      take: 12,
      select: {
        id: true,
        name: true,
        code: true,
        isDefault: true,
        hidden: true,
        updatedAt: true,
      },
    }),
    prisma.dataImportJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        sourceKind: true,
        sourceBrandId: true,
        targetBrandId: true,
        backupVersion: true,
        storeCount: true,
        rowCount: true,
        localStorageCount: true,
        startedAt: true,
        finishedAt: true,
        _count: { select: { errors: true } },
      },
    }),
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
    brands: brands.map(brand => ({
      ...brand,
      updatedAt: brand.updatedAt?.toISOString?.() || null,
    })),
    recentImportJobs: recentImportJobs.map(job => ({
      id: job.id,
      status: job.status,
      sourceKind: job.sourceKind,
      sourceBrandId: job.sourceBrandId,
      targetBrandId: job.targetBrandId,
      backupVersion: job.backupVersion,
      storeCount: job.storeCount,
      rowCount: job.rowCount,
      localStorageCount: job.localStorageCount,
      errorCount: job._count?.errors ?? 0,
      startedAt: job.startedAt?.toISOString?.() || null,
      finishedAt: job.finishedAt?.toISOString?.() || null,
    })),
    checkedAt: new Date().toISOString(),
  };
}
