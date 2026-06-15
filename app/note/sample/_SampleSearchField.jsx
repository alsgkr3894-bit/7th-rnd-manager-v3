'use client';

import { Icon } from '@/components/icons';

export function SampleSearchField({
  search,
  onSearchChange,
  showSearchHist,
  onSearchFocus,
  onSearchBlur,
  searchHistory,
  onSelectSearchHistory,
}) {
  return (
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
  );
}
