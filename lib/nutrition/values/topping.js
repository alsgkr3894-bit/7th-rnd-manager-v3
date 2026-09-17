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

/**
 * 메뉴마스터(menu_master.menuName)와 영양 토핑 기준(nutrition_topping_master.toppingName)은
 * 서로 다른 화면에서 각자 입력되는 이름이라 공백 위치·대소문자만 다른 경우가 흔하다
 * (예: "페페로니 12장 (29g)" vs "페페로니12장(29g)"). 그대로 정확히 비교하면 실제로는
 * 영양성분이 등록돼 있는데도 메뉴마스터에 "영양 누락"으로 잘못 표시된다 — 토핑
 * 가져오기(topping-import.js)의 textKey와 같은 규칙으로 공백을 지우고 비교한다.
 * @param {string} value
 */
export function toppingNameMatchKey(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}
