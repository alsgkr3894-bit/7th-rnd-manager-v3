import { getAllIngredients } from '@/lib/ingredient';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { buildUnitPriceMap, calcMarginRate } from '@/lib/recipe';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';
import {
  componentEffectiveUnitPrice,
  effectiveComponentsRawCost,
} from '@/lib/cost/shared/effective-cost';

export { componentEffectiveUnitPrice } from '@/lib/cost/shared/effective-cost';

export const MENU_RECIPE_SUMMARY_STATUS = {
  READY: 'ready',
  MISSING: 'missing',
  NEEDS_PRICE: 'needs-price',
  NEEDS_QUANTITY: 'needs-quantity',
  UNSUPPORTED: 'unsupported',
};

function toRecipeMap(rows) {
  return new Map(
    asObjectArray(rows)
      .filter(row => row.menuCode)
      .map(row => [row.menuCode, row])
  );
}

function latestPriceRowsFromLookup(priceLookup) {
  return new Map(
    [...(priceLookup || new Map()).entries()].map(([productCode, priceWithTax]) => [
      productCode,
      { productCode, priceWithTax },
    ])
  );
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
    };
  }

  const components = asObjectArray(recipe?.components).filter(
    component => asDisplayText(component?.ingredientName) || asDisplayText(component?.productCode)
  );

  if (!recipe || components.length === 0) {
    return {
      kind,
      status: MENU_RECIPE_SUMMARY_STATUS.MISSING,
      hasRecipe: false,
      componentCount: 0,
      totalCost: 0,
      costRate: null,
      missingPriceCount: 0,
      missingQuantityCount: 0,
    };
  }

  let missingPriceCount = 0;
  let missingQuantityCount = 0;

  for (const component of components) {
    const quantity = asFiniteNumber(component?.quantity, null);
    const unitPrice = componentEffectiveUnitPrice(component, unitPriceMap);

    if (quantity == null || quantity <= 0) missingQuantityCount += 1;
    if (unitPrice == null) missingPriceCount += 1;
  }

  const totalCost = Math.round(effectiveComponentsRawCost(components, unitPriceMap));
  const sellingPrice = asFiniteNumber(menu?.price, null);
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
    totalCost,
    costRate: calcMarginRate(totalCost, sellingPrice),
    missingPriceCount,
    missingQuantityCount,
  };
}

export function buildMenuRecipeSummary(menu, recipeMaps = {}, unitPriceMap = new Map()) {
  const kind = recipeKindForMenu(menu);
  const menuCode = asDisplayText(menu?.menuCode);
  const recipe = kind && menuCode ? recipeMaps?.[kind]?.get(menuCode) || null : null;
  return summarizeMenuRecipe(menu, recipe, unitPriceMap, { kind });
}

export function buildMenuRecipeSummaryMap(menus, recipeMaps = {}, unitPriceMap = new Map()) {
  const summaryMap = new Map();
  for (const menu of asObjectArray(menus)) {
    const menuCode = asDisplayText(menu?.menuCode);
    if (!menuCode) continue;
    summaryMap.set(menuCode, buildMenuRecipeSummary(menu, recipeMaps, unitPriceMap));
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
  const [pizza, personal, side, set] = await Promise.all([
    getAllPizzaRecipes(),
    getAllPersonalRecipes(),
    getAllSideRecipes(),
    getAllSetRecipes(),
  ]);
  return {
    pizza: toRecipeMap(pizza),
    personal: toRecipeMap(personal),
    side: toRecipeMap(side),
    set: toRecipeMap(set),
  };
}

export async function loadMenuRecipeSummaryMap(menus) {
  const [recipeMaps, unitPriceMap] = await Promise.all([
    loadMenuRecipeMaps(),
    loadLatestUnitPriceMap(),
  ]);
  return buildMenuRecipeSummaryMap(menus, recipeMaps, unitPriceMap);
}
