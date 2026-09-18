/**
 * lib/menu-master/readiness-coverage.js — 원산지·알레르기 실제 출력 커버리지
 *
 * readiness.js에서 분리(파일 크기 관리): "이 메뉴가 원산지/알레르기 표에 실제로 출력되는
 * 행을 갖는가"만 계산한다. buildOriginMenuRows/buildMenuMatrix(각 화면이 쓰는 것과 같은
 * 빌더)를 그대로 돌려 실제 출력 여부를 판정하므로, 화면과 readiness 판정이 항상 일치한다.
 */
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { buildOriginMenuRows } from '@/lib/nutrition/origin/build';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { asObjectArray } from '@/lib/ui/prop-guards';

/**
 * @param {{menus, ingredients, groups, edges, recipeArrays, toppings, compositions}} input
 * @returns {{ originReadyCodes: Set<string>, allergenReadyCodes: Set<string> }}
 */
export function buildNutritionOutputCoverage({
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
