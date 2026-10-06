'use client';
import { useEffect, useState } from 'react';
import { SearchBox } from '@/components/ui/SearchBox';
import { monthLabel, safeMonth, shiftMonth } from './journalDates';
import { JOURNAL_LIST_FILTERS } from './journalSearch';
import { EntryRow } from './_JournalListRow';

const LIST_PAGE_SIZE = 50;

const S_EMPTY = {
  border: '1px dashed var(--border)',
  borderRadius: 8,
  padding: '18px 14px',
  textAlign: 'center',
  color: 'var(--text-3)',
  fontSize: 13,
};

export function JournalMonthList({
  month,
  entries,
  totalEntries,
  selectedDate,
  onMonthChange,
  onSelectDate,
  search,
  onSearch,
  listFilter = 'all',
  onListFilter,
  searchScope = 'month',
  onPhotoClick,
}) {
  const [expandedDates, setExpandedDates] = useState(() => new Set());
  // 넓은 검색어('2026' 등)는 거의 모든 날이 걸려 사진 썸네일이 한꺼번에 그려졌다 — 50일씩 보여준다
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  useEffect(() => setVisibleCount(LIST_PAGE_SIZE), [search, month, listFilter]);
  const query = String(search || '').trim();
  const searchingAll = searchScope === 'all';

  function toggle(date) {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const summary = searchingAll
    ? `'${query}' 검색 · 전체 기간 ${entries.length}일`
    : `${monthLabel(month)} · ${entries.length}일 표시 / 전체 ${totalEntries}일`;

  return (
    <section className="card" style={{ padding: 18, marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div>
          <div className="card-title">연구일지 목록</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{summary}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 240, flex: '1 1 240px', minWidth: 0 }}>
            <SearchBox
              value={search}
              onChange={onSearch}
              placeholder="전체 기간 검색 (일지·노트·일정)"
            />
          </div>
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            disabled={searchingAll}
          >
            이전 달
          </button>
          <input
            className="form-input"
            type="month"
            value={safeMonth(month)}
            onChange={event => {
              if (event.target.value) onMonthChange(event.target.value);
            }}
            disabled={searchingAll}
            style={{ width: 132 }}
          />
          <button
            className="btn sm"
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            disabled={searchingAll}
          >
            다음 달
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {JOURNAL_LIST_FILTERS.map(filter => (
          <button
            key={filter.id}
            type="button"
            className={'chip' + (listFilter === filter.id ? ' active' : '')}
            onClick={() => onListFilter?.(filter.id)}
          >
            {filter.label}
          </button>
        ))}
        {searchingAll && (
          <button type="button" className="chip" onClick={() => onSearch('')}>
            검색 지우고 {monthLabel(month)} 보기
          </button>
        )}
      </div>

      {!searchingAll && totalEntries === 0 ? (
        <div style={S_EMPTY}>이 달에 저장된 연구일지나 일정이 없습니다.</div>
      ) : entries.length === 0 ? (
        <div style={S_EMPTY}>
          {searchingAll
            ? '전체 기간에서 찾지 못했습니다. 다른 키워드로 검색해보세요.'
            : '조건에 맞는 날이 없습니다. 보기 필터를 바꿔보세요.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {entries.slice(0, visibleCount).map(entry => (
            <EntryRow
              key={entry.date}
              entry={entry}
              selected={entry.date === selectedDate}
              expanded={expandedDates.has(entry.date)}
              query={query}
              onSelect={onSelectDate}
              onToggle={toggle}
              onPhotoClick={onPhotoClick}
            />
          ))}
          {entries.length > visibleCount && (
            <button
              type="button"
              className="btn"
              onClick={() => setVisibleCount(count => count + LIST_PAGE_SIZE)}
            >
              더 보기 ({entries.length - visibleCount}일 남음)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
