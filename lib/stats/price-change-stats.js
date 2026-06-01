/**
 * lib/stats/price-change-stats.js — 식자재 단가 변동 (cost_ingredient_price_history 기반)
 */

import { getAllHistory } from '@/lib/cost/price-history';

/**
 * 최근 단가 변동 — 식자재별 가장 최근 변동 1건씩, 변동폭 큰 순.
 *
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ name, sub, pct:number, dir:'up'|'down' }>>}
 */
export async function getRecentPriceChanges(limit = 6) {
  const history = await getAllHistory(); // changedAt 내림차순

  const seen = new Set();
  const items = [];
  for (const h of history) {
    const key = h.ingredientName || h.productCode || h.ingredientId;
    if (key == null || seen.has(key)) continue;
    const oldP = Number(h.oldPrice);
    const newP = Number(h.newPrice);
    if (!(oldP > 0) || !(newP > 0) || oldP === newP) continue;
    seen.add(key);

    const pct = ((newP - oldP) / oldP) * 100;
    items.push({
      name: h.ingredientName || h.productCode || '식자재',
      sub: `${oldP.toLocaleString()}원 → ${newP.toLocaleString()}원`,
      pct,
      dir: pct > 0 ? 'up' : 'down',
    });
  }

  return items
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, limit);
}
