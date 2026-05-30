/**
 * lib/stats/cost-stats.js — 원가율 경보 데이터
 */
import { safeAll } from './_helpers';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { buildUnitPriceMap, calcCostBySizes, calcMarginRate } from '@/lib/recipe';
import { hasStore } from '@/lib/db';

/**
 * 레시피 기준 원가율 상위/하위 목록 반환.
 * 각 메뉴의 첫 번째 사이즈만 대표값으로 사용 (L 또는 단일).
 *
 * @returns {{ items: Array<{menuName, menuCategory, costRate, sellingPrice, cost, size}>, total: number } | null}
 */
export async function getCostAlertData() {
  if (!hasStore('cost_recipes') || !hasStore('cost_ingredients')) return null;

  const [recipes, allMeta, files] = await Promise.all([
    safeAll('cost_recipes'),
    safeAll('cost_ingredients'),
    getPriceFiles().catch(() => []),
  ]);

  if (!recipes.length || !allMeta.length) return null;

  // 단가 맵 빌드
  const priceRowMap = new Map();
  if (files[0]) {
    try {
      const rows = await getPriceRowsByFileId(files[0].id);
      rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    } catch { /* ignore */ }
  }
  const upm = buildUnitPriceMap(allMeta, priceRowMap);

  const SIZE_PREF = ['L', 'R', '단일', '단품', '세트'];

  const items = [];
  for (const r of recipes) {
    const costMap = calcCostBySizes(r, upm);
    const sizes = (r.sizes || []).filter(s => s.label && s.sellingPrice > 0);
    if (!sizes.length) continue;

    // 대표 사이즈: 선호순서 → 없으면 첫번째
    const rep = SIZE_PREF.map(p => sizes.find(s => s.label === p)).find(Boolean) || sizes[0];
    const cost = costMap[rep.label] || 0;
    if (cost <= 0) continue;

    const costRate = calcMarginRate(cost, Number(rep.sellingPrice));
    if (costRate == null) continue;

    items.push({
      menuName:     r.menuName,
      menuCategory: r.menuCategory || '기타',
      costRate:     Math.round(costRate * 10) / 10,
      cost:         Math.round(cost),
      sellingPrice: Number(rep.sellingPrice),
      size:         rep.label,
    });
  }

  items.sort((a, b) => b.costRate - a.costRate);
  return { items, total: items.length };
}
