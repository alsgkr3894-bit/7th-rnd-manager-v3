import { getAllIngredients } from '@/lib/ingredient';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { buildUnitPriceMap, calcMarginRate } from '@/lib/recipe';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildAppliedRecipeGroupComponents } from '@/lib/cost/recipe-groups/effective';
import {
  componentEffectiveUnitPrice,
  effectiveComponentsRawCost,
} from '@/lib/cost/shared/effective-cost';
import {
  loadMenuRecipeMaps as loadCanonicalMenuRecipeMaps,
  normalizeSelectedRecipeGroupIds,
} from '@/lib/menu-recipes';

export { componentEffectiveUnitPrice } from '@/lib/cost/shared/effective-cost';

export const MENU_RECIPE_SUMMARY_STATUS = {
  READY: 'ready',
  MISSING: 'missing',
  NEEDS_PRICE: 'needs-price',
  NEEDS_QUANTITY: 'needs-quantity',
  UNSUPPORTED: 'unsupported',
};

function latestPriceRowsFromLookup(priceLookup) {
  return new Map(
    [...(priceLookup || new Map()).entries()].map(([productCode, priceWithTax]) => [
      productCode,
      { productCode, priceWithTax },
    ])
  );
}

function countMissingRecipeComponentInputs(components, unitPriceMap) {
  let missingPriceCount = 0;
  let missingQuantityCount = 0;

  for (const component of components) {
    const quantity = asFiniteNumber(component?.quantity, null);
    const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);

    if (quantity == null) missingQuantityCount += 1;
    if (unitPrice == null) missingPriceCount += 1;
  }

  return { missingPriceCount, missingQuantityCount };
}

export function recipeKindForMenu(menu) {
  return recipeStoreKindForCategory(menu?.category);
}

export function summarizeMenuRecipe(menu, recipe, unitPriceMap = new Map(), options = {}) {
  const kind = options.kind ?? recipeKindForMenu(menu);
  if (!kind) {
    return {
      kind: null,
      status: MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED,
      hasRecipe: false,
      componentCount: 0,
      totalCost: 0,
      costRate: null,
      missingPriceCount: 0,
      missingQuantityCount: 0,
      missingDirectPriceCount: 0,
      missingDirectQuantityCount: 0,
      missingCommonPriceCount: 0,
      missingCommonQuantityCount: 0,
    };
  }

  const directComponents = asObjectArray(recipe?.components).filter(
    component => asDisplayText(component?.ingredientName) || asDisplayText(component?.productCode)
  );
  const selectedRecipeGroupIds = normalizeSelectedRecipeGroupIds(
    recipe?.selectedRecipeGroupIds ?? options.selectedRecipeGroupIds
  );
  const commonComponents = buildAppliedRecipeGroupComponents(
    menu,
    options.recipeGroups,
    selectedRecipeGroupIds
  );
  const components = [...directComponents, ...commonComponents];

  if (components.length === 0) {
    return {
      kind,
      status: MENU_RECIPE_SUMMARY_STATUS.MISSING,
      hasRecipe: false,
      componentCount: 0,
      directComponentCount: 0,
      commonComponentCount: 0,
      commonGroupCount: 0,
      totalCost: 0,
      costRate: null,
      missingPriceCount: 0,
      missingQuantityCount: 0,
      missingDirectPriceCount: 0,
      missingDirectQuantityCount: 0,
      missingCommonPriceCount: 0,
      missingCommonQuantityCount: 0,
    };
  }

  const directMissing = countMissingRecipeComponentInputs(directComponents, unitPriceMap);
  const commonMissing = countMissingRecipeComponentInputs(commonComponents, unitPriceMap);
  const missingPriceCount = directMissing.missingPriceCount + commonMissing.missingPriceCount;
  const missingQuantityCount =
    directMissing.missingQuantityCount + commonMissing.missingQuantityCount;

  const totalCost = Math.round(effectiveComponentsRawCost(components, unitPriceMap));
  const directCost = Math.round(effectiveComponentsRawCost(directComponents, unitPriceMap));
  const commonGroupCost = totalCost - directCost;
  const sellingPrice = asFiniteNumber(menu?.price, null);
  const costRate = calcMarginRate(totalCost, sellingPrice);
  const marginAmount =
    sellingPrice != null && sellingPrice > 0 ? Math.round(sellingPrice - totalCost) : null;
  const costRateTone =
    costRate == null ? null : costRate >= 40 ? 'danger' : costRate >= 35 ? 'warn' : 'ok';
  const status =
    missingQuantityCount > 0
      ? MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY
      : missingPriceCount > 0
        ? MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE
        : MENU_RECIPE_SUMMARY_STATUS.READY;

  return {
    kind,
    status,
    hasRecipe: true,
    componentCount: components.length,
    directComponentCount: directComponents.length,
    commonComponentCount: commonComponents.length,
    commonGroupCount: new Set(commonComponents.map(component => component.groupId)).size,
    totalCost,
    directCost,
    commonGroupCost,
    costRate,
    costRateTone,
    marginAmount,
    missingPriceCount,
    missingQuantityCount,
    missingDirectPriceCount: directMissing.missingPriceCount,
    missingDirectQuantityCount: directMissing.missingQuantityCount,
    missingCommonPriceCount: commonMissing.missingPriceCount,
    missingCommonQuantityCount: commonMissing.missingQuantityCount,
  };
}

export function buildMenuRecipeSummary(
  menu,
  recipeMaps = {},
  unitPriceMap = new Map(),
  options = {}
) {
  const kind = recipeKindForMenu(menu);
  const menuCode = asDisplayText(menu?.menuCode);
  const recipe = kind && menuCode ? recipeMaps?.[kind]?.get(menuCode) || null : null;
  return summarizeMenuRecipe(menu, recipe, unitPriceMap, { ...options, kind });
}

export function buildMenuRecipeSummaryMap(
  menus,
  recipeMaps = {},
  unitPriceMap = new Map(),
  options = {}
) {
  const summaryMap = new Map();
  for (const menu of asObjectArray(menus)) {
    const menuCode = asDisplayText(menu?.menuCode);
    if (!menuCode) continue;
    const kind = recipeKindForMenu(menu);
    const recipe = kind && menuCode ? recipeMaps?.[kind]?.get(menuCode) || null : null;
    summaryMap.set(menuCode, summarizeMenuRecipe(menu, recipe, unitPriceMap, { ...options, kind }));
  }
  return summaryMap;
}

export async function loadLatestUnitPriceMap() {
  const [ingredients, latestPriceLookup] = await Promise.all([
    getAllIngredients(),
    buildLatestPriceLookup(),
  ]);
  return buildUnitPriceMap(ingredients, latestPriceRowsFromLookup(latestPriceLookup));
}

export async function loadMenuRecipeMaps() {
  return loadCanonicalMenuRecipeMaps();
}

export async function loadMenuRecipeSummaryMap(menus) {
  const [recipeMaps, unitPriceMap, recipeGroups] = await Promise.all([
    loadMenuRecipeMaps(),
    loadLatestUnitPriceMap(),
    getAllRecipeGroups(),
  ]);
  return buildMenuRecipeSummaryMap(menus, recipeMaps, unitPriceMap, { recipeGroups });
}
