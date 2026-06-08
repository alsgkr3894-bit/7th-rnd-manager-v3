import { describe, expect, test } from '@jest/globals';
import {
  CURRENT_BACKUP_VERSION,
  invalidStoreRowsByStore,
  invalidStoreRowsOf,
  summarizeBackupStores,
  validateBackupPayload,
} from '../../lib/backup/validation.js';

describe('backup validation', () => {
  test('정상 백업 파일의 store 요약을 만든다', () => {
    const result = validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      exportedAt: '2026-06-08T00:00:00.000Z',
      stores: {
        settings: [{ id: 1 }],
        sales_files: [{ id: 1 }, { id: 2 }],
      },
    });

    expect(result.summary).toMatchObject({
      storeCount: 2,
      totalRows: 3,
      version: CURRENT_BACKUP_VERSION,
      exportedAt: '2026-06-08T00:00:00.000Z',
      versionMismatch: false,
      unknownStores: [],
    });
    expect(result.summary.knownStores).toEqual(['settings', 'sales_files']);
  });

  test('알 수 없는 store는 요약에 남겨 UI가 경고할 수 있게 한다', () => {
    const summary = summarizeBackupStores({
      settings: [],
      legacy_store: [{ id: 1 }],
    }, ['settings']);

    expect(summary.knownStores).toEqual(['settings']);
    expect(summary.unknownStores).toEqual(['legacy_store']);
    expect(summary.totalRows).toBe(1);
  });

  test('버전이 다르면 mismatch로 표시하되 구조가 맞으면 허용한다', () => {
    const result = validateBackupPayload({
      version: 'v2',
      stores: { settings: [] },
    });

    expect(result.summary.versionMismatch).toBe(true);
    expect(result.summary.version).toBe('v2');
  });

  test('최상위 객체와 stores 객체가 없으면 명확히 실패한다', () => {
    expect(() => validateBackupPayload(null)).toThrow('최상위 객체 누락');
    expect(() => validateBackupPayload({})).toThrow('stores 객체 누락');
  });

  test('store 값이 배열이 아니면 복원 전에 실패시킨다', () => {
    expect(() => validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      stores: { settings: {} },
    })).toThrow('stores 값이 배열이 아님: settings');
  });

  test('store 배열 안의 레코드가 객체가 아니면 복원 전에 실패시킨다', () => {
    expect(invalidStoreRowsOf([{ id: 1 }, null, 'bad', ['array']])).toEqual([1, 2, 3]);
    expect(invalidStoreRowsByStore({
      settings: [{ id: 1 }, null],
      sales_files: [{ id: 2 }],
    })).toEqual([{ name: 'settings', invalidIndexes: [1] }]);

    expect(() => validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      stores: { settings: [{ id: 1 }, null] },
    })).toThrow('store 레코드가 객체가 아님: settings[1]');
  });
});
