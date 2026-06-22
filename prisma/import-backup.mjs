import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { disconnectPrismaClient, getPrismaClient } from '../lib/server/prisma.js';
import { buildImportPlan } from './backup-import-core.mjs';
import { seedStoreCatalogDefaults } from './seed-store-catalog.mjs';

const CHUNK_SIZE = 500;

function usage() {
  return [
    'Usage:',
    '  npm run db:import:backup -- <backup.json> [--brand <brandId>] [--dry-run] [--include-shared] [--no-local-storage]',
    '',
    'Examples:',
    '  npm run db:import:backup:dry-run -- ./backup.json --brand main',
    '  npm run db:import:backup -- ./backup.json --brand china4',
  ].join('\n');
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    dryRun: false,
    includeShared: false,
    importLocalStorage: true,
    targetBrandId: '',
    filePath: '',
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') return { help: true, ...options };
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--include-shared') {
      options.includeShared = true;
      continue;
    }
    if (arg === '--no-local-storage') {
      options.importLocalStorage = false;
      continue;
    }
    if (arg === '--brand') {
      options.targetBrandId = String(args.shift() || '').trim();
      continue;
    }
    if (!options.filePath) {
      options.filePath = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function chunks(items, size = CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function readBackup(filePath) {
  if (!filePath) throw new Error(`Backup file path is required.\n\n${usage()}`);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function ensureTargetBrand(prisma, plan) {
  const brandId = plan.target.brandId;
  await prisma.brand.upsert({
    where: { id: brandId },
    update: {
      name: plan.source.brandName || brandId,
      code: brandId,
      dbName: plan.source.dbName || null,
    },
    create: {
      id: brandId,
      name: plan.source.brandName || brandId,
      code: brandId,
      dbName: plan.source.dbName || null,
      isDefault: brandId === 'main',
      hidden: false,
      metadata: {
        importedFromBackup: true,
      },
    },
  });
}

async function writeStoreRows(prisma, plan, jobId) {
  let inserted = 0;
  for (const storePlan of plan.storePlans) {
    await prisma.$transaction(async tx => {
      await tx.storeRow.deleteMany({
        where: {
          brandId: storePlan.brandId,
          storeName: storePlan.storeName,
        },
      });

      for (const batch of chunks(storePlan.rows)) {
        await tx.storeRow.createMany({
          data: batch.map(row => ({
            ...row,
            sourceBackupId: jobId,
          })),
        });
      }
    });
    inserted += storePlan.rows.length;
  }
  return inserted;
}

async function writeLocalStorage(prisma, plan) {
  if (plan.localStorageEntries.length === 0) return 0;
  const keys = plan.localStorageEntries.map(entry => entry.key);
  await prisma.$transaction(async tx => {
    await tx.localStorageEntry.deleteMany({
      where: {
        brandId: plan.target.brandId,
        key: { in: keys },
      },
    });
    for (const batch of chunks(plan.localStorageEntries)) {
      await tx.localStorageEntry.createMany({ data: batch });
    }
  });
  return plan.localStorageEntries.length;
}

async function writeImportErrors(prisma, jobId, messages) {
  if (!messages.length) return;
  await prisma.dataImportError.createMany({
    data: messages.map(message => ({
      id: randomUUID(),
      jobId,
      message,
    })),
  });
}

function printPlan(plan, label = 'Import plan') {
  console.log(
    JSON.stringify(
      {
        label,
        ok: plan.ok,
        source: plan.source,
        target: plan.target,
        summary: plan.summary,
        warnings: plan.warnings,
        errors: plan.errors,
      },
      null,
      2
    )
  );
}

async function executeImport(plan) {
  const prisma = getPrismaClient();
  let job = null;
  try {
    await seedStoreCatalogDefaults(prisma);
    await ensureTargetBrand(prisma, plan);

    job = await prisma.dataImportJob.create({
      data: {
        id: randomUUID(),
        status: plan.ok ? 'RUNNING' : 'FAILED',
        sourceKind: plan.source.kind,
        sourceBrandId: plan.source.brandId || null,
        targetBrandId: plan.target.brandId,
        backupVersion: plan.source.version || null,
        backupExportedAt: plan.source.exportedAtDate,
        storeCount: plan.summary.storeCount,
        rowCount: plan.summary.rowCount,
        localStorageCount: plan.summary.localStorageCount,
        summary: plan.summary,
        finishedAt: plan.ok ? null : new Date(),
      },
    });

    if (!plan.ok) {
      await writeImportErrors(prisma, job.id, plan.errors);
      return { jobId: job.id, status: 'FAILED', insertedRows: 0, localStorageRows: 0 };
    }

    const insertedRows = await writeStoreRows(prisma, plan, job.id);
    const localStorageRows = await writeLocalStorage(prisma, plan);
    const finalStatus = plan.warnings.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';

    await writeImportErrors(prisma, job.id, plan.warnings);
    await prisma.dataImportJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        rowCount: insertedRows,
        localStorageCount: localStorageRows,
        finishedAt: new Date(),
      },
    });

    return { jobId: job.id, status: finalStatus, insertedRows, localStorageRows };
  } catch (error) {
    if (job?.id) {
      await prisma.dataImportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
        },
      });
      await writeImportErrors(prisma, job.id, [error?.message || String(error)]);
    }
    throw error;
  } finally {
    await disconnectPrismaClient();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const backup = await readBackup(options.filePath);
  const plan = buildImportPlan(backup, {
    targetBrandId: options.targetBrandId,
    includeShared: options.includeShared,
    importLocalStorage: options.importLocalStorage,
  });

  if (options.dryRun) {
    printPlan(plan, 'Dry run import plan');
    process.exitCode = plan.ok ? 0 : 1;
    return;
  }

  printPlan(plan);
  if (!plan.ok) {
    throw new Error('Backup import plan has errors. Run with --dry-run to inspect details.');
  }
  const result = await executeImport(plan);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
