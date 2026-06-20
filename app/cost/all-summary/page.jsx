'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDBLoad } from '@/hooks/useDBLoad';
import { usePagination } from '@/hooks/usePagination';
import { onPriceUpload } from '@/lib/price/price-events';
import { loadAllSummaryRows } from './allSummaryData';
import {
  buildAllSummaryCategories,
  buildAllSummaryStats,
  exportAllSummaryCsv,
  filterAllSummaryRows,
} from './allSummaryUtils';
import { AllSummaryCategoryFilter } from './components/AllSummaryCategoryFilter';
import { AllSummaryEmptyState } from './components/AllSummaryEmptyState';
import { AllSummaryError } from './components/AllSummaryError';
import { AllSummaryLoadingSkeleton } from './components/AllSummaryLoadingSkeleton';
import { AllSummaryRecipeNotice } from './components/AllSummaryRecipeNotice';
import { AllSummaryStats } from './components/AllSummaryStats';
import { AllSummaryTable } from './components/AllSummaryTable';

const PAGE_SIZE = 60;

export default function Page() {
  const [catFilter, setCatFilter] = useState('전체');
  const fetchFn = useCallback(() => loadAllSummaryRows(), []);
  const { data: rawData, loading, error: dbErrorObj, reload } = useDBLoad(fetchFn);

  useEffect(() => onPriceUpload(reload), [reload]);

  const rows = useMemo(() => rawData ?? [], [rawData]);
  const dbError = dbErrorObj?.message ?? null;
  const stats = useMemo(() => buildAllSummaryStats(rows), [rows]);
  const categories = useMemo(() => buildAllSummaryCategories(rows), [rows]);
  const filtered = useMemo(() => filterAllSummaryRows(rows, catFilter), [rows, catFilter]);
  const hasAnyData = rows.length > 0;
  const hasRecipeData = rows.some(row => row.hasCost);
  const { page, goTo, totalPages, paged, total } = usePagination(filtered, PAGE_SIZE);

  if (dbError) return <AllSummaryError dbError={dbError} onRetry={reload} />;

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['원가계산', '종합전메뉴원가']}
        title="종합전메뉴원가"
        masterSource
        sub="모든 메뉴(피자/1인피자/사이드/세트박스)의 원가를 한 화면에서 비교"
        actions={
          hasAnyData && (
            <button className="btn" onClick={() => exportAllSummaryCsv(filtered)}>
              <Icon.download style={{ width: 13, height: 13 }} /> 엑셀로 내보내기
            </button>
          )
        }
      />

      {!loading && hasAnyData && <AllSummaryStats stats={stats} />}

      {!loading && hasAnyData && (
        <AllSummaryCategoryFilter
          categories={categories}
          activeCategory={catFilter}
          onChange={setCatFilter}
        />
      )}

      {loading && <AllSummaryLoadingSkeleton />}
      {!loading && !hasAnyData && <AllSummaryEmptyState />}
      {!loading && hasAnyData && !hasRecipeData && <AllSummaryRecipeNotice />}
      {!loading && hasAnyData && (
        <AllSummaryTable
          rows={paged}
          page={page}
          totalPages={totalPages}
          onPage={goTo}
          total={total}
          filteredCount={filtered.length}
          category={catFilter}
          pageSize={PAGE_SIZE}
        />
      )}
    </main>
  );
}
