/**
 * app/note/journal/journalForm.js — 연구일지 작성 폼 ↔ 노트 레코드 변환 (순수)
 */
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import { noteDayKey } from './journalDates';

export const EMPTY_JOURNAL_FORM = {
  work: '',
  result: '',
  next: '',
  photos: [],
};

export function mergeJournalText(...values) {
  return values
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
}

export function hasJournalText(form) {
  return (
    Object.entries(form).some(([key, value]) => key !== 'photos' && String(value || '').trim()) ||
    (Array.isArray(form.photos) && form.photos.length > 0)
  );
}

export function journalFormFromEntry(journalEntry) {
  if (!journalEntry) return EMPTY_JOURNAL_FORM;
  return {
    work: journalEntry.testContent || '',
    result: mergeJournalText(journalEntry.tasteEval, journalEntry.improvements),
    next: mergeJournalText(journalEntry.nextAction, journalEntry.materials),
    photos: Array.isArray(journalEntry.photos) ? journalEntry.photos : [],
  };
}

export function buildJournalNoteFromForm(date, form, existingEntry) {
  const title = existingEntry?.title || `${date} 연구일지`;
  return {
    ...(existingEntry || {}),
    title,
    menuName: existingEntry?.menuName || title,
    testDate: date,
    category: existingEntry?.category || '기타',
    noteType: JOURNAL_NOTE_TYPE,
    status: existingEntry?.status || NOTE_STATUS.TEST,
    testContent: String(form.work || '').trim(),
    materials: '',
    tasteEval: String(form.result || '').trim(),
    improvements: '',
    nextAction: String(form.next || '').trim(),
    tags: existingEntry?.tags || '연구일지',
    photos: Array.isArray(form.photos) ? form.photos : [],
  };
}

export function mergeJournalPrintNotesForDate(notes, currentJournalNote, targetDate) {
  if (!currentJournalNote) return notes;
  let replaced = false;
  const merged = notes.map(note => {
    if (note.noteType !== JOURNAL_NOTE_TYPE || noteDayKey(note) !== targetDate) return note;
    replaced = true;
    return { ...note, ...currentJournalNote, id: note.id };
  });
  return replaced
    ? merged
    : [...merged, currentJournalNote].sort(
        (a, b) =>
          noteDayKey(a).localeCompare(noteDayKey(b)) ||
          String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
}
