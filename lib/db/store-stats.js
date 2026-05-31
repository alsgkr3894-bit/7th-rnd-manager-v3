import { ALL_STORES } from './constants';
import { hasStore } from './operations';
import { _getDB } from './init';

/**
 * IDB count() 요청으로 store 행 수를 효율적으로 조회.
 * getAll()과 달리 실제 데이터를 읽지 않으므로 훨씬 빠름.
 *
 * @param {string} name - store 이름
 * @returns {Promise<number>}
 */
function countStore(name) {
  return new Promise((resolve, reject) => {
    const tx = _getDB().transaction(name, 'readonly');
    const req = tx.objectStore(name).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

/**
 * 모든 IndexedDB store의 행 수를 수집해 반환한다.
 * IDB count() API를 사용하므로 getAll()보다 빠름.
 * store가 없거나 읽기 실패 시 해당 store는 0으로 처리한다.
 *
 * @returns {Promise<Record<string, number>>} storeName → rowCount
 */
export async function collectStoreStats() {
  const result = {};
  for (const name of ALL_STORES) {
    if (!hasStore(name)) { result[name] = 0; continue; }
    try {
      result[name] = await countStore(name);
    } catch {
      result[name] = 0;
    }
  }
  return result;
}
