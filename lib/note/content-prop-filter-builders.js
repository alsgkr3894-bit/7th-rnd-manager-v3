export function buildNoteFilterProps({ listState }) {
  const {
    brandFilter,
    statusFilter,
    counts,
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
  } = listState;

  return {
    brandFilter,
    statusFilter,
    counts,
    sortBy,
    viewMode,
    search,
    searchHistory,
    showSearchHistory: showSearchHist,
    onBrandFilter: changeBrandFilter,
    onStatusFilter: changeStatusFilter,
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
