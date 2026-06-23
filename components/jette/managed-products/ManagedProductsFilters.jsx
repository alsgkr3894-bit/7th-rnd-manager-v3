'use client';

import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';

export function ManagedProductsFilters({
  counts,
  filter,
  onFilter,
  managedOnly,
  onToggleManagedOnly,
  search,
  onSearch,
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <Chip
          label="전체"
          count={counts.all}
          active={filter === 'all'}
          onClick={() => onFilter('all')}
        />
        <Chip
          label="전용상품"
          count={counts.exclusive}
          active={filter === 'exclusive'}
          onClick={() => onFilter('exclusive')}
        />
        <Chip
          label="범용상품"
          count={counts.generic}
          active={filter === 'generic'}
          onClick={() => onFilter('generic')}
        />
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <Chip
          label="관리품목만"
          count={counts.managed}
          active={managedOnly}
          onClick={onToggleManagedOnly}
        />
        {counts.disabled > 0 && (
          <Chip
            label="비활성"
            count={counts.disabled}
            active={filter === 'disabled'}
            onClick={() => onFilter('disabled')}
          />
        )}
      </div>

      <SearchBox value={search} onChange={onSearch} />
    </>
  );
}
