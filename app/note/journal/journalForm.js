/**
 * app/note/journal/journalForm.js — 연구일지 작성 폼 ↔ 노트 레코드 변환 (순수)
 *
 * 2026-10-06: 작성 칸을 '오늘 내용 보고서' 한 칸(report)으로 합쳤다. 본문은 예전 '오늘 한 일'과
 * 같은 testContent에 저장한다(캘린더 체크리스트도 testContent에 합쳐 넣는다).
 * 예전 세 칸 시절 따로 적은 칸(테스트 결과·다음 일정 등)은 열 때 소제목을 붙여 보고서 칸 아래에
 * 이어 붙이므로, 저장할 때 그 칸들을 비워도 내용은 testContent에 그대로 남는다.
 */
import { JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import { LEGACY_JOURNAL_FIELDS, journalReportText } from '@/lib/note/journal-report';
import { noteDayKey } from './journalDates';

export const EMPTY_JOURNAL_FORM = {
  report: '',
  photos: [],
};

export function hasJournalText(form) {
  return (
    Boolean(String(form?.report || '').trim()) ||
    (Array.isArray(form?.photos) && form.photos.length > 0)
  );
}

/** 저장된 일지 → 보고서 한 칸 본문. 예전 보조 칸이 있으면 소제목과 함께 아래에 붙인다. */
export const journalReportFromEntry = journalReportText;

export function journalFormFromEntry(journalEntry) {
  if (!journalEntry) return EMPTY_JOURNAL_FORM;
  return {
    report: journalReportText(journalEntry),
    photos: Array.isArray(journalEntry.photos) ? journalEntry.photos : [],
  };
}

function samePhoto(a, b) {
  if (a === b) return true;
  if (!a || !b || a.data !== b.data) return false;
  const { data: _a, ...restA } = a;
  const { data: _b, ...restB } = b;
  return JSON.stringify(restA) === JSON.stringify(restB);
}

/**
 * 저장 안 된 변경이 있는지 — 글자마다 불리므로 사진(base64)을 통째로 문자열화하지 않고
 * 본문 비교 + 사진 순서·객체 비교로 판단한다(대표사진은 첫 번째 사진).
 */
export function isJournalFormChanged(form, base) {
  if (String(form?.report || '') !== String(base?.report || '')) return true;
  const a = Array.isArray(form?.photos) ? form.photos : [];
  const b = Array.isArray(base?.photos) ? base.photos : [];
  if (a === b) return false;
  return a.length !== b.length || a.some((photo, index) => !samePhoto(photo, b[index]));
}

/** 폼 → 저장할 본문 칸. 예전 보조 칸은 보고서에 합쳐졌으므로 비운다. */
export function journalContentFields(form) {
  return {
    testContent: String(form?.report || '').trim(),
    ...Object.fromEntries(LEGACY_JOURNAL_FIELDS.map(key => [key, ''])),
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
    ...journalContentFields(form),
    tags: existingEntry?.tags || '연구일지',
    photos: Array.isArray(form.photos) ? form.photos : [],
  };
}

export function mergeJournalPrintNotesForDate(notes, currentJournalNote, targetDate) {
  if (!currentJournalNote) return notes;
  let replaced = false;
  // 지금 고치는 일지 한 건만 바꾼다 — 같은 날 일지가 둘이면(체크리스트 경합 등) 둘 다 같은 내용으로
  // 덮여 PDF에 두 번 나오고 다른 일지 내용이 빠지던 문제. 새 일지(id 없음)는 그날 첫 일지 자리.
  const targetId = currentJournalNote.id;
  const merged = notes.map(note => {
    if (replaced || note.noteType !== JOURNAL_NOTE_TYPE || noteDayKey(note) !== targetDate) {
      return note;
    }
    if (targetId != null && note.id !== targetId) return note;
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
