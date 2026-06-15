'use client';

import { Icon } from '@/components/icons';

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

export function SampleFilterControls({
  categories,
  catCounts,
  catFilter,
  onCatFilterChange,
  ratingMin,
  onRatingMinChange,
  ratingDist,
  sampleCount,
  sortOptions,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  showSearchHist,
  onSearchFocus,
  onSearchBlur,
  searchHistory,
  onSelectSearchHistory,
}) {
  const categoryItems = [
    { key: 'all', label: '전체' },
    ...(Array.isArray(categories)
      ? categories.map(category => ({ key: category, label: category }))
      : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, marginBottom: 8 }}>
        {categoryItems.map(({ key, label }) => (
          <button
            key={key}
            className={'chip' + (catFilter === key ? ' active' : '')}
            onClick={() => onCatFilterChange(key)}
          >
            {label}
            {catCounts?.[key] > 0 && (
              <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                {catCounts[key] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

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

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Icon.search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'var(--text-3)',
            }}
          />
          <input
            className="form-input filter-search"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder="제목, 메뉴명, 내용, 태그 검색"
          />
          {showSearchHist && searchHistory.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0 0 10px 10px',
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: 13,
                    color: 'var(--text-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseDown={event => {
                    event.preventDefault();
                    onSelectSearchHistory(item);
                  }}
                >
                  🕐 {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
