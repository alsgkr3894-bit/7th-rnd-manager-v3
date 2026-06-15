import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';
import { calcMarginRate } from '@/lib/recipe';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const priceKey = (menuCode, menuName, size) => {
  const code = asDisplayText(menuCode);
  const name = asDisplayText(menuName);
  const label = asDisplayText(size, '단일') || '단일';
  return code ? `code:${code}` : `name:${name}|${label}`;
};

export function buildSellingPriceLookup(sellingPrices = []) {
  const lookup = new Map();
  for (const row of asObjectArray(sellingPrices)) {
    const price = asFiniteNumber(row?.price, null);
    if (!(price > 0)) continue;
    const code = asDisplayText(row?.menuCode);
    const name = asDisplayText(row?.menuName);
    const size = asDisplayText(row?.size, '단일') || '단일';
    if (code) lookup.set(`code:${code}`, price);
    if (name) lookup.set(`name:${name}|${size}`, price);
  }
  return lookup;
}

export function sellingPriceForRecipe(recipe, lookup) {
  return asFiniteNumber(
    lookup.get(priceKey(recipe?.menuCode, recipe?.menuName, recipe?.size)),
    null
  );
}

export function buildCanonicalCostRateItems({ recipes, sellingPrices, unitPriceMap }) {
  const priceLookup = buildSellingPriceLookup(sellingPrices);
  const items = [];

  for (const recipe of asObjectArray(recipes)) {
    const components = asObjectArray(recipe?.components);
    if (!components.length) continue;

    const sellingPrice = sellingPriceForRecipe(recipe, priceLookup);
    if (!(sellingPrice > 0)) continue;

    const cost = effectiveComponentsCost(components, unitPriceMap);
    if (!(cost > 0)) continue;

    const costRate = calcMarginRate(cost, sellingPrice);
    if (costRate == null) continue;

    items.push({
      menuName: asDisplayText(recipe?.menuName, '메뉴명 없음'),
      menuCategory: asDisplayText(recipe?.category, '기타'),
      costRate: Math.round(costRate * 10) / 10,
      cost: Math.round(cost),
      sellingPrice,
      size: asDisplayText(recipe?.size, '단일') || '단일',
      menuCode: asDisplayText(recipe?.menuCode),
    });
  }

  return items;
}
