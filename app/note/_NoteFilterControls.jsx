'use client';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { NOTE_BRANDS } from '@/lib/note/constants';

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'menuName', label: '메뉴명순' },
];

export function NoteFilterControls({
  brandFilter,
  statusFilter,
  counts,
  sortBy,
  viewMode,
  search,
  searchHistory,
  showSearchHistory,
  onBrandFilter,
  onStatusFilter,
  onSort,
  onView,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onSearchBlur,
  onSearchHistoryPick,
}) {
  const safeCounts = counts && typeof counts === 'object' ? counts : {};
  const safeSearchHistory = Array.isArray(searchHistory) ? searchHistory : [];

  return (
    <>
      {NOTE_BRANDS.length > 1 && (
        <div
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 2 }}>
            브랜드
          </span>
          <button
            className={'chip' + (brandFilter === 'all' ? ' active' : '')}
            onClick={() => onBrandFilter('all')}
          >
            전체
          </button>
          {NOTE_BRANDS.map(brand => (
            <button
              key={brand.id}
              className={'chip' + (brandFilter === brand.id ? ' active' : '')}
              onClick={() => onBrandFilter(brand.id)}
            >
              {brand.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="motion-stagger"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}
      >
        <button
          className={'chip' + (statusFilter === 'all' ? ' active' : '')}
          onClick={() => onStatusFilter('all')}
        >
          전체 <span style={{ fontSize: 11, opacity: 0.7 }}>{safeCounts.all}</span>
        </button>
        {STATUSES.map(status => (
          <button
            key={status}
            className={'chip' + (statusFilter === status ? ' active' : '')}
            onClick={() => onStatusFilter(status)}
            style={
              statusFilter !== status && safeCounts[status] > 0
                ? { borderColor: STATUS_BORDER[status], color: STATUS_COLORS[status].color }
                : {}
            }
          >
            {status} <span style={{ fontSize: 11, opacity: 0.7 }}>{safeCounts[status]}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {SORT_OPTIONS.map(option => (
            <button
              key={option.key}
              className={'chip' + (sortBy === option.key ? ' active' : '')}
              onClick={() => onSort(option.key)}
              style={{ fontSize: 11 }}
            >
              {option.label}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
          <button
            className={'chip' + (viewMode === 'card' ? ' active' : '')}
            onClick={() => onView('card')}
            title="카드 뷰"
          >
            <Icon.box style={{ width: 12, height: 12 }} />
          </button>
          <button
            className={'chip' + (viewMode === 'table' ? ' active' : '')}
            onClick={() => onView('table')}
            title="테이블 뷰"
          >
            <Icon.doc style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, position: 'relative' }}>
        <div className="filter-search">
          <Icon.search style={{ width: 15, height: 15, color: 'var(--text-3)' }} />
          <input
            placeholder="제목, 메뉴명, 테스트 내용, 태그 검색"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') onSearchSubmit();
            }}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
          />
        </div>
        {showSearchHistory && safeSearchHistory.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-md)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {safeSearchHistory.map((history, index) => (
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
                  borderBottom:
                    index < safeSearchHistory.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onMouseDown={event => {
                  event.preventDefault();
                  onSearchHistoryPick(history);
                }}
              >
                <Icon.search style={{ width: 11, height: 11, marginRight: 6, opacity: 0.5 }} />
                {history}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
