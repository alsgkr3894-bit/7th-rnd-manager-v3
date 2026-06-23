import { NOTE_STATUS } from '@/lib/note/constants';

export function buildNoteHeaderProps({
  canEdit = false,
  router,
  notesState,
  listState,
  handleBulkCopy,
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
    handleBatchStatusChange,
  } = batchActions;

  return {
    notesCount: notes.length,
    batchMode,
    selected,
    reportingCount: counts[NOTE_STATUS.REPORTING],
    reportExportCount: Array.isArray(filtered) ? filtered.length : notes.length,
    canEdit,
    onBulkCopy: handleBulkCopy,
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
