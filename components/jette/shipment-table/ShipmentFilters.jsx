'use client';

import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';

export function ShipmentFilters({
  counts,
  typeFilter,
  onTypeFilter,
  managedOnly,
  onManagedOnly,
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
          active={typeFilter === 'all'}
          onClick={() => onTypeFilter('all')}
        />
        <Chip
          label="전용상품"
          count={counts.exclusive}
          active={typeFilter === 'exclusive'}
          onClick={() => onTypeFilter('exclusive')}
        />
        <Chip
          label="범용상품"
          count={counts.generic}
          active={typeFilter === 'generic'}
          onClick={() => onTypeFilter('generic')}
        />
        <Chip
          label="범용관리"
          count={counts['generic-managed']}
          active={typeFilter === 'generic-managed'}
          onClick={() => onTypeFilter('generic-managed')}
        />
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <Chip
          label="관리품목만"
          count={counts.managed}
          active={managedOnly}
          onClick={onManagedOnly}
        />
      </div>

      <SearchBox value={search} onChange={onSearch} />
    </>
  );
}
