/**
 * lib/backup/validation.js — 백업 JSON 구조 검증/요약
 *
 * 복원 페이지와 테스트가 같은 기준을 쓰도록 순수 함수로 분리한다.
 */

import { ALL_STORES } from '@/lib/db/constants';
import { backupSourceMetadataOf } from '@/lib/backup/brand-source';
import { PERSISTENT_LS_KEYS, isSavedViewStorageKey } from '@/lib/backup/local-storage-keys';
import { isActiveAccountStorageKey } from '@/lib/auth/account-constants';

export const CURRENT_BACKUP_VERSION = 'v3';
const MAX_LOCAL_STORAGE_SUMMARY_KEYS = 2000;

function storeEntriesOf(stores) {
  return Object.entries(stores || {});
}

export function isBackupStoreRecord(row) {
  return row !== null && typeof row === 'object' && !Array.isArray(row);
}

export function invalidStoreRowsOf(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isBackupStoreRecord(row))
    .map(({ index }) => index);
}

export function invalidStoreRowsByStore(stores) {
  return storeEntriesOf(stores)
    .filter(([, rows]) => Array.isArray(rows))
    .map(([name, rows]) => ({ name, invalidIndexes: invalidStoreRowsOf(rows) }))
    .filter(({ invalidIndexes }) => invalidIndexes.length > 0);
}

export function failedBackupStoresOf(data) {
  if (!Array.isArray(data?.failedStores)) return [];
  return data.failedStores
    .map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const store = typeof item.store === 'string' ? item.store.trim() : '';
      if (!store) return null;
      return {
        store,
        error: typeof item.error === 'string' ? item.error : '',
      };
    })
    .filter(Boolean);
}

export function summarizeBackupStores(stores, allStores = ALL_STORES) {
  const knownSet = new Set(allStores);
  const entries = storeEntriesOf(stores);
  const knownStores = [];
  const unknownStores = [];
  let totalRows = 0;

  for (const [name, rows] of entries) {
    if (knownSet.has(name)) knownStores.push(name);
    else unknownStores.push(name);
    totalRows += Array.isArray(rows) ? rows.length : 0;
  }

  return {
    storeCount: entries.length,
    knownStores,
    unknownStores,
    totalRows,
  };
}

function baseLocalStorageSummary() {
  return {
    hasLocalStorage: false,
    invalidShape: false,
    restorableKeyCount: 0,
    ignoredKeyCount: 0,
    unknownKeyCount: 0,
    nonStringValueCount: 0,
    unreadableValueCount: 0,
    inspectedDynamicKeyCount: 0,
    truncated: false,
    sampleIgnoredKeys: [],
  };
}

function addIgnoredSample(summary, key) {
  if (summary.sampleIgnoredKeys.length < 5) summary.sampleIgnoredKeys.push(key);
}

function readBackupStorageValue(map, key) {
  try {
    return { ok: true, value: map[key] };
  } catch {
    return { ok: false, value: undefined };
  }
}

function isAllowedDynamicStorageKey(key) {
  return isActiveAccountStorageKey(key) || isSavedViewStorageKey(key);
}

function markStorageValue(summary, map, key, isAllowed) {
  const read = readBackupStorageValue(map, key);
  if (!read.ok) {
    summary.unreadableValueCount += 1;
    addIgnoredSample(summary, key);
    return;
  }
  if (!isAllowed) {
    summary.unknownKeyCount += 1;
    addIgnoredSample(summary, key);
    return;
  }
  if (typeof read.value !== 'string') {
    summary.nonStringValueCount += 1;
    addIgnoredSample(summary, key);
    return;
  }
  summary.restorableKeyCount += 1;
}

export function summarizeBackupLocalStorage(map, options = {}) {
  const summary = baseLocalStorageSummary();
  if (map == null) return summary;
  if (typeof map !== 'object' || Array.isArray(map)) {
    return { ...summary, invalidShape: true };
  }

  summary.hasLocalStorage = true;
  const persistentKeys = options.persistentKeys || PERSISTENT_LS_KEYS;
  const persistentSet = new Set(persistentKeys);
  const seenStaticKeys = new Set();

  // 정적 허용 키는 직접 조회해 큰 입력에서도 뒤쪽 허용 키를 놓치지 않는다.
  for (const key of persistentKeys) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    seenStaticKeys.add(key);
    markStorageValue(summary, map, key, true);
  }

  let inspected = 0;
  for (const key in map) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    if (seenStaticKeys.has(key)) continue;
    if (inspected >= MAX_LOCAL_STORAGE_SUMMARY_KEYS) {
      summary.truncated = true;
      break;
    }
    inspected += 1;
    markStorageValue(summary, map, key, isAllowedDynamicStorageKey(key) || persistentSet.has(key));
  }
  summary.inspectedDynamicKeyCount = inspected;
  summary.ignoredKeyCount =
    summary.unknownKeyCount + summary.nonStringValueCount + summary.unreadableValueCount;
  return summary;
}

export function validateBackupPayload(data, options = {}) {
  const currentVersion = options.currentVersion || CURRENT_BACKUP_VERSION;
  const allStores = options.allStores || ALL_STORES;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('잘못된 백업 파일 형식 (최상위 객체 누락)');
  }
  if (!data.stores || typeof data.stores !== 'object' || Array.isArray(data.stores)) {
    throw new Error('잘못된 백업 파일 형식 (stores 객체 누락)');
  }

  const nonArrayStores = storeEntriesOf(data.stores)
    .filter(([, rows]) => !Array.isArray(rows))
    .map(([name]) => name);

  if (nonArrayStores.length > 0) {
    throw new Error(
      `잘못된 백업 파일 형식 (stores 값이 배열이 아님: ${nonArrayStores.slice(0, 3).join(', ')})`
    );
  }

  const invalidRows = invalidStoreRowsByStore(data.stores);
  if (invalidRows.length > 0) {
    const samples = invalidRows
      .slice(0, 3)
      .map(({ name, invalidIndexes }) => `${name}[${invalidIndexes.slice(0, 3).join(', ')}]`);
    throw new Error(`잘못된 백업 파일 형식 (store 레코드가 객체가 아님: ${samples.join(', ')})`);
  }

  const summary = summarizeBackupStores(data.stores, allStores);
  const version = typeof data.version === 'string' ? data.version : '';
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : '';
  const source = backupSourceMetadataOf(data);
  const failedStores = failedBackupStoresOf(data);
  const localStorageSummary = summarizeBackupLocalStorage(data.localStorage);

  return {
    backup: data,
    summary: {
      ...summary,
      version,
      exportedAt,
      versionMismatch: Boolean(version && version !== currentVersion),
      hasLocalStorage: localStorageSummary.hasLocalStorage,
      localStorageSummary,
      sourceBrandId: source.sourceBrandId,
      sourceBrandName: source.sourceBrandName,
      sourceDbName: source.sourceDbName,
      sharedDbName: source.sharedDbName,
      hasSourceBrand: source.hasSourceBrand,
      failedStores,
      failedStoreCount: failedStores.length,
    },
  };
}
