/**
 * lib/menu-master/readiness.js — 메뉴별 출시 준비 상태 계산
 *
 * 각 메뉴가 출시 가능한 상태인지 8개 차원을 체크한다.
 * 상태: 'ok' | 'warn' | 'missing' | 'unknown'
 */
import { hasStore } from '@/lib/db';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { getAllRawValues } from '@/lib/nutrition/values/raw-values';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllCompositions, getAllToppings } from '@/lib/nutrition/values/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { buildOriginMenuRows } from '@/lib/nutrition/origin/build';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { MENU_RECIPE_SUMMARY_STATUS } from './recipe-summary';
import { asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

/** 출시 준비 차원 정의 */
export const READINESS_DIMS = [
  { id: 'basic', label: '기본정보', href: null },
  { id: 'price', label: '판매가', href: null },
  { id: 'recipe', label: '레시피 구성품', href: null },
  { id: 'costRate', label: '원가율 계산', href: null },
  { id: 'nutrition', label: '영양성분', href: '/nutrition/menu' },
  { id: 'origin', label: '원산지 출력', href: '/nutrition/origin' },
  { id: 'allergen', label: '알레르기 출력', href: '/nutrition/allergen' },
];

/**
 * @typedef {'ok'|'warn'|'missing'|'unknown'} ReadinessStatus
 * @typedef {{ status: ReadinessStatus, detail?: string }} DimResult
 * @typedef {{ menuCode: string, dims: Record<string, DimResult>, overall: ReadinessStatus }} MenuReadiness
 */

function worstStatus(statuses) {
  const rank = { ok: 0, unknown: 1, warn: 2, missing: 3 };
  return statuses.reduce((worst, s) => (rank[s] > rank[worst] ? s : worst), 'ok');
}

function overallFromDims(dims) {
  return worstStatus(Object.values(dims).map(d => d.status));
}

/** 기본 정보 (menuName, menuCode, category) */
function checkBasic(menu) {
  if (!menu.menuName || !menu.menuCode || !menu.category) {
    return { status: 'missing', detail: '메뉴명·코드·카테고리 중 누락이 있습니다' };
  }
  return { status: 'ok' };
}

/** 판매가 */
function checkPrice(menuCode, priceMap) {
  const entry = priceMap.get(menuCode);
  const price = asFiniteNumber(entry?.price, null) ?? asFiniteNumber(entry?.sellingPrice, null);
  if (!entry) return { status: 'missing', detail: '판매가가 등록되지 않았습니다' };
  if (!price || price <= 0) return { status: 'warn', detail: '판매가가 0 이하입니다' };
  return { status: 'ok', detail: `${price.toLocaleString()}원` };
}

/** 레시피 구성품 (recipeSummaryMap 활용) */
function checkRecipe(menuCode, recipeSummaryMap) {
  const summary = recipeSummaryMap.get(menuCode);
  if (!summary) return { status: 'unknown', detail: '레시피 데이터 없음' };
  const { status, hasRecipe, missingPriceCount, missingQuantityCount } = summary;
  if (status === MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED)
    return { status: 'unknown', detail: '이 카테고리는 레시피 미지원' };
  if (!hasRecipe || status === MENU_RECIPE_SUMMARY_STATUS.MISSING)
    return { status: 'missing', detail: '레시피 구성품 없음' };
  if (missingQuantityCount > 0)
    return { status: 'warn', detail: `수량 미입력 ${missingQuantityCount}개` };
  if (missingPriceCount > 0)
    return { status: 'warn', detail: `단가 없는 식자재 ${missingPriceCount}개` };
  return { status: 'ok' };
}

/** 원가율 계산 가능 여부 (레시피 READY이고 판매가 있으면 ok) */
function checkCostRate(recipeResult, priceResult) {
  if (recipeResult.status === 'unknown')
    return { status: 'unknown', detail: '레시피 미지원 카테고리' };
  if (recipeResult.status === 'missing') return { status: 'missing', detail: '레시피 필요' };
  if (recipeResult.status === 'warn') return { status: 'warn', detail: '레시피 완성 필요' };
  if (priceResult.status === 'missing') return { status: 'missing', detail: '판매가 필요' };
  if (priceResult.status === 'warn') return { status: 'warn', detail: '판매가 확인 필요' };
  return { status: 'ok' };
}

/** 영양성분 (nutrition_raw_values에 menuCode가 있으면 ok) */
function checkNutrition(menuCode, rawValueMenuCodes) {
  if (!rawValueMenuCodes.has(menuCode)) {
    return { status: 'missing', detail: '영양성분 값 미입력' };
  }
  return { status: 'ok' };
}

/** 원산지 출력 가능 (실제 메뉴별 원산지 출력 row가 있으면 ok) */
function checkOrigin(menuCode, originReadyCodes) {
  if (!originReadyCodes.has(menuCode)) {
    return { status: 'missing', detail: '원산지 데이터 없음' };
  }
  return { status: 'ok' };
}

/** 알레르기 (실제 메뉴별 알레르기 출력 row가 있으면 ok) */
function checkAllergen(menuCode, allergenReadyCodes) {
  if (!allergenReadyCodes.has(menuCode)) {
    return { status: 'missing', detail: '알레르기 데이터 없음' };
  }
  return { status: 'ok' };
}

async function loadOptional(storeName, loader) {
  if (!hasStore(storeName)) return [];
  return loader().catch(() => []);
}

function buildNutritionOutputCoverage({
  menus,
  ingredients,
  groups,
  edges,
  recipeArrays,
  toppings,
  compositions,
}) {
  const safeMenus = asObjectArray(menus);
  const safeIngredients = asObjectArray(ingredients);
  const safeEdges = asObjectArray(edges);
  const safeToppings = asObjectArray(toppings);
  const detailRecipes = tagDetailRecipes(
    asObjectArray(recipeArrays?.pizza),
    asObjectArray(recipeArrays?.personal),
    asObjectArray(recipeArrays?.side),
    asObjectArray(recipeArrays?.set)
  );

  const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(safeMenus);
  const isExcludedMenu = (menuCode, menuName) =>
    excludedMenuCodes.has(menuCode) ||
    excludedMenuCodes.has(String(menuCode ?? '').trim()) ||
    excludedMenuNames.has(String(menuName ?? '').trim());

  const mapData = buildIngredientMenuMap({
    menuMasters: safeMenus,
    detailRecipes,
    groups: asObjectArray(groups),
    edges: safeEdges,
    compositions: asObjectArray(compositions),
  });

  const originIngredients = safeIngredients.filter(
    ingredient =>
      asObjectArray(ingredient?.origin).length &&
      !ingredient?.discontinued &&
      !ingredient?.excluded &&
      ingredient?.originHidden !== true
  );
  const originRows = buildOriginMenuRows(originIngredients, mapData, isExcludedMenu, [], {});
  const originReadyCodes = new Set(
    originRows
      .filter(row => asObjectArray(row?.origins).length > 0)
      .map(row => row.menuCode)
      .filter(Boolean)
  );

  const allergenIngredients = safeIngredients.filter(
    ingredient =>
      Array.isArray(ingredient?.allergens) &&
      ingredient.allergens.length > 0 &&
      !ingredient?.discontinued &&
      !ingredient?.excluded
  );
  const allergenRows = buildMenuMatrix(
    allergenIngredients,
    mapData,
    safeEdges,
    isExcludedMenu,
    [],
    {},
    safeToppings
  );
  const allergenReadyCodes = new Set();
  allergenRows
    .filter(row => row?.allergenCodes instanceof Set && row.allergenCodes.size > 0)
    .forEach(row => {
      if (row.menuCode) allergenReadyCodes.add(row.menuCode);
      asObjectArray(row.sourceMenuCodes).forEach(code => {
        if (code) allergenReadyCodes.add(code);
      });
    });

  return { originReadyCodes, allergenReadyCodes };
}

/**
 * 모든 메뉴의 출시 준비 상태를 일괄 계산한다.
 *
 * @param {object[]} menus - getAllMenuMaster() 결과
 * @param {Map} recipeSummaryMap - loadMenuRecipeSummaryMap() 결과
 * @returns {Promise<Map<string, MenuReadiness>>} menuCode → readiness
 */
export async function buildMenuReadinessMap(menus, recipeSummaryMap = new Map()) {
  // 병렬 로드
  const [prices, rawValues, ingredients, groups, edges, recipeArrays, toppings, compositions] =
    await Promise.all([
      loadOptional('cost_selling_prices', getAllMenuPrices),
      loadOptional('nutrition_raw_values', getAllRawValues),
      loadOptional('cost_ingredients', getAllIngredients),
      loadOptional('cost_recipe_groups', getAllRecipeGroups),
      loadOptional('cost_edge_dough', getAllEdges),
      hasStore('menu_recipes')
        ? loadMenuRecipeArrays().catch(() => ({ pizza: [], personal: [], side: [], set: [] }))
        : Promise.resolve({ pizza: [], personal: [], side: [], set: [] }),
      loadOptional('nutrition_topping_master', getAllToppings),
      loadOptional('nutrition_pizza_composition', getAllCompositions),
    ]);

  // 인덱스 빌드
  const priceMap = new Map();
  asObjectArray(prices).forEach(p => {
    if (p.menuCode) priceMap.set(p.menuCode, p);
  });

  const rawValueMenuCodes = new Set(
    asObjectArray(rawValues)
      .filter(r => r.menuCode)
      .map(r => r.menuCode)
  );

  const { originReadyCodes, allergenReadyCodes } = buildNutritionOutputCoverage({
    menus,
    ingredients,
    groups,
    edges,
    recipeArrays,
    toppings,
    compositions,
  });

  // 메뉴별 계산
  const result = new Map();
  for (const menu of menus) {
    const mc = menu.menuCode;
    if (!mc) continue;

    const basic = checkBasic(menu);
    const price = checkPrice(mc, priceMap);
    const recipe = checkRecipe(mc, recipeSummaryMap);
    const costRate = checkCostRate(recipe, price);
    const nutrition = checkNutrition(mc, rawValueMenuCodes);
    const origin = checkOrigin(mc, originReadyCodes);
    const allergen = checkAllergen(mc, allergenReadyCodes);

    const dims = { basic, price, recipe, costRate, nutrition, origin, allergen };
    const overall = overallFromDims(dims);
    result.set(mc, { menuCode: mc, menu, dims, overall });
  }

  return result;
}

/** overall status별 표시 텍스트 */
export const OVERALL_LABEL = {
  ok: { text: '출시 가능', color: 'var(--positive)' },
  warn: { text: '확인 필요', color: 'var(--warn)' },
  missing: { text: '미작성', color: 'var(--negative)' },
  unknown: { text: '확인 불가', color: 'var(--text-3)' },
};

export const DIM_STATUS_LABEL = {
  ok: { icon: '✅', color: 'var(--positive)' },
  warn: { icon: '⚠️', color: 'var(--warn)' },
  missing: { icon: '❌', color: 'var(--negative)' },
  unknown: { icon: '❓', color: 'var(--text-3)' },
};
