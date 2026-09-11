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
import {
  isDiscontinuedMenuName,
  isKnownMenuMasterName,
} from '@/lib/menu-master/discontinued-lookup';
import { isIrregularMenuName } from '@/lib/sales/irregular-menu';

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
 * @param {{ year: number, month: number, periodMode?: 'month'|'quarter'|'year', scope: string,
 *   discontinuedNameSet?: Set<string>, menuMasterNameSet?: Set<string>,
 *   irregularNameSet?: Set<string> }} params
 *   discontinuedNameSet — buildDiscontinuedMenuNameSet() 결과. 있으면 groupRanking 각 항목에
 *   discontinued 플래그가 붙는다(없으면 전부 false — 하위 호환).
 *   menuMasterNameSet — buildMenuMasterNameSet() 결과(메뉴마스터 등록 이름 전체, 상태 무관).
 *   irregularNameSet — buildIrregularMenuNameSet() 결과(ref_discontinued, 사용자가 단종
 *   처리한 비정규메뉴). 있으면 irregular 플래그가 붙고 discontinued에도 합산되며(상승·하락·
 *   베스트·워스트 제외), menuMasterNameSet에도 irregularNameSet에도 없는 이름은
 *   unregistered:true(메뉴마스터 미등록 — "단종 처리" 후보)가 된다.
 * @returns {{ catShares: object[], groupRanking: object[], kpi: object|null }}
 */
export function buildSalesStats(
  normRows,
  {
    year,
    month,
    periodMode = 'month',
    scope,
    discontinuedNameSet,
    menuMasterNameSet,
    irregularNameSet,
  }
) {
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
    const irregular = isIrregularMenuName(m.name, irregularNameSet);
    const registeredDiscontinued = isDiscontinuedMenuName(m.name, discontinuedNameSet);
    return {
      ...m,
      rank: i + 1,
      prevQty,
      delta,
      deltaPct,
      prevRevenue,
      revenueDelta,
      revenueDeltaPct,
      discontinued: registeredDiscontinued || irregular,
      irregular,
      // menuMasterNameSet이 없으면(호출부가 아직 안 넘긴 경우) "모르는 상태"이지
      // "미등록 확정"이 아니므로 안전하게 false로 닫는다 — false positive(단종 처리
      // 버튼이 실제로는 등록된 메뉴에도 뜨는 것)가 안 뜨는 것보다 훨씬 나쁘다.
      unregistered:
        !irregular &&
        !!menuMasterNameSet &&
        menuMasterNameSet.size > 0 &&
        !isKnownMenuMasterName(m.name, menuMasterNameSet),
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
