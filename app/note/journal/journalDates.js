/**
 * app/note/journal/journalDates.js — 연구일지 날짜·기간 계산 (순수)
 */
import { todayLocalDate, formatLocalDateInput } from '@/lib/date/local-date';

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 노트의 표시용 날짜 키. testDate는 이미 YYYY-MM-DD(정규형)이라 그대로 쓰고,
// createdAt 폴백만 로컬 달력일자로 변환한다(UTC slice 시 자정 부근 전날로 새던 문제 방지).
export function noteDayKey(n) {
  if (n?.testDate) return String(n.testDate).slice(0, 10);
  return n?.createdAt ? formatLocalDateInput(new Date(n.createdAt)) : '';
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

export function printRangeForMode(mode, { date, month, customStart, customEnd }) {
  if (mode === 'week') return weekBounds(date);
  if (mode === 'month') return monthBounds(month);
  if (mode === 'custom') return normalizeRange(customStart, customEnd);
  return { start: date, end: date };
}

export function printRangeLabel(mode, range) {
  if (range.start === range.end) return toDateLabel(range.start);
  const prefix = mode === 'week' ? '주간' : mode === 'month' ? '월간' : '선택기간';
  return `${prefix} ${range.start} ~ ${range.end}`;
}

export function isWithinRange(day, range) {
  return Boolean(day && day >= range.start && day <= range.end);
}
