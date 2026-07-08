import { noteDisplayTitle } from '@/lib/note/display';
import { selectRepresentativeNote } from '@/lib/note/representative';

function asText(value) {
  return value == null ? '' : String(value).trim();
}

function keyText(value) {
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

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'ko', { numeric: true });
}

function compactDate(value) {
  return asText(value).slice(0, 10);
}

function koreanDate(value) {
  const date = compactDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split('-');
  return `${year}년${month}월${day}일`;
}

function periodLabel(notes = []) {
  const dates = notes
    .map(note => compactDate(note?.testDate))
    .filter(Boolean)
    .sort();
  if (!dates.length) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? koreanDate(first) : `${koreanDate(first)} ~ ${koreanDate(last)}`;
}

function buildNoteLookup(notes = []) {
  const byId = new Map();
  const parentIds = new Set();

  for (const note of notes) {
    const id = keyText(note?.id);
    const parentId = keyText(note?.parentId);
    if (id) byId.set(id, note);
    if (parentId) parentIds.add(parentId);
  }

  return { byId, parentIds };
}

function findChainRoot(note = {}, byId = new Map()) {
  let current = note;
  const seen = new Set();

  while (current) {
    const currentId = keyText(current.id);
    const parentId = keyText(current.parentId);
    if (!parentId || seen.has(parentId)) break;
    if (currentId) seen.add(currentId);

    const parent = byId.get(parentId);
    if (!parent) break;
    current = parent;
  }

  return current || note;
}

function groupIdentity(note = {}, lookup, index = 0) {
  const root = findChainRoot(note, lookup.byId);
  const noteId = keyText(note.id);
  const parentId = keyText(note.parentId);
  const rootId = keyText(root?.id);
  const hasChain = Boolean(
    parentId || lookup.parentIds.has(noteId) || (rootId && rootId !== noteId)
  );
  const menuCode = asText(root?.menuCode || note.menuCode);

  if (hasChain) {
    const keyId =
      rootId && (rootId !== noteId || lookup.parentIds.has(rootId))
        ? rootId
        : parentId || rootId || noteId;
    return {
      key: keyId ? `chain:${keyId}` : '',
      title: noteIdeaTitle(root || note),
      category: root?.category || note.category || '미분류',
      menuCode,
    };
  }

  const title = noteIdeaTitle(note);
  return {
    key: `note:${noteId || index}`,
    title,
    category: note.category || '미분류',
    menuCode: asText(note.menuCode),
  };
}

function noteCreatedValue(note = {}) {
  return timeValue(note.createdAt || note.updatedAt || note.testDate);
}

function isPinnedGroup(group, pinnedIds) {
  if (!(pinnedIds instanceof Set) || pinnedIds.size === 0) return false;
  return (group.notes || []).some(note => pinnedIds.has(note.id));
}

function sortNoteIdeaGroups(groups, { sortBy, pinnedIds } = {}) {
  if (!sortBy) return groups;

  return [...groups].sort((a, b) => {
    if (sortBy === 'menuName') {
      return compareText(a.title, b.title);
    }

    if (sortBy === 'testDate') {
      const dateDiff = noteDateValue(b.latestNote) - noteDateValue(a.latestNote);
      return dateDiff || compareText(a.title, b.title);
    }

    const ap = isPinnedGroup(a, pinnedIds) ? 0 : 1;
    const bp = isPinnedGroup(b, pinnedIds) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const createdDiff = noteCreatedValue(b.latestNote) - noteCreatedValue(a.latestNote);
    return createdDiff || compareText(a.title, b.title);
  });
}

export function buildNoteIdeaGroups(filtered = [], visible = [], options = {}) {
  const filteredSource = Array.isArray(filtered) ? filtered : [];
  const visibleArray = Array.isArray(visible) ? visible : [];
  const visibleSource = visibleArray.length ? visibleArray : filteredSource;
  const visibleIds = new Set(visibleSource.map(note => note?.id));
  const lookup = buildNoteLookup(filteredSource);
  const map = new Map();

  for (const [index, note] of filteredSource.entries()) {
    const identity = groupIdentity(note, lookup, index);
    const key = identity.key;
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: identity.title,
        category: identity.category,
        menuCode: identity.menuCode,
        notes: [],
        isVisible: false,
      });
    }
    const group = map.get(key);
    group.notes.push(note);
    if (visibleIds.has(note?.id)) group.isVisible = true;
  }

  const groups = [...map.values()]
    .filter(group => group.isVisible)
    .map(group => {
      const notes = [...group.notes].sort(compareIdeaNotes);
      const lastRoundNote = notes[notes.length - 1] || null;
      const latestTitle = noteIdeaTitle(lastRoundNote || {}) || group.title;
      return {
        ...group,
        title: latestTitle,
        menuCode: asText(lastRoundNote?.menuCode) || group.menuCode,
        periodLabel: periodLabel(notes),
        notes,
        latestNote: selectRepresentativeNote(notes),
        lastRoundNote,
      };
    });

  return sortNoteIdeaGroups(groups, options);
}

function photoSortValue(photo, note, photoIndex) {
  const explicitTime = timeValue(photo?.uploadedAt || photo?.createdAt || photo?.updatedAt);
  if (explicitTime) return explicitTime;
  return timeValue(note?.updatedAt || note?.createdAt || note?.testDate) + photoIndex;
}

function photosFromNote(note, noteIndex) {
  const notePhotos = Array.isArray(note?.photos) ? note.photos : [];
  return notePhotos
    .map((photo, photoIndex) => ({
      photo,
      noteIndex,
      photoIndex,
      sortValue: photoSortValue(photo, note, photoIndex),
    }))
    .filter(item => item.photo?.data);
}

export function collectRecentNotePhotos(notes = [], limit = 3) {
  const source = Array.isArray(notes) ? notes : [];
  const photos = [];

  source.forEach((note, noteIndex) => {
    photos.push(...photosFromNote(note, noteIndex));
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

export function collectLatestRoundNotePhotos(notes = [], limit = 3) {
  const source = Array.isArray(notes) ? notes : [];
  for (let noteIndex = source.length - 1; noteIndex >= 0; noteIndex -= 1) {
    const photos = photosFromNote(source[noteIndex], noteIndex)
      .sort((a, b) => {
        if (a.photoIndex !== b.photoIndex) return a.photoIndex - b.photoIndex;
        return a.sortValue - b.sortValue;
      })
      .slice(0, limit)
      .map(item => item.photo);

    if (photos.length) return photos;
  }

  return [];
}
