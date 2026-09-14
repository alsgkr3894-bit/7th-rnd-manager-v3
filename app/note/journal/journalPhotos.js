/**
 * app/note/journal/journalPhotos.js — 연구일지 사진 병합·중복 제거 (순수)
 *
 * 같은 날 다른 기록(샘플·노트)에서 온 사진을 일지 카드에 함께 보여주되, 일지 자체가
 * 들고 있는 사진과 겹치면 두 번 보이지 않게 걸러낸다.
 */
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { buildNoteIdeaGroups, collectLatestRoundNotePhotos } from '../noteIdeaGroups';
import { noteDayKey } from './journalDates';

export function journalPhotoKey(photo) {
  return [photo?.data, photo?.caption, photo?.name].map(value => String(value || '')).join('|');
}

export function mergeJournalPhotos(...photoGroups) {
  const merged = [];
  const seen = new Set();
  for (const group of photoGroups) {
    const photos = Array.isArray(group) ? group : [];
    for (const photo of photos) {
      if (!photo || typeof photo !== 'object' || !photo.data) continue;
      const key = journalPhotoKey(photo);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(photo);
    }
  }
  return merged;
}

export function filterJournalPhotosAgainstSources(photos, sourcePhotos) {
  const sourceKeys = new Set(
    (Array.isArray(sourcePhotos) ? sourcePhotos : []).map(journalPhotoKey).filter(Boolean)
  );
  if (!sourceKeys.size) return Array.isArray(photos) ? photos : [];
  return (Array.isArray(photos) ? photos : []).filter(
    photo => !sourceKeys.has(journalPhotoKey(photo))
  );
}

export function withoutJournalSourceDuplicatePhotos(records) {
  const source = Array.isArray(records) ? records : [];
  if (!source.length) return source;

  const sourcePhotosByDay = new Map();
  for (const note of source) {
    if (note?.noteType === JOURNAL_NOTE_TYPE) continue;
    const day = noteDayKey(note);
    if (!day) continue;
    const photos = Array.isArray(note?.photos) ? note.photos : [];
    if (!photos.length) continue;
    const bucket = sourcePhotosByDay.get(day) || [];
    bucket.push(...photos);
    sourcePhotosByDay.set(day, bucket);
  }

  if (!sourcePhotosByDay.size) return source;

  return source.map(note => {
    if (note?.noteType !== JOURNAL_NOTE_TYPE) return note;
    const sourcePhotos = sourcePhotosByDay.get(noteDayKey(note)) || [];
    const photos = filterJournalPhotosAgainstSources(note?.photos, sourcePhotos);
    return photos === note?.photos ? note : { ...note, photos };
  });
}

export function buildJournalRelatedPhotoLookup(notes) {
  const source = Array.isArray(notes) ? notes : [];
  const lookup = new Map();
  const groups = buildNoteIdeaGroups(source, source);

  for (const group of groups) {
    const photos = collectLatestRoundNotePhotos(group.notes, 99);
    for (const note of group.notes || []) {
      if (note?.id) lookup.set(note.id, photos);
    }
  }

  return lookup;
}

export function withRelatedJournalPhotos(dayNotes, allNotes) {
  const notes = Array.isArray(dayNotes) ? dayNotes : [];
  if (!notes.length) return notes;

  const relatedPhotosByNoteId = buildJournalRelatedPhotoLookup(allNotes);
  return notes.map(note => {
    const relatedPhotos = note?.id ? relatedPhotosByNoteId.get(note.id) : [];
    return {
      ...note,
      photos: mergeJournalPhotos(note?.photos, relatedPhotos),
    };
  });
}
