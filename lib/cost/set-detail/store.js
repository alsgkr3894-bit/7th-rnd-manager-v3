/**
 * lib/cost/set-detail/store.js — cost_set_detail CRUD
 *
 * 스키마 인덱스가 setName이라 menuName 동일 사용. menuCode로 매칭.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';
import { normalizeComponent } from '@/lib/cost/shared/store';

const STORE = 'cost_set_detail';
const s = (tx) => tx.objectStore(STORE);

export async function getAllSetRecipes() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.menuCode || '').localeCompare(b.menuCode || ''));
}

export async function getSetRecipeMap() {
  const rows = await getAllSetRecipes();
  return new Map(rows.filter(r => r.menuCode).map(r => [r.menuCode, r]));
}

export async function upsertSetRecipe(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  if (!data.menuCode) throw new Error('menuCode가 필요합니다');

  const all = await getAll(STORE);

  if (data.id) {
    const existing = all.find(r => r.id === data.id);
    if (!existing) throw new Error('항목을 찾을 수 없습니다');
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...existing, ...buildRecord(data), id: data.id });
    });
    return { id: data.id, mode: 'update' };
  }

  const dup = all.find(r => r.menuCode === data.menuCode);
  if (dup) {
    await runTransaction([STORE], 'readwrite', tx => {
      s(tx).put({ ...dup, ...buildRecord(data), id: dup.id });
    });
    return { id: dup.id, mode: 'update' };
  }

  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = s(tx).add(buildRecord(data));
    req.onsuccess = () => { insertedId = req.result; };
  });
  return { id: insertedId, mode: 'insert' };
}

export async function deleteSetRecipe(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
}

export async function resetAllSetRecipes() {
  if (!hasStore(STORE)) return { deleted: 0 };
  const all = await getAll(STORE);
  const count = all.length;
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).clear();
  });
  return { deleted: count };
}

function buildRecord(data) {
  return {
    menuCode:   (data.menuCode || '').trim(),
    menuName:   (data.menuName || '').trim(),
    setName:    (data.menuName || '').trim(), // schema index 호환
    components: Array.isArray(data.components) ? data.components.map(normalizeComponent) : [],
    note:       (data.note || '').trim(),
    updatedAt:  new Date().toISOString(),
  };
}

