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
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/** 영양 필드 키 목록 (NUTRITION_FIELDS.key 기준, weight 제외) */
export const CALC_NUTRITION_KEYS = [
  'kcal',
  'carbs',
  'sugar',
  'fat',
  'satFat',
  'transFat',
  'cholesterol',
  'protein',
  'sodium',
];

/** 재료명 정규화 (allergen/origin 모듈과 동일 규칙) */
const normStr = s => asDisplayText(s).trim().toLowerCase().replace(/\s+/g, '');

/** 레시피 재료에서 지정 사이즈 사용량을 추출 (없으면 다른 사이즈 → 구버전 quantity 폴백) */
function pickQuantity(ing, size) {
  if (!ing || typeof ing !== 'object') return 0;
  const q = ing.quantities;
  if (q && typeof q === 'object') {
    const v = Number(q[asDisplayText(size)]);
    if (Number.isFinite(v) && v > 0) return v;
    for (const k of Object.keys(q)) {
      const n = Number(q[k]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const single = Number(ing.quantity);
  return Number.isFinite(single) && single > 0 ? single : 0;
}

/** 영양값 맵에서 재료 조회 — code: 우선, name: 폴백, 구버전 직접 키 폴백 */
function lookupNutrition(ing, map) {
  if (!ing || typeof ing !== 'object' || !(map instanceof Map)) return null;
  const productCode = asDisplayText(ing.productCode);
  if (productCode && map.has(`code:${productCode}`)) return map.get(`code:${productCode}`);
  const n = normStr(ing.ingredientName);
  if (n && map.has(`name:${n}`)) return map.get(`name:${n}`);
  if (productCode && map.has(productCode)) return map.get(productCode);
  return null;
}

function pickStrictQuantity(ing, size) {
  if (!ing || typeof ing !== 'object') return 0;
  const safeSize = asDisplayText(size) === 'R' ? 'R' : 'L';
  const q = ing.quantities;
  if (q && typeof q === 'object') {
    const v = Number(q[safeSize]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }
  const key = safeSize === 'R' ? 'rAmount' : 'lAmount';
  const v = Number(ing[key]);
  return Number.isFinite(v) && v > 0 ? v : 0;
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
  const safeIngredients = asObjectArray(ingredients);
  if (
    !safeIngredients.length ||
    !(ingredientNutritionMap instanceof Map) ||
    !ingredientNutritionMap.size
  ) {
    return null;
  }

  const total = safeIngredients.length;
  // 사용량(quantity)이 있는 재료 전체 — 분모(한판 총중량)는 영양DB 미매칭 재료도 포함
  const withQty = safeIngredients
    .map(ing => ({
      amount: pickQuantity(ing, size),
      nutr: lookupNutrition(ing, ingredientNutritionMap),
    }))
    .filter(x => x.amount > 0);
  const usable = withQty.filter(x => x.nutr); // 영양값 매칭된 재료만 합산
  if (usable.length === 0) return null;

  const sum = {};
  CALC_NUTRITION_KEYS.forEach(k => {
    sum[k] = 0;
  });
  for (const { amount, nutr } of usable) {
    CALC_NUTRITION_KEYS.forEach(k => {
      sum[k] += ((Number(nutr[k]) || 0) * amount) / 100;
    });
  }

  // 분모 = 사용량 있는 전체 재료 중량(미매칭 포함) → 한판 총중량이자 100g 정규화 기준.
  // 미매칭 재료는 영양값 0으로 간주되어 과소평가될 수 있음(matched/total로 사용자에 노출).
  const totalGrams = withQty.reduce((s, x) => s + x.amount, 0);
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
 * 사용자가 직접 입력한 L/R 투입량으로 식자재 영양값을 계산한다.
 * 레시피 자동계산과 달리 요청 사이즈에 수량이 없으면 반대 사이즈로 폴백하지 않는다.
 *
 * @param {Array<{productCode, ingredientName, lAmount?, rAmount?, quantities?}>} ingredients
 * @param {Map<string, Object>} ingredientNutritionMap
 * @param {'L'|'R'} [size='L']
 * @returns {{ values: Object, totalGrams: number, matched: number, total: number }|null}
 */
export function calcNutritionFromIngredientAmounts(ingredients, ingredientNutritionMap, size = 'L') {
  const safeSize = asDisplayText(size) === 'R' ? 'R' : 'L';
  const components = asObjectArray(ingredients).map(ing => ({
    productCode: ing.productCode,
    ingredientName: ing.ingredientName,
    quantities: {
      [safeSize]: pickStrictQuantity(ing, safeSize),
    },
  }));
  return calcNutritionFromComponents(components, ingredientNutritionMap, safeSize);
}

export function buildIngredientNutritionMapFromRows(rows) {
  const map = new Map();
  asObjectArray(rows).forEach(r => {
    const productCode = asDisplayText(r.productCode);
    if (productCode) map.set(`code:${productCode}`, r);
    const n = normStr(r.ingredientName);
    if (n) map.set(`name:${n}`, r);
  });
  return map;
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
    return buildIngredientNutritionMapFromRows(rows);
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
    const all = asObjectArray(await getAll('cost_recipes').catch(() => []));
    if (!all.length) return null;

    const safeMenuCode = asDisplayText(menuCode);
    const safeMenuName = asDisplayText(menuName);
    if (safeMenuCode) {
      const byCode = all.find(r => asDisplayText(r.menuCode) === safeMenuCode);
      if (byCode) return byCode;
    }
    if (safeMenuName) {
      const byName = all.find(r => asDisplayText(r.menuName) === safeMenuName);
      if (byName) return byName;
    }
    return null;
  } catch {
    return null;
  }
}
