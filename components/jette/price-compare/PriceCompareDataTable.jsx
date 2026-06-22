'use client';

import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { PRICE_COMPARE_PAGE_SIZE } from './priceCompareTableUtils';
import { PriceCompareRow } from './PriceCompareRow';

export function PriceCompareDataTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  productTypeLookup,
  canEdit = false,
  onTypeChange,
  priceAlertThreshold,
  page,
  totalPages,
  onPage,
  total,
}) {
  if (total === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        조건에 맞는 항목이 없습니다
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh
              sortKey="productCode"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={100}
            >
              제품코드
            </SortableTh>
            <SortableTh sortKey="productName" active={sortKey} dir={sortDir} onClick={onSort}>
              제품명
            </SortableTh>
            <th style={{ width: 100 }}>분류</th>
            <SortableTh
              sortKey="basePrice"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={130}
              right
            >
              이전 단가
            </SortableTh>
            <SortableTh
              sortKey="latestPrice"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={130}
              right
            >
              현재 단가
            </SortableTh>
            <SortableTh
              sortKey="changeAmount"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={120}
              right
            >
              변동액
            </SortableTh>
            <SortableTh
              sortKey="changeRate"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={120}
              right
            >
              변동률
            </SortableTh>
            <th style={{ width: 90 }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <PriceCompareRow
              key={`${asDisplayText(row.productCode || row.productName, 'product')}-${index}`}
              row={row}
              productTypeLookup={productTypeLookup}
              canEdit={canEdit}
              onTypeChange={onTypeChange}
              priceAlertThreshold={priceAlertThreshold}
            />
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={onPage}
        total={total}
        pageSize={PRICE_COMPARE_PAGE_SIZE}
      />
    </div>
  );
}
