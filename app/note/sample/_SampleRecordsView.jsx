'use client';

import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { SampleEmptyState } from './_SampleEmptyState';
import { SampleGridView } from './_SampleGridView';
import { SampleListView } from './_SampleListView';
import { SampleLoadingGrid } from './_SampleLoadingGrid';

const SAMPLE_PAGE_SIZE = 24;

export function SampleRecordsView({
  loading,
  viewMode,
  filtered,
  catFilter,
  ratingMin,
  sortBy,
  search,
  batchMode,
  selected,
  canEdit = false,
  toggleSelect,
  compareMode,
  toggleCompare,
  compareIdxMap,
  onOpenSample,
  onEditSample,
  onCopySample,
  onDeleteSample,
  onRatingChange,
  onCreateSample,
}) {
  const rows = Array.isArray(filtered) ? filtered : [];
  const { page, goTo, totalPages, paged, total } = usePagination(rows, SAMPLE_PAGE_SIZE);

  if (loading) {
    return <SampleLoadingGrid />;
  }

  if ((viewMode === 'grid' || viewMode === 'list') && rows.length === 0) {
    return (
      <SampleEmptyState
        search={search}
        ratingMin={ratingMin}
        catFilter={catFilter}
        onCreateSample={onCreateSample}
      />
    );
  }

  if (viewMode === 'grid' && rows.length > 0) {
    return (
      <>
        <SampleGridView
          rows={paged}
          catFilter={catFilter}
          ratingMin={ratingMin}
          sortBy={sortBy}
          batchMode={batchMode}
          selected={selected}
          canEdit={canEdit}
          toggleSelect={toggleSelect}
          compareMode={compareMode}
          toggleCompare={toggleCompare}
          compareIdxMap={compareIdxMap}
          onOpenSample={onOpenSample}
          onEditSample={onEditSample}
          onCopySample={onCopySample}
          onDeleteSample={onDeleteSample}
          onRatingChange={onRatingChange}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={goTo}
          total={total}
          pageSize={SAMPLE_PAGE_SIZE}
        />
      </>
    );
  }

  if (viewMode === 'list' && rows.length > 0) {
    return (
      <>
        <SampleListView
          rows={paged}
          catFilter={catFilter}
          ratingMin={ratingMin}
          sortBy={sortBy}
          batchMode={batchMode}
          canEdit={canEdit}
          toggleSelect={toggleSelect}
          compareMode={compareMode}
          toggleCompare={toggleCompare}
          onOpenSample={onOpenSample}
          onEditSample={onEditSample}
          onCopySample={onCopySample}
          onDeleteSample={onDeleteSample}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={goTo}
          total={total}
          pageSize={SAMPLE_PAGE_SIZE}
        />
      </>
    );
  }

  return null;
}
