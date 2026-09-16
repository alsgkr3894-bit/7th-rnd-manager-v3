/**
 * lib/nutrition/allergen/coverage.js — 알레르기 자동 집계의 "조용한 누락" 탐지 (순수 함수)
 *
 * 영양성분표의 알레르기 열은 레시피 구성품 → 식자재 마스터(cost_ingredients.allergens)를
 * 역참조해 만든다. 이 사슬이 끊긴 곳(레시피 없음, 구성품이 식자재 마스터에 없음, 도우 미설정)은
 * 집계에서 그냥 빠져 표에 빈칸/불완전한 목록으로 찍힌다 — 법정 표시라 누락을 화면에서
 * 반드시 알려야 한다. 출력물(인쇄/엑셀)에는 넣지 않고 화면 배너 전용.
 */
import { buildIngredientLookup, findIngredientByComponent } from './ingredient-lookup';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

function baseCodeOf(code) {
  return asDisplayText(code)
    .trim()
    .toUpperCase()
    .replace(/-(?:L|R)$/i, '');
}

/**
 * @param {object} opts
 * @param {Array} opts.menus         라벨에 출력되는 영양 메뉴(nutrition_menu_ref)
 * @param {object} opts.masterByCode
 * @param {Array} opts.ingredients   cost_ingredients
 * @param {Array} opts.detailRecipes tagDetailRecipes() 결과(레시피 + category)
 * @param {Array} opts.costEdges     cost_edge_dough
 * @returns {{
 *   menusWithoutRecipe: Array<{menuCode:string, menuName:string}>,
 *   unmatchedComponents: Array<{productCode:string, ingredientName:string, menuCodes:string[]}>,
 *   componentsWithoutAllergens: Array<{productCode:string, ingredientName:string, menuCodes:string[]}>,
 *   doughNotConfigured: boolean,
 *   pizzaMenuCount: number,
 *   total: number,
 * }}
 */
export function buildAllergenCoverageWarnings({
  menus,
  masterByCode = {},
  ingredients,
  detailRecipes,
  costEdges,
} = {}) {
  const labelMenus = asObjectArray(menus).filter(
    m => resolveNutritionGroup(m, masterByCode) !== '음료'
  );
  const recipesByBase = new Map();
  for (const recipe of asObjectArray(detailRecipes)) {
    const base = baseCodeOf(recipe.menuCode);
    if (!base) continue;
    if (!recipesByBase.has(base)) recipesByBase.set(base, []);
    recipesByBase.get(base).push(recipe);
  }

  // 알레르기 유무·단종 여부와 무관하게 "식자재 마스터에 존재하는가"만 본다.
  const anyLookup = buildIngredientLookup(ingredients, {
    requireAllergens: false,
    skipInactive: false,
  });

  const menusWithoutRecipe = [];
  const unmatched = new Map();
  const noAllergens = new Map();
  const pushComponent = (bucket, component, menuCode) => {
    const productCode = asDisplayText(component?.productCode).trim();
    const ingredientName = asDisplayText(component?.ingredientName ?? component?.name).trim();
    const key = `${productCode}|${ingredientName}`;
    if (!productCode && !ingredientName) return;
    if (!bucket.has(key)) bucket.set(key, { productCode, ingredientName, menuCodes: [] });
    const entry = bucket.get(key);
    if (!entry.menuCodes.includes(menuCode)) entry.menuCodes.push(menuCode);
  };

  for (const menu of labelMenus) {
    const menuCode = asDisplayText(menu.menuCode).trim();
    const recipes = recipesByBase.get(baseCodeOf(menuCode)) || [];
    if (!recipes.length) {
      menusWithoutRecipe.push({ menuCode, menuName: asDisplayText(menu.menuName) });
      continue;
    }
    for (const recipe of recipes) {
      for (const component of asObjectArray(recipe.components)) {
        const ingredient = findIngredientByComponent(anyLookup, component);
        if (!ingredient) pushComponent(unmatched, component, menuCode);
        else if (!asStringArray(ingredient.allergens).length)
          pushComponent(noAllergens, component, menuCode);
      }
    }
  }

  const pizzaMenuCount = labelMenus.filter(
    m => resolveNutritionGroup(m, masterByCode) === '피자'
  ).length;
  const doughNotConfigured = pizzaMenuCount > 0 && asObjectArray(costEdges).length === 0;

  const unmatchedComponents = [...unmatched.values()];
  const componentsWithoutAllergens = [...noAllergens.values()];
  return {
    menusWithoutRecipe,
    unmatchedComponents,
    componentsWithoutAllergens,
    doughNotConfigured,
    pizzaMenuCount,
    total: menusWithoutRecipe.length + unmatchedComponents.length + (doughNotConfigured ? 1 : 0),
  };
}
