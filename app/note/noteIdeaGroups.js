import { noteDisplayTitle } from '@/lib/note/display';

function asText(value) {
  return value == null ? '' : String(value).trim();
}

function timeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function noteIdeaTitle(note = {}) {
  const title = noteDisplayTitle(note, '');
  return (
    title
      .replace(/\s*[\-–—_/|]*\s*\(?\d+\s*(차|회차|차수|차 테스트|차시)\)?\s*$/u, '')
      .replace(/\s*\(?테스트\s*\d+\s*(차|회차|차수)?\)?\s*$/u, '')
      .trim() || title
  );
}

export function noteRoundNumber(note = {}) {
  const source = [note.testRound, note.title, note.menuName].map(asText).find(Boolean) || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function noteDateValue(note = {}) {
  const value = note.testDate || note.createdAt || note.updatedAt;
  return timeValue(value);
}

function compareIdeaNotes(a, b) {
  const ar = noteRoundNumber(a);
  const br = noteRoundNumber(b);
  if (ar && br && ar !== br) return ar - br;
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  return noteDateValue(a) - noteDateValue(b);
}

function groupKey(note = {}) {
  return noteIdeaTitle(note).toLowerCase();
}

export function buildNoteIdeaGroups(filtered = [], visible = []) {
  const visibleSource = visible.length ? visible : filtered;
  const visibleIds = new Set(visibleSource.map(note => note?.id));
  const map = new Map();

  for (const note of filtered) {
    const key = groupKey(note);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: noteIdeaTitle(note),
        category: note.category || '미분류',
        notes: [],
        isVisible: false,
      });
    }
    const group = map.get(key);
    group.notes.push(note);
    if (visibleIds.has(note?.id)) group.isVisible = true;
  }

  return [...map.values()]
    .filter(group => group.isVisible)
    .map(group => {
      const notes = [...group.notes].sort(compareIdeaNotes);
      return {
        ...group,
        notes,
        latestNote: notes[notes.length - 1] || null,
      };
    });
}

function photoSortValue(photo, note, photoIndex) {
  const explicitTime = timeValue(photo?.uploadedAt || photo?.createdAt || photo?.updatedAt);
  if (explicitTime) return explicitTime;
  return timeValue(note?.updatedAt || note?.createdAt || note?.testDate) + photoIndex;
}

export function collectRecentNotePhotos(notes = [], limit = 3) {
  const source = Array.isArray(notes) ? notes : [];
  const photos = [];

  source.forEach((note, noteIndex) => {
    const notePhotos = Array.isArray(note?.photos) ? note.photos : [];
    notePhotos.forEach((photo, photoIndex) => {
      if (!photo?.data) return;
      photos.push({
        photo,
        noteIndex,
        photoIndex,
        sortValue: photoSortValue(photo, note, photoIndex),
      });
    });
  });

  return photos
    .sort((a, b) => {
      if (a.sortValue !== b.sortValue) return b.sortValue - a.sortValue;
      if (a.noteIndex !== b.noteIndex) return b.noteIndex - a.noteIndex;
      return b.photoIndex - a.photoIndex;
    })
    .slice(0, limit)
    .map(item => item.photo);
}
