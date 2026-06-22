'use client';

import { Icon } from '@/components/icons';

export function SuppliersToolbar({ search, canEdit = false, onSearch, onAdd }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div className="filter-search" style={{ flex: '1 1 200px', maxWidth: 320 }}>
        <Icon.search style={{ width: 13, height: 13, color: 'var(--text-3)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={event => onSearch(event.target.value)}
          placeholder="업체명·담당자·연락처 검색"
        />
      </div>
      <button
        type="button"
        className="btn primary"
        style={{ marginLeft: 'auto' }}
        onClick={onAdd}
        disabled={!canEdit}
      >
        <Icon.plus style={{ width: 13, height: 13 }} /> 공급업체 추가
      </button>
    </div>
  );
}
