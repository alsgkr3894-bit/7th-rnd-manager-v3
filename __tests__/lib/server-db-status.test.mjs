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

  test('listLocalDbBackups는 0바이트이거나 사이드카가 없는 실패한 백업을 제외한다', () => {
    // 실사고 재현: 로그인 직후 자동 백업이 Postgres가 뜨기 전에 실행돼 0바이트 .dump만
    // 남긴 적이 여러 번 있었다(2026-09-14~18). 이런 파일을 "최신 백업"으로 세면 홈
    // 대시보드가 백업이 정상인 것처럼 잘못 표시한다.
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-db-backups-'));

    // 정상 백업 (더 오래된 시각)
    const goodPath = join(tempDir, 'rnd_local-20260622-100000.dump');
    writeFileSync(goodPath, 'dump bytes');
    writeFileSync(
      `${goodPath}.json`,
      JSON.stringify({ createdAt: '2026-06-22T01:00:00.000Z', database: 'rnd_local' })
    );

    // 실패한 백업(0바이트, 사이드카 없음) — 더 최신 시각인데도 제외돼야 한다.
    writeFileSync(join(tempDir, 'rnd_local-20260623-090000.dump'), '');
    // 사이드카 없이 내용만 있는 경우도 pg_dump 중간에 죽은 것으로 보고 제외.
    writeFileSync(join(tempDir, 'rnd_local-20260623-090500.dump'), 'partial bytes');

    const status = listLocalDbBackups({ backupDir: tempDir });

    expect(status.count).toBe(1);
    expect(status.latest.name).toBe('rnd_local-20260622-100000.dump');
  });
});
