'use client';

import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { formatNumber } from '@/lib/format';
import {
  getShipmentProductTypeMeta,
  getShipmentRowValues,
  shipmentRowKey,
} from './shipmentTableUtils';

function ShipmentNoResults() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      조건에 맞는 항목이 없습니다
    </div>
  );
}

function ProductTypeChip({ type }) {
  const meta = getShipmentProductTypeMeta(type);
  return (
    <span className="chip" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function ShipmentRow({ row }) {
  const values = getShipmentRowValues(row);

  return (
    <tr>
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
        {values.productCode}
      </td>
      <td className="cell-name">
        <div className="menu-name">{values.productName}</div>
      </td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{values.unit}</td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{values.temperature}</td>
      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{values.taxType}</td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatNumber(values.totalQuantity)}
        <span className="unit">개</span>
      </td>
      <td className="num right">
        {values.priceWithTax != null ? (
          `${formatNumber(values.priceWithTax)}원`
        ) : (
          <span
            className="chip"
            style={{ background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 11 }}
          >
            단가 미연동
          </span>
        )}
      </td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatNumber(values.totalAmount)}
        <span className="unit">원</span>
      </td>
      <td>
        <ProductTypeChip type={values.productType} />
      </td>
      <td style={{ textAlign: 'center' }}>
        {values.isManaged ? (
          <span title="관리품목" style={{ color: 'var(--warn)', fontSize: 14 }}>
            ★
          </span>
        ) : (
          <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}

function ShipmentTableHeader({ sortKey, sortDir, onSort }) {
  return (
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
        <SortableTh sortKey="unit" active={sortKey} dir={sortDir} onClick={onSort} width={90}>
          단위
        </SortableTh>
        <SortableTh
          sortKey="temperature"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={90}
        >
          온도
        </SortableTh>
        <SortableTh sortKey="taxType" active={sortKey} dir={sortDir} onClick={onSort} width={80}>
          과세
        </SortableTh>
        <SortableTh
          sortKey="totalQuantity"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={120}
          right
        >
          총 출고량
        </SortableTh>
        <SortableTh
          sortKey="priceWithTax"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={120}
          right
        >
          부가세포함가
        </SortableTh>
        <SortableTh
          sortKey="totalAmount"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={140}
          right
        >
          총 출고 금액
        </SortableTh>
        <SortableTh
          sortKey="productType"
          active={sortKey}
          dir={sortDir}
          onClick={onSort}
          width={100}
        >
          분류
        </SortableTh>
        <SortableTh sortKey="isManaged" active={sortKey} dir={sortDir} onClick={onSort} width={80}>
          관리
        </SortableTh>
      </tr>
    </thead>
  );
}

export function ShipmentDataTable({
  filteredCount,
  paged,
  page,
  totalPages,
  total,
  onPage,
  sortKey,
  sortDir,
  onSort,
}) {
  if (filteredCount === 0) return <ShipmentNoResults />;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <ShipmentTableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
        <tbody>
          {paged.map((row, index) => (
            <ShipmentRow key={shipmentRowKey(row, page, index)} row={row} />
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} total={total} pageSize={80} />
    </div>
  );
}
