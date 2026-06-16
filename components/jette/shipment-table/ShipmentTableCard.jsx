'use client';

import { formatNumber } from '@/lib/format';
import { ShipmentDataTable } from './ShipmentDataTable';
import { ShipmentFilters } from './ShipmentFilters';

export function ShipmentTableCard({
  rows,
  filtered,
  counts,
  typeFilter,
  onTypeFilter,
  managedOnly,
  onManagedOnly,
  search,
  onSearch,
  pagination,
  sortKey,
  sortDir,
  onSort,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">출고량 집계</div>
          <div className="card-sub">
            {formatNumber(filtered.length)} / {formatNumber(rows.length)}개 표시
          </div>
        </div>
      </div>

      <ShipmentFilters
        counts={counts}
        typeFilter={typeFilter}
        onTypeFilter={onTypeFilter}
        managedOnly={managedOnly}
        onManagedOnly={onManagedOnly}
        search={search}
        onSearch={onSearch}
      />

      <ShipmentDataTable
        filteredCount={filtered.length}
        paged={pagination.paged}
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPage={pagination.goTo}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      />
    </div>
  );
}
