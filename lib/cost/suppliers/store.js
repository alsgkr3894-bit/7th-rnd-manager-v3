/**
 * lib/cost/suppliers/store.js — cost_suppliers CRUD
 *
 * 레코드 구조:
 *   id          autoIncrement PK
 *   name        공급업체명 (index)
 *   contact     담당자 (선택)
 *   phone       연락처 (선택)
 *   memo        메모 (선택)
 *   createdAt   ISO string
 *   updatedAt   ISO string
 */

import { getAll, put, deleteById, hasStore, runTransaction } from '@/lib/db';

const STORE = 'cost_suppliers';

/**
 * 모든 공급업체를 이름 순으로 반환.
 * store 없으면 [] 반환 (안전 처리).
 */
export async function getAllSuppliers() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
}

/**
 * 새 공급업체 추가.
 * @param {{ name: string, contact?: string, phone?: string, memo?: string }} data
 * @returns {Promise<number>} 새 레코드의 id
 */
export async function addSupplier(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const now = new Date().toISOString();
  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const record = {
      name:      (data.name    || '').trim(),
      contact:   (data.contact || '').trim() || null,
      phone:     (data.phone   || '').trim() || null,
      memo:      (data.memo    || '').trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => { insertedId = req.result; };
  });
  return insertedId;
}

/**
 * 기존 공급업체 수정.
 * @param {number} id
 * @param {{ name?: string, contact?: string, phone?: string, memo?: string }} patch
 */
export async function updateSupplier(id, patch) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('공급업체를 찾을 수 없습니다');
  const now = new Date().toISOString();
  const merged = {
    ...existing,
    ...('name'    in patch ? { name:    (patch.name    || '').trim() }          : {}),
    ...('contact' in patch ? { contact: (patch.contact || '').trim() || null }  : {}),
    ...('phone'   in patch ? { phone:   (patch.phone   || '').trim() || null }  : {}),
    ...('memo'    in patch ? { memo:    (patch.memo    || '').trim() || null }   : {}),
    updatedAt: now,
  };
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).put(merged);
  });
}

/**
 * 공급업체 삭제.
 * @param {number} id
 */
export async function deleteSupplier(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  return deleteById(STORE, id);
}
