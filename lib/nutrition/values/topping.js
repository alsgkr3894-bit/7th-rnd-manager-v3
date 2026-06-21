/**
 * lib/nutrition/values/topping.js — nutrition_topping_master CRUD
 */
import { getAll, deleteById, hasStore } from '@/lib/db';
import { byDisplayOrder, cleanKey, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

export async function getAllToppings() {
  if (!hasStore('nutrition_topping_master')) return [];
  const rows = await getAll('nutrition_topping_master');
  return rows.sort(byDisplayOrder);
}

export async function upsertTopping(data) {
  const toppingCode = cleanKey(data?.toppingCode);
  if (!toppingCode) return upsertWithTimestamp('nutrition_topping_master', data);
  return upsertUniqueByIndex('nutrition_topping_master', 'toppingCode', toppingCode, {
    ...data,
    toppingCode,
  });
}

export async function deleteTopping(id) {
  return deleteById('nutrition_topping_master', id);
}
