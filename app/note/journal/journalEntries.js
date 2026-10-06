/**
 * app/note/journal/journalEntries.js — 기록·일정을 날짜별 목록 항목으로 묶기 (순수)
 */
import { JOURNAL_NOTE_TYPE } from '@/lib/note/constants';
import { expandOccurrences } from '@/app/note/calendar/_recurrence';
import { addDays, noteDayKey } from './journalDates';

// expandOccurrences는 한 번에 최대 1000회까지만 돈다 — 매일 반복 일정을 몇 년 범위로 한 번에
// 펼치면 1000일째에서 끊겨 최근·앞으로의 날짜가 검색에서 빠졌다. 1년 단위로 나눠 펼친다.
const EXPANSION_WINDOW_DAYS = 365;

export function expandInWindows(schedule, start, end) {
  const days = [];
  let windowStart = start;
  while (windowStart <= end) {
    const windowEnd = addDays(windowStart, EXPANSION_WINDOW_DAYS - 1);
    days.push(...expandOccurrences(schedule, windowStart, windowEnd < end ? windowEnd : end));
    windowStart = addDays(windowEnd, 1);
  }
  return days;
}

/**
 * [start, end] 기간의 기록·일정을 날짜별로 묶는다(최신 날짜 먼저).
 * 월별 목록과 전체 기간 검색이 같이 쓴다.
 */
export function groupJournalEntries(journalRecords, schedules, start, end) {
  const notesByDate = new Map();
  const schedulesByDate = new Map();

  journalRecords.forEach(note => {
    const day = noteDayKey(note);
    if (!day || day < start || day > end) return;
    if (!notesByDate.has(day)) notesByDate.set(day, []);
    notesByDate.get(day).push(note);
  });

  schedules.forEach(schedule => {
    expandInWindows(schedule, start, end).forEach(day => {
      if (day < start || day > end) return;
      if (!schedulesByDate.has(day)) schedulesByDate.set(day, []);
      schedulesByDate.get(day).push({ ...schedule, _occurrenceDate: day });
    });
  });

  const dates = new Set([...notesByDate.keys(), ...schedulesByDate.keys()]);
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map(day => {
      const entryNotes = (notesByDate.get(day) || []).sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || '')
      );
      const entrySchedules = (schedulesByDate.get(day) || []).sort(
        (a, b) =>
          String(a.time || '').localeCompare(String(b.time || '')) ||
          String(a.title || '').localeCompare(String(b.title || ''), 'ko')
      );
      return {
        date: day,
        notes: entryNotes,
        schedules: entrySchedules,
        journal: entryNotes.find(note => note.noteType === JOURNAL_NOTE_TYPE) || null,
      };
    });
}
