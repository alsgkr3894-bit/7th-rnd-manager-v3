/**
 * lib/cost/pizza-detail/store.js — cost_pizza_detail CRUD
 *
 * 레코드 구조:
 *   id          autoIncrement PK
 *   menuCode    'PZ-001-L' 등 (메뉴 판매가의 menuCode와 매칭)
 *   menuName    '슈퍼콤비네이션' (편의상 캐시)
 *   size        'L' | 'R'
 *   components  [{ productCode?, ingredientName, quantity, unit, unitPrice, note? }]
 *   note        string
 *   updatedAt   ISO
 *
 * 엣지·도우는 별도 store (cost_edge_dough) — 종합 원가표에서 합산.
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

const STORE = 'cost_pizza_detail';
const s = (tx) => tx.objectStore(STORE);

export async function getAllPizzaRecipes() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.menuCode || '').localeCompare(b.menuCode || ''));
}

/** menuCode → recipe Map (있으면 1개) */
export async function getPizzaRecipeMap() {
  const rows = await getAllPizzaRecipes();
  return new Map(rows.filter(r => r.menuCode).map(r => [r.menuCode, r]));
}

/**
 * upsert — menuCode 기준.
 * id가 있으면 기존 갱신, 없으면 menuCode 중복 검사 후 추가.
 */
export async function upsertPizzaRecipe(data) {
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
    // menuCode 중복 → 기존 항목 갱신
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

export async function deletePizzaRecipe(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  await runTransaction([STORE], 'readwrite', tx => {
    s(tx).delete(id);
  });
}

export async function resetAllPizzaRecipes() {
  if (!hasStore(STORE)) return { deleted: 0 };
  const all = await getAll(STORE);
  const count = all.length;
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).clear();
  });
  return { deleted: count };
}

// ── 내부 ──────────────────────────────────────────────

function buildRecord(data) {
  return {
    menuCode:   (data.menuCode || '').trim(),
    menuName:   (data.menuName || '').trim(),
    size:       (data.size     || '').trim(),
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
