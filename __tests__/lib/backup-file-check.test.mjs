import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// 2026-11-26 점검 목록 8번: 다운로드 요청 시각과 저장한 파일 확인 시각을 따로 기록한다.
const stored = {};
globalThis.localStorage = {
  getItem: key => stored[key] ?? null,
  setItem: (key, value) => {
    stored[key] = value;
  },
  removeItem: key => delete stored[key],
};
jest.unstable_mockModule('@/lib/work-log', () => ({ logWork: async () => {} }));

const history = await import('../../lib/backup-history.js');
const { backupFileStamp, checkBackupFile } = await import('../../lib/backup/file-check.js');
const { buildBackupActions } = await import('../../lib/action-center/build.js');

const payload = (exportedAt = '2026-11-26T01:00:00.000Z') => ({
  version: 'v3',
  exportedAt,
  stores: { menu_master: [{ id: 1 }, { id: 2 }] },
});
const request = data =>
  history.addEntry({ fileName: 'a.json', totalRows: 2, ...backupFileStamp(data) });
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

beforeEach(() => {
  for (const key of Object.keys(stored)) delete stored[key];
});

describe('다운로드 요청만 한 상태', () => {
  test('파일 확인 시각이 없고, 백업한 것으로 세지 않는다', () => {
    request(payload());
    expect(history.getLastBackupAt()).not.toBeNull();
    expect(history.getLastFileCheckedAt()).toBeNull();
    expect(history.getBackupReminder()).toEqual({
      stale: true,
      daysSince: null,
      never: true,
      unconfirmed: true,
    });
    expect(buildBackupActions({ backupReminder: history.getBackupReminder() })[0].title).toBe(
      '백업 파일 확인 필요'
    );
  });

  test('저장을 취소하고 다시 요청해도 마지막 파일 확인 시각은 그대로다', () => {
    const first = payload('2026-11-20T00:00:00.000Z');
    request(first);
    history.markFileChecked(checkBackupFile(first, history.getHistory()).entry.id);
    const checkedAt = history.getLastFileCheckedAt();
    request(payload('2026-11-26T02:00:00.000Z'));
    expect(history.getLastFileCheckedAt()).toBe(checkedAt);
    expect(history.getBackupReminder().never).toBe(false);
  });
});

describe('저장한 파일 확인', () => {
  test('같은 백업 파일이면 통과하고 확인 시각이 남아 경고가 사라진다', () => {
    const data = payload();
    request(data);
    const result = checkBackupFile(JSON.parse(JSON.stringify(data)), history.getHistory());
    expect(result).toMatchObject({ ok: true, rows: 2 });
    expect(history.markFileChecked(result.entry.id)).toBe(true);
    expect(history.getLastFileCheckedAt()).not.toBeNull();
    expect(history.getBackupReminder()).toEqual({ stale: false, daysSince: 0, never: false });
  });

  test('이력에 없는 파일, 행이 모자란 파일, 저장소가 빠진 파일은 통과하지 않는다', () => {
    const data = payload();
    request(data);
    const list = history.getHistory();
    expect(checkBackupFile(payload('2020-01-01T00:00:00.000Z'), list).ok).toBe(false);
    expect(checkBackupFile({ ...data, stores: { menu_master: [{ id: 1 }] } }, list).reason).toMatch(
      '행 수가 달라요'
    );
    expect(checkBackupFile({ ...data, failedStores: [{ store: 'menu_recipes' }] }, list).ok).toBe(
      false
    );
    expect(() => checkBackupFile({ nope: true }, list)).toThrow('잘못된 백업 파일');
  });

  test('경고의 날짜는 확인한 시각이 아니라 그 백업을 내보낸 시점으로 센다', () => {
    stored['v3:backup-history'] = JSON.stringify([
      { id: 'BK-old', at: daysAgo(30), fileCheckedAt: daysAgo(0) },
    ]);
    expect(history.getBackupReminder()).toMatchObject({ stale: true, daysSince: 30 });
  });

  test('구분이 생기기 전의 이력은 확인된 것으로 본다', () => {
    stored['v3:backup-history'] = JSON.stringify([{ id: 'BK-legacy', at: daysAgo(1) }]);
    expect(history.getBackupReminder()).toEqual({ stale: false, daysSince: 1, never: false });
    expect(history.getLastFileCheckedAt()).toBeNull();
  });
});
