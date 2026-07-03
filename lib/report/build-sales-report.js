/**
 * lib/report/build-sales-report.js
 * 판매량 보고서 통계 빌더 — IO·사이드이펙트 없음, 단위 테스트 가능.
 */

import { asDisplayText } from '@/lib/ui/prop-guards';
import { safeQuantity } from '@/lib/report/period';
import { buildGroupRanking } from '@/lib/sales/ranking';
import { safeRevenue } from '@/lib/sales/revenue';
import {
  resolveMenuCategoryGroup,
  isPersonalPizzaCategory,
} from '@/lib/menu-master/category-policy';

export const CAT_COLORS = [
  '#3182F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#E1101F',
  '#6B7280',
];

/**
 * 정규화된 판매 행에서 카테고리 비중·그룹 순위·KPI를 계산한다.
 *
 * @param {object[]} normRows  safeYear/safeMonth/safeQuantity가 적용된 정규화 행
 * @param {{ year: number, month: number, scope: string }} params
 * @returns {{ catShares: object[], groupRanking: object[], kpi: object|null }}
 */
export function buildSalesStats(normRows, { year, month, scope }) {
  if (!normRows || normRows.length === 0) return { catShares: [], groupRanking: [], kpi: null };

  const prevPeriod = {
    year: month === 1 ? year - 1 : year,
    month: month === 1 ? 12 : month - 1,
  };
  function scopeFilter(r) {
    if (scope === 'all') return true;
    if (scope === '1인피자') return isPersonalPizzaCategory(r.category);
    return resolveMenuCategoryGroup(r.category, { includePersonal: false }) === scope;
  }

  // 카테고리 비중
  const catMap = new Map();
  for (const r of normRows) {
    if (r.status !== 'classified') continue;
    if (r.year !== year || r.month !== month) continue;
    if (!scopeFilter(r)) continue;
    const cat = asDisplayText(r.category, '미분류') || '미분류';
    const entry = catMap.get(cat) || { value: 0, revenue: 0 };
    entry.value += safeQuantity(r.quantity);
    entry.revenue += safeRevenue(r.revenue ?? r.amount ?? r.salesAmount ?? r.totalAmount);
    catMap.set(cat, entry);
  }
  const catShares = Array.from(catMap, ([name, entry], i) => ({
    name,
    value: entry.value,
    revenue: entry.revenue,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // 그룹 순위 + 전월 비교
  const scopedRows = normRows.filter(r => scopeFilter(r));
  const ranking = buildGroupRanking(scopedRows, { year, month });
  const prevRanking = buildGroupRanking(scopedRows, prevPeriod);
  const prevMap = new Map(prevRanking.map(m => [m.name, m.quantity]));
  const prevRevenueMap = new Map(prevRanking.map(m => [m.name, safeRevenue(m.revenue)]));

  const groupRanking = ranking.map((m, i) => {
    const prevQty = prevMap.get(m.name) || 0;
    const prevRevenue = prevRevenueMap.get(m.name) || 0;
    const delta = m.quantity - prevQty;
    const deltaPct = prevQty === 0 ? null : (delta / prevQty) * 100;
    const revenueDelta = safeRevenue(m.revenue) - prevRevenue;
    const revenueDeltaPct = prevRevenue === 0 ? null : (revenueDelta / prevRevenue) * 100;
    return {
      ...m,
      rank: i + 1,
      prevQty,
      delta,
      deltaPct,
      prevRevenue,
      revenueDelta,
      revenueDeltaPct,
    };
  });

  // KPI
  const total = ranking.reduce((s, m) => s + m.quantity, 0);
  const prevTotal = prevRanking.reduce((s, m) => s + m.quantity, 0);
  const revenue = ranking.reduce((s, m) => s + safeRevenue(m.revenue), 0);
  const prevRevenue = prevRanking.reduce((s, m) => s + safeRevenue(m.revenue), 0);
  const deltaPct = prevTotal === 0 ? null : ((total - prevTotal) / prevTotal) * 100;
  const revenueDeltaPct = prevRevenue === 0 ? null : ((revenue - prevRevenue) / prevRevenue) * 100;

  return {
    catShares,
    groupRanking,
    kpi: {
      current: total,
      previous: prevTotal,
      deltaPct,
      revenue,
      previousRevenue: prevRevenue,
      revenueDeltaPct,
    },
  };
}
