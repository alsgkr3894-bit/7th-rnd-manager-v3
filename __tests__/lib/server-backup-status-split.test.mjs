import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  backupCountTile,
  backupListMessage,
  dbTile,
  importJobsMessage,
  latestBackupTile,
  serverStatusErrors,
} from '../../app/settings/backup/panels/serverBackupView.js';

// 2026-11-26 점검 목록 7번: DB 상태와 백업 목록을 따로 조회·표시하고, 못 읽은 것을 백업 0개로 보이지 않는다.
const ok = { error: '', at: '2026-11-26T00:00:00.000Z' };
const failed = { error: '조회 실패', at: null };
const backups = {
  count: 2,
  totalSize: 2048,
  latest: { modifiedAt: '2026-11-26T00:00:00.000Z', size: 1024 },
  backups: [{ name: 'a.dump' }, { name: 'b.dump' }],
};

describe('DB 조회만 실패', () => {
  const view = { dbStatus: null, backupStatus: backups, dbCheck: failed, backupCheck: ok };
  test('확인된 백업 목록은 그대로 보인다', () => {
    expect(backupCountTile(view).value).toBe('2개');
    expect(backupListMessage(view)).toBe('');
    expect(dbTile(view).value).toBe('확인 실패');
    expect(importJobsMessage(view)).toBe('PostgreSQL 작업 이력 확인 실패');
    expect(serverStatusErrors(view).map(e => e.label)).toEqual(['DB 상태 확인 실패']);
  });
});

describe('백업 목록만 실패', () => {
  const view = {
    dbStatus: { ok: true, counts: { storeRows: 10 }, recentImportJobs: [] },
    backupStatus: null,
    dbCheck: ok,
    backupCheck: failed,
  };
  test('DB는 정상, 목록은 확인 실패 — 0개로 표시하지 않는다', () => {
    expect(dbTile(view).value).toBe('연결됨');
    expect(backupCountTile(view).value).toBe('확인 불가');
    expect(latestBackupTile(view)).toEqual({ value: '확인 실패', sub: '백업 목록 확인 실패' });
    expect(backupListMessage(view)).toBe('백업 목록 확인 실패');
  });
});

describe('조회 성공', () => {
  test('빈 목록을 받았을 때만 0개다', () => {
    const view = { backupStatus: { count: 0, totalSize: 0, backups: [] }, backupCheck: ok };
    expect(backupCountTile(view).value).toBe('0개');
    expect(backupListMessage(view)).toBe('서버 백업 목록이 비어 있습니다.');
  });

  test('이전에 읽은 값이 있고 이번에 실패하면 이전 값임을 알린다', () => {
    const view = { backupStatus: backups, backupCheck: { ...ok, error: '일시 장애' } };
    expect(backupCountTile(view).value).toBe('2개');
    expect(latestBackupTile(view).sub).toContain('목록 확인 실패');
  });

  test('훅은 두 조회를 allSettled로 나눠 반영한다', () => {
    const hook = readFileSync(
      new URL('../../app/settings/backup/useServerBackupStatus.js', import.meta.url),
      'utf8'
    );
    expect(hook).toContain('Promise.allSettled([');
    expect(hook).toContain('applyCheck(db, setDbStatus, setDbCheck)');
    expect(hook).toContain('applyCheck(backups, setBackupStatus, setBackupCheck)');
  });
});
