export function buildNoteCardGridProps({
  visible,
  filtered,
  batchMode,
  selected,
  pinnedIds,
  popIds,
  hlRe,
  openContextMenu,
  onOpenDetail,
  onEditNote,
  onToggleSelect,
  onTogglePin,
  onCopy,
  onDelete,
  onStatusChange,
  onNewVersion,
  onTagClick,
  onLoadMore,
}) {
  return {
    visible,
    filteredCount: filtered.length,
    batchMode,
    selected,
    pinnedIds,
    popIds,
    hlRe,
    onContextMenu: openContextMenu,
    onToggleSelect,
    onOpen: onOpenDetail,
    onEdit: (note, event) => {
      event?.stopPropagation();
      onEditNote(note);
    },
    onDelete,
    onCopy,
    onStatusChange,
    onNewVersion,
    onPin: onTogglePin,
    onTagClick,
    onLoadMore,
  };
}

export function buildNoteTableViewProps({
  visible,
  filtered,
  focusedRow,
  setFocusedRow,
  onOpenDetail,
  onEditNote,
  onDelete,
  onStatusChange,
  onLoadMore,
}) {
  return {
    visible,
    filtered,
    focusedRow,
    onFocusRow: setFocusedRow,
    onOpen: onOpenDetail,
    onEdit: onEditNote,
    onDelete,
    onStatusChange,
    onLoadMore,
  };
}
