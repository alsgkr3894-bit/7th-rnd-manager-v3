/**
 * lib/backup/validation.js — 백업 JSON 구조 검증/요약
 *
 * 복원 페이지와 테스트가 같은 기준을 쓰도록 순수 함수로 분리한다.
 */

import { ALL_STORES } from '@/lib/db/constants';

export const CURRENT_BACKUP_VERSION = 'v3';

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
    throw new Error(`잘못된 백업 파일 형식 (stores 값이 배열이 아님: ${nonArrayStores.slice(0, 3).join(', ')})`);
  }

  const invalidRows = invalidStoreRowsByStore(data.stores);
  if (invalidRows.length > 0) {
    const samples = invalidRows.slice(0, 3).map(({ name, invalidIndexes }) => (
      `${name}[${invalidIndexes.slice(0, 3).join(', ')}]`
    ));
    throw new Error(`잘못된 백업 파일 형식 (store 레코드가 객체가 아님: ${samples.join(', ')})`);
  }

  const summary = summarizeBackupStores(data.stores, allStores);
  const version = typeof data.version === 'string' ? data.version : '';
  const exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : '';

  return {
    backup: data,
    summary: {
      ...summary,
      version,
      exportedAt,
      versionMismatch: Boolean(version && version !== currentVersion),
      hasLocalStorage: Boolean(data.localStorage && typeof data.localStorage === 'object' && !Array.isArray(data.localStorage)),
    },
  };
}
