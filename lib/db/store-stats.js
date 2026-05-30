import { ALL_STORES } from './constants';
import { hasStore, getAll } from './operations';

/**
 * 모든 IndexedDB store의 행 수를 수집해 반환한다.
 * store가 없거나 읽기 실패 시 해당 store는 0으로 처리한다.
 *
 * @returns {Promise<Record<string, number>>} storeName → rowCount
 */
export async function collectStoreStats() {
  const result = {};
  for (const name of ALL_STORES) {
    if (!hasStore(name)) { result[name] = 0; continue; }
    try {
      const rows = await getAll(name);
      result[name] = rows.length;
    } catch {
      result[name] = 0;
    }
  }
  return result;
}
