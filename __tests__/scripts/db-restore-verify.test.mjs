import { describe, expect, test } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertIsolatedTarget,
  compareStoreRows,
  dumpStartedAt,
  isOwnTempDir,
  summarizeComparison,
} from '../../prisma/restore-verify-core.mjs';
import { pruneBackups } from '../../prisma/local-db-backup.mjs';
import { listLocalDbBackups } from '../../lib/server/local-db-backups.js';
import {
  restoreVerifyTile,
  verificationLabel,
} from '../../app/settings/backup/panels/serverBackupView.js';

// 2026-11-26 점검 목록 10번: 백업을 격리된 임시 DB에 복원해 확인하고 그 시각을 남긴다.
const PRODUCTION = 'postgresql://app:pw@127.0.0.1:5432/rnd_manager';

describe('격리 보장', () => {
  test('운영 DB 포트로는 임시 DB를 만들지 않는다', () => {
    expect(() => assertIsolatedTarget(5432, PRODUCTION)).toThrow('겹칩니다');
    expect(() => assertIsolatedTarget(6000, 'postgresql://a:b@127.0.0.1:6000/db')).toThrow();
    expect(() => assertIsolatedTarget('abc', PRODUCTION)).toThrow('올바르지');
    expect(assertIsolatedTarget('55432', PRODUCTION)).toBe(55432);
  });

  test('이 도구가 만든 임시 폴더만 정리 대상이다', () => {
    expect(isOwnTempDir(join(tmpdir(), 'rnd-restore-verify-abc'), tmpdir())).toBe(true);
    expect(isOwnTempDir(join(tmpdir(), 'other'), tmpdir())).toBe(false);
    expect(isOwnTempDir(process.cwd(), tmpdir())).toBe(false);
    expect(isOwnTempDir(tmpdir(), tmpdir())).toBe(false);
  });
});

describe('복원본과 운영 DB 비교', () => {
  const snapshot = dumpStartedAt('x/rnd_manager-20261126-085153.dump').getTime() / 1000;
  const row = (recordKey, extra = {}) => ({
    brandId: 'main',
    storeName: 'menu_master',
    recordKey,
    hash: 'a',
    createdAt: snapshot - 100,
    updatedAt: snapshot - 100,
    ...extra,
  });

  test('백업 뒤의 변경·추가는 정상, 그 전 행의 차이는 설명되지 않는 차이다', () => {
    const result = compareStoreRows(
      [row('1'), row('2'), row('3'), row('4')],
      [
        row('1'),
        row('2', { hash: 'b', updatedAt: snapshot + 5 }),
        row('3', { hash: 'b' }),
        row('9', { createdAt: snapshot + 5, updatedAt: snapshot + 5 }),
        row('8'),
      ],
      snapshot
    );
    expect(summarizeComparison(result)).toMatchObject({
      identical: 1,
      changedAfterBackup: [{ storeName: 'menu_master', count: 1 }],
      addedAfterBackup: [{ storeName: 'menu_master', count: 1 }],
      onlyInBackup: [{ storeName: 'menu_master', count: 1 }],
      unexplainedCount: 2,
    });
    expect(result.unexplained.map(item => item.recordKey)).toEqual(['3', '8']);
  });

  test('파일 이름에서 백업 시작 시각을 읽는다', () => {
    expect(dumpStartedAt('rnd_manager-20261126-085153.dump').getHours()).toBe(8);
    expect(dumpStartedAt('manual.dump')).toBeNull();
  });
});

describe('검증 결과 기록과 표시', () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-list-'));
    for (const [name, ok] of [
      ['rnd_manager-20261125-085651', true],
      ['rnd_manager-20261126-085153', false],
    ]) {
      writeFileSync(join(dir, `${name}.dump`), 'x');
      writeFileSync(join(dir, `${name}.dump.json`), '{}');
      writeFileSync(
        join(dir, `${name}.dump.verify.json`),
        JSON.stringify({ verifiedAt: '2026-11-26T01:00:00.000Z', ok, sha256: 'secret' })
      );
    }
    return dir;
  };

  test('목록은 성공한 검증만 마지막 검증으로 보여 주고 내부 값은 내보내지 않는다', () => {
    const dir = setup();
    try {
      const status = listLocalDbBackups({ backupDir: dir });
      expect(status.count).toBe(2);
      expect(status.lastVerified).toEqual({
        name: 'backup-20261125-085651.dump',
        verifiedAt: '2026-11-26T01:00:00.000Z',
      });
      expect(JSON.stringify(status)).not.toContain('secret');
      expect(status.backups.map(b => verificationLabel(b.verification)).sort()).toEqual([
        '성공',
        '실패',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('검증 기록이 없으면 없다고 표시한다', () => {
    expect(restoreVerifyTile({ backupStatus: { lastVerified: null } }).value).toBe('기록 없음');
    expect(restoreVerifyTile({ backupStatus: null }).value).toBe('확인 불가');
    expect(verificationLabel(null)).toBe('-');
  });

  test('오래된 백업을 지우면 검증 기록도 지운다', () => {
    const dir = setup();
    const argv = process.argv;
    process.argv = [...argv, '--keep', '1'];
    try {
      const result = pruneBackups(dir);
      expect(result.removed).toHaveLength(1);
      expect(listLocalDbBackups({ backupDir: dir }).count).toBe(1);
      const left = result.removed[0];
      expect(() => rmSync(join(dir, `${left}.verify.json`))).toThrow('ENOENT');
    } finally {
      process.argv = argv;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
