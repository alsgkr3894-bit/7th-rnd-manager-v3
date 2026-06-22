'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { downloadCsv, makeFileNameWithBrand } from '@/lib/download';
import { getPriceRowsByFileId } from '@/lib/price';
import { PriceLatestKpi } from './PriceLatestKpi';
import { useTableSearchSort } from '@/hooks/useTableSearchSort';
import { PriceLatestEmptyState } from './price-latest/PriceLatestEmptyState';
import { PriceLatestListCard } from './price-latest/PriceLatestListCard';
import {
  buildLatestPriceCsvRows,
  filterAndSortLatestRows,
  filterLatestRowsByType,
  getLatestTaxCounts,
  getLatestTypeCounts,
  PRODUCT_SORT_DIR,
} from './price-latest/priceLatestViewUtils';

export function PriceLatestView({
  files,
  latestFileId,
  onLatestChange,
  productTypeLookup = new Map(),
  canEdit = false,
  onTypeChange,
}) {
  const [rows, setRows] = useState([]);
  const [taxFilter, setTaxFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { search, setSearch, sortKey, sortDir, toggleSort } = useTableSearchSort(
    'productName',
    'asc',
    PRODUCT_SORT_DIR
  );

  const latestFile = files.find(f => f.id === latestFileId);

  useEffect(() => {
    setTypeFilter('all');
    setTaxFilter('all');
    setSearch('');
  }, [latestFileId, setSearch]);

  useEffect(() => {
    (async () => {
      if (!latestFileId) {
        setRows([]);
        return;
      }
      try {
        const r = await getPriceRowsByFileId(latestFileId);
        setRows(r);
      } catch (err) {
        console.warn('[jette-price] rows 로드 실패:', err);
        setRows([]);
      }
    })();
  }, [latestFileId]);

  const typeCounts = useMemo(
    () => getLatestTypeCounts(rows, productTypeLookup),
    [rows, productTypeLookup]
  );

  const typeFilteredRows = useMemo(
    () => filterLatestRowsByType(rows, typeFilter, productTypeLookup),
    [rows, typeFilter, productTypeLookup]
  );

  const taxCounts = useMemo(() => getLatestTaxCounts(typeFilteredRows), [typeFilteredRows]);

  const filtered = useMemo(
    () =>
      filterAndSortLatestRows({
        rows: typeFilteredRows,
        search,
        taxFilter,
        sortKey,
        sortDir,
      }),
    [typeFilteredRows, search, taxFilter, sortKey, sortDir]
  );
  const pagination = usePagination(filtered, 80);

  function exportCsv() {
    downloadCsv(
      buildLatestPriceCsvRows(filtered, productTypeLookup),
      makeFileNameWithBrand('제때_최신단가', 'csv')
    );
  }

  if (files.length === 0) {
    return <PriceLatestEmptyState />;
  }

  return (
    <>
      <PriceLatestKpi
        latestFile={latestFile}
        rows={rows}
        files={files}
        latestFileId={latestFileId}
        onLatestChange={onLatestChange}
      />

      <PriceLatestListCard
        rows={rows}
        filtered={filtered}
        typeCounts={typeCounts}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        typeFilteredRows={typeFilteredRows}
        taxCounts={taxCounts}
        taxFilter={taxFilter}
        onTaxFilter={setTaxFilter}
        search={search}
        onSearch={setSearch}
        onExport={exportCsv}
        table={pagination}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        productTypeLookup={productTypeLookup}
        canEdit={canEdit}
        onTypeChange={onTypeChange}
      />
    </>
  );
}
