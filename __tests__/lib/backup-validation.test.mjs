import { describe, expect, test } from '@jest/globals';
import {
  CURRENT_BACKUP_VERSION,
  invalidStoreRowsByStore,
  invalidStoreRowsOf,
  failedBackupStoresOf,
  summarizeBackupLocalStorage,
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
      hasSourceBrand: false,
    });
    expect(result.summary.knownStores).toEqual(['settings', 'sales_files']);
  });

  test('백업 source brand metadata를 요약에 포함한다', () => {
    const result = validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      sourceBrandId: 'brand-a',
      sourceBrandName: '브랜드 A',
      sourceDbName: 'rnd_manager_v3__brand-a',
      sharedDbName: 'rnd_manager_v3',
      stores: {
        settings: [],
      },
    });

    expect(result.summary).toMatchObject({
      sourceBrandId: 'brand-a',
      sourceBrandName: '브랜드 A',
      sourceDbName: 'rnd_manager_v3__brand-a',
      sharedDbName: 'rnd_manager_v3',
      hasSourceBrand: true,
    });
  });

  test('백업 생성 실패 store manifest를 정규화한다', () => {
    const result = validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      stores: { settings: [] },
      failedStores: [
        { store: 'sales_rows', error: 'read failed' },
        { store: '  cost_ingredients  ' },
        { error: 'missing store name' },
        'bad',
      ],
    });

    expect(failedBackupStoresOf(result.backup)).toEqual([
      { store: 'sales_rows', error: 'read failed' },
      { store: 'cost_ingredients', error: '' },
    ]);
    expect(result.summary.failedStoreCount).toBe(2);
    expect(result.summary.failedStores.map(item => item.store)).toEqual([
      'sales_rows',
      'cost_ingredients',
    ]);
  });

  test('localStorage 섹션의 복원 가능 키와 무시 키를 요약한다', () => {
    const { summary } = validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      stores: { settings: [] },
      localStorage: {
        'v3:profile': 'profile',
        saved_views_v1__main__ingredient: '[{"name":"기본"}]',
        'rnd_active_account_id:brand-b': 'user-1',
        'v3:unknown': 'skip',
        'v3:brand-master': { brands: [] },
      },
    });

    expect(summary.hasLocalStorage).toBe(true);
    expect(summary.localStorageSummary).toMatchObject({
      hasLocalStorage: true,
      invalidShape: false,
      restorableKeyCount: 3,
      ignoredKeyCount: 2,
      unknownKeyCount: 1,
      nonStringValueCount: 1,
      unreadableValueCount: 0,
      truncated: false,
    });
    expect(summary.localStorageSummary.sampleIgnoredKeys).toEqual(
      expect.arrayContaining(['v3:unknown', 'v3:brand-master'])
    );
  });

  test('localStorage가 객체가 아니면 복원을 막지 않고 형식 오류로만 요약한다', () => {
    const { summary } = validateBackupPayload({
      version: CURRENT_BACKUP_VERSION,
      stores: { settings: [] },
      localStorage: [],
    });

    expect(summary.hasLocalStorage).toBe(false);
    expect(summary.localStorageSummary).toMatchObject({
      hasLocalStorage: false,
      invalidShape: true,
      restorableKeyCount: 0,
    });
  });

  test('localStorage 요약은 큰 입력에서도 정적 허용 키를 순서와 무관하게 확인한다', () => {
    const map = {};
    for (let i = 0; i < 2105; i += 1) {
      map[`v3:unknown-${i}`] = 'skip';
    }
    map['v3:profile'] = 'late-profile';

    const summary = summarizeBackupLocalStorage(map);

    expect(summary.restorableKeyCount).toBe(1);
    expect(summary.truncated).toBe(true);
    expect(summary.unknownKeyCount).toBe(2000);
    expect(summary.ignoredKeyCount).toBe(2000);
  });

  test('알 수 없는 store는 요약에 남겨 UI가 경고할 수 있게 한다', () => {
    const summary = summarizeBackupStores(
      {
        settings: [],
        legacy_store: [{ id: 1 }],
      },
      ['settings']
    );

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
    expect(() =>
      validateBackupPayload({
        version: CURRENT_BACKUP_VERSION,
        stores: { settings: {} },
      })
    ).toThrow('stores 값이 배열이 아님: settings');
  });

  test('store 배열 안의 레코드가 객체가 아니면 복원 전에 실패시킨다', () => {
    expect(invalidStoreRowsOf([{ id: 1 }, null, 'bad', ['array']])).toEqual([1, 2, 3]);
    expect(
      invalidStoreRowsByStore({
        settings: [{ id: 1 }, null],
        sales_files: [{ id: 2 }],
      })
    ).toEqual([{ name: 'settings', invalidIndexes: [1] }]);

    expect(() =>
      validateBackupPayload({
        version: CURRENT_BACKUP_VERSION,
        stores: { settings: [{ id: 1 }, null] },
      })
    ).toThrow('store 레코드가 객체가 아님: settings[1]');
  });
});
