'use client';

const RATING_FILTERS = [
  { min: 0, label: '전체' },
  { min: 3, label: '★3이상' },
  { min: 4, label: '★4이상' },
  { min: 5, label: '★5' },
  { min: -1, label: '★없음' },
];

const VIEW_OPTIONS = [
  { v: 'grid', label: '갤러리' },
  { v: 'list', label: '리스트' },
  { v: 'calendar', label: '캘린더' },
];

export function SampleRatingViewControls({
  ratingMin,
  onRatingMinChange,
  ratingDist,
  sampleCount,
  sortOptions,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div
      className="sample-filter-row"
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <div className="sample-rating-row">
        {RATING_FILTERS.map(({ min, label }) => (
          <button
            key={min}
            className={'chip' + (ratingMin === min ? ' active' : '')}
            style={{ fontSize: 11 }}
            onClick={() => onRatingMinChange(min)}
          >
            {label}
          </button>
        ))}
        {sampleCount > 0 && (
          <span
            className="sample-rating-dist"
            style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 2, whiteSpace: 'nowrap' }}
          >
            5★ {ratingDist[5]} · 4★ {ratingDist[4]} · 3★ {ratingDist[3]} · 2★ {ratingDist[2]} · 1★{' '}
            {ratingDist[1]} · 없음 {ratingDist.none}
          </span>
        )}
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {sortOptions.map(({ key, label }) => (
          <button
            key={key}
            className={'chip' + (sortBy === key ? ' active' : '')}
            style={{ fontSize: 11 }}
            onClick={() => onSortChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {VIEW_OPTIONS.map(({ v, label }) => (
          <button
            key={v}
            className={'chip' + (viewMode === v ? ' active' : '')}
            style={{ fontSize: 11 }}
            onClick={() => onViewModeChange(v)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
