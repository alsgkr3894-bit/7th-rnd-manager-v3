import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import { readDbHealth } from '../../lib/server/db-health.js';
import { listLocalDbBackups } from '../../lib/server/local-db-backups.js';

let tempDir = null;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('server db status helpers', () => {
  test('readDbHealth maps PostgreSQL counts, brands, and recent import jobs', async () => {
    const prisma = {
      $queryRaw: async () => [{ database: 'rnd_local', schema: 'public' }],
      brand: {
        count: async () => 2,
        findMany: async () => [
          {
            id: 'main',
            name: '7번가피자',
            code: 'main',
            isDefault: true,
            hidden: false,
            updatedAt: new Date('2026-06-23T00:00:00.000Z'),
          },
        ],
      },
      storeCatalog: { count: async () => 12 },
      storeRow: { count: async () => 340 },
      localStorageEntry: { count: async () => 8 },
      dataImportJob: {
        count: async () => 1,
        findMany: async () => [
          {
            id: 'job-1',
            status: 'COMPLETED_WITH_WARNINGS',
            sourceKind: 'backup_json',
            sourceBrandId: 'main',
            targetBrandId: 'main',
            backupVersion: 'v3',
            storeCount: 5,
            rowCount: 120,
            localStorageCount: 3,
            startedAt: new Date('2026-06-23T01:00:00.000Z'),
            finishedAt: new Date('2026-06-23T01:01:00.000Z'),
            _count: { errors: 2 },
          },
        ],
      },
    };

    const health = await readDbHealth(prisma);

    expect(health.ok).toBe(true);
    expect(health.database).toBe('rnd_local');
    expect(health.counts.storeRows).toBe(340);
    expect(health.brands[0]).toMatchObject({ id: 'main', name: '7번가피자' });
    expect(health.recentImportJobs[0]).toMatchObject({
      id: 'job-1',
      errorCount: 2,
      rowCount: 120,
      startedAt: '2026-06-23T01:00:00.000Z',
    });
  });

  test('listLocalDbBackups reads dump files and sidecar metadata', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-db-backups-'));
    const dumpPath = join(tempDir, 'rnd_local-20260623-100000.dump');
    writeFileSync(dumpPath, 'dump bytes');
    writeFileSync(
      `${dumpPath}.json`,
      JSON.stringify({
        createdAt: '2026-06-23T01:00:00.000Z',
        database: 'rnd_local',
        host: '127.0.0.1',
        port: '5432',
      })
    );

    const status = listLocalDbBackups({ backupDir: tempDir });

    expect(status.ok).toBe(true);
    expect(status.count).toBe(1);
    expect(status.latest).toMatchObject({
      name: 'rnd_local-20260623-100000.dump',
      database: 'rnd_local',
      host: '127.0.0.1',
    });
    expect(status.totalSize).toBeGreaterThan(0);
  });
});
