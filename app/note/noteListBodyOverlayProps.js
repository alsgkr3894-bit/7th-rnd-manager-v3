function createStoppedEvent() {
  return { stopPropagation: () => {} };
}

export function buildNoteContextMenuProps({
  ctxMenu,
  canEdit = false,
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
    canEdit,
    pinnedIds,
    onClose: closeContextMenu,
    onEdit: note => {
      if (canEdit) onEditNote(note);
    },
    onTogglePin,
    onCopy: note => {
      if (canEdit) onCopy(note, createStoppedEvent());
    },
    onStatusChange: (noteId, status) => {
      if (canEdit) onStatusChange(noteId, status, createStoppedEvent());
    },
    onDelete: note => {
      if (canEdit) onDelete(note);
    },
  };
}

export function buildNoteDetailModalProps({
  canEdit = false,
  detailNote,
  onCloseDetail,
  onEditNote,
}) {
  return {
    note: detailNote,
    canEdit,
    onClose: onCloseDetail,
    onEdit: () => {
      if (canEdit) onEditNote(detailNote);
    },
  };
}
