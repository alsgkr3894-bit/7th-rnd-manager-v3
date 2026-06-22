'use client';

import { useCallback, useEffect, useRef } from 'react';
import { FilterBar } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { ManageRow } from '@/components/ingredient/ManageRow';
import {
  DISCONTINUED_FILTER,
  NO_PRICE_FILTER,
  UNCATEGORIZED_FILTER,
} from '@/lib/ingredient/constants';
import { getCategoryStyle } from '@/lib/ingredient';
import { SavedViewSelector } from '@/components/ui/SavedViewSelector';

const PAGE_SIZE = 60;

export function IngredientManagePanel({
  rows,
  filtered,
  activeCount,
  managedCount,
  mainCats,
  categoryCounts,
  hashTags,
  tagCounts,
  uncategorized,
  noPriceCount,
  discontinuedCount,
  catFilter,
  tagFilter,
  search,
  onSearch,
  onCatFilter,
  onTagFilter,
  batchMode,
  selected,
  toggleSelect,
  deletePending,
  deletePreview,
  onEdit,
  onCopy,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onRestore,
  highlightId,
  highlightProductCode,
  onHighlightClear,
  isViewer = false,
}) {
  const { page, goTo, totalPages, paged, total } = usePagination(filtered, PAGE_SIZE);
  const highlightIdKey = highlightId != null ? String(highlightId) : '';
  const highlightProductCodeKey =
    highlightProductCode != null ? String(highlightProductCode).trim().toLowerCase() : '';
  const isHighlightedRow = useCallback(
    row =>
      (highlightIdKey && String(row?.id) === highlightIdKey) ||
      (highlightProductCodeKey &&
        String(row?.productCode ?? '')
          .trim()
          .toLowerCase() === highlightProductCodeKey),
    [highlightIdKey, highlightProductCodeKey]
  );

  // highlight 대상이 다른 페이지에 있으면 해당 페이지로 이동한다.
  useEffect(() => {
    if (!highlightIdKey && !highlightProductCodeKey) return;
    const index = filtered.findIndex(row => isHighlightedRow(row));
    if (index < 0) return;
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    if (targetPage !== page) goTo(targetPage);
  }, [filtered, highlightIdKey, highlightProductCodeKey, isHighlightedRow, page, goTo]);

  // 대상 행 렌더 후 화면 중앙으로 이동한다.
  useEffect(() => {
    if (!highlightIdKey && !highlightProductCodeKey) return;
    if (!paged.some(row => isHighlightedRow(row))) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector('[data-ingredient-highlighted="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [paged, highlightIdKey, highlightProductCodeKey, isHighlightedRow]);

  // rows 로드 완료 후 2.5초 뒤 하이라이트 해제
  const clearTimerRef = useRef(null);
  useEffect(() => {
    if ((!highlightIdKey && !highlightProductCodeKey) || rows.length === 0) return;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      onHighlightClear?.();
      clearTimerRef.current = null;
    }, 2500);
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightIdKey, highlightProductCodeKey, rows.length]);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
            분류
          </span>
          <button
            className={'chip' + (catFilter === 'all' ? ' active' : '')}
            onClick={() => onCatFilter('all')}
          >
            전체 {activeCount}
          </button>
          {mainCats.map(category => (
            <button
              key={category}
              className={'chip' + (catFilter === category ? ' active' : '')}
              style={catFilter !== category ? getCategoryStyle(category) : undefined}
              onClick={() => onCatFilter(category)}
            >
              {category} {categoryCounts.get(category) || 0}
            </button>
          ))}
          {uncategorized > 0 && (
            <button
              className={'chip' + (catFilter === UNCATEGORIZED_FILTER ? ' active' : '')}
              style={catFilter !== UNCATEGORIZED_FILTER ? { color: 'var(--warn)' } : undefined}
              onClick={() =>
                onCatFilter(catFilter === UNCATEGORIZED_FILTER ? 'all' : UNCATEGORIZED_FILTER)
              }
            >
              미분류 {uncategorized}
            </button>
          )}
          {noPriceCount > 0 && (
            <button
              className={'chip' + (catFilter === NO_PRICE_FILTER ? ' active' : '')}
              style={catFilter !== NO_PRICE_FILTER ? { color: 'var(--warn)' } : undefined}
              onClick={() => onCatFilter(catFilter === NO_PRICE_FILTER ? 'all' : NO_PRICE_FILTER)}
            >
              단가 없음 {noPriceCount}
            </button>
          )}
          {discontinuedCount > 0 && (
            <button
              className={'chip' + (catFilter === DISCONTINUED_FILTER ? ' active' : '')}
              style={
                catFilter !== DISCONTINUED_FILTER
                  ? { color: 'var(--text-3)', marginLeft: 'auto' }
                  : { marginLeft: 'auto' }
              }
              onClick={() =>
                onCatFilter(catFilter === DISCONTINUED_FILTER ? 'all' : DISCONTINUED_FILTER)
              }
            >
              단종 {discontinuedCount}
            </button>
          )}
        </div>

        {hashTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
              #태그
            </span>
            <button
              className={'chip' + (tagFilter === 'all' ? ' active' : '')}
              onClick={() => onTagFilter('all')}
            >
              전체
            </button>
            {hashTags.map(tag => (
              <button
                key={tag}
                className={'chip' + (tagFilter === tag ? ' active' : '')}
                onClick={() => onTagFilter(tagFilter === tag ? 'all' : tag)}
              >
                #{tag} {tagCounts.get(tag) || 0}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <FilterBar search={search} onSearch={onSearch} />
          <SavedViewSelector
            screen="ingredient-manage"
            currentFilters={{ catFilter, tagFilter, search }}
            onApply={filters => {
              if (filters.catFilter != null) onCatFilter(filters.catFilter);
              if (filters.tagFilter != null) onTagFilter(filters.tagFilter);
              if (filters.search != null) onSearch(filters.search);
            }}
          />
        </div>
      </div>

      {catFilter === NO_PRICE_FILTER && filtered.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: -4 }}>
          단가 없는 식자재 {filtered.length}개 — 행을 클릭해서 폼에서 단가를 입력하세요
        </div>
      )}

      <div className="card table-card">
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            조건에 맞는 항목이 없습니다
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table stagger-rows">
              <thead>
                <tr>
                  {batchMode && <th style={{ width: 36 }} />}
                  <th style={{ width: 88 }}>제품코드</th>
                  <th style={{ width: 58 }}>사진</th>
                  <th>제품명</th>
                  <th style={{ width: 60 }}>온도</th>
                  <th style={{ width: 88 }}>포장단위</th>
                  <th style={{ width: 80 }}>전용/범용</th>
                  <th style={{ width: 108, textAlign: 'right' }}>부가세포함단가</th>
                  <th style={{ width: 96 }}>분류</th>
                  <th style={{ width: 140 }}>#태그</th>
                  <th style={{ width: 96 }}>제조사</th>
                  <th style={{ width: 76 }} />
                </tr>
              </thead>
              <tbody>
                {paged.map((row, index) => {
                  const rowKey = `${row.productCode ?? row.id ?? 'm'}-${index}`;
                  const isPending = row.isManual
                    ? deletePending?.isManual && deletePending?.id === row.id
                    : deletePending?.productCode === row.productCode;
                  return (
                    <ManageRow
                      key={rowKey}
                      r={row}
                      deletePending={isPending}
                      deletePreview={isPending ? deletePreview : null}
                      onEdit={() => onEdit(row)}
                      onCopy={() => onCopy(row)}
                      onDeleteStart={() => onDeleteStart(row)}
                      onDeleteCancel={onDeleteCancel}
                      onDeleteConfirm={() => onDeleteConfirm(row)}
                      onRestore={() => onRestore(row.productCode)}
                      isViewer={isViewer}
                      batchMode={batchMode}
                      isSelected={selected.has(row.id)}
                      onToggleSelect={toggleSelect}
                      isHighlighted={isHighlightedRow(row)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--divider)' }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={goTo}
            total={total}
            pageSize={PAGE_SIZE}
          />
          <div
            style={{
              padding: '8px 16px',
              fontSize: 11,
              color: 'var(--text-3)',
            }}
          >
            {filtered.length}개 표시 / 전체 {rows.length}개 · 관리 중 {managedCount}개
          </div>
        </div>
      </div>
    </>
  );
}
