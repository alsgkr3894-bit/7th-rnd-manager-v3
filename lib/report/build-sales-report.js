/**
 * lib/report/build-sales-report.js
 * 판매량 보고서 통계 빌더 — IO·사이드이펙트 없음, 단위 테스트 가능.
 */

import { asDisplayText } from '@/lib/ui/prop-guards';
import { monthsInPeriod, previousPeriod, safeQuantity } from '@/lib/report/period';
import { buildGroupRanking, mergeGroupRankings } from '@/lib/sales/ranking';
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
 * periodMode가 'quarter'/'year'이면 month는 각각 해당 분기(1~4)/연도 전체(무시)로
 * 취급해 여러 달을 하나의 기간으로 통합 집계하고, 직전 기간(전월/전분기/전년)과 비교한다.
 * periodMode 생략 시 기존과 동일하게 단일 월 기준으로 동작한다(하위 호환).
 *
 * @param {object[]} normRows  safeYear/safeMonth/safeQuantity가 적용된 정규화 행
 * @param {{ year: number, month: number, periodMode?: 'month'|'quarter'|'year', scope: string }} params
 * @returns {{ catShares: object[], groupRanking: object[], kpi: object|null }}
 */
export function buildSalesStats(normRows, { year, month, periodMode = 'month', scope }) {
  if (!normRows || normRows.length === 0) return { catShares: [], groupRanking: [], kpi: null };

  const months = monthsInPeriod(periodMode, year, month);
  const prev = previousPeriod(periodMode, year, month);
  const prevMonths = monthsInPeriod(periodMode, prev.year, prev.monthOrQuarter);
  const monthKey = ({ year: y, month: m }) => `${y}-${m}`;
  const monthSet = new Set(months.map(monthKey));

  function scopeFilter(r) {
    if (scope === 'all') return true;
    if (scope === '1인피자') return isPersonalPizzaCategory(r.category);
    return resolveMenuCategoryGroup(r.category, { includePersonal: false }) === scope;
  }

  // 카테고리 비중
  const catMap = new Map();
  for (const r of normRows) {
    if (r.status !== 'classified') continue;
    if (!monthSet.has(monthKey(r))) continue;
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

  // 그룹 순위 + 직전 기간(전월/전분기/전년) 비교
  const scopedRows = normRows.filter(r => scopeFilter(r));
  const ranking = mergeGroupRankings(months.map(m => buildGroupRanking(scopedRows, m)));
  const prevRanking = mergeGroupRankings(prevMonths.map(m => buildGroupRanking(scopedRows, m)));
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
