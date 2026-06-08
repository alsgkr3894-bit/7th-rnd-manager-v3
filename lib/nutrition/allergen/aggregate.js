/**
 * lib/nutrition/allergen/aggregate.js — 메뉴별 알레르기 집계 헬퍼 (출력 전용)
 *
 * allergen/page.jsx 의 menuMatrixAll 로직과 동일한 방식으로 구현.
 * ingredientToMenus 맵을 순회하며 식자재 키로 역참조 — 알레르기 페이지와 동일한 결과.
 */

import { ALLERGEN_SEED } from './store';

const normStr = s => (s || '').trim().toLowerCase().replace(/\s+/g, '');
const codeToName = Object.fromEntries(ALLERGEN_SEED.map(a => [a.allergenCode, a.allergenName]));

/**
 * 식자재 목록 + ingredientToMenus 맵 → menuCode별 allergenCode Set 반환.
 *
 * allergen/page.jsx의 menuMatrixAll 로직과 동일하게:
 *   "ingByKey 맵 구성 → ingredientToMenus 순회 → 식자재 역참조"
 *
 * @param {object} opts
 * @param {Array}  opts.ingredients    - cost_ingredients 목록
 * @param {Map}    opts.ingredientToMenus - buildIngredientMenuMap() 결과의 ingredientToMenus
 * @returns {Map<string, Set<string>>} menuCode → Set<allergenCode>
 */
export function buildMenuAllergenMap({ ingredients, ingredientToMenus }) {
  // 알레르기 있는 식자재를 code:/name: 양쪽 키로 인덱싱 (알레르기 페이지와 동일)
  const ingByKey = new Map();
  for (const ing of ingredients) {
    if (!ing.allergens?.length || ing.discontinued || ing.excluded) continue;
    if (ing.productCode) ingByKey.set(`code:${ing.productCode}`, ing);
    const n = normStr(ing.ingredientName);
    if (n) ingByKey.set(`name:${n}`, ing);
  }

  const map = new Map(); // menuCode → Set<allergenCode>

  // ingredientToMenus 순회 — 각 키로 식자재를 찾아 allergen 추가
  for (const [key, menus] of ingredientToMenus) {
    const ing = ingByKey.get(key);
    if (!ing) continue;
    for (const [menuCode] of menus) {
      if (!map.has(menuCode)) map.set(menuCode, new Set());
      ing.allergens.forEach(code => map.get(menuCode).add(code));
    }
  }

  return map;
}

/**
 * allergenCode Set → 쉼표 구분 알레르기명 문자열 (없으면 '')
 */
export function allergenNames(codeSet) {
  if (!codeSet?.size) return '';
  return [...codeSet]
    .map(code => codeToName[code] || code)
    .join(', ');
}
