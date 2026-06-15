'use client';

import { SampleEmptyState } from './_SampleEmptyState';
import { SampleGridView } from './_SampleGridView';
import { SampleListView } from './_SampleListView';
import { SampleLoadingGrid } from './_SampleLoadingGrid';

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
      <SampleGridView
        rows={rows}
        catFilter={catFilter}
        ratingMin={ratingMin}
        sortBy={sortBy}
        batchMode={batchMode}
        selected={selected}
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
    );
  }

  if (viewMode === 'list' && rows.length > 0) {
    return (
      <SampleListView
        rows={rows}
        catFilter={catFilter}
        ratingMin={ratingMin}
        sortBy={sortBy}
        batchMode={batchMode}
        toggleSelect={toggleSelect}
        compareMode={compareMode}
        toggleCompare={toggleCompare}
        onOpenSample={onOpenSample}
        onEditSample={onEditSample}
        onCopySample={onCopySample}
        onDeleteSample={onDeleteSample}
      />
    );
  }

  return null;
}
