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
