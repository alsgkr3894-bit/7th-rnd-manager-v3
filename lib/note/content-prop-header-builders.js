import { NOTE_STATUS } from '@/lib/note/constants';

export function buildNoteHeaderProps({
  router,
  notesState,
  listState,
  handleBulkCopy,
  batchActions,
}) {
  const { notes } = notesState;
  const { counts } = listState;
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
    onBulkCopy: handleBulkCopy,
    onEnterBatchMode: () => setBatchMode(true),
    onCalendar: () => router.push('/note/calendar'),
    onBoard: () => router.push('/note/board'),
    onWrite: () => router.push('/note/write'),
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

export function buildNoteStatesProps({ router, notesState, listState }) {
  const { notes, loading } = notesState;
  const { filtered, search } = listState;

  return {
    loading,
    notesCount: notes.length,
    filteredCount: filtered.length,
    search,
    onCreate: () => router.push('/note/write'),
  };
}
