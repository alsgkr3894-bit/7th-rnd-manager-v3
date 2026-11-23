export async function readDbHealth(prisma) {
  const [
    brandCount,
    storeCatalogCount,
    storeRowCount,
    localStorageCount,
    importJobCount,
    recentImportJobs,
  ] = await Promise.all([
    prisma.brand.count(),
    prisma.storeCatalog.count(),
    prisma.storeRow.count(),
    prisma.localStorageEntry.count(),
    prisma.dataImportJob.count(),
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
    counts: {
      brands: brandCount,
      storeCatalog: storeCatalogCount,
      storeRows: storeRowCount,
      localStorageEntries: localStorageCount,
      dataImportJobs: importJobCount,
    },
    recentImportJobs: recentImportJobs.map(job => ({
      status: job.status,
      storeCount: job.storeCount,
      rowCount: job.rowCount,
      errorCount: job._count?.errors ?? 0,
      startedAt: job.startedAt?.toISOString?.() || null,
      finishedAt: job.finishedAt?.toISOString?.() || null,
    })),
    checkedAt: new Date().toISOString(),
  };
}
