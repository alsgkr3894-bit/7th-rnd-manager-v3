export function buildSampleRecordsProps({
  pageState,
  batch,
  compare,
  recordActions,
  navigation,
  canEdit = false,
}) {
  const { openWrite, openSampleEditor, openSampleNextRound } = navigation;
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
    canEdit,
    toggleSelect: batch.toggleSelect,
    compareMode: compare.compareMode,
    toggleCompare: compare.toggleCompare,
    compareIdxMap: compare.compareIdxMap,
    onOpenSample: setDetailRec,
    onEditSample: sample => {
      if (canEdit) openSampleEditor(sample);
    },
    onCopySample: recordActions.handleCopy,
    onNextRoundSample: sample => {
      if (canEdit) openSampleNextRound(sample);
    },
    onDeleteSample: recordActions.handleDelete,
    onRatingChange: recordActions.handleRatingChange,
    onCreateSample: () => {
      if (canEdit) openWrite();
    },
  };
}
