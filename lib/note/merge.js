import { noteDisplayTitle } from '@/lib/note/display';

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

export function buildNoteMergePlan(notes = [], selectedIds = []) {
  const selectedSet = new Set([...selectedIds].map(id => String(id)));
  const seen = new Set();
  const selectedNotes = [];

  for (const note of Array.isArray(notes) ? notes : []) {
    if (note?.id == null) continue;
    const key = String(note.id);
    if (!selectedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    selectedNotes.push(note);
  }

  const ordered = selectedNotes.sort(compareNotesForMerge);
  if (ordered.length < 2) {
    return {
      canMerge: false,
      selectedCount: ordered.length,
      title: '',
      ordered,
      changes: [],
      reason: '노트를 2개 이상 선택해야 합니다',
    };
  }

  const title = noteMergeBaseTitle(ordered[0]) || noteDisplayTitle(ordered[0], '');
  const changes = ordered.map((note, index) => ({
    id: note.id,
    note,
    patch: {
      title,
      menuName: title,
      testRound: String(index + 1),
      parentId: index === 0 ? null : ordered[index - 1].id,
    },
  }));

  return {
    canMerge: true,
    selectedCount: ordered.length,
    title,
    ordered,
    changes,
    reason: '',
  };
}
