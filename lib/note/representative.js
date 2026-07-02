import { normalizeNoteStatus } from './constants';

export function isReleasedNote(note = {}) {
  return normalizeNoteStatus(note?.status) === '출시';
}

export function selectRepresentativeNote(notes = []) {
  const list = Array.isArray(notes) ? notes.filter(Boolean) : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (isReleasedNote(list[index])) return list[index];
  }
  return list[list.length - 1] || null;
}
