/**
 * prisma/local-db-backup.mjs 신뢰성 회귀 테스트.
 * 2026-09-14~18에 로그인 직후 자동 백업이 Postgres가 뜨기 전에 실행돼 0바이트 .dump만
 * 남기고, autoBackup()이 그걸 "최신 백업"으로 세 20시간을 스킵한 사고가 있었다.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import { BackupBusyError, createLocalDbBackup } from '../../lib/server/local-db-backups.js';
import {
  acquireBackupLock,
  autoBackup,
  BACKUP_BUSY_MARK,
  LOCK_STALE_MS,
  backupFiles,
  createBackup,
  DEFAULT_AUTO_RETRY_DELAY_MS,
  pruneBackups,
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

describe('백업 잠금과 미완성 파일', () => {
  const withUrl = async work => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/rnd_test_unreachable';
    try {
      return await work();
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  };

  test('진행 중이면 두 번째 백업은 거절하고, 첫 번째의 파일을 건드리지 않는다', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-backup-lock-'));
    const release = acquireBackupLock(tempDir);
    const running = join(tempDir, 'db-20261126-000000.dump.partial');
    writeFileSync(running, 'writing');

    await withUrl(() => expect(() => createBackup(tempDir)).toThrow(BACKUP_BUSY_MARK));

    expect(existsSync(running)).toBe(true);
    release();
    expect(readdirSync(tempDir)).toEqual(['db-20261126-000000.dump.partial']);
  });

  test('끝난 프로세스나 오래된 잠금은 넘겨받는다', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-backup-stale-'));
    const lock = join(tempDir, '.backup.lock');
    writeFileSync(lock, JSON.stringify({ pid: 2147483000 }));
    acquireBackupLock(tempDir)();

    writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    const old = new Date(Date.now() - LOCK_STALE_MS - 1000);
    utimesSync(lock, old, old);
    acquireBackupLock(tempDir)();

    expect(existsSync(lock)).toBe(false);
  });

  test('다음 백업이 미완성 파일만 지우고 사이드카 없는 예전 .dump는 남긴다', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-backup-partial-'));
    writeFileSync(join(tempDir, 'db-1.dump.partial'), 'half');
    writeFileSync(join(tempDir, 'db-2.dump'), 'old without sidecar');

    await withUrl(() => expect(() => createBackup(tempDir)).toThrow());

    expect(readdirSync(tempDir)).toEqual(['db-2.dump']);
  }, 20_000);

  test('서버는 진행 중 오류를 따로 알린다', async () => {
    const execFile = async () => {
      throw Object.assign(new Error('failed'), { stderr: `... (${BACKUP_BUSY_MARK})` });
    };

    await expect(createLocalDbBackup({ execFile })).rejects.toBeInstanceOf(BackupBusyError);
  });
});

describe('pruneBackups — 보관 개수 상한', () => {
  test('최신 14개만 남기고 오래된 dump와 sidecar를 함께 삭제한다', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-prune-backup-'));

    for (let index = 0; index < 17; index++) {
      const name = `rnd_local-${String(index).padStart(2, '0')}.dump`;
      const dumpPath = join(tempDir, name);
      writeFileSync(dumpPath, `dump-${index}`);
      writeFileSync(`${dumpPath}.json`, JSON.stringify({ database: 'rnd_local' }));
      const modifiedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index));
      utimesSync(dumpPath, modifiedAt, modifiedAt);
    }
    const unrelated = join(tempDir, '사용자메모.txt');
    writeFileSync(unrelated, '삭제하면 안 됨');

    const result = pruneBackups(tempDir);

    expect(result).toMatchObject({ keep: 14, remaining: 14 });
    expect(result.removed).toEqual(['rnd_local-02.dump', 'rnd_local-01.dump', 'rnd_local-00.dump']);
    expect(existsSync(join(tempDir, 'rnd_local-00.dump'))).toBe(false);
    expect(existsSync(join(tempDir, 'rnd_local-00.dump.json'))).toBe(false);
    expect(existsSync(unrelated)).toBe(true);
  });
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

  test('DATABASE_URL 미설정처럼 재시도해도 나아지지 않는 오류는 즉시 포기한다(1회만 시도)', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rnd-auto-backup-config-'));
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      await expect(
        autoBackup({ dir: tempDir, retryAttempts: 5, retryDelayMs: 10_000 })
      ).rejects.toThrow('DATABASE_URL is required');
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  }, 2_000);
});
