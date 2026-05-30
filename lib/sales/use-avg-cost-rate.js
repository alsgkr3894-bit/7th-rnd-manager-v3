import { useEffect, useState } from 'react';
import { getPizzaRecipeMap, pizzaBaseCost } from '@/lib/cost/pizza-detail';
import { getAllMenuPrices } from '@/lib/cost/menu-price';

export function useAvgCostRate() {
  const [avgCostRate, setAvgCostRate] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [pizzaMap, menuPrices] = await Promise.all([
          getPizzaRecipeMap(),
          getAllMenuPrices(),
        ]);
        const pizzaPrices = menuPrices.filter(p =>
          (p.category === '피자' || p.category?.startsWith('피자/')) &&
          p.price > 0 && p.menuCode
        );
        const rates = [];
        for (const p of pizzaPrices) {
          const recipe = pizzaMap.get(p.menuCode);
          if (!recipe) continue;
          const cost = pizzaBaseCost(recipe);
          if (cost > 0) rates.push((cost / p.price) * 100);
        }
        if (rates.length > 0) {
          setAvgCostRate(rates.reduce((a, b) => a + b, 0) / rates.length);
        }
      } catch (err) {
        console.error('[useAvgCostRate] 원가율 로드 실패:', err);
      }
    })();
  }, []);

  return avgCostRate;
}
