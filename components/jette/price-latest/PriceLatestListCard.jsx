'use client';

import { formatNumber } from '@/lib/format';
import { PriceLatestFilters } from './PriceLatestFilters';
import { PriceLatestTable } from './PriceLatestTable';

export function PriceLatestListCard({
  rows,
  filtered,
  typeCounts,
  typeFilter,
  onTypeFilter,
  typeFilteredRows,
  taxCounts,
  taxFilter,
  onTaxFilter,
  search,
  onSearch,
  onExport,
  table,
  sortKey,
  sortDir,
  onSort,
  productTypeLookup,
  canEdit = false,
  onTypeChange,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">단가 목록</div>
          <div className="card-sub">
            {formatNumber(filtered.length)} / {formatNumber(rows.length)}개 표시
          </div>
        </div>
        <button className="btn sm" onClick={onExport} disabled={filtered.length === 0}>
          엑셀로 내보내기
        </button>
      </div>

      <PriceLatestFilters
        rowsCount={rows.length}
        typeCounts={typeCounts}
        typeFilter={typeFilter}
        onTypeFilter={onTypeFilter}
        typeFilteredCount={typeFilteredRows.length}
        taxCounts={taxCounts}
        taxFilter={taxFilter}
        onTaxFilter={onTaxFilter}
        search={search}
        onSearch={onSearch}
      />

      <PriceLatestTable
        filteredCount={filtered.length}
        paged={table.paged}
        page={table.page}
        totalPages={table.totalPages}
        total={table.total}
        onPage={table.goTo}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        productTypeLookup={productTypeLookup}
        canEdit={canEdit}
        onTypeChange={onTypeChange}
      />
    </div>
  );
}
