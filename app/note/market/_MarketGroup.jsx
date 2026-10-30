'use client';

import { MarketRecordCard } from './_MarketRecordCard';

export function MarketGroup({
  group,
  expanded,
  onToggle,
  viewMode,
  activeId,
  canEdit,
  onDetail,
  onEdit,
  onDelete,
  onPhotoClick,
}) {
  return (
    <section className="market-group" style={{ '--market-group-color': group.color }}>
      <button
        type="button"
        className="market-group-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${group.label} 브랜드 ${group.items.length}건 ${expanded ? '접기' : '펼치기'}`}
      >
        <span className="market-group-dot" aria-hidden="true" />
        <strong className="market-group-name">{group.label}</strong>
        <span className="market-group-count">{group.items.length}건</span>
        <span className="market-group-date">최근 조사 {group.items[0]?.date || '날짜 없음'}</span>
        <span className={`market-group-chevron${expanded ? ' is-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {expanded && (
        <div className={`market-group-items${viewMode === 'list' ? ' is-list' : ''}`}>
          {group.items.map(row => (
            <MarketRecordCard
              key={row.id}
              row={row}
              color={group.color}
              viewMode={viewMode}
              active={activeId === row.id}
              canEdit={canEdit}
              onDetail={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
