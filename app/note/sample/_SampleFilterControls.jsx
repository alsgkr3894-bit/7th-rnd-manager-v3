'use client';

import { SampleCategoryFilter } from './_SampleCategoryFilter';
import { SampleRatingViewControls } from './_SampleRatingViewControls';
import { SampleSearchField } from './_SampleSearchField';

export function SampleFilterControls({
  categories,
  catCounts,
  catFilter,
  onCatFilterChange,
  ratingMin,
  onRatingMinChange,
  ratingDist,
  sampleCount,
  sortOptions,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  showSearchHist,
  onSearchFocus,
  onSearchBlur,
  searchHistory,
  onSelectSearchHistory,
}) {
  return (
    <>
      <SampleCategoryFilter
        categories={categories}
        catCounts={catCounts}
        catFilter={catFilter}
        onCatFilterChange={onCatFilterChange}
      />
      <SampleRatingViewControls
        ratingMin={ratingMin}
        onRatingMinChange={onRatingMinChange}
        ratingDist={ratingDist}
        sampleCount={sampleCount}
        sortOptions={sortOptions}
        sortBy={sortBy}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <SampleSearchField
        search={search}
        onSearchChange={onSearchChange}
        showSearchHist={showSearchHist}
        onSearchFocus={onSearchFocus}
        onSearchBlur={onSearchBlur}
        searchHistory={searchHistory}
        onSelectSearchHistory={onSelectSearchHistory}
      />
    </>
  );
}
