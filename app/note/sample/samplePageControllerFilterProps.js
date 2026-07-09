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

  // 폼은 자유 입력 카테고리를 허용하므로, 정적 목록에 없는 데이터 기반 카테고리도 칩으로 노출한다.
  const extraCategories = Object.keys(catCounts || {})
    .filter(key => key && key !== 'all' && !SAMPLE_CATEGORIES.includes(key))
    .sort((a, b) => a.localeCompare(b, 'ko'));
  const categories = [...SAMPLE_CATEGORIES, ...extraCategories];

  return {
    categories,
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
