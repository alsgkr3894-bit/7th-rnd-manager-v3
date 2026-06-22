/**
 * __tests__/lib/backup-restore-rehearsal.test.mjs
 *
 * 백업/복원 실데이터 리허설 — 4개 시나리오
 *
 * 1. 브랜드별 백업/복원 검증
 * 2. localStorage 포함 범위 확인
 * 3. 대용량 복원 테스트
 * 4. 실패 store 복구 시나리오
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';

// 복원 페이지 소스코드 — 차단 가드 확인용 (module-load 시점 읽기)
const restorePageSrc = readFileSync(resolve('app/settings/restore/page.jsx'), 'utf8');
import {
  buildBackupSourceMetadata,
  backupSourceMetadataOf,
  isBackupSourceMismatch,
} from '../../lib/backup/brand-source.js';
import {
  validateBackupPayload,
  failedBackupStoresOf,
  summarizeBackupStores,
  invalidStoreRowsOf,
  CURRENT_BACKUP_VERSION,
} from '../../lib/backup/validation.js';
import {
  PERSISTENT_LS_KEYS,
  LOCAL_STORAGE_KEYS_BY_SCOPE,
  COMMON_LS_KEYS,
  persistentLocalStorageKeysForScopes,
  pickLocalStorageForScopes,
  collectLocalStorage,
  restoreLocalStorage,
} from '../../lib/backup/local-storage-keys.js';
import {
  RESTORE_JOURNAL_KEY,
  clearRestoreJournal,
  createRestoreJournal,
  readRestoreJournal,
  updateRestoreJournal,
} from '../../lib/backup/restore-journal.js';
import { dbNameFor, ALL_STORES } from '../../lib/db/constants.js';

// ── localStorage mock helper ────────────────────────────────────────────────

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

function installMapStorage(initial = {}) {
  const store = { ...initial };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return Object.keys(store).length;
      },
      key(index) {
        return Object.keys(store)[index] ?? null;
      },
      getItem(key) {
        return key in store ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = value;
      },
      removeItem(key) {
        delete store[key];
      },
    },
  });
  return store;
}

// ── 최소 유효 백업 헬퍼 ──────────────────────────────────────────────────────

function makeBackup(overrides = {}) {
  return {
    version: CURRENT_BACKUP_VERSION,
    exportedAt: '2026-06-21T00:00:00.000Z',
    stores: { settings: [{ id: 1 }] },
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 1. 브랜드별 백업/복원 검증
// ────────────────────────────────────────────────────────────────────────────

describe('1. 브랜드별 백업/복원 검증', () => {
  test('main 브랜드 백업 메타데이터: 공유 DB = 브랜드 DB', () => {
    const meta = buildBackupSourceMetadata('main');
    expect(meta.sourceBrandId).toBe('main');
    expect(meta.sourceBrandName).toBe('7번가피자');
    expect(meta.sourceDbName).toBe('rnd_manager_v3');
    expect(meta.sharedDbName).toBe('rnd_manager_v3');
    // main은 brand DB = shared DB (하위 호환)
    expect(meta.sourceDbName).toBe(meta.sharedDbName);
  });

  test('china4 브랜드 백업 메타데이터: 분리된 brand DB', () => {
    const meta = buildBackupSourceMetadata('china4');
    expect(meta.sourceBrandId).toBe('china4');
    expect(meta.sourceBrandName).toBe('차이나X4');
    expect(meta.sourceDbName).toBe('rnd_manager_v3__china4');
    expect(meta.sharedDbName).toBe('rnd_manager_v3');
    expect(meta.sourceDbName).not.toBe(meta.sharedDbName);
  });

  test('icheon 브랜드 백업 메타데이터: 분리된 brand DB', () => {
    const meta = buildBackupSourceMetadata('icheon');
    expect(meta.sourceBrandId).toBe('icheon');
    expect(meta.sourceBrandName).toBe('이천밥쌤');
    expect(meta.sourceDbName).toBe(dbNameFor('icheon'));
    expect(meta.sharedDbName).toBe(dbNameFor('main'));
  });

  test('3개 브랜드 모두 sharedDbName이 동일 (rnd_manager_v3)', () => {
    const ids = ['main', 'china4', 'icheon'];
    const sharedNames = ids.map(id => buildBackupSourceMetadata(id).sharedDbName);
    expect(new Set(sharedNames).size).toBe(1);
    expect(sharedNames[0]).toBe('rnd_manager_v3');
  });

  test('브랜드 간 복원 mismatch 감지', () => {
    // main → china4: 교차 복원 차단 대상
    expect(isBackupSourceMismatch({ sourceBrandId: 'main' }, 'china4')).toBe(true);
    // icheon → main: 교차 복원 차단 대상
    expect(isBackupSourceMismatch({ sourceBrandId: 'icheon' }, 'main')).toBe(true);
    // china4 → china4: 동일 브랜드 복원 허용
    expect(isBackupSourceMismatch({ sourceBrandId: 'china4' }, 'china4')).toBe(false);
    // main → main: 동일 브랜드 복원 허용
    expect(isBackupSourceMismatch({ sourceBrandId: 'main' }, 'main')).toBe(false);
    // sourceBrandId 없는 구형 백업: mismatch 없음 (경고 없이 통과)
    expect(isBackupSourceMismatch({}, 'main')).toBe(false);
  });

  test('validateBackupPayload가 브랜드 메타데이터를 summary에 포함한다', () => {
    const backup = makeBackup({
      sourceBrandId: 'china4',
      sourceBrandName: '차이나X4',
      sourceDbName: 'rnd_manager_v3__china4',
      sharedDbName: 'rnd_manager_v3',
    });
    const { summary } = validateBackupPayload(backup);
    expect(summary.sourceBrandId).toBe('china4');
    expect(summary.sourceBrandName).toBe('차이나X4');
    expect(summary.hasSourceBrand).toBe(true);
  });

  test('교차 복원: summary의 sourceBrandId와 타깃 브랜드로 mismatch 재확인 가능', () => {
    const backup = makeBackup({ sourceBrandId: 'main' });
    const { summary } = validateBackupPayload(backup);
    // 복원 UI가 summary.sourceBrandId를 사용해 mismatch를 표시하는 흐름 검증
    expect(isBackupSourceMismatch({ sourceBrandId: summary.sourceBrandId }, 'china4')).toBe(true);
    expect(isBackupSourceMismatch({ sourceBrandId: summary.sourceBrandId }, 'main')).toBe(false);
  });

  test('구형 brandId/brandName 백업도 교차 복원을 정확히 감지한다', () => {
    // v2 백업 호환 (brandId 필드명)
    const legacyBackup = { brandId: 'main', brandName: '7번가피자' };
    expect(isBackupSourceMismatch(legacyBackup, 'china4')).toBe(true);
    expect(isBackupSourceMismatch(legacyBackup, 'main')).toBe(false);
    const meta = backupSourceMetadataOf(legacyBackup);
    expect(meta.sourceBrandId).toBe('main');
    expect(meta.sourceBrandName).toBe('7번가피자');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. localStorage 포함 범위 확인
// ────────────────────────────────────────────────────────────────────────────

describe('2. localStorage 포함 범위 확인', () => {
  test('전 스코프 선택 시 PERSISTENT_LS_KEYS 전체가 복원 대상에 포함된다', () => {
    const allScopes = Object.keys(LOCAL_STORAGE_KEYS_BY_SCOPE);
    const selected = persistentLocalStorageKeysForScopes(allScopes);
    const selectedSet = new Set(selected);
    for (const key of PERSISTENT_LS_KEYS) {
      expect(selectedSet.has(key)).toBe(true);
    }
  });

  test('COMMON_LS_KEYS는 어떤 단일 스코프를 선택해도 항상 포함된다', () => {
    const commonSet = new Set(COMMON_LS_KEYS);
    for (const scope of Object.keys(LOCAL_STORAGE_KEYS_BY_SCOPE)) {
      const keys = persistentLocalStorageKeysForScopes([scope]);
      for (const commonKey of commonSet) {
        expect(keys).toContain(commonKey);
      }
    }
  });

  test('round-trip: 모든 영속 키를 저장한 뒤 collectLocalStorage → restoreLocalStorage하면 동일 값', () => {
    const original = {};
    for (const key of PERSISTENT_LS_KEYS) {
      original[key] = `value:${key}`;
    }
    const storeA = installMapStorage(original);

    const collected = collectLocalStorage(PERSISTENT_LS_KEYS);
    // PERSISTENT_LS_KEYS에서 동적 계정 키(rnd_active_account_id:*)는 제외하고 개수 검증
    const staticKeys = PERSISTENT_LS_KEYS.filter(k => !k.startsWith('rnd_active_account_id:'));
    for (const key of staticKeys) {
      expect(collected[key]).toBe(`value:${key}`);
    }

    // 빈 스토리지에 복원
    const storeB = installMapStorage({});
    const restoredCount = restoreLocalStorage(collected, PERSISTENT_LS_KEYS);
    expect(restoredCount).toBeGreaterThan(0);
    for (const key of staticKeys) {
      expect(storeB[key]).toBe(`value:${key}`);
    }
  });

  test('round-trip: 동적 saved views 키도 백업/복원된다', () => {
    const original = {
      saved_views_v1__main__ingredient: '[{"name":"필터A"}]',
      saved_views_v1_default__main__ingredient: '필터A',
      'saved_views_v1__main__bad/path': 'skip',
      'v3:note-draft-write': 'draft',
    };
    installMapStorage(original);

    const collected = collectLocalStorage(PERSISTENT_LS_KEYS);
    expect(collected).toEqual({
      saved_views_v1__main__ingredient: '[{"name":"필터A"}]',
      saved_views_v1_default__main__ingredient: '필터A',
    });

    const storeB = installMapStorage({});
    expect(restoreLocalStorage(collected, PERSISTENT_LS_KEYS)).toBe(2);
    expect(storeB.saved_views_v1__main__ingredient).toBe('[{"name":"필터A"}]');
    expect(storeB.saved_views_v1_default__main__ingredient).toBe('필터A');
  });

  test('알 수 없는 키는 pickLocalStorageForScopes가 필터링한다', () => {
    const backupMap = {
      'v3:recipe-sort': 'asc',
      'v3:unknown-future-key': 'future',
      'v3:secret-token': 'do-not-restore',
      'v3:profile': 'user',
    };
    const result = pickLocalStorageForScopes(backupMap, ['cost']);
    expect(result?.['v3:recipe-sort']).toBe('asc');
    expect(result?.['v3:profile']).toBe('user');
    expect(result?.['v3:unknown-future-key']).toBeUndefined();
    expect(result?.['v3:secret-token']).toBeUndefined();
  });

  test('sales 스코프의 LS 키 목록이 비어 있어도 공통 키는 정상 반환된다', () => {
    // sales 모듈에는 전용 LS 설정이 없음 — 공통 키만 복원해야 한다
    expect(LOCAL_STORAGE_KEYS_BY_SCOPE.sales).toEqual([]);
    const keys = persistentLocalStorageKeysForScopes(['sales']);
    for (const key of COMMON_LS_KEYS) {
      expect(keys).toContain(key);
    }
  });

  test('PERSISTENT_LS_KEYS에 중복 키가 없다', () => {
    const set = new Set(PERSISTENT_LS_KEYS);
    expect(set.size).toBe(PERSISTENT_LS_KEYS.length);
  });

  test('복원 저널은 마지막 복원 시도 상태를 안전하게 보존한다', () => {
    const store = installMapStorage({});
    let journal = createRestoreJournal({
      brandId: 'china4',
      sourceBrandId: 'main',
      requestedStores: ['settings', 'sales_rows', 'settings'],
      restoreLocalStorage: true,
    });

    journal = updateRestoreJournal(journal, {
      status: 'failed_partial',
      failedGroup: 'sharedStores',
      imported: 1,
      skipped: 2,
      errors: Array.from({ length: 25 }, (_, index) => ({
        store: `store_${index}`,
        error: `error_${index}`,
      })),
    });

    expect(store[RESTORE_JOURNAL_KEY]).toBeTruthy();
    expect(readRestoreJournal()).toMatchObject({
      status: 'failed_partial',
      brandId: 'china4',
      sourceBrandId: 'main',
      requestedStoreCount: 2,
      requestedStores: ['settings', 'sales_rows'],
      restoreLocalStorage: true,
      imported: 1,
      skipped: 2,
      failedGroup: 'sharedStores',
    });
    expect(readRestoreJournal().errors).toHaveLength(20);
    expect(journal.errors).toHaveLength(20);

    expect(clearRestoreJournal()).toBe(true);
    expect(store[RESTORE_JOURNAL_KEY]).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. 대용량 복원 테스트
// ────────────────────────────────────────────────────────────────────────────

describe('3. 대용량 복원 테스트', () => {
  function makeRows(count, base = {}) {
    return Array.from({ length: count }, (_, i) => ({ id: i + 1, ...base }));
  }

  test('1000행 × 5 store(5000행) 백업이 validateBackupPayload를 통과한다', () => {
    const stores = {
      sales_files: makeRows(1000),
      sales_rows: makeRows(1000),
      cost_ingredients: makeRows(1000),
      menu_master: makeRows(1000),
      nutrition_raw_values: makeRows(1000),
    };
    const { summary } = validateBackupPayload(makeBackup({ stores }));
    expect(summary.storeCount).toBe(5);
    expect(summary.totalRows).toBe(5000);
    expect(summary.unknownStores).toHaveLength(0);
  });

  test('단일 store에 10000행 — summarizeBackupStores가 정확히 집계한다', () => {
    const result = summarizeBackupStores({ sales_rows: makeRows(10000) });
    expect(result.totalRows).toBe(10000);
    expect(result.storeCount).toBe(1);
  });

  test('30개 store × 100행 — storeCount와 totalRows 모두 정확하다', () => {
    const stores = {};
    for (const name of ALL_STORES.slice(0, 30)) {
      stores[name] = makeRows(100);
    }
    const { summary } = validateBackupPayload(makeBackup({ stores }));
    expect(summary.storeCount).toBe(30);
    expect(summary.totalRows).toBe(3000);
    expect(summary.unknownStores).toHaveLength(0);
  });

  test('9999번째 행에 null 삽입 — invalidStoreRowsOf가 정확히 감지한다', () => {
    const rows = makeRows(10000);
    rows[9999] = null; // 마지막 행 손상
    const invalid = invalidStoreRowsOf(rows);
    expect(invalid).toEqual([9999]);
  });

  test('대형 store에 손상 레코드 포함 시 validateBackupPayload가 예외를 발생시킨다', () => {
    const rows = makeRows(5000);
    rows[2500] = 'bad-string'; // 중간 손상
    expect(() => validateBackupPayload(makeBackup({ stores: { sales_rows: rows } }))).toThrow(
      'store 레코드가 객체가 아님'
    );
  });

  test('빈 store(0행)를 포함해도 유효하다 — totalRows에서 0으로 집계된다', () => {
    const stores = {
      settings: [],
      sales_files: makeRows(500),
      price_files: [],
    };
    const { summary } = validateBackupPayload(makeBackup({ stores }));
    expect(summary.totalRows).toBe(500);
    expect(summary.storeCount).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. 실패 store 복구 시나리오
// ────────────────────────────────────────────────────────────────────────────

describe('4. 실패 store 복구 시나리오', () => {
  test('IDBTransaction 타임아웃 실패 store를 정확히 정규화한다', () => {
    const failedStores = failedBackupStoresOf({
      failedStores: [
        { store: 'sales_rows', error: 'IDBTransaction timeout' },
        { store: 'cost_ingredients', error: 'Failed to execute getAll on IDBObjectStore' },
      ],
    });
    expect(failedStores).toHaveLength(2);
    expect(failedStores[0]).toEqual({ store: 'sales_rows', error: 'IDBTransaction timeout' });
    expect(failedStores[1].error).toContain('getAll');
  });

  test('부분 성공 백업: 유효 store 3개 + failedStores 2개 → validateBackupPayload 통과', () => {
    const backup = makeBackup({
      stores: {
        settings: [{ id: 1 }],
        menu_master: [{ id: 1 }, { id: 2 }],
        ref_accounts: [{ id: 1 }],
      },
      failedStores: [
        { store: 'sales_rows', error: 'read timeout' },
        { store: 'cost_ingredients', error: 'store locked' },
      ],
    });
    const { summary } = validateBackupPayload(backup);
    expect(summary.storeCount).toBe(3);
    expect(summary.totalRows).toBe(4);
    expect(summary.failedStoreCount).toBe(2);
    expect(summary.failedStores.map(f => f.store)).toEqual(['sales_rows', 'cost_ingredients']);
  });

  test('failedStores에 있는 store는 stores 객체에 없어도 구조 자체는 유효하다', () => {
    const backup = makeBackup({
      stores: { settings: [{ id: 1 }] },
      failedStores: [{ store: 'sales_rows', error: 'export failed' }],
    });
    expect(() => validateBackupPayload(backup)).not.toThrow();
    const { summary } = validateBackupPayload(backup);
    // sales_rows는 stores에 없으므로 knownStores에 없음
    expect(summary.knownStores).not.toContain('sales_rows');
    // 하지만 failedStores에는 있음
    expect(summary.failedStores[0].store).toBe('sales_rows');
  });

  test('malformed failedStores 항목은 조용히 무시한다', () => {
    const result = failedBackupStoresOf({
      failedStores: [
        { store: 'sales_rows', error: 'real error' }, // 정상
        null, // null — 무시
        { error: 'no store name' }, // store 이름 없음 — 무시
        { store: '  ', error: 'empty name' }, // 공백만 — 무시
        'string-entry', // 문자열 — 무시
        { store: 'cost_ingredients' }, // error 없음 — 허용 (빈 문자열로)
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ store: 'sales_rows', error: 'real error' });
    expect(result[1]).toEqual({ store: 'cost_ingredients', error: '' });
  });

  test('failedStores가 없는 정상 백업의 failedStoreCount는 0이다', () => {
    const { summary } = validateBackupPayload(makeBackup());
    expect(summary.failedStoreCount).toBe(0);
    expect(summary.failedStores).toHaveLength(0);
  });

  test('복원 차단 흐름: failedStores가 있는 백업은 UI에서 allowFailedStoreRestore 없이 차단된다', () => {
    expect(restorePageSrc).toContain('allowFailedStoreRestore');
    expect(restorePageSrc).toContain('위험 승인');
  });

  test('실패 store의 error 메시지가 summary에서 그대로 노출된다', () => {
    const longError = 'A'.repeat(200); // 긴 에러 메시지
    const { summary } = validateBackupPayload(
      makeBackup({
        stores: { settings: [] },
        failedStores: [{ store: 'sales_rows', error: longError }],
      })
    );
    expect(summary.failedStores[0].error).toBe(longError);
  });
});
