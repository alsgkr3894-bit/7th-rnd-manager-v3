const NOTE_VIEW_KEYS = new Set(['card', 'table']);

export function normalizeNoteView(value) {
  return NOTE_VIEW_KEYS.has(value) ? value : 'card';
}

export function shouldShowAllNoteRows(statusFilter) {
  return statusFilter === 'all';
}
