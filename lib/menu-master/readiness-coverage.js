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
import { buildOriginMenuRows, filterOriginOutputIngredients } from '@/lib/nutrition/origin/build';
import {
  buildIngredientLookup,
  findIngredientByComponent,
  markShadowedNames,
} from '@/lib/nutrition/allergen/ingredient-lookup';
import { groupAppliesToMenu, normalizeRecipeGroupIds } from '@/lib/cost/recipe-groups/effective';
import { hasNoAllergenToShow, hasNoOriginToShow } from '@/lib/ingredient/origin-allergen-text';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

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
    asObjectArray(recipeArrays?.set),
    asObjectArray(recipeArrays?.topping)
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

  // 단종·제외 식자재도 레시피에 남아 있으면 출력에 들어가므로 함께 본다.
  const originIngredients = filterOriginOutputIngredients(
    safeIngredients,
    mapData.ingredientToMenus,
    isExcludedMenu
  ).filter(ingredient => ingredient.originHidden !== true);
  const originRows = buildOriginMenuRows(originIngredients, mapData, isExcludedMenu, [], {});
  const originReadyCodes = new Set(
    originRows
      .filter(row => asObjectArray(row?.origins).length > 0)
      .map(row => row.menuCode)
      .filter(Boolean)
  );

  const allergenIngredients = markShadowedNames(safeIngredients).filter(
    ingredient => Array.isArray(ingredient.allergens) && ingredient.allergens.length > 0
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
      // 피자 행은 L·R을 합친 기본 코드라, 실제 메뉴코드는 sourceMenuCodes에 있다.
      asStringArray(row.sourceMenuCodes).forEach(code => {
        if (code) allergenReadyCodes.add(code);
      });
    });

  // 구성품이 모두 "없음"·비표기·공산품이면 표에 행이 없어도 누락이 아니다.
  const lookup = buildIngredientLookup(safeIngredients, { requireAllergens: false });
  const groupById = new Map(asObjectArray(groups).map(group => [String(group.id), group]));
  const masterByCode = new Map(safeMenus.map(menu => [menu.menuCode, menu]));
  for (const recipe of detailRecipes) {
    const menu = { ...recipe, ...masterByCode.get(recipe.menuCode) };
    const components = [
      ...asObjectArray(recipe.components),
      ...normalizeRecipeGroupIds(recipe.selectedRecipeGroupIds)
        .map(id => groupById.get(id))
        .filter(group => group && groupAppliesToMenu(group, menu))
        .flatMap(group => asObjectArray(group.ingredients)),
    ];
    if (!recipe.menuCode || !components.length) continue;
    const matched = components.map(component => findIngredientByComponent(lookup, component));
    if (matched.every(i => i && hasNoOriginToShow(i))) originReadyCodes.add(recipe.menuCode);
    if (matched.every(i => i && hasNoAllergenToShow(i))) allergenReadyCodes.add(recipe.menuCode);
  }

  return { originReadyCodes, allergenReadyCodes };
}
