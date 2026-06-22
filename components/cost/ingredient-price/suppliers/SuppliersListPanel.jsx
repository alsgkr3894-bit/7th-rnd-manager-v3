'use client';

import { Icon } from '@/components/icons';

const HEADER_STYLE = {
  padding: '9px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-3)',
};

function LoadingState() {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
      로딩 중…
    </div>
  );
}

function EmptySuppliersState() {
  return (
    <div
      className="card empty-state"
      style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}
    >
      <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
        <Icon.box style={{ width: 32, height: 32, opacity: 0.35, marginBottom: 10 }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 공급업체가 없습니다</div>
        <div style={{ fontSize: 13 }}>
          위 <b>공급업체 추가</b> 버튼으로 첫 업체를 등록해보세요.
        </div>
      </div>
    </div>
  );
}

function EmptySearchState({ search }) {
  return (
    <div
      className="card"
      style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
    >
      &quot;{search}&quot; 검색 결과가 없습니다
    </div>
  );
}

function SupplierTableRow({ supplier, isLast, canEdit = false, onEdit, onDelete }) {
  return (
    <tr style={{ borderBottom: !isLast ? '1px solid var(--divider)' : undefined }}>
      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{supplier.name}</td>
      <td
        style={{
          padding: '10px 14px',
          fontSize: 12,
          color: supplier.contact ? 'var(--text-2)' : 'var(--text-4)',
        }}
      >
        {supplier.contact || '—'}
      </td>
      <td
        style={{
          padding: '10px 14px',
          fontSize: 12,
          color: supplier.phone ? 'var(--text-2)' : 'var(--text-4)',
          fontFamily: supplier.phone ? 'monospace' : undefined,
        }}
      >
        {supplier.phone || '—'}
      </td>
      <td
        style={{
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--text-3)',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {supplier.memo || ''}
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn xs"
            onClick={() => onEdit(supplier)}
            disabled={!canEdit}
          >
            수정
          </button>
          <button
            type="button"
            className="btn xs"
            style={{ color: 'var(--negative)' }}
            onClick={() => onDelete(supplier.id)}
            disabled={!canEdit}
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}

function SuppliersTable({ suppliers, canEdit = false, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)', background: 'var(--surface-2)' }}>
            <th style={HEADER_STYLE}>업체명</th>
            <th style={HEADER_STYLE}>담당자</th>
            <th style={HEADER_STYLE}>연락처</th>
            <th style={HEADER_STYLE}>메모</th>
            <th style={{ ...HEADER_STYLE, textAlign: 'right', width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier, index) => (
            <SupplierTableRow
              key={supplier.id}
              supplier={supplier}
              isLast={index >= suppliers.length - 1}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SuppliersListPanel({
  loading,
  suppliers,
  filteredSuppliers,
  search,
  canEdit = false,
  onEdit,
  onDelete,
}) {
  if (loading) return <LoadingState />;
  if (suppliers.length === 0) return <EmptySuppliersState />;
  if (filteredSuppliers.length === 0) return <EmptySearchState search={search} />;
  return (
    <SuppliersTable
      suppliers={filteredSuppliers}
      canEdit={canEdit}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
