/**
 * lib/stats/cost-stats.js — 원가율 경보 데이터
 */
import { safeAll } from './_helpers';
import { buildCanonicalCostRateItems } from './canonical-cost-rate';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { buildUnitPriceMap } from '@/lib/recipe';
import { hasStore } from '@/lib/db';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 레시피 기준 원가율 상위/하위 목록 반환.
 * 각 메뉴의 첫 번째 사이즈만 대표값으로 사용 (L 또는 단일).
 *
 * @returns {{ items: Array<{menuName, menuCategory, costRate, sellingPrice, cost, size}>, total: number } | null}
 */
export async function getCostAlertData() {
  if (!hasStore('menu_recipes') || !hasStore('cost_ingredients')) return null;

  const [recipes, allMeta, sellingPrices, files] = await Promise.all([
    safeAll('menu_recipes'),
    safeAll('cost_ingredients'),
    safeAll('cost_selling_prices'),
    getPriceFiles()
      .then(asObjectArray)
      .catch(() => []),
  ]);

  if (!recipes.length || !allMeta.length) return null;

  // 단가 맵 빌드
  const priceRowMap = new Map();
  if (files[0]?.id != null) {
    try {
      const rows = await getPriceRowsByFileId(files[0].id);
      asObjectArray(rows).forEach(r => {
        const productCode = asDisplayText(r.productCode);
        if (productCode) priceRowMap.set(productCode, r);
      });
    } catch {
      /* ignore */
    }
  }
  const upm = buildUnitPriceMap(allMeta, priceRowMap);

  const items = buildCanonicalCostRateItems({
    recipes,
    sellingPrices,
    unitPriceMap: upm,
  });

  items.sort((a, b) => b.costRate - a.costRate);
  return { items, total: items.length };
}
