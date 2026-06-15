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

export function buildSampleCalendarProps({ pageState }) {
  const { calDays, calMonth, samplesByDate, today, goPrevMonth, goNextMonth, setDetailRec } =
    pageState;

  return {
    days: calDays,
    calMonth,
    samplesByDate,
    today,
    onPrevMonth: goPrevMonth,
    onNextMonth: goNextMonth,
    onOpenSample: setDetailRec,
  };
}

export function buildSampleRecordsProps({ pageState, batch, compare, recordActions, navigation }) {
  const { openWrite, openSampleEditor } = navigation;
  const { loading, viewMode, filtered, catFilter, ratingMin, sortBy, search, setDetailRec } =
    pageState;

  return {
    loading,
    viewMode,
    filtered,
    catFilter,
    ratingMin,
    sortBy,
    search,
    batchMode: batch.batchMode,
    selected: batch.selected,
    toggleSelect: batch.toggleSelect,
    compareMode: compare.compareMode,
    toggleCompare: compare.toggleCompare,
    compareIdxMap: compare.compareIdxMap,
    onOpenSample: setDetailRec,
    onEditSample: openSampleEditor,
    onCopySample: recordActions.handleCopy,
    onDeleteSample: recordActions.handleDelete,
    onRatingChange: recordActions.handleRatingChange,
    onCreateSample: openWrite,
  };
}
