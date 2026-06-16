'use client';

import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { CHANGE_FILTERS, TYPE_FILTERS } from './priceCompareTableUtils';

export function PriceCompareFilters({
  rowCount,
  typeCounts,
  typeFilter,
  onTypeFilter,
  counts,
  filter,
  onFilter,
  search,
  onSearch,
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {TYPE_FILTERS.map(option => (
          <Chip
            key={option.key}
            label={option.label}
            count={option.key === 'all' ? rowCount : typeCounts[option.countKey]}
            active={typeFilter === option.key}
            onClick={() => onTypeFilter(option.key)}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {CHANGE_FILTERS.map(option => (
          <Chip
            key={option.key}
            label={option.label}
            count={counts[option.key]}
            active={filter === option.key}
            onClick={() => onFilter(option.key)}
            color={option.color}
          />
        ))}
      </div>

      <SearchBox value={search} onChange={onSearch} />
    </>
  );
}
