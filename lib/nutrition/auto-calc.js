/**
 * lib/nutrition/auto-calc.js — 레시피 구성 기반 영양성분 자동 계산
 *
 * cost_recipes 재료 × nutrition_ingredient_values 재료별 영양값 → 메뉴 영양성분(100g 기준)
 *
 * 핵심:
 * - 재료별 영양값은 100g/ml 기준 저장. 사용량(quantities[size])을 곱해 총합을 구한 뒤
 *   레시피 총중량으로 나눠 **100g 기준 가중평균**으로 정규화한다.
 *   (베이스 영양성분은 100g 기준 저장 → 출력에서 150g/총중량으로 환산하므로 정규화 필수)
 * - 사용량은 사이즈별(quantities: {L, R, ...})로 저장되므로 crust의 사이즈(L/R)에 맞춰 선택.
 * - 재료 매칭은 productCode(`code:`) 우선, ingredientName(`name:`) 폴백.
 *
 * nutrition_ingredient_values 스토어가 없거나 비어 있으면 빈 맵을 반환하고 UI가 안내를 표시한다.
 */

import { getAll, hasStore } from '@/lib/db';

/** 영양 필드 키 목록 (NUTRITION_FIELDS.key 기준, weight 제외) */
export const CALC_NUTRITION_KEYS = [
  'kcal', 'carbs', 'sugar', 'fat', 'satFat', 'transFat',
  'cholesterol', 'protein', 'sodium',
];

/** 재료명 정규화 (allergen/origin 모듈과 동일 규칙) */
const normStr = s => (s || '').trim().toLowerCase().replace(/\s+/g, '');

/** 레시피 재료에서 지정 사이즈 사용량을 추출 (없으면 다른 사이즈 → 구버전 quantity 폴백) */
function pickQuantity(ing, size) {
  const q = ing.quantities;
  if (q && typeof q === 'object') {
    const v = Number(q[size]);
    if (!isNaN(v) && v > 0) return v;
    for (const k of Object.keys(q)) {
      const n = Number(q[k]);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  const single = Number(ing.quantity);
  return !isNaN(single) && single > 0 ? single : 0;
}

/** 영양값 맵에서 재료 조회 — code: 우선, name: 폴백, 구버전 직접 키 폴백 */
function lookupNutrition(ing, map) {
  if (ing.productCode && map.has(`code:${ing.productCode}`)) return map.get(`code:${ing.productCode}`);
  const n = normStr(ing.ingredientName);
  if (n && map.has(`name:${n}`)) return map.get(`name:${n}`);
  if (ing.productCode && map.has(ing.productCode)) return map.get(ing.productCode);
  return null;
}

/**
 * 레시피 재료 목록과 재료별 영양값을 기반으로 100g 기준 영양성분 계산 (순수 함수)
 *
 * @param {Array<{productCode, ingredientName, quantities?, quantity?}>} ingredients
 * @param {Map<string, Object>} ingredientNutritionMap  `code:`/`name:` 키 (buildIngredientNutritionMap)
 * @param {string} [size='L']  crust 사이즈(L/R)
 * @returns {{ values: Object, totalGrams: number, matched: number, total: number }|null}
 */
export function calcNutritionFromComponents(ingredients, ingredientNutritionMap, size = 'L') {
  if (!ingredients?.length || !ingredientNutritionMap?.size) return null;

  const total = ingredients.length;
  const usable = ingredients
    .map(ing => ({ amount: pickQuantity(ing, size), nutr: lookupNutrition(ing, ingredientNutritionMap) }))
    .filter(x => x.amount > 0 && x.nutr);
  if (usable.length === 0) return null;

  const sum = {};
  CALC_NUTRITION_KEYS.forEach(k => { sum[k] = 0; });
  let totalGrams = 0;

  for (const { amount, nutr } of usable) {
    totalGrams += amount;
    CALC_NUTRITION_KEYS.forEach(k => {
      sum[k] += (Number(nutr[k]) || 0) * amount / 100;
    });
  }

  // 100g 기준 가중평균으로 정규화
  const values = {};
  CALC_NUTRITION_KEYS.forEach(k => {
    const per100 = totalGrams > 0 ? (sum[k] / totalGrams) * 100 : 0;
    values[k] = Math.round(per100 * 10) / 10;
  });

  return {
    values,
    totalGrams: Math.round(totalGrams * 10) / 10,
    matched: usable.length,
    total,
  };
}

/**
 * nutrition_ingredient_values 스토어에서 재료 영양값 맵을 빌드한다.
 * `code:${productCode}` 와 `name:${정규화이름}` 두 키로 등록.
 * 스토어가 없거나 비어 있으면 빈 맵을 반환한다.
 *
 * @returns {Promise<Map<string, Object>>}
 */
export async function buildIngredientNutritionMap() {
  try {
    if (!hasStore('nutrition_ingredient_values')) return new Map();
    const rows = await getAll('nutrition_ingredient_values').catch(() => []);
    const map = new Map();
    rows.forEach(r => {
      if (r.productCode) map.set(`code:${r.productCode}`, r);
      const n = normStr(r.ingredientName);
      if (n) map.set(`name:${n}`, r);
    });
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
 * @returns {Promise<Object|null>}
 */
export async function findRecipeForMenu(menuCode, menuName) {
  try {
    if (!hasStore('cost_recipes')) return null;
    const all = await getAll('cost_recipes').catch(() => []);
    if (!all.length) return null;

    if (menuCode) {
      const byCode = all.find(r => r.menuCode === menuCode);
      if (byCode) return byCode;
    }
    if (menuName) {
      const byName = all.find(r => r.menuName === menuName);
      if (byName) return byName;
    }
    return null;
  } catch {
    return null;
  }
}
