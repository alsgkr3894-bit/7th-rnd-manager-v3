export function buildNoteBodyProps({
  canEdit = false,
  router,
  detailState,
  pins,
  listState,
  batchActions,
  itemActions,
}) {
  const { detailNote, setDetailNote } = detailState;
  const { pinnedIds, togglePin } = pins;
  const { filtered, visible, hlRe, viewMode, sortBy, handleTagSearch, loadMore } = listState;
  const { batchMode, selected, toggleSelect, handleDropMerge, handleUnmergeGroup } = batchActions;
  const { popIds, handleDelete, handleCopy, handleStatusChange, handleNewVersion } = itemActions;

  const openNoteEditor = note => router.push(`/note/${note.id}`);

  return {
    filtered,
    visible,
    sortBy,
    canEdit,
    viewMode,
    batchMode,
    selected,
    pinnedIds,
    popIds,
    hlRe,
    detailNote,
    onOpenDetail: setDetailNote,
    onCloseDetail: () => setDetailNote(null),
    onEditNote: note => {
      if (canEdit) openNoteEditor(note);
    },
    onToggleSelect: toggleSelect,
    onDropMerge: handleDropMerge,
    onUnmergeGroup: handleUnmergeGroup,
    onTogglePin: togglePin,
    onCopy: handleCopy,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onNewVersion: handleNewVersion,
    onTagClick: handleTagSearch,
    onLoadMore: loadMore,
  };
}
