/**
 * app/note/journal/journalSearch.js — 월별 목록 검색 매칭 (순수)
 */

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
