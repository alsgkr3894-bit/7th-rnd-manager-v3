import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { buildRows, catRank } from '@/lib/cost/shared/buildSummaryRows';

export function sortAllSummaryRows(rows) {
  return rows.sort((a, b) => {
    const categoryRank = catRank(a.category) - catRank(b.category);
    if (categoryRank !== 0) return categoryRank;
    const menuRank = getMenuCodeRank(a.menuCode) - getMenuCodeRank(b.menuCode);
    if (menuRank !== 0) return menuRank;
    return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
  });
}

export async function loadAllSummaryRows() {
  const [allMenuPrices, allIngredients, recipeMaps, latestPriceLookup, recipeGroups] =
    await Promise.all([
      getAllMenuPrices(),
      getAllIngredients(),
      loadMenuRecipeMaps(),
      buildLatestPriceLookup(),
      getAllRecipeGroups(),
    ]);

  const latestPriceRows = new Map(
    [...latestPriceLookup.entries()].map(([productCode, priceWithTax]) => [
      productCode,
      { productCode, priceWithTax },
    ])
  );
  const unitPriceMap = buildUnitPriceMap(allIngredients, latestPriceRows);
  const rows = buildRows(allMenuPrices, recipeMaps, unitPriceMap, recipeGroups);

  return sortAllSummaryRows(rows);
}
