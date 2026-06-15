import { safeQuantity } from '@/lib/report/period';

export function buildSalesCategoryBarMetrics({ item, index, itemCount, catTotal }) {
  const quantity = safeQuantity(item.quantity);
  const pct = catTotal > 0 ? (quantity / catTotal) * 100 : 0;
  const weight = 1 - index / Math.max(itemCount, 1);

  return {
    quantity,
    pct,
    dotOpacity: 0.5 + 0.5 * weight,
    barOpacity: 0.55 + 0.45 * weight,
    isTop: index === 0,
  };
}
