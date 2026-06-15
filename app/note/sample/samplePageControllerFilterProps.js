import { SAMPLE_CATEGORIES } from '@/lib/sample/constants';
import { SAMPLE_SORT_OPTIONS } from './samplePageStateUtils';

export function buildSampleFilterProps({ pageState }) {
  const {
    samples,
    search,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    catFilter,
    setCatFilter,
    ratingMin,
    setRatingMin,
    sortBy,
    applySortBy,
    viewMode,
    applyViewMode,
    handleSearchChange,
    closeSearchHistorySoon,
    selectSearchHistory,
    catCounts,
    ratingDist,
  } = pageState;

  return {
    categories: SAMPLE_CATEGORIES,
    catCounts,
    catFilter,
    onCatFilterChange: setCatFilter,
    ratingMin,
    onRatingMinChange: setRatingMin,
    ratingDist,
    sampleCount: samples.length,
    sortOptions: SAMPLE_SORT_OPTIONS,
    sortBy,
    onSortChange: applySortBy,
    viewMode,
    onViewModeChange: applyViewMode,
    search,
    onSearchChange: handleSearchChange,
    showSearchHist,
    onSearchFocus: () => setShowSearchHist(true),
    onSearchBlur: closeSearchHistorySoon,
    searchHistory,
    onSelectSearchHistory: selectSearchHistory,
  };
}
