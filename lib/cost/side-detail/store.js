/**
 * lib/cost/side-detail/store.js — cost_side_detail CRUD
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

const STORE = 'cost_side_detail';
const s = (tx) => tx.objectStore(STORE);

export async function getAllSideRecipes() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.menuCode || '').localeCompare(b.menuCode || ''));
}

export async function getSideRecipeMap() {
  const rows = await getAllSideRecipes();
  return new Map(rows.filter(r => r.menuCode).map(r => [r.menuCode, r]));
}

export async function upsertSideRecipe(data) {
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

  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).add(buildRecord(data));
  });
  return { mode: 'insert' };
}

export async function deleteSideRecipe(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
}

export async function resetAllSideRecipes() {
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
    components: Array.isArray(data.components) ? data.components.map(normalizeComponent) : [],
    note:       (data.note || '').trim(),
    updatedAt:  new Date().toISOString(),
  };
}

function normalizeComponent(c) {
  return {
    productCode:    (c.productCode || '').trim() || null,
    ingredientName: (c.ingredientName || '').trim(),
    quantity:       c.quantity != null && c.quantity !== '' ? Number(c.quantity) : null,
    unit:           (c.unit || 'g').trim(),
    unitPrice:      c.unitPrice != null && c.unitPrice !== '' ? Number(c.unitPrice) : null,
    note:           (c.note || '').trim(),
  };
}
