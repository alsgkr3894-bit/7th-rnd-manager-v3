import { ALL_STORES, dbNameFor } from './constants';
import { _getDB, openNamed, getNamed } from './init';
import { SHARED_STORE_NAMES } from './module-stores';
import { collectLocalStorage, restoreLocalStorage } from '@/lib/backup/local-storage-keys';
import { invalidStoreRowsOf } from '@/lib/backup/validation';
import { getActiveBrandId } from '@/lib/active-brand';
import { buildBackupSourceMetadata } from '@/lib/backup/brand-source';

function getAllFromDb(db, storeName) {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => {
      const ms = Math.round(performance.now() - t0);
      if (ms > 1000) {
        console.warn(`[DB] getAll('${storeName}') ${ms}ms — 데이터 ${req.result.length}건`);
      }
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function ensureMainDB() {
  const mainName = dbNameFor('main');
  try {
    getNamed(mainName);
  } catch {
    await openNamed(mainName);
  }
}

async function ensureBrandDB(brandId) {
  const name = dbNameFor(brandId);
  try {
    return getNamed(name);
  } catch {
    return openNamed(name);
  }
}

function dbForStore(name, brandId = getActiveBrandId()) {
  if (SHARED_STORE_NAMES.has(name)) return getNamed(dbNameFor('main'));
  if (brandId === getActiveBrandId()) return _getDB();
  return getNamed(dbNameFor(brandId));
}

function validRows(rows) {
  return Array.isArray(rows) ? rows.filter(r => r !== null && typeof r === 'object') : [];
}

export function replaceStoresInDbTransaction(db, entries, options = {}) {
  const pairs = Array.isArray(entries) ? entries : [];
  if (pairs.length === 0) return Promise.resolve({});
  const storeNames = pairs.map(([storeName]) => storeName);
  const counts = {};

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    try {
      for (const [storeName, rows] of pairs) {
        const store = tx.objectStore(storeName);
        const valid = validRows(rows);
        store.clear();
        valid.forEach(item => store.put(item));
        counts[storeName] = valid.length;
        options.onStoreQueued?.(storeName);
      }
    } catch (err) {
      try {
        tx.abort();
      } catch (abortErr) {
        console.warn('[DB] replaceStores transaction abort failed:', abortErr);
      }
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(counts);
    tx.onerror = () => reject(tx.error || new Error('replaceStores transaction error'));
    tx.onabort = () => reject(tx.error || new Error('replaceStores transaction aborted'));
  });
}

/**
 * store를 비우고 새 레코드로 교체 — 단일 트랜잭션.
 * 공유 store는 main DB, 나머지는 활성 브랜드 DB에 기록.
 */
export async function replaceStore(storeName, rows) {
  return replaceStoreForBrand(storeName, rows, getActiveBrandId());
}

export async function replaceStoreForBrand(storeName, rows, brandId) {
  if (SHARED_STORE_NAMES.has(storeName)) await ensureMainDB();
  else await ensureBrandDB(brandId);
  const db = dbForStore(storeName, brandId);
  const counts = await replaceStoresInDbTransaction(db, [[storeName, rows]]);
  return counts[storeName] || 0;
}

async function replaceStoreGroupForBrand(entries, brandId, options = {}) {
  const pairs = Array.isArray(entries) ? entries : [];
  if (pairs.length === 0) return {};
  const shared = SHARED_STORE_NAMES.has(pairs[0][0]);
  if (shared) await ensureMainDB();
  else await ensureBrandDB(brandId);
  const db = shared ? getNamed(dbNameFor('main')) : dbForStore(pairs[0][0], brandId);
  return replaceStoresInDbTransaction(db, pairs, options);
}

export async function exportAll() {
  return exportSelected(ALL_STORES, { scopes: 'all' });
}

export async function exportSelected(storeNames, meta = {}, options = {}) {
  return exportSelectedForBrand(getActiveBrandId(), storeNames, meta, options);
}

export async function exportAllForBrand(brandId, meta = {}, options = {}) {
  return exportSelectedForBrand(brandId, ALL_STORES, { scopes: 'all', ...meta }, options);
}

export async function exportSelectedForBrand(brandId, storeNames, meta = {}, options = {}) {
  const hasShared = storeNames.some(n => SHARED_STORE_NAMES.has(n));
  if (hasShared) await ensureMainDB();
  const brandDb = await ensureBrandDB(brandId);

  const mainDb = hasShared ? getNamed(dbNameFor('main')) : null;
  const activeStoreNames = new Set(Array.from(brandDb.objectStoreNames));
  const mainStoreNames = mainDb ? new Set(Array.from(mainDb.objectStoreNames)) : new Set();

  const stores = {};
  const total = Math.max(storeNames.length, 1);
  let index = 0;
  const markProgress = store => {
    index += 1;
    options?.onProgress?.({ store, index, total });
  };

  const validNames = [];
  for (const name of storeNames) {
    if (!ALL_STORES.includes(name)) {
      console.warn(`[DB] exportSelected: 알 수 없는 store '${name}' (skip)`);
      markProgress(name);
      continue;
    }
    const isShared = SHARED_STORE_NAMES.has(name);
    const dbNames = isShared ? mainStoreNames : activeStoreNames;
    if (!dbNames.has(name)) {
      stores[name] = [];
      markProgress(name);
      continue;
    }
    validNames.push(name);
  }

  const failedStores = [];
  const CHUNK = 5;
  for (let i = 0; i < validNames.length; i += CHUNK) {
    const chunk = validNames.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async name => {
        try {
          stores[name] = await getAllFromDb(dbForStore(name, brandId), name);
        } catch (err) {
          console.warn(`[DB] exportSelected: ${name} 조회 실패 (제외):`, err);
          failedStores.push({ store: name, error: String(err?.message || err) });
        } finally {
          markProgress(name);
        }
      })
    );
  }

  const includeLocalStorage = options.includeLocalStorage !== false;
  const localStorageData = includeLocalStorage ? collectLocalStorage() : null;
  const requestedStores = storeNames.filter(name => ALL_STORES.includes(name));
  const sharedStoreNames = requestedStores.filter(name => SHARED_STORE_NAMES.has(name));
  const brandScopedStoreNames = requestedStores.filter(name => !SHARED_STORE_NAMES.has(name));

  return {
    version: 'v3',
    exportedAt: new Date().toISOString(),
    stores,
    ...(failedStores.length ? { failedStores } : {}),
    ...(localStorageData && Object.keys(localStorageData).length
      ? { localStorage: localStorageData }
      : {}),
    ...meta,
    ...buildBackupSourceMetadata(brandId),
    sharedStoreNames,
    brandScopedStoreNames,
  };
}

