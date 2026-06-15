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
