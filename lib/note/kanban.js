import { noteDisplayTitle } from '@/lib/note/display';
import { compareNotesForMerge, noteMergeBaseTitle } from '@/lib/note/merge';

function asText(value) {
  return value == null ? '' : String(value).trim();
}

function keyText(value) {
  return asText(value).toLowerCase();
}

function parentIdOf(note = {}) {
  const id = Number(note.parentId);
  return Number.isFinite(id) ? id : null;
}

function resolveRootId(note, byId) {
  let current = note;
  const seen = new Set();
  while (current?.id != null && current.parentId != null) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent = byId.get(parentIdOf(current));
    if (!parent) break;
    current = parent;
  }
  return current?.id ?? note?.id;
}

function buildSearchText(note = {}) {
  return [
    noteDisplayTitle(note, ''),
    note.menuName,
    note.testContent,
    note.reportSummary,
    note.nextAction,
    note.tasteEval,
    note.tags,
    note.category,
    note.noteType,
  ]
    .map(asText)
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

function kanbanGroupKey(note, byId, parentIds) {
  const isChained = note?.parentId != null || parentIds.has(note?.id);
  if (isChained) return `chain:${resolveRootId(note, byId)}`;
  return `idea:${keyText(noteMergeBaseTitle(note)) || keyText(noteDisplayTitle(note, ''))}`;
}

export function buildKanbanBoardCards(notes = [], search = '') {
  const source = Array.isArray(notes) ? notes.filter(note => note?.id != null) : [];
  const query = keyText(search);
  const byId = new Map(source.map(note => [note.id, note]));
  const parentIds = new Set(source.map(parentIdOf).filter(id => id != null));
  const groups = new Map();

  for (const note of source) {
    const key = kanbanGroupKey(note, byId, parentIds);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        notes: [],
      });
    }
    groups.get(key).notes.push(note);
  }

  return [...groups.values()]
    .filter(group => !query || group.notes.some(note => buildSearchText(note).includes(query)))
    .map(group => {
      const ordered = [...group.notes].sort(compareNotesForMerge);
      const representative = ordered[ordered.length - 1];
      const title = noteMergeBaseTitle(representative) || noteDisplayTitle(representative, '');
      return {
        ...representative,
        _kanbanGroupKey: group.key,
        _kanbanGroupTitle: title,
        _kanbanGroupCount: ordered.length,
        _kanbanGroupIds: ordered.map(note => note.id),
      };
    });
}
