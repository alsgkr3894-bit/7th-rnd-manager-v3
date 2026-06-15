import { NOTE_STATUS } from '@/lib/note/constants';

export function buildNoteDialogProps({ listState, batchActions, itemActions }) {
  const { presets, confirmDeletePreset, setConfirmDeletePreset, deletePreset } = listState;
  const { selected, confirmBatch, setConfirmBatch, confirmBatchDelete } = batchActions;
  const { singleDeleteNote, setSingleDeleteNote, execDelete } = itemActions;

  return {
    confirmBatch,
    selectedCount: selected.size,
    onConfirmBatchDelete: confirmBatchDelete,
    onCancelBatchDelete: () => setConfirmBatch(false),
    confirmDeletePreset,
    presetName: presets[confirmDeletePreset]?.name,
    onConfirmPresetDelete: () => {
      deletePreset(confirmDeletePreset);
      setConfirmDeletePreset(null);
    },
    onCancelPresetDelete: () => setConfirmDeletePreset(null),
    singleDeleteOpen: singleDeleteNote !== null,
    onConfirmSingleDelete: () => execDelete(singleDeleteNote),
    onCancelSingleDelete: () => setSingleDeleteNote(null),
  };
}

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

export function buildNotePresetProps({ listState }) {
  const { presets, hasActiveFilter, savePreset, applyPreset, setConfirmDeletePreset } = listState;

  return {
    presets,
    hasActiveFilter,
    onApply: applyPreset,
    onSave: savePreset,
    onDelete: idx => setConfirmDeletePreset(idx),
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

export function buildNoteBodyProps({
  router,
  detailState,
  pins,
  listState,
  batchActions,
  itemActions,
}) {
  const { detailNote, setDetailNote } = detailState;
  const { pinnedIds, togglePin } = pins;
  const { filtered, visible, hlRe, viewMode, handleTagSearch, loadMore } = listState;
  const { batchMode, selected, toggleSelect } = batchActions;
  const { popIds, handleDelete, handleCopy, handleStatusChange, handleNewVersion } = itemActions;

  const openNoteEditor = note => router.push(`/note/${note.id}`);

  return {
    filtered,
    visible,
    viewMode,
    batchMode,
    selected,
    pinnedIds,
    popIds,
    hlRe,
    detailNote,
    onOpenDetail: setDetailNote,
    onCloseDetail: () => setDetailNote(null),
    onEditNote: openNoteEditor,
    onToggleSelect: toggleSelect,
    onTogglePin: togglePin,
    onCopy: handleCopy,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onNewVersion: handleNewVersion,
    onTagClick: handleTagSearch,
    onLoadMore: loadMore,
  };
}
