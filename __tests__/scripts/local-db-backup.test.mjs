/**
 * prisma/local-db-backup.mjs 신뢰성 회귀 테스트.
 * 2026-09-14~18에 로그인 직후 자동 백업이 Postgres가 뜨기 전에 실행돼 0바이트 .dump만
 * 남기고, autoBackup()이 그걸 "최신 백업"으로 세 20시간을 스킵한 사고가 있었다.
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
  autoBackup,
  backupFiles,
  createBackup,
  DEFAULT_AUTO_RETRY_DELAY_MS,
} from '../../prisma/local-db-backup.mjs';

let tempDir = null;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('backupFiles — 실패한 백업 잔해 제외', () => {
  test('0바이트이거나 .json 사이드카가 없는 .dump는 제외한다', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-backup-files-'));

    const goodPath = join(tempDir, 'db-20260622-100000.dump');
    writeFileSync(goodPath, 'dump bytes');
    writeFileSync(`${goodPath}.json`, JSON.stringify({ database: 'db' }));

    writeFileSync(join(tempDir, 'db-20260623-090000.dump'), ''); // 0바이트
    writeFileSync(join(tempDir, 'db-20260623-090500.dump'), 'partial'); // 사이드카 없음

    const files = backupFiles(tempDir);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('db-20260622-100000.dump');
  });

  test('존재하지 않는 디렉터리는 빈 배열', () => {
    expect(backupFiles(join(tmpdir(), 'does-not-exist-' + Date.now()))).toEqual([]);
  });
});

describe('createBackup — pg_dump 실패 시 잔해를 남기지 않는다', () => {
  test('DATABASE_URL이 연결 불가면 0바이트 .dump를 지우고 에러를 던진다', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-create-backup-'));
    const originalUrl = process.env.DATABASE_URL;
    // 존재하지 않는 포트로 pg_dump가 즉시 연결 실패하게 만든다(실 DB 불필요, 빠름).
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/rnd_test_unreachable';

    try {
      expect(() => createBackup(tempDir)).toThrow();
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }

    // pg_dump가 만들었을 수 있는 부분 파일이 남아있지 않아야 한다.
    const leftoverDumps = readdirSync(tempDir).filter(name => name.endsWith('.dump'));
    expect(leftoverDumps).toHaveLength(0);
  }, 20_000);
});

describe('autoBackup — 실패 시 재시도 후 포기한다', () => {
  test('createBackup이 계속 실패하면 지정한 횟수만큼 재시도하고 마지막 에러를 던진다', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-auto-backup-'));
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/rnd_test_unreachable';

    try {
      await expect(
        autoBackup({ dir: tempDir, retryAttempts: 2, retryDelayMs: 5 })
      ).rejects.toThrow();
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  }, 20_000);

  test('기본 재시도 지연은 30초다(상수 확인 — 실제로 기다리지 않음)', () => {
    expect(DEFAULT_AUTO_RETRY_DELAY_MS).toBe(30_000);
  });
});
