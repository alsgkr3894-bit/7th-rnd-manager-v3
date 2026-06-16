'use client';
import { useState, useEffect, useMemo } from 'react';
import { buildSalesStats } from '@/lib/report/build-sales-report';
import { buildPeriodCompare } from '@/lib/sales/compare';

/**
 * 판매량 보고서 계산 훅.
 * normRows(정규화된 row 배열)와 현재 필터 값을 받아 stats + compare 결과를 반환.
 */
export function useSalesReportComputed({
  normRows,
  safeViewMode,
  safeYearValue,
  safeMonthValue,
  safeCmpYear,
  safeCmpMonth,
  safeScope,
}) {
  const [compareData, setCompareData] = useState(null);

  const { catShares, groupRanking, kpi } = useMemo(
    () => buildSalesStats(normRows, { year: safeYearValue, month: safeMonthValue, scope: safeScope }),
    [normRows, safeYearValue, safeMonthValue, safeScope]
  );

  useEffect(() => {
    if (safeViewMode !== 'compare' || normRows.length === 0 || !safeCmpYear || !safeCmpMonth) {
      setCompareData(null);
      return;
    }
    const id = setTimeout(() => {
      const result = buildPeriodCompare(
        normRows,
        { year: safeYearValue, month: safeMonthValue },
        { year: safeCmpYear, month: safeCmpMonth },
        { groupBy: 'group', category: safeScope === 'all' ? null : safeScope, topN: 5 }
      );
      setCompareData(result);
    }, 0);
    return () => clearTimeout(id);
  }, [normRows, safeViewMode, safeYearValue, safeMonthValue, safeCmpYear, safeCmpMonth, safeScope]);

  return { catShares, groupRanking, kpi, compareData };
}
