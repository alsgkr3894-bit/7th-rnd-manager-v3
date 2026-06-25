export function buildNoteCardGridProps({
  visible,
  filtered,
  canEdit = false,
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
    filtered,
    filteredCount: filtered.length,
    canEdit,
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
      if (canEdit) onEditNote(note);
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
  canEdit = false,
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
    canEdit,
    focusedRow,
    onFocusRow: setFocusedRow,
    onOpen: onOpenDetail,
    onEdit: onEditNote,
    onDelete,
    onStatusChange,
    onLoadMore,
  };
}
