'use client';
import { useState, useEffect, useMemo } from 'react';
import { buildSalesStats } from '@/lib/report/build-sales-report';
import { buildRangeCompare } from '@/lib/sales/compare';
import { monthsInPeriod } from '@/lib/report/period';

/**
 * 판매량 보고서 계산 훅.
 * normRows(정규화된 row 배열)와 현재 필터 값을 받아 stats + compare 결과를 반환.
 * safePeriodMode가 'quarter'/'year'이면 safeMonthValue는 각각 분기(1~4)/연도 전체로 해석되어
 * 여러 달을 하나의 기간으로 통합 집계한다.
 */
export function useSalesReportComputed({
  normRows,
  safeViewMode,
  safePeriodMode = 'month',
  safeYearValue,
  safeMonthValue,
  safeCmpYear,
  safeCmpMonth,
  safeScope,
}) {
  const [compareData, setCompareData] = useState(null);

  const { catShares, groupRanking, kpi } = useMemo(
    () =>
      buildSalesStats(normRows, {
        year: safeYearValue,
        month: safeMonthValue,
        periodMode: safePeriodMode,
        scope: safeScope,
      }),
    [normRows, safeYearValue, safeMonthValue, safePeriodMode, safeScope]
  );

  useEffect(() => {
    if (safeViewMode !== 'compare' || normRows.length === 0 || !safeCmpYear || !safeCmpMonth) {
      setCompareData(null);
      return;
    }
    const id = setTimeout(() => {
      const monthsA = monthsInPeriod(safePeriodMode, safeYearValue, safeMonthValue);
      const monthsB = monthsInPeriod(safePeriodMode, safeCmpYear, safeCmpMonth);
      const result = buildRangeCompare(normRows, monthsA, monthsB, {
        groupBy: 'group',
        category: safeScope === 'all' ? null : safeScope,
        topN: 5,
      });
      setCompareData(result);
    }, 0);
    return () => clearTimeout(id);
  }, [
    normRows,
    safeViewMode,
    safePeriodMode,
    safeYearValue,
    safeMonthValue,
    safeCmpYear,
    safeCmpMonth,
    safeScope,
  ]);

  return { catShares, groupRanking, kpi, compareData };
}
