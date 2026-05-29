/**
 * lib/cost/recipe-groups/store.js — cost_recipe_groups CRUD
 *
 * 레코드 구조:
 *   id                autoIncrement PK
 *   name              묶음 이름 (예: '피자L 공통', '피자LR 공통')
 *   description       설명 (선택)
 *   sizes             사용하는 사이즈 레이블 배열 (예: ['L', 'R'])
 *   defaultCategories 자동 적용할 메뉴 카테고리 배열
 *   ingredients       [{ productCode, ingredientName, quantities:{L,R,...}, unitType }]
 *   updatedAt         ISO string
 */

import { getAll, put, deleteById, hasStore } from '@/lib/db';

const STORE = 'cost_recipe_groups';

export async function getAllRecipeGroups() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
}

export async function saveRecipeGroup(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const record = { ...data, updatedAt: new Date().toISOString() };
  if (record.id == null) delete record.id;
  return await put(STORE, record);
}

export async function deleteRecipeGroup(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  return await deleteById(STORE, id);
}
