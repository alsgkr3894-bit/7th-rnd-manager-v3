/**
 * lib/nutrition/values/composition.js — nutrition_pizza_composition CRUD
 *
 * 파생 메뉴(베이스 조합으로 만들어지는 메뉴) 레코드 관리.
 */
import { getAll, deleteById, hasStore } from '@/lib/db';
import { byDisplayOrder, upsertWithTimestamp } from './shared';

export async function getAllCompositions() {
  if (!hasStore('nutrition_pizza_composition')) return [];
  const rows = await getAll('nutrition_pizza_composition');
  return rows.sort(byDisplayOrder);
}

export async function upsertComposition(data) {
  return upsertWithTimestamp('nutrition_pizza_composition', data);
}

export async function deleteComposition(id) {
  return deleteById('nutrition_pizza_composition', id);
}
