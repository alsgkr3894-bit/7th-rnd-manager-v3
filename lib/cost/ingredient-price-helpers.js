/**
 * lib/cost/ingredient-price-helpers.js — 식자재 단가 페이지 데이터 빌드 헬퍼
 *
 * UI에 의존하지 않는 순수 계산 함수만 포함.
 * 테스트 가능하도록 사이드이펙트(setState, toast) 없음.
 */

import { resolveCompositePrice } from './composite-price';
import { buildIngredientMenuMap } from './ingredient-menu-map';
import {
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSetCategory,
  isSideCategory,
} from '@/lib/menu-master/category-policy';
import { MENU_CATEGORY } from '@/lib/menu-categories';

function normalizeIngName(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '');
}

function stripSizeLabel(name) {
  return (name || '').replace(/\s+[LR]$/i, '').trim();
}

/**
 * 4개 레시피 스토어에서 식자재별 사용 메뉴 맵을 빌드한다.
 *
 * @param {object} params
 * @param {Array}  params.allMeta       - 전체 식자재 마스터
 * @param {Array}  params.pizzaRecs     - 피자 세부 레시피
 * @param {Array}  params.personalRecs  - 1인피자 세부 레시피
 * @param {Array}  params.sideRecs      - 사이드 세부 레시피
 * @returns {{ byCode: Map, byName: Map }}
 *   byCode: productCode → Map<menuName, topCategory>
 *   byName: normalizedIngName → Map<menuName, topCategory>
 */
/**
 * compositeOf 코드 배열에서 제때 단가를 합산해 반환한다.
 *
 * 일부 코드에 단가가 없어도 존재하는 단가를 모두 합산한다 (partial-sum 허용).
 * 합산 결과가 0이면 null을 반환한다.
 *
 * @param {string[]} compositeOf  - 구성 상품코드 배열
 * @param {Map<string, { priceWithTax: number }>} priceLookup
 *   - productCode → 가격행 (priceWithTax 필드 사용)
 * @returns {number|null}  합산 단가, 또는 합산 결과가 0이면 null
 */
export function sumCompositePrice(compositeOf, priceLookup) {
  return resolveCompositePrice(compositeOf, priceLookup, { mode: 'partial' }).priceWithTax;
}

function usageCategory(category) {
  if (isPersonalPizzaCategory(category)) return MENU_CATEGORY.PERSONAL;
  if (isPizzaCategory(category, { includePersonal: false })) return MENU_CATEGORY.PIZZA;
  if (isSideCategory(category)) return MENU_CATEGORY.SIDE;
  if (isSetCategory(category)) return MENU_CATEGORY.SET;
  return MENU_CATEGORY.ETC;
}

function recipeRows({ detailRecipes = [], pizzaRecs = [], personalRecs = [], sideRecs = [] }) {
  if (detailRecipes.length > 0) return detailRecipes;
  return [
    ...pizzaRecs.map(row => ({ ...row, category: row.category || MENU_CATEGORY.PIZZA })),
    ...personalRecs.map(row => ({ ...row, category: row.category || MENU_CATEGORY.PERSONAL })),
    ...sideRecs.map(row => ({ ...row, category: row.category || MENU_CATEGORY.SIDE })),
  ];
}

function masterRowsFromRecipes(recipes) {
  return recipes
    .filter(row => row?.menuCode)
    .map(row => ({
      menuCode: row.menuCode,
      menuName: row.menuName,
      category: row.category,
    }));
}

export function buildIngredientUsageMap({
  pizzaRecs = [],
  personalRecs = [],
  sideRecs = [],
  menuMasters = [],
  detailRecipes = [],
  groups = [],
  edges = [],
  compositions = [],
} = {}) {
  const byCode = new Map();
  const byName = new Map();
  const recipes = recipeRows({ detailRecipes, pizzaRecs, personalRecs, sideRecs });
  const { ingredientToMenus } = buildIngredientMenuMap({
    menuMasters: menuMasters.length > 0 ? menuMasters : masterRowsFromRecipes(recipes),
    detailRecipes: recipes,
    groups,
    edges,
    compositions,
  });

  function addUsage(targetMap, key, menuName, category) {
    if (!menuName) return;
    const menu = stripSizeLabel(menuName);
    if (!targetMap.has(key)) targetMap.set(key, new Map());
    targetMap.get(key).set(menu, usageCategory(category));
  }

  for (const [ingredientKey, menus] of ingredientToMenus) {
    const [kind, ...rest] = String(ingredientKey).split(':');
    const key = rest.join(':');
    if (!key) continue;
    const targetMap = kind === 'code' ? byCode : kind === 'name' ? byName : null;
    if (!targetMap) continue;
    for (const [menuCode, menu] of menus) {
      addUsage(targetMap, key, menu?.menuName || menuCode, menu?.category);
    }
  }

  return { byCode, byName };
}
