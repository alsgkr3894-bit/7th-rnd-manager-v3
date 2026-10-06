/**
 * app/note/journal/journalDates.js — 연구일지 날짜·기간 계산 (순수)
 */
import { todayLocalDate, formatLocalDateInput } from '@/lib/date/local-date';

// 노트 날짜 키는 다른 화면도 써서 lib/note/day-key.js로 옮겼다 — 연구일지 안에서는 여기서 그대로 가져다 쓴다
export { noteDayKey } from '@/lib/note/day-key';

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 기록이 있는 날짜 목록(내림차순)에서 현재 날짜의 이전/다음 기록일(없으면 null).
 * 현재 날짜 자체에 기록이 없어도(indexOf -1) 가장 가까운 날로 이동한다.
 */
export function adjacentJournalDate(datesDesc, current, direction) {
  const asc = [...(Array.isArray(datesDesc) ? datesDesc : [])].filter(Boolean).sort();
  if (direction === 'prev') {
    for (let i = asc.length - 1; i >= 0; i -= 1) if (asc[i] < current) return asc[i];
    return null;
  }
  for (const d of asc) if (d > current) return d;
  return null;
}

export function toDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${dateStr} (${DAY_LABELS[d.getDay()]})`;
}

export function safeMonth(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}$/.test(text) ? text : todayLocalDate().slice(0, 7);
}

export function monthBounds(month) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return {
    start: `${safe}-01`,
    end: formatLocalDateInput(new Date(year, monthNumber, 0)),
  };
}

export function shiftMonth(month, delta) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return formatLocalDateInput(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7);
}

export function monthLabel(month) {
  const safe = safeMonth(month);
  const [year, monthNumber] = safe.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

export function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDateInput(date);
}

export function weekBounds(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const mondayOffset = (date.getDay() + 6) % 7;
  const start = addDays(dateStr, -mondayOffset);
  return { start, end: addDays(start, 6) };
}

export function normalizeRange(start, end) {
  const safeStart = /^\d{4}-\d{2}-\d{2}$/.test(String(start || '')) ? start : todayLocalDate();
  const safeEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(end || '')) ? end : safeStart;
  return safeStart <= safeEnd
    ? { start: safeStart, end: safeEnd }
    : { start: safeEnd, end: safeStart };
}

/** 'YYYY' 또는 'YYYY-MM' 아무거나 받아 그 해 1/1~12/31을 돌려준다. */
export function yearBounds(value) {
  const text = String(value || '');
  const year = /^\d{4}/.test(text) ? text.slice(0, 4) : todayLocalDate().slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function printRangeForMode(mode, { date, month, year, customStart, customEnd }) {
  if (mode === 'week') return weekBounds(date);
  if (mode === 'month') return monthBounds(month);
  if (mode === 'year') return yearBounds(year || month);
  if (mode === 'custom') return normalizeRange(customStart, customEnd);
  return { start: date, end: date };
}

export function printRangeLabel(mode, range) {
  if (range.start === range.end) return toDateLabel(range.start);
  if (mode === 'year') return `연간 ${range.start.slice(0, 4)}년`;
  const prefix = mode === 'week' ? '주간' : mode === 'month' ? '월간' : '선택기간';
  return `${prefix} ${range.start} ~ ${range.end}`;
}

export function isWithinRange(day, range) {
  return Boolean(day && day >= range.start && day <= range.end);
}
