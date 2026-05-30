import { getAll, runTransaction, hasStore } from '@/lib/db';
import { normalizeComponent } from './store';

/**
 * 메뉴 레시피 detail store를 위한 팩토리.
 * pizza / personal / side / set 4개 store 모두 동일한 CRUD 구조를 공유한다.
 *
 * @param {string} storeName  - IndexedDB objectStore 이름
 * @param {function} extraFields - data → 추가 필드 객체 (store별 차이 부분만)
 */
export function createDetailStore(storeName, extraFields = () => ({})) {
  const storeObj = (tx) => tx.objectStore(storeName);

  function buildRecord(data) {
    return {
      menuCode:   (data.menuCode || '').trim(),
      menuName:   (data.menuName || '').trim(),
      ...extraFields(data),
      components: Array.isArray(data.components)
        ? data.components.map(normalizeComponent)
        : [],
      note:     (data.note || '').trim(),
      updatedAt: new Date().toISOString(),
    };
  }

  async function getAll_() {
    if (!hasStore(storeName)) return [];
    const rows = await getAll(storeName);
    return rows.sort((a, b) => (a.menuCode || '').localeCompare(b.menuCode || ''));
  }

  async function getRecipeMap() {
    const rows = await getAll_();
    return new Map(rows.filter(r => r.menuCode).map(r => [r.menuCode, r]));
  }

  async function upsert(data) {
    if (!hasStore(storeName)) throw new Error(`${storeName} store 없음`);
    if (!data.menuCode) throw new Error('menuCode가 필요합니다');

    const all = await getAll(storeName);

    if (data.id) {
      const existing = all.find(r => r.id === data.id);
      if (!existing) throw new Error('항목을 찾을 수 없습니다');
      await runTransaction([storeName], 'readwrite', tx => {
        storeObj(tx).put({ ...existing, ...buildRecord(data), id: data.id });
      });
      return { id: data.id, mode: 'update' };
    }

    const duplicate = all.find(r => r.menuCode === data.menuCode);
    if (duplicate) {
      await runTransaction([storeName], 'readwrite', tx => {
        storeObj(tx).put({ ...duplicate, ...buildRecord(data), id: duplicate.id });
      });
      return { id: duplicate.id, mode: 'update' };
    }

    let insertedId = null;
    await runTransaction([storeName], 'readwrite', tx => {
      const req = storeObj(tx).add(buildRecord(data));
      req.onsuccess = () => { insertedId = req.result; };
    });
    return { id: insertedId, mode: 'insert' };
  }

  async function remove(id) {
    if (!hasStore(storeName)) throw new Error(`${storeName} store 없음`);
    await runTransaction([storeName], 'readwrite', tx => {
      storeObj(tx).delete(id);
    });
  }

  async function resetAll() {
    if (!hasStore(storeName)) return { deleted: 0 };
    const all = await getAll(storeName);
    const count = all.length;
    await runTransaction([storeName], 'readwrite', tx => {
      tx.objectStore(storeName).clear();
    });
    return { deleted: count };
  }

  return { getAll: getAll_, getRecipeMap, upsert, remove, resetAll };
}
