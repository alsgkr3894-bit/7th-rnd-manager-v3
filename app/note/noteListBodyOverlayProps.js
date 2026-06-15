function createStoppedEvent() {
  return { stopPropagation: () => {} };
}

export function buildNoteContextMenuProps({
  ctxMenu,
  pinnedIds,
  closeContextMenu,
  onEditNote,
  onTogglePin,
  onCopy,
  onStatusChange,
  onDelete,
}) {
  return {
    ctxMenu,
    pinnedIds,
    onClose: closeContextMenu,
    onEdit: onEditNote,
    onTogglePin,
    onCopy: note => onCopy(note, createStoppedEvent()),
    onStatusChange: (noteId, status) => onStatusChange(noteId, status, createStoppedEvent()),
    onDelete,
  };
}

export function buildNoteDetailModalProps({ detailNote, onCloseDetail, onEditNote }) {
  return {
    note: detailNote,
    onClose: onCloseDetail,
    onEdit: () => onEditNote(detailNote),
  };
}
