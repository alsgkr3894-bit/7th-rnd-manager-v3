'use client';

import { MarketRecordCard } from './_MarketRecordCard';

/** 시장조사 목록 카드 — 건수/검색 툴바와 경쟁사별로 묶인 기록 카드 스택. */
export function MarketListPanel({
  rows,
  query,
  onQueryChange,
  loading,
  filtered,
  groupedRows,
  activeId,
  canEdit,
  onDetail,
  onEdit,
  onDelete,
  onPhotoClick,
}) {
  return (
    <div className="form-layout market-layout">
      <section className="card table-card market-list-card">
        <div className="market-list-toolbar">
          <div className="market-list-title">
            <div className="card-title">시장조사 목록</div>
            <div className="card-sub">총 {rows.length}건</div>
          </div>
        </div>
        <input
          className="form-input"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="키워드 검색"
          style={{ marginBottom: 12 }}
        />
        <div className="market-list-stack">
          {loading && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>불러오는 중</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>저장된 시장조사가 없습니다.</div>
          )}
          {groupedRows.map(group => (
            <div key={group.label} style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  paddingBottom: 4,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: group.color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontSize: 13 }}>{group.label}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{group.items.length}건</span>
              </div>
              {group.items.map(row => (
                <MarketRecordCard
                  key={row.id}
                  row={row}
                  color={group.color}
                  active={activeId === row.id}
                  canEdit={canEdit}
                  onDetail={onDetail}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPhotoClick={onPhotoClick}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
