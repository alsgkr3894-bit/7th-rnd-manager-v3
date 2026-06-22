/**
 * lib/nutrition/values/topping.js — nutrition_topping_master CRUD
 */
import { getAll, deleteById, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { byDisplayOrder, cleanKey, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

export async function getAllToppings() {
  if (!hasStore('nutrition_topping_master')) return [];
  const rows = await getAll('nutrition_topping_master');
  return rows.sort(byDisplayOrder);
}

export async function upsertTopping(data) {
  await assertActiveAdmin('영양 토핑 기준 저장');
  const toppingCode = cleanKey(data?.toppingCode);
  if (!toppingCode) return upsertWithTimestamp('nutrition_topping_master', data);
  return upsertUniqueByIndex('nutrition_topping_master', 'toppingCode', toppingCode, {
    ...data,
    toppingCode,
  });
}

export async function deleteTopping(id) {
  await assertActiveAdmin('영양 토핑 기준 삭제');
  return deleteById('nutrition_topping_master', id);
}
