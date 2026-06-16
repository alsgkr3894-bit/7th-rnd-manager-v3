'use client';

import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SortableTh } from '@/components/ui/SortableTh';
import { ManagedProductsRow } from '../ManagedProductsRow';
import { MANAGED_PRODUCTS_PAGE_SIZE } from './managedProductsCardUtils';

export function ManagedProductsTable({
  rows,
  total,
  page,
  totalPages,
  onPage,
  search,
  sortKey,
  sortDir,
  onSort,
  pendingDeleteId,
  onToggleEnable,
  onChangeType,
  onToggleManaged,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={<Icon.box style={{ width: 28, height: 28 }} />}
        title={search ? '조건에 맞는 제품이 없습니다' : '관리 대상 제품이 없습니다'}
        desc={search ? '검색어를 바꿔보세요' : '상단에서 제품을 추가해 관리하세요'}
      />
    );
  }

  return (
    <div style={{ maxHeight: 480, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
      <table className="data-table">
        <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <tr>
            <SortableTh
              sortKey="productCode"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={120}
            >
              제품코드
            </SortableTh>
            <SortableTh sortKey="productName" active={sortKey} dir={sortDir} onClick={onSort}>
              제품명
            </SortableTh>
            <SortableTh
              sortKey="enable"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={70}
              style={{ textAlign: 'center' }}
            >
              활성
            </SortableTh>
            <SortableTh
              sortKey="productType"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={130}
            >
              분류
            </SortableTh>
            <SortableTh
              sortKey="isManaged"
              active={sortKey}
              dir={sortDir}
              onClick={onSort}
              width={80}
              style={{ textAlign: 'center' }}
            >
              관리품목
            </SortableTh>
            <th style={{ width: 150 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(product => (
            <ManagedProductsRow
              key={product.id}
              product={product}
              onToggleEnable={onToggleEnable}
              onChangeType={onChangeType}
              onToggleManaged={onToggleManaged}
              pendingDelete={pendingDeleteId === product.id}
              onAskDelete={() => onAskDelete(product.id)}
              onCancelDelete={onCancelDelete}
              onConfirmDelete={() => onConfirmDelete(product.id)}
            />
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={onPage}
        total={total}
        pageSize={MANAGED_PRODUCTS_PAGE_SIZE}
      />
    </div>
  );
}
