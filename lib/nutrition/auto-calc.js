/**
 * lib/nutrition/auto-calc.js — 레시피 구성 기반 영양성분 자동 계산
 *
 * cost_recipes 재료 × nutrition_ingredient_values 재료별 영양값 → 메뉴 총 영양성분
 *
 * nutrition_ingredient_values 스토어는 현재 DB schema에 없으므로
 * 해당 스토어가 없거나 비어 있으면 빈 맵을 반환하고 UI가 "준비 중" 안내를 표시한다.
 */

import { getAll, hasStore } from '@/lib/db';

/**
 * 영양 필드 키 목록 (NUTRITION_FIELDS.key 기준, weight 제외)
 * lib/nutrition/values/store.js 의 NUTRITION_FIELDS 순서와 동일하게 유지
 */
export const CALC_NUTRITION_KEYS = [
  'kcal', 'carbs', 'sugar', 'fat', 'satFat', 'transFat',
  'cholesterol', 'protein', 'sodium',
];

/**
 * 레시피 재료 목록과 재료별 영양값을 기반으로 총 영양성분 계산 (순수 함수)
 *
 * @param {Array<{productCode: string, quantity: number|string}>} ingredients
 *   cost_recipes 의 ingredients 배열 — quantity 는 레시피 1회분 사용량(g 또는 ml)
 * @param {Map<string, Object>} ingredientNutritionMap
 *   productCode → 영양값 객체 (영양값은 100g/ml 기준으로 저장된 것으로 가정)
 * @returns {Object|null} 계산된 영양성분 객체 또는 null (계산 불가 시)
 */
export function calcNutritionFromComponents(ingredients, ingredientNutritionMap) {
  if (!ingredients?.length || !ingredientNutritionMap?.size) return null;

  // 매핑 가능한 재료가 하나도 없으면 null 반환
  const usable = ingredients.filter(
    ing => (Number(ing.quantity) || 0) > 0 && ingredientNutritionMap.has(ing.productCode),
  );
  if (usable.length === 0) return null;

  const result = {};
  CALC_NUTRITION_KEYS.forEach(k => { result[k] = 0; });

  for (const ing of usable) {
    const amount = Number(ing.quantity) || 0;
    const nutr = ingredientNutritionMap.get(ing.productCode);
    // 재료 영양값은 100g 기준 → amount / 100 × 영양값
    CALC_NUTRITION_KEYS.forEach(k => {
      result[k] += (Number(nutr[k]) || 0) * amount / 100;
    });
  }

  // 소수점 1자리 반올림
  CALC_NUTRITION_KEYS.forEach(k => {
    result[k] = Math.round(result[k] * 10) / 10;
  });

  return result;
}

/**
 * nutrition_ingredient_values 스토어에서 재료 영양값 맵을 빌드한다.
 * 스토어가 없거나 비어 있으면 빈 맵을 반환한다.
 *
 * @returns {Promise<Map<string, Object>>} productCode → 영양값 객체
 */
export async function buildIngredientNutritionMap() {
  try {
    if (!hasStore('nutrition_ingredient_values')) return new Map();
    const rows = await getAll('nutrition_ingredient_values').catch(() => []);
    const map = new Map();
    rows.forEach(r => { if (r.productCode) map.set(r.productCode, r); });
    return map;
  } catch {
    return new Map();
  }
}

/**
 * cost_recipes 스토어에서 특정 메뉴의 레시피를 찾는다.
 * menuCode 또는 menuName 으로 우선순위를 두어 매칭한다.
 *
 * @param {string} menuCode
 * @param {string} menuName
 * @returns {Promise<Object|null>} 매칭된 레시피 레코드 또는 null
 */
export async function findRecipeForMenu(menuCode, menuName) {
  try {
    if (!hasStore('cost_recipes')) return null;
    const all = await getAll('cost_recipes').catch(() => []);
    if (!all.length) return null;

    // 1순위: menuCode 정확 일치
    if (menuCode) {
      const byCode = all.find(r => r.menuCode === menuCode);
      if (byCode) return byCode;
    }

    // 2순위: menuName 정확 일치
    if (menuName) {
      const byName = all.find(r => r.menuName === menuName);
      if (byName) return byName;
    }

    return null;
  } catch {
    return null;
  }
}
