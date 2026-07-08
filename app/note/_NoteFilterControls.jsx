'use client';
import { Icon } from '@/components/icons';
import { STATUSES, STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { NOTE_UNIFIED_TYPES, NOTE_UNIFIED_TYPE_ALL } from '@/lib/note/unified-records';

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'menuName', label: '제목순' },
];

export function NoteFilterControls({
  statusFilter,
  typeFilter = NOTE_UNIFIED_TYPE_ALL,
  counts,
  typeCounts,
  sortBy,
  viewMode,
  search,
  searchHistory,
  showSearchHistory,
  onStatusFilter,
  onTypeFilter,
  onSort,
  onView,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onSearchBlur,
  onSearchHistoryPick,
}) {
  const safeCounts = counts && typeof counts === 'object' ? counts : {};
  const safeTypeCounts = typeCounts && typeof typeCounts === 'object' ? typeCounts : {};
  const safeSearchHistory = Array.isArray(searchHistory) ? searchHistory : [];

  return (
    <>
      <div
        className="motion-stagger"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}
      >
        <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-3)' }}>유형</span>
        <button
          className={'chip' + (typeFilter === NOTE_UNIFIED_TYPE_ALL ? ' active' : '')}
          onClick={() => onTypeFilter?.(NOTE_UNIFIED_TYPE_ALL)}
        >
          전체{' '}
          {safeTypeCounts[NOTE_UNIFIED_TYPE_ALL] > 0 && (
            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {safeTypeCounts[NOTE_UNIFIED_TYPE_ALL]}
            </span>
          )}
        </button>
        {NOTE_UNIFIED_TYPES.map(type => (
          <button
            key={type}
            className={'chip' + (typeFilter === type ? ' active' : '')}
            onClick={() => onTypeFilter?.(type)}
          >
            {type}{' '}
            {safeTypeCounts[type] > 0 && (
              <span style={{ fontSize: 11, opacity: 0.7 }}>{safeTypeCounts[type]}</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="motion-stagger"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}
      >
        <button
          className={'chip' + (statusFilter === 'all' ? ' active' : '')}
          onClick={() => onStatusFilter('all')}
        >
          전체{' '}
          {safeCounts.all > 0 && (
            <span style={{ fontSize: 11, opacity: 0.7 }}>{safeCounts.all}</span>
          )}
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
            {status}{' '}
            {safeCounts[status] > 0 && (
              <span style={{ fontSize: 11, opacity: 0.7 }}>{safeCounts[status]}</span>
            )}
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
            placeholder="제목, 테스트 내용, 태그 검색"
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
