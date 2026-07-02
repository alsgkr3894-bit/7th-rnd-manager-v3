import { noteDisplayTitle } from '@/lib/note/display';
import { normalizeNoteStatus } from '@/lib/note/constants';
import { selectRepresentativeNote } from '@/lib/note/representative';

function asText(value) {
  return value == null ? '' : String(value).trim();
}

function timeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function idValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function keyOf(value) {
  return value == null ? '' : String(value);
}

export function noteMergeBaseTitle(note = {}) {
  const title = noteDisplayTitle(note, '');
  return (
    title
      .replace(/\s*\(?테스트\s*\d+\s*(차|회차|차수)?\)?\s*$/u, '')
      .replace(/\s*[\-–—_/|]*\s*\(?\d+\s*(차|회차|차수|차 테스트|차시)\)?\s*$/u, '')
      .trim() || title
  );
}

export function noteMergeRoundNumber(note = {}) {
  const source = [note.testRound, note.title, note.menuName].map(asText).find(Boolean) || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function noteMergeDateValue(note = {}) {
  return (
    timeValue(note.testDate) ||
    timeValue(note.createdAt) ||
    timeValue(note.updatedAt) ||
    idValue(note.id)
  );
}

export function compareNotesForMerge(a = {}, b = {}) {
  const ar = noteMergeRoundNumber(a);
  const br = noteMergeRoundNumber(b);
  if (ar && br && ar !== br) return ar - br;
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  const dateDiff = noteMergeDateValue(a) - noteMergeDateValue(b);
  return dateDiff || idValue(a.id) - idValue(b.id);
}

function buildNoteChainMaps(notes = []) {
  const byId = new Map();
  const childrenByParent = new Map();

  for (const note of Array.isArray(notes) ? notes : []) {
    if (note?.id == null) continue;
    byId.set(keyOf(note.id), note);
  }

  for (const note of byId.values()) {
    const parentKey = keyOf(note.parentId);
    if (!parentKey || !byId.has(parentKey)) continue;
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey).push(note);
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareNotesForMerge);
  }

  return { byId, childrenByParent };
}

function findChainRoot(note, byId) {
  let current = note;
  const seen = new Set();

  while (current?.id != null) {
    const currentKey = keyOf(current.id);
    const parentKey = keyOf(current.parentId);
    if (!parentKey || seen.has(parentKey)) break;
    seen.add(currentKey);

    const parent = byId.get(parentKey);
    if (!parent) break;
    current = parent;
  }

  return current || note;
}

function collectDescendants(note, childrenByParent, collected) {
  if (note?.id == null) return;
  const key = keyOf(note.id);
  if (collected.has(key)) return;
  collected.set(key, note);

  const children = childrenByParent.get(key) || [];
  for (const child of children) {
    collectDescendants(child, childrenByParent, collected);
  }
}

function collectNotesForMerge(notes = [], selectedIds = []) {
  const selectedSet = new Set([...selectedIds].map(keyOf));
  const { byId, childrenByParent } = buildNoteChainMaps(notes);
  const collected = new Map();
  let selectedCount = 0;

  for (const selectedId of selectedSet) {
    const note = byId.get(selectedId);
    if (!note) continue;
    selectedCount += 1;
    const root = findChainRoot(note, byId);
    collectDescendants(root, childrenByParent, collected);
  }

  return {
    selectedCount,
    notes: [...collected.values()],
  };
}

export function buildNoteMergePlan(notes = [], selectedIds = []) {
  const { selectedCount, notes: mergeNotes } = collectNotesForMerge(notes, selectedIds);
  const ordered = mergeNotes.sort(compareNotesForMerge);
  if (ordered.length < 2) {
    return {
      canMerge: false,
      selectedCount,
      mergedCount: ordered.length,
      title: '',
      ordered,
      changes: [],
      reason: '노트를 2개 이상 선택해야 합니다',
    };
  }

  const title = noteMergeBaseTitle(ordered[0]) || noteDisplayTitle(ordered[0], '');
  const menuStatus = normalizeNoteStatus(selectRepresentativeNote(ordered)?.status);
  const changes = ordered.map((note, index) => ({
    id: note.id,
    note,
    patch: {
      title,
      menuName: title,
      status: menuStatus,
      testRound: String(index + 1),
      parentId: index === 0 ? null : ordered[index - 1].id,
    },
  }));

  return {
    canMerge: true,
    selectedCount,
    mergedCount: ordered.length,
    title,
    ordered,
    changes,
    reason: '',
  };
}

export function buildNoteDropMergePlan(notes = [], sourceIds = [], targetIds = []) {
  const source = collectNotesForMerge(notes, sourceIds);
  const target = collectNotesForMerge(notes, targetIds);
  const sourceKeys = new Set(source.notes.map(note => keyOf(note.id)));
  const targetKeys = new Set(target.notes.map(note => keyOf(note.id)));
  const overlaps = [...sourceKeys].some(key => targetKeys.has(key));

  if (overlaps) {
    return {
      canMerge: false,
      selectedCount: source.selectedCount + target.selectedCount,
      sourceCount: source.notes.length,
      targetCount: target.notes.length,
      mergedCount: target.notes.length,
      title: '',
      ordered: [],
      changes: [],
      reason: '같은 차수 묶음 안에서는 다시 넣을 필요가 없습니다',
    };
  }

  const targetOrdered = target.notes.sort(compareNotesForMerge);
  const sourceOrdered = source.notes.sort(compareNotesForMerge);
  const ordered = [...targetOrdered, ...sourceOrdered];

  if (!targetOrdered.length || !sourceOrdered.length || ordered.length < 2) {
    return {
      canMerge: false,
      selectedCount: source.selectedCount + target.selectedCount,
      sourceCount: source.notes.length,
      targetCount: target.notes.length,
      mergedCount: ordered.length,
      title: '',
      ordered,
      changes: [],
      reason: '넣을 카드와 대상 카드를 다시 확인해주세요',
    };
  }

  const title = noteMergeBaseTitle(targetOrdered[0]) || noteDisplayTitle(targetOrdered[0], '');
  const menuStatus = normalizeNoteStatus(selectRepresentativeNote(ordered)?.status);
  const changes = ordered.map((note, index) => ({
    id: note.id,
    note,
    patch: {
      title,
      menuName: title,
      status: menuStatus,
      testRound: String(index + 1),
      parentId: index === 0 ? null : ordered[index - 1].id,
    },
  }));

  return {
    canMerge: true,
    selectedCount: source.selectedCount + target.selectedCount,
    sourceCount: source.notes.length,
    targetCount: target.notes.length,
    mergedCount: ordered.length,
    title,
    ordered,
    changes,
    reason: '',
  };
}

export function buildNoteUnmergePlan(notes = [], selectedIds = []) {
  const { selectedCount, notes: mergeNotes } = collectNotesForMerge(notes, selectedIds);
  const ordered = mergeNotes.sort(compareNotesForMerge);
  const hasChainLink = ordered.some(note => note?.parentId != null);

  if (!ordered.length || !hasChainLink) {
    return {
      canUnmerge: false,
      selectedCount,
      unmergedCount: ordered.length,
      title: '',
      ordered,
      changes: [],
      reason: '분리할 차수 묶음이 없습니다',
    };
  }

  const title = noteMergeBaseTitle(ordered[0]) || noteDisplayTitle(ordered[0], '');
  const changes = ordered.map(note => ({
    id: note.id,
    note,
    patch: {
      parentId: null,
    },
  }));

  return {
    canUnmerge: true,
    selectedCount,
    unmergedCount: ordered.length,
    title,
    ordered,
    changes,
    reason: '',
  };
}
