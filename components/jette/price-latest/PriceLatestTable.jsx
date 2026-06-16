'use client';

import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';
import { TypeSelect } from '../_TypeSelect';
import { latestTaxChipStyle } from './priceLatestViewUtils';

function PriceLatestNoResults() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      조건에 맞는 항목이 없습니다
    </div>
  );
}

function PriceLatestRow({ row, productTypeLookup, onTypeChange }) {
  return (
    <tr>
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
        {row.productCode || '-'}
      </td>
      <td className="cell-name">
        <div className="menu-name">{row.productName}</div>
      </td>
      <td>
        <TypeSelect
          productCode={row.productCode}
          productName={row.productName}
          productTypeLookup={productTypeLookup}
          onTypeChange={onTypeChange}
        />
      </td>
      <td>
        <span className="chip" style={latestTaxChipStyle(row.taxType)}>
          {row.taxType || '-'}
        </span>
      </td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{row.salesUnit || '-'}</td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{row.temperature || '-'}</td>
      <td className="num right">
        {formatNumber(row.price)}
        <span className="unit">원</span>
      </td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatNumber(row.priceWithTax)}
        <span className="unit">원</span>
      </td>
    </tr>
  );
}

export function PriceLatestTable({
  filteredCount,
  paged,
  page,
  totalPages,
  total,
  onPage,
  sortKey,
  sortDir,
  onSort,
  productTypeLookup,
  onTypeChange,
}) {
  if (filteredCount === 0) return <PriceLatestNoResults />;

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
              sortKey="taxType"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={90}
            >
              과세구분
            </SortableTh>
            <SortableTh
              sortKey="salesUnit"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={100}
            >
              판매단위
            </SortableTh>
            <SortableTh
              sortKey="temperature"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={100}
            >
              온도
            </SortableTh>
            <SortableTh
              sortKey="price"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={130}
              right
            >
              단가
            </SortableTh>
            <SortableTh
              sortKey="priceWithTax"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={140}
              right
            >
              부가세포함가
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {paged.map((row, index) => (
            <PriceLatestRow
              key={`${row.productCode || row.productName}-${index}`}
              row={row}
              productTypeLookup={productTypeLookup}
              onTypeChange={onTypeChange}
            />
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} total={total} pageSize={80} />
    </div>
  );
}
