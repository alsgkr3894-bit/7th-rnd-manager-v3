/**
 * lib/nutrition/allergen/aggregate.js — 메뉴별 알레르기 집계 헬퍼 (출력 전용)
 *
 * allergen/page.jsx 의 menuMatrixAll 로직과 동일한 방식으로 구현.
 * ingredientToMenus 맵을 순회하며 식자재 키로 역참조 — 알레르기 페이지와 동일한 결과.
 */

import { ALLERGEN_SEED } from './store';
import { applyAllEdgeAllergenRules } from './rules';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const EMPTY_MENU_MAP = new Map();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);
const normStr = s => asDisplayText(s).trim().toLowerCase().replace(/\s+/g, '');
const codeToName = Object.fromEntries(
  asObjectArray(ALLERGEN_SEED).map(a => [
    asDisplayText(a.allergenCode),
    asDisplayText(a.allergenName),
  ])
);

const EDGE_TYPE_TO_NUTRITION_CODES = {
  치즈크러스트: edge => [`치즈크러스트${asDisplayText(edge.size) || 'L'}`],
  골드스윗크러스트: edge => [`골드스윗${asDisplayText(edge.size) || 'L'}`],
  씬도우: edge => {
    const size = asDisplayText(edge.size);
    return size ? [`씬바사삭${size}`] : ['씬바사삭L', '씬바사삭R'];
  },
};

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
export function buildMenuAllergenMap({ ingredients, ingredientToMenus } = {}) {
  // 알레르기 있는 식자재를 code:/name: 양쪽 키로 인덱싱 (알레르기 페이지와 동일)
  const ingByKey = new Map();
  for (const ing of asObjectArray(ingredients)) {
    const allergenCodes = asStringArray(ing.allergens);
    if (!allergenCodes.length || ing.discontinued || ing.excluded) continue;
    const productCode = asDisplayText(ing.productCode);
    if (productCode) ingByKey.set(`code:${productCode}`, ing);
    const n = normStr(ing.ingredientName);
    if (n) ingByKey.set(`name:${n}`, ing);
  }

  const map = new Map(); // menuCode → Set<allergenCode>

  // ingredientToMenus 순회 — 각 키로 식자재를 찾아 allergen 추가
  for (const [key, menus] of asMenuMap(ingredientToMenus)) {
    if (!(menus instanceof Map)) continue;
    const ing = ingByKey.get(key);
    if (!ing) continue;
    for (const [menuCode] of menus) {
      if (!map.has(menuCode)) map.set(menuCode, new Set());
      asStringArray(ing.allergens).forEach(code => map.get(menuCode).add(code));
    }
  }

  return map;
}

/**
 * 엣지·도우 구성품 알레르기 → nutrition edgeCode별 allergenCode Set.
 *
 * cost_edge_dough의 edgeType/size 체계를 nutrition_edge_master의 edgeCode
 * (치즈크러스트L, 골드스윗R, 씬바사삭L/R)로 변환해 영양성분표 행별 알레르기에 합산한다.
 *
 * @param {object} opts
 * @param {Array} opts.ingredients - cost_ingredients 목록
 * @param {Array} opts.edges       - cost_edge_dough 목록
 * @returns {Map<string, Set<string>>} nutritionEdgeCode → Set<allergenCode>
 */
export function buildEdgeAllergenMap({ ingredients, edges } = {}) {
  const ingByKey = new Map();
  for (const ing of asObjectArray(ingredients)) {
    const allergenCodes = asStringArray(ing.allergens);
    if (!allergenCodes.length || ing.discontinued || ing.excluded) continue;
    const productCode = asDisplayText(ing.productCode);
    if (productCode) ingByKey.set(`code:${productCode}`, ing);
    const n = normStr(ing.ingredientName);
    if (n) ingByKey.set(`name:${n}`, ing);
  }

  const map = new Map();
  for (const edge of asObjectArray(edges)) {
    const edgeType = asDisplayText(edge.edgeType);
    const toCodes = EDGE_TYPE_TO_NUTRITION_CODES[edgeType];
    if (!toCodes) continue;
    const targetCodes = toCodes(edge).filter(Boolean);
    if (!targetCodes.length) continue;
    for (const code of targetCodes) {
      if (!map.has(code)) map.set(code, new Set());
    }
    for (const component of asObjectArray(edge.components)) {
      const productCode = asDisplayText(component.productCode);
      const key = productCode
        ? `code:${productCode}`
        : `name:${normStr(component.ingredientName)}`;
      const ing = ingByKey.get(key);
      if (!ing) continue;
      for (const allergenCode of asStringArray(ing.allergens)) {
        targetCodes.forEach(code => map.get(code).add(allergenCode));
      }
    }
  }

  return applyAllEdgeAllergenRules(map);
}

/**
 * allergenCode Set → 쉼표 구분 알레르기명 문자열 (없으면 '')
 */
export function allergenNames(codeSet) {
  if (!(codeSet instanceof Set) || !codeSet.size) return '';
  return [...codeSet]
    .map(code => asDisplayText(code))
    .filter(Boolean)
    .map(code => codeToName[code] || code)
    .join(', ');
}
