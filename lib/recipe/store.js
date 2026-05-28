/**
 * lib/recipe/store.js — cost_recipes CRUD
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   menuName      메뉴명
 *   menuCategory  카테고리 (피자, 1인피자, 파스타, 사이드, 음료, 기타)
 *   sizes         [{label:'L', sellingPrice:28000}, {label:'R', sellingPrice:18000}]
 *   ingredients   [{productCode, ingredientName, quantity, unitType, note}]
 *   note          비고
 *   updatedAt     ISO
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

function store(tx) { return tx.objectStore('cost_recipes'); }

export async function getAllRecipes() {
  if (!hasStore('cost_recipes')) return [];
  const rows = await getAll('cost_recipes');
  return rows.sort((a, b) => {
    const ca = a.menuCategory || 'ㅎ', cb = b.menuCategory || 'ㅎ';
    if (ca !== cb) return ca.localeCompare(cb, 'ko');
    return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
  });
}

/** @returns {Promise<number>} 저장된 레코드의 id */
export async function saveRecipe(data) {
  if (!hasStore('cost_recipes')) throw new Error('cost_recipes store 없음');
  const record = buildRecord(data);
  if (data.id) {
    const all = await getAll('cost_recipes');
    const existing = all.find(r => r.id === data.id);
    if (!existing) throw new Error('레시피를 찾을 수 없습니다');
    await runTransaction(['cost_recipes'], 'readwrite', tx => {
      store(tx).put({ ...existing, ...record, id: data.id });
    });
    return data.id;
  } else {
    // runTransaction resolves with the return value of work(tx);
    // IDBRequest.result (the new key) is accessible after tx.oncomplete
    const req = await runTransaction(['cost_recipes'], 'readwrite', tx => {
      return store(tx).add(record);
    });
    return req.result;
  }
}

export async function deleteRecipe(id) {
  if (!hasStore('cost_recipes')) throw new Error('cost_recipes store 없음');
  await runTransaction(['cost_recipes'], 'readwrite', tx => {
    store(tx).delete(id);
  });
}

function buildRecord(data) {
  return {
    menuName:     (data.menuName || '').trim(),
    menuCategory: (data.menuCategory || '').trim(),
    sizes: Array.isArray(data.sizes)
      ? data.sizes.map(s => ({
          label:        (s.label || '').trim(),
          sellingPrice: s.sellingPrice != null ? Number(s.sellingPrice) : null,
        })).filter(s => s.label)
      : [],
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.map(i => {
          // quantities: { L: number, R: number, ... } — 사이즈별 사용량
          const quantities = {};
          if (i.quantities && typeof i.quantities === 'object') {
            for (const [k, v] of Object.entries(i.quantities)) {
              const n = v !== '' && v != null ? Number(v) : null;
              quantities[k] = n;
            }
          }
          return {
            productCode:    i.productCode    || '',
            ingredientName: i.ingredientName || '',
            quantities,
            unitType:       i.unitType       || 'g',
            note:           i.note           || '',
          };
        }).filter(i => i.productCode)
      : [],
    note:      (data.note || '').trim(),
    updatedAt: new Date().toISOString(),
  };
}
