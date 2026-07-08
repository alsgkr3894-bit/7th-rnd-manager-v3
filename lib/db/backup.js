import { ALL_STORES, dbNameFor } from './constants';
import { _getDB, openNamed, getNamed } from './init';
import { SHARED_STORE_NAMES } from './module-stores';
import {
  drainServerStoreSyncQueue,
  queueCapturedStoreSync,
  wrapTransactionForServerSync,
} from './server-sync';
import { collectLocalStorage, restoreLocalStorage } from '@/lib/backup/local-storage-keys';
import { invalidStoreRowsOf } from '@/lib/backup/validation';
import { createRestoreJournal, updateRestoreJournal } from '@/lib/backup/restore-journal';
import { getActiveBrandId } from '@/lib/active-brand';
import { buildBackupSourceMetadata } from '@/lib/backup/brand-source';
import { assertActiveAdmin } from '@/lib/auth/guard';

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
    const captures = [];
    const writeTx =
      options.syncToServer === false ? tx : wrapTransactionForServerSync(tx, captures);
    // 개별 요청 실패 시 트랜잭션을 명시적으로 abort 해 부분 적용(일부 store만 clear되고
    // 새 데이터는 못 들어가는 손실)을 막는다. abort가 onabort→reject로 이어진다.
    const failTx = () => {
      try {
        tx.abort();
      } catch (abortErr) {
        console.warn('[DB] replaceStores request abort failed:', abortErr);
      }
    };
    try {
      for (const [storeName, rows] of pairs) {
        const store = writeTx.objectStore(storeName);
        const valid = validRows(rows);
        const clearReq = store.clear();
        clearReq.onerror = failTx;
        valid.forEach(item => {
          const putReq = store.put(item);
          putReq.onerror = failTx;
        });
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
    tx.oncomplete = () => {
      queueCapturedStoreSync(captures, { includeClientId: false });
      resolve(counts);
    };
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
  await assertActiveAdmin('백업 store 직접 교체');
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

function finalRestoreStatus(errors) {
  const realErrors = errors.filter(error => error.store !== '__shared_skipped__');
  if (realErrors.some(error => error.store === '__partial__')) return 'failed_partial';
  if (realErrors.length > 0) return 'completed_with_errors';
  if (errors.length > 0) return 'completed_with_warnings';
  return 'completed';
}

export async function importAllToBrand(data, brandId, options = {}) {
  await assertActiveAdmin('데이터 복원');
  if (!data || typeof data.stores !== 'object') {
    throw new Error('잘못된 백업 파일 형식입니다.');
  }
  let restoreJournal = createRestoreJournal({
    brandId,
    sourceBrandId: data.sourceBrandId || data.brandId || '',
    requestedStores: Object.keys(data.stores),
    restoreLocalStorage: Boolean(options.restoreLocalStorage && data.localStorage),
  });
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
    restoreJournal = updateRestoreJournal(restoreJournal, {
      status: 'blocked_invalid_backup',
      finishedAt: new Date().toISOString(),
      imported: 0,
      skipped,
      errors,
    });
    return { imported: 0, skipped, errors };
  }

  let progressIndex = 0;
  const markProgress = store => {
    progressIndex += 1;
    options.onProgress?.({ store, index: progressIndex, total: entries.length });
  };
  const sharedEntries = entries.filter(([storeName]) => SHARED_STORE_NAMES.has(storeName));
  // 공유 store(노트·샘플·일정·작업일지)는 항상 main(7번가) DB에 산다. 비-main 브랜드 백업에도
  // 백업 시점의 7번가 공유 데이터가 embed되는데, 이를 복원하면 brandId와 무관하게 현재 7번가
  // 공유 store를 clear+덮어쓰기해 데이터가 무경고로 손실된다(7번가 무변경 원칙 위반).
  // → 비-main 브랜드 복원에서는 공유 store 그룹을 적용하지 않고 건너뛴다.
  const restoreShared = brandId === 'main';
  if (!restoreShared && sharedEntries.length > 0) {
    skipped += sharedEntries.length;
    errors.push({
      store: '__shared_skipped__',
      error: `공유 store ${sharedEntries.length}개(노트·샘플·일정·작업일지)는 7번가 데이터 보호를 위해 비-main 브랜드 복원 시 적용하지 않았습니다.`,
    });
  }
  const storeGroups = [
    {
      name: 'brandScopedStores',
      entries: entries.filter(([storeName]) => !SHARED_STORE_NAMES.has(storeName)),
    },
    {
      name: 'sharedStores',
      entries: restoreShared ? sharedEntries : [],
    },
  ].filter(group => group.entries.length > 0);

  // 그룹별 트랜잭션은 그룹 내에서는 원자적이지만 그룹 간(브랜드↔공유)에는 원자성이 없다.
  // 한 그룹이 실패하면 이후 그룹을 적용하지 않고 중단해 불일치 폭을 최소화하고, 이미 적용된
  // 그룹이 있으면 "부분 복원" 사실을 명확히 errors로 알린다.
  const appliedGroups = [];
  for (let i = 0; i < storeGroups.length; i++) {
    const group = storeGroups[i];
    restoreJournal = updateRestoreJournal(restoreJournal, {
      status: 'running_group',
      currentGroup: group.name,
      imported,
      skipped,
      errors,
      appliedGroups,
    });
    try {
      const counts = await replaceStoreGroupForBrand(group.entries, brandId, {
        onStoreQueued: markProgress,
      });
      imported += Object.keys(counts).length;
      appliedGroups.push({ name: group.name, storeCount: Object.keys(counts).length });
      restoreJournal = updateRestoreJournal(restoreJournal, {
        status: 'running',
        currentGroup: group.name,
        imported,
        skipped,
        errors,
        appliedGroups,
      });
    } catch (err) {
      errors.push({
        store: group.name,
        error: err?.message || String(err),
      });
      const remaining = storeGroups.slice(i + 1).map(g => g.name);
      if (imported > 0 || remaining.length > 0) {
        errors.push({
          store: '__partial__',
          error: `부분 복원: '${group.name}' 그룹 실패로 중단${
            imported > 0 ? ` (이미 적용된 그룹 있음 — DB가 불일치 상태일 수 있음)` : ''
          }${remaining.length ? `, 미적용: ${remaining.join(', ')}` : ''}`,
        });
      }
      restoreJournal = updateRestoreJournal(restoreJournal, {
        status: 'failed_partial',
        failedGroup: group.name,
        finishedAt: new Date().toISOString(),
        imported,
        skipped,
        errors,
        appliedGroups,
      });
      break;
    }
  }

  // store 복원 중 "실제 오류"가 있으면 localStorage 복원은 진행하지 않는다(추가 부분 적용 방지).
  // __shared_skipped__는 의도된 건너뜀(정보성)이라 실패로 보지 않는다.
  let hasRealError = errors.some(e => e.store !== '__shared_skipped__');
  if (!hasRealError && options.syncToServer !== false) {
    try {
      await drainServerStoreSyncQueue();
    } catch (err) {
      errors.push({
        store: 'server_store_sync',
        error: err?.message || String(err),
      });
    }
  }

  hasRealError = errors.some(e => e.store !== '__shared_skipped__');
  if (!hasRealError && options.restoreLocalStorage && data.localStorage) {
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

  restoreJournal = updateRestoreJournal(restoreJournal, {
    status: finalRestoreStatus(errors),
    currentGroup: null,
    finishedAt: new Date().toISOString(),
    imported,
    skipped,
    errors,
    appliedGroups,
  });

  return { imported, skipped, errors };
}
