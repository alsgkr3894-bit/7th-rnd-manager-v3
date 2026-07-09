import { ALL_STORES, dbNameFor } from './constants';
import { hasStore } from './operations';
import { _getDB, getNamed } from './init';
import { SHARED_STORE_NAMES } from './module-stores';
import { initSharedDB, sharedHasStore } from './shared';

/**
 * IDB count() 요청으로 store 행 수를 효율적으로 조회.
 * getAll()과 달리 실제 데이터를 읽지 않으므로 훨씬 빠름.
 *
 * @param {IDBDatabase} db - 대상 DB 핸들
 * @param {string} name - store 이름
 * @returns {Promise<number>}
 */
function countStore(db, name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readonly');
    const req = tx.objectStore(name).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 모든 IndexedDB store의 행 수를 수집해 반환한다.
 * IDB count() API를 사용하므로 getAll()보다 빠름.
 * store가 없거나 읽기 실패 시 해당 store는 0으로 처리한다.
 *
 * 공유 store(노트·샘플·일정·작업일지)는 활성 브랜드와 무관하게 항상 main DB에 산다.
 * 활성 브랜드 DB로 세면 비-main 브랜드에서 0으로 잘못 표시되므로 main DB에서 센다.
 *
 * @returns {Promise<Record<string, number>>} storeName → rowCount
 */
export async function collectStoreStats() {
  const result = {};
  let mainDb = null;
  if (ALL_STORES.some(name => SHARED_STORE_NAMES.has(name))) {
    try {
      await initSharedDB();
      mainDb = getNamed(dbNameFor('main'));
    } catch {
      mainDb = null;
    }
  }
  for (const name of ALL_STORES) {
    const shared = SHARED_STORE_NAMES.has(name);
    try {
      if (shared) {
        result[name] = mainDb && sharedHasStore(name) ? await countStore(mainDb, name) : 0;
      } else {
        result[name] = hasStore(name) ? await countStore(_getDB(), name) : 0;
      }
    } catch {
      result[name] = 0;
    }
  }
  return result;
}
