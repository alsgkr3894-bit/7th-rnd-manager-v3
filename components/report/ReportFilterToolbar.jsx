'use client';

import { FilterBar } from '@/components/ui/PageHeader';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const REPORT_FILTER_CHIPS = [
  { id: 'all', label: '전체' },
  { id: 'sales', label: '판매량' },
  { id: 'cost', label: '원가' },
  { id: 'price', label: '가격' },
  { id: 'shipment', label: '출고량' },
];

export function ReportFilterToolbar({
  reports,
  search,
  onSearch,
  kindFilter,
  onKindFilterChange,
  favOnly,
  onFavOnlyChange,
  filteredCount,
}) {
  const rows = asObjectArray(reports);
  const favoriteCount = rows.filter(row => row.fav).length;

  return (
    <>
      <FilterBar
        search={search}
        onSearch={onSearch}
        chips={REPORT_FILTER_CHIPS.map(chip => ({
          label: chip.label,
          count:
            chip.id === 'all'
              ? rows.length
              : rows.filter(row => asDisplayText(row.kind) === chip.id).length,
          active: kindFilter === chip.id,
          onClick: () => onKindFilterChange(chip.id),
        }))}
      />

      <div className="report-list-toolbar">
        <button
          className={'report-toolbar-pill ' + (favOnly ? 'active' : '')}
          onClick={() => onFavOnlyChange(value => !value)}
        >
          <span style={{ color: '#F59E0B' }}>★</span>즐겨찾기만
          <span className="muted">({favoriteCount})</span>
        </button>
        <div className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
          {filteredCount}건 표시
        </div>
      </div>
    </>
  );
}
