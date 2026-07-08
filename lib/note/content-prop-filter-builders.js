export function buildNoteFilterProps({ listState }) {
  const {
    brandFilter,
    statusFilter,
    typeFilter,
    counts,
    typeCounts,
    sortBy,
    viewMode,
    search,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    saveSearchHistory,
    cancelSearchHistory,
    closeSearchHistorySoon,
    handleSearchChange,
    applySearchHistory,
    changeSort,
    changeView,
    changeBrandFilter,
    changeStatusFilter,
    changeTypeFilter,
  } = listState;

  return {
    brandFilter,
    statusFilter,
    typeFilter,
    counts,
    typeCounts,
    sortBy,
    viewMode,
    search,
    searchHistory,
    showSearchHistory: showSearchHist,
    onBrandFilter: changeBrandFilter,
    onStatusFilter: changeStatusFilter,
    onTypeFilter: changeTypeFilter,
    onSort: changeSort,
    onView: changeView,
    onSearchChange: handleSearchChange,
    onSearchSubmit: () => saveSearchHistory(search),
    onSearchFocus: () => setShowSearchHist(true),
    onSearchBlur: () => {
      cancelSearchHistory();
      closeSearchHistorySoon();
    },
    onSearchHistoryPick: applySearchHistory,
  };
}
