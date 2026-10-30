'use client';

import { useEffect, useState } from 'react';
import { MarketFilters } from './_MarketFilters';
import { MarketGroup } from './_MarketGroup';
import { allBrandsExpanded, toggleExpandedBrand } from './marketPageUtils';

/** 브랜드별로 접어 보는 시장조사 목록. */
export function MarketListPanel({
  rows,
  query,
  onQueryChange,
  filters,
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
  const [expandedBrands, setExpandedBrands] = useState(() => new Set());
  const [viewMode, setViewMode] = useState('grid');
  const allExpanded = allBrandsExpanded(groupedRows, expandedBrands);

  useEffect(() => {
    if (!query.trim()) return;
    setExpandedBrands(previous => new Set([...previous, ...groupedRows.map(group => group.label)]));
  }, [query, groupedRows]);

  function toggleBrand(label) {
    setExpandedBrands(previous => toggleExpandedBrand(previous, label));
  }

  return (
    <div className="form-layout market-layout">
      <section className="card table-card market-list-card">
        <div className="market-list-toolbar">
          <div className="market-list-title">
            <div className="card-title">시장조사 목록</div>
            <div className="card-sub">
              {groupedRows.length}개 브랜드 · {filtered.length}건 표시 / 총 {rows.length}건
            </div>
          </div>
          <div className="market-view-switch" role="group" aria-label="목록 보기 방식">
            <button
              type="button"
              className={`btn sm${viewMode === 'grid' ? ' primary' : ''}`}
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            >
              그리드
            </button>
            <button
              type="button"
              className={`btn sm${viewMode === 'list' ? ' primary' : ''}`}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              목록
            </button>
          </div>
        </div>
        <div className="market-filter-panel">
          <MarketFilters filters={filters} />
        </div>
        <div className="market-list-search-row">
          <input
            className="form-input"
            type="search"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="브랜드·제목·내용 검색"
            aria-label="시장조사 검색"
          />
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              setExpandedBrands(
                allExpanded ? new Set() : new Set(groupedRows.map(group => group.label))
              )
            }
            disabled={groupedRows.length === 0}
          >
            {allExpanded ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
        <div className="market-list-stack">
          {loading && <div className="market-list-empty">불러오는 중</div>}
          {!loading && filtered.length === 0 && (
            <div className="market-list-empty">
              {rows.length === 0
                ? '저장된 시장조사가 없습니다.'
                : '조건에 맞는 시장조사가 없습니다. 필터나 검색어를 바꿔 보세요.'}
            </div>
          )}
          {groupedRows.map(group => (
            <MarketGroup
              key={group.label}
              group={group}
              expanded={expandedBrands.has(group.label)}
              onToggle={() => toggleBrand(group.label)}
              viewMode={viewMode}
              activeId={activeId}
              canEdit={canEdit}
              onDetail={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
