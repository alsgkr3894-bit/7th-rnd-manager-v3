export function buildNoteHeaderProps({
  canEdit = false,
  router,
  notesState,
  listState,
  handleReportPdf,
  batchActions,
}) {
  const { notes } = notesState;
  const { counts, filtered } = listState;
  const {
    batchMode,
    setBatchMode,
    selected,
    exitBatch,
    handleBatchDelete,
    handleBatchMerge,
    handleBatchStatusChange,
  } = batchActions;

  return {
    notesCount: notes.length,
    batchMode,
    selected,
    reportExportCount: Array.isArray(filtered) ? filtered.length : notes.length,
    canEdit,
    onExportReportPdf: handleReportPdf,
    onEnterBatchMode: () => {
      if (canEdit) setBatchMode(true);
    },
    onCalendar: () => router.push('/note/calendar'),
    onChecklist: listState.openChecklistList,
    onBoard: () => router.push('/note/board'),
    onWrite: () => {
      if (canEdit) router.push('/note/write');
    },
    onBatchStatusChange: handleBatchStatusChange,
    onBatchMerge: handleBatchMerge,
    onBatchDelete: handleBatchDelete,
    onBatchExit: exitBatch,
  };
}

export function buildNoteStatsProps({ notesState, listState }) {
  return {
    stats: notesState.stats,
    counts: listState.counts,
  };
}

export function buildNoteStatesProps({ canEdit = false, router, notesState, listState }) {
  const { notes, loading } = notesState;
  const { filtered, search } = listState;

  return {
    loading,
    notesCount: notes.length,
    filteredCount: filtered.length,
    search,
    canEdit,
    onCreate: () => {
      if (canEdit) router.push('/note/write');
    },
  };
}
