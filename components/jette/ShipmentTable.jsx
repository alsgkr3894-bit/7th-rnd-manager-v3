'use client';
import { useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { useTableSearchSort } from '@/hooks/useTableSearchSort';
import { ShipmentTableCard } from './shipment-table/ShipmentTableCard';
import { filterAndSortShipmentRows, getShipmentCounts } from './shipment-table/shipmentTableUtils';

/**
 * ShipmentTable — 단일 파일 집계 테이블
 *
 * @param {Array} aggRows — aggregateShipmentRows 결과
 */
export function ShipmentTable({ aggRows }) {
  const [typeFilter, setTypeFilter] = useState('all'); // all | exclusive | generic
  const [managedOnly, setManagedOnly] = useState(false);
  const { search, setSearch, sortKey, sortDir, toggleSort } = useTableSearchSort(
    'totalAmount',
    'desc'
  );
  const safeAggRows = useMemo(() => asObjectArray(aggRows), [aggRows]);

  const filtered = useMemo(
    () =>
      filterAndSortShipmentRows({
        rows: safeAggRows,
        search,
        typeFilter,
        managedOnly,
        sortKey,
        sortDir,
      }),
    [safeAggRows, search, typeFilter, managedOnly, sortKey, sortDir]
  );
  const pagination = usePagination(filtered, 80);

  const counts = useMemo(() => getShipmentCounts(safeAggRows), [safeAggRows]);

  return (
    <ShipmentTableCard
      rows={safeAggRows}
      filtered={filtered}
      counts={counts}
      typeFilter={typeFilter}
      onTypeFilter={setTypeFilter}
      managedOnly={managedOnly}
      onManagedOnly={() => setManagedOnly(value => !value)}
      search={search}
      onSearch={setSearch}
      pagination={pagination}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={toggleSort}
    />
  );
}
