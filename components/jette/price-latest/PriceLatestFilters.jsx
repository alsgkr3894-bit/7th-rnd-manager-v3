'use client';

import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';

export function PriceLatestFilters({
  rowsCount,
  typeCounts,
  typeFilter,
  onTypeFilter,
  typeFilteredCount,
  taxCounts,
  taxFilter,
  onTaxFilter,
  search,
  onSearch,
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <Chip
          label="전체"
          count={rowsCount}
          active={typeFilter === 'all'}
          onClick={() => onTypeFilter('all')}
        />
        <Chip
          label="전용"
          count={typeCounts.exclusive}
          active={typeFilter === 'exclusive'}
          onClick={() => onTypeFilter('exclusive')}
        />
        <Chip
          label="범용"
          count={typeCounts.generic}
          active={typeFilter === 'generic'}
          onClick={() => onTypeFilter('generic')}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Chip
          label="전체"
          count={typeFilteredCount}
          active={taxFilter === 'all'}
          onClick={() => onTaxFilter('all')}
        />
        <Chip
          label="과세"
          count={taxCounts.taxable}
          active={taxFilter === '과세'}
          onClick={() => onTaxFilter('과세')}
        />
        <Chip
          label="면세"
          count={taxCounts.exempt}
          active={taxFilter === '면세'}
          onClick={() => onTaxFilter('면세')}
        />
      </div>

      <SearchBox value={search} onChange={onSearch} />
    </>
  );
}
