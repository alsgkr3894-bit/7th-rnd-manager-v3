import { useEffect, useState } from 'react';
import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import { getAllIngredients } from '@/lib/ingredient';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { buildLatestPriceLookup } from '@/lib/price/price-lookup';
import { buildUnitPriceMap } from '@/lib/recipe';

function priceRowMapFromLookup(priceLookup) {
  return new Map(
    [...priceLookup.entries()].map(([productCode, priceWithTax]) => [
      productCode,
      { productCode, priceWithTax },
    ])
  );
}

export function useAvgCostRate() {
  const [avgCostRate, setAvgCostRate] = useState(null);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const [recipeMaps, menuPrices, ingredients, latestPriceLookup] = await Promise.all([
          loadMenuRecipeMaps(),
          getAllMenuPrices(),
          getAllIngredients(),
          buildLatestPriceLookup(),
        ]);
        if (ignore) return;

        const unitPriceMap = buildUnitPriceMap(
          ingredients,
          priceRowMapFromLookup(latestPriceLookup)
        );
        const pizzaPrices = menuPrices.filter(
          p => isPizzaCategory(p.category, { includePersonal: false }) && p.price > 0 && p.menuCode
        );
        const rates = [];
        for (const p of pizzaPrices) {
          const recipe = recipeMaps.pizza.get(p.menuCode);
          if (!recipe) continue;
          const cost = effectiveComponentsCost(recipe.components, unitPriceMap);
          if (cost > 0) rates.push((cost / p.price) * 100);
        }
        setAvgCostRate(rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null);
      } catch (err) {
        if (ignore) return;
        console.error('[useAvgCostRate] 원가율 로드 실패:', err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  return avgCostRate;
}
