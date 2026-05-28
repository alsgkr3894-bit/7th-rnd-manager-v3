/**
 * lib/nutrition/origin/store.js — nutrition_origin_master CRUD
 *
 * cost_ingredients 식재료와 연결 후 원산지 정보 관리.
 *
 * 레코드 구조:
 *   id              autoIncrement PK
 *   ingredientId    cost_ingredients.id (연결 기준)
 *   productCode     제때 제품코드 (null 가능)
 *   ingredientName  원래 재료명 (cost_ingredients 기준)
 *   displayName     출력용 표기명 (별도 지정 가능, e.g. '밀가루' → '밀')
 *   originCountry   원산지 국가 (e.g. '미국', '국내산')
 *   originRegion    원산지 세부 (선택)
 *   note            비고
 *   displayOrder    정렬 순서
 *   updatedAt       ISO string
 */

import { getAll, put, deleteById, hasStore } from '@/lib/db';

const STORE = 'nutrition_origin_master';

export async function getAllOrigins() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko'));
}

/** ingredientId → origin 레코드 맵 */
export async function getOriginByIngredientId(ingredientId) {
  if (!hasStore(STORE)) return null;
  const rows = await getAll(STORE);
  return rows.find(r => r.ingredientId === ingredientId) || null;
}

export async function upsertOrigin(data) {
  return await put(STORE, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteOrigin(id) {
  return await deleteById(STORE, id);
}