export async function importAll(data, options = {}) {
  return importAllToBrand(data, getActiveBrandId(), { ...options, restoreLocalStorage: true });
}

export async function importAllToBrand(data, brandId, options = {}) {
  if (!data || typeof data.stores !== 'object') {
    throw new Error('잘못된 백업 파일 형식입니다.');
  }
  let imported = 0,
    skipped = 0;
  const errors = [];

  const entries = Object.entries(data.stores).filter(([storeName, rows]) => {
    if (!ALL_STORES.includes(storeName)) {
      console.warn(`[DB] importAll: 알 수 없는 store '${storeName}' (skip)`);
      skipped++;
      return false;
    }
    if (!Array.isArray(rows)) {
      errors.push({ store: storeName, error: 'store 데이터가 배열이 아닙니다.' });
      return false;
    }
    const invalidIndexes = invalidStoreRowsOf(rows);
    if (invalidIndexes.length > 0) {
      errors.push({
        store: storeName,
        error: `store 레코드가 객체가 아닙니다. index: ${invalidIndexes.slice(0, 5).join(', ')}`,
      });
      return false;
    }
    return true;
  });

  if (errors.length > 0) {
    return { imported: 0, skipped, errors };
  }

  let progressIndex = 0;
  const markProgress = store => {
    progressIndex += 1;
    options.onProgress?.({ store, index: progressIndex, total: entries.length });
  };
  const storeGroups = [
    {
      name: 'brandScopedStores',
      entries: entries.filter(([storeName]) => !SHARED_STORE_NAMES.has(storeName)),
    },
    {
      name: 'sharedStores',
      entries: entries.filter(([storeName]) => SHARED_STORE_NAMES.has(storeName)),
    },
  ].filter(group => group.entries.length > 0);

  for (const group of storeGroups) {
    try {
      const counts = await replaceStoreGroupForBrand(group.entries, brandId, {
        onStoreQueued: markProgress,
      });
      imported += Object.keys(counts).length;
    } catch (err) {
      errors.push({
        store: group.name,
        error: err?.message || String(err),
      });
    }
  }

  if (options.restoreLocalStorage && data.localStorage) {
    const localStorageErrors = [];
    restoreLocalStorage(data.localStorage, undefined, {
      onError: error => localStorageErrors.push(error),
    });
    if (localStorageErrors.length > 0) {
      const keys = localStorageErrors.map(item => item.key).join(', ');
      errors.push({
        store: 'localStorage',
        error: `localStorage 복원 실패 ${localStorageErrors.length}건: ${keys}`,
      });
    }
  }

  return { imported, skipped, errors };
}
