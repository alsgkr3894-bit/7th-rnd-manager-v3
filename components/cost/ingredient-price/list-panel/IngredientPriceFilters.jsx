'use client';

import { Icon } from '@/components/icons';
import { SelectionToolbar } from '@/components/cost/manage/table-utils';

export function IngredientPriceFilters({
  taxFilter,
  search,
  priceTable,
  onTaxFilter,
  onSearch,
  onSelectedDelete,
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>과세</span>
          {['all', '과세', '면세'].map(type => (
            <button
              key={type}
              className={'chip' + (taxFilter === type ? ' active' : '')}
              onClick={() => onTaxFilter(type)}
            >
              {type === 'all' ? '전체' : type}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div className="filter-search" style={{ width: 260 }}>
          <Icon.search style={{ width: 15, height: 15, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder="제품코드·제품명·마스터명 검색"
          />
        </div>
        <SelectionToolbar
          selectedCount={priceTable.selected.size}
          confirming={priceTable.confirmingDelete}
          noun="식자재"
          onAskDelete={() => priceTable.setConfirmingDelete(true)}
          onConfirmDelete={onSelectedDelete}
          onCancel={priceTable.clearSelection}
        />
      </div>
    </>
  );
}
