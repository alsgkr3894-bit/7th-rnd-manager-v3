import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  getBackupReminder,
  getHistory,
  normalizeHistory,
  normalizeHistoryEntry,
  togglePin,
} from '../../lib/backup-history.js';

const HISTORY_KEY = 'v3:backup-history';
let storageData;

beforeEach(() => {
  storageData = {};
  globalThis.localStorage = {
    getItem: key => (key in storageData ? storageData[key] : null),
    setItem: (key, value) => {
      storageData[key] = String(value);
    },
    removeItem: key => {
      delete storageData[key];
    },
  };
});

describe('backup history guards', () => {
  test('필수 id/at이 없는 이력 항목은 제외한다', () => {
    expect(
      normalizeHistory([
        null,
        {
          id: ' BK-1 ',
          at: ' 2026-06-01T00:00:00.000Z ',
          scopes: ['all', '', { bad: true }],
          totalRows: '3',
          pinned: true,
          fileName: 7,
        },
        { id: '', at: '2026-06-02T00:00:00.000Z' },
        { id: 'BK-2' },
        { id: 'BK-3', at: 'not-date' },
      ])
    ).toEqual([
      {
        id: 'BK-1',
        at: '2026-06-01T00:00:00.000Z',
        scopes: ['all'],
        totalRows: 3,
        fileName: '7',
        pinned: true,
      },
    ]);
  });

  test('단일 항목이 객체가 아니면 null로 처리한다', () => {
    expect(normalizeHistoryEntry(null)).toBeNull();
    expect(normalizeHistoryEntry('broken')).toBeNull();
  });

  test('localStorage 이력이 깨져 있어도 정상 항목만 읽는다', () => {
    storageData[HISTORY_KEY] = JSON.stringify([
      null,
      { id: 'BK-ok', at: '2026-06-01T00:00:00.000Z', scopes: 'all', totalRows: '-3' },
    ]);

    expect(getHistory()).toEqual([
      {
        id: 'BK-ok',
        at: '2026-06-01T00:00:00.000Z',
        scopes: [],
        totalRows: 0,
        fileName: '',
        pinned: false,
      },
    ]);
  });

  test('백업 리마인더는 깨진 날짜와 threshold를 안전하게 처리한다', () => {
    storageData[HISTORY_KEY] = JSON.stringify([{ id: 'BK-bad', at: 'not-date' }]);

    expect(getBackupReminder()).toEqual({ stale: true, daysSince: null, never: true });

    storageData[HISTORY_KEY] = JSON.stringify([{ id: 'BK-ok', at: new Date().toISOString() }]);

    expect(getBackupReminder('bad')).toEqual({ stale: false, daysSince: 0, never: false });
  });

  test('손상 항목이 섞여 있어도 pin 토글이 예외 없이 저장된다', () => {
    storageData[HISTORY_KEY] = JSON.stringify([
      null,
      { id: 'BK-ok', at: '2026-06-01T00:00:00.000Z', pinned: false },
    ]);

    expect(togglePin('BK-ok')).toBe(true);
    expect(JSON.parse(storageData[HISTORY_KEY])).toEqual([
      {
        id: 'BK-ok',
        at: '2026-06-01T00:00:00.000Z',
        scopes: [],
        totalRows: 0,
        fileName: '',
        pinned: true,
      },
    ]);
  });
});
