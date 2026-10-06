/**
 * app/note/journal/journalSearch.js — 연구일지 목록 검색·필터·미리보기 (순수)
 */
import { journalReportFromEntry } from './journalForm';

export function noteSearchText(note) {
  const photoText = (Array.isArray(note?.photos) ? note.photos : [])
    .map(photo => [photo?.caption, photo?.name].filter(Boolean).join(' '))
    .join(' ');
  return [
    note?.title,
    note?.menuName,
    note?.menuCode,
    note?.category,
    note?.status,
    note?.noteType,
    note?.testContent,
    note?.materials,
    note?.tasteEval,
    note?.improvements,
    note?.nextAction,
    note?.tags,
    photoText,
  ]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
}

export function scheduleSearchText(schedule) {
  return [
    schedule?.title,
    schedule?.description,
    schedule?.type,
    schedule?.time,
    schedule?._occurrenceDate,
  ]
    .map(value => String(value || '').toLowerCase())
    .join(' ');
}

export function journalEntryMatches(entry, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  const haystack = [
    entry?.date,
    noteSearchText(entry?.journal),
    ...(entry?.notes || []).map(noteSearchText),
    ...(entry?.schedules || []).map(scheduleSearchText),
  ].join(' ');
  return haystack.includes(q);
}

// ── 목록 보기 필터·미리보기·강조 (2026-10-06) ─────────────────

export const JOURNAL_LIST_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'journal', label: '일지 쓴 날' },
  { id: 'photos', label: '사진 있는 날' },
];

/** 그날 기록에 붙은 사진 전부(연구일지 먼저, 같은 사진은 한 번만) */
export function entryPhotos(entry) {
  const seen = new Set();
  const records = [entry?.journal, ...(entry?.notes || [])].filter(Boolean);
  const photos = [];
  for (const record of records) {
    for (const photo of Array.isArray(record.photos) ? record.photos : []) {
      if (!photo?.data || seen.has(photo.data)) continue;
      seen.add(photo.data);
      photos.push(photo);
    }
  }
  return photos;
}

export function journalEntryMatchesFilter(entry, filter) {
  if (filter === 'journal') return Boolean(entry?.journal);
  if (filter === 'photos') return entryPhotos(entry).length > 0;
  return true;
}

/** 검색어 강조용 분할 — [{ text, match }]. 대소문자 무시, 원문 대소문자 유지 */
export function splitHighlight(text, query) {
  const source = String(text ?? '');
  const q = String(query || '').trim();
  if (!q || !source) return source ? [{ text: source, match: false }] : [];
  const lower = source.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let cursor = 0;
  let index = lower.indexOf(needle, cursor);
  while (index !== -1) {
    if (index > cursor) parts.push({ text: source.slice(cursor, index), match: false });
    parts.push({ text: source.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = lower.indexOf(needle, cursor);
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), match: false });
  return parts;
}

/**
 * 목록 미리보기 문장. 일지 본문(예전 보조 칸 포함)을 먼저 쓰고, 검색 중이면 검색어가 들어 있는
 * 첫 문장을 골라 검색어가 미리보기 앞쪽에 보이게 자른다.
 */
export function entryPreviewText(entry, query) {
  const candidates = [
    entry?.journal ? journalReportFromEntry(entry.journal) : '',
    ...(entry?.notes || [])
      .filter(note => note !== entry?.journal)
      .map(note => [note?.title || note?.menuName, note?.testContent].filter(Boolean).join(' — ')),
    ...(entry?.schedules || []).map(schedule =>
      [schedule?.time, schedule?.title, schedule?.description].filter(Boolean).join(' ')
    ),
  ]
    .map(text => String(text || '').trim())
    .filter(Boolean);
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (q) {
    for (const text of candidates) {
      const index = text.toLowerCase().indexOf(q);
      if (index === -1) continue;
      // 줄바꿈이 많으면 검색어가 3줄 미리보기 밖으로 밀려나므로 한 줄로 이어 붙인다
      const snippet = index > 60 ? `…${text.slice(index - 40)}` : text;
      return snippet.replace(/\s*\n\s*/g, ' ');
    }
  }
  return candidates[0] || '기록 보기';
}
