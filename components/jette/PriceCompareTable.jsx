'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { downloadCsv } from '@/lib/download';
import { sortByKey, getProductTypeCounts } from '@/lib/jette/utils';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { useTableSearchSort } from '@/hooks/useTableSearchSort';
import { getPriceAlertThreshold } from '@/lib/jette/settings';
import { PriceCompareDataTable } from './price-compare/PriceCompareDataTable';
import { PriceCompareFilters } from './price-compare/PriceCompareFilters';
import {
  buildPriceCompareCsvData,
  countPriceChangeStatuses,
  FILTER_TO_STATUS,
  PRICE_COMPARE_PAGE_SIZE,
} from './price-compare/priceCompareTableUtils';

export function PriceCompareTable({
  diffRows,
  productTypeLookup = new Map(),
  onTypeChange,
  externalFilter,
  priceAlertThreshold,
}) {
  const [filter, setFilter] = useState(externalFilter || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { search, setSearch, sortKey, sortDir, toggleSort } = useTableSearchSort(
    'changeRate',
    'desc'
  );
  const safeDiffRows = useMemo(() => asObjectArray(diffRows), [diffRows]);
  const safeProductTypeLookup = useMemo(
    () => (productTypeLookup instanceof Map ? productTypeLookup : new Map()),
    [productTypeLookup]
  );
  const alertThreshold = useMemo(
    () => getPriceAlertThreshold(priceAlertThreshold),
    [priceAlertThreshold]
  );

  useEffect(() => {
    setTypeFilter('all');
    setFilter('all');
    setSearch('');
  }, [safeDiffRows, setSearch]);

  useEffect(() => {
    if (externalFilter) setFilter(externalFilter);
  }, [externalFilter]);

  const typeCounts = useMemo(
    () => getProductTypeCounts(safeDiffRows, safeProductTypeLookup),
    [safeDiffRows, safeProductTypeLookup]
  );

  const counts = useMemo(() => countPriceChangeStatuses(safeDiffRows), [safeDiffRows]);

  const filtered = useMemo(() => {
    let list = safeDiffRows;
    if (filter !== 'all') list = list.filter(r => r.changeStatus === FILTER_TO_STATUS[filter]);
    if (typeFilter !== 'all') {
      list = list.filter(r => safeProductTypeLookup.get(r.productCode)?.productType === typeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          asDisplayText(r.productName).toLowerCase().includes(q) ||
          asDisplayText(r.productCode).toLowerCase().includes(q)
      );
    return sortByKey(list, sortKey, sortDir);
  }, [safeDiffRows, search, filter, typeFilter, sortKey, sortDir, safeProductTypeLookup]);
  const { page, goTo, totalPages, paged, total } = usePagination(
    filtered,
    PRICE_COMPARE_PAGE_SIZE
  );

  function exportCsv() {
    downloadCsv(buildPriceCompareCsvData(filtered, safeProductTypeLookup), '제때_가격비교.csv');
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">가격 비교</div>
          <div className="card-sub">제품코드 우선 매칭 · 변동률 기준 정렬</div>
        </div>
        <button className="btn sm" onClick={exportCsv} disabled={filtered.length === 0}>
          엑셀로 내보내기
        </button>
      </div>

      <PriceCompareFilters
        rowCount={safeDiffRows.length}
        typeCounts={typeCounts}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        counts={counts}
        filter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
      />

      <PriceCompareDataTable
        rows={paged}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        productTypeLookup={safeProductTypeLookup}
        onTypeChange={onTypeChange}
        priceAlertThreshold={alertThreshold}
        page={page}
        totalPages={totalPages}
        onPage={goTo}
        total={total}
      />
    </div>
  );
}
