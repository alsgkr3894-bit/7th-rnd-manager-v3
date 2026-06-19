import { sampleNamesText } from '@/lib/sample';
import { buildCalendarDays } from '@/lib/note/calendar-utils';

export const SAMPLE_SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'rating', label: '별점순' },
];

export const SAMPLE_SORT_KEYS = new Set(SAMPLE_SORT_OPTIONS.map(option => option.key));
export const SAMPLE_VIEW_KEYS = new Set(['grid', 'list', 'calendar']);
export const SAMPLE_RATING_KEYS = new Set([-1, 0, 3, 4, 5]);

const CALENDAR_CELLS = 42; // 6주 x 7일, 달력 그리드 고정 칸 수

export function pickAllowed(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

export function filterSortSamples(samples, { catFilter, ratingMin, search, sortBy }) {
  let list = Array.isArray(samples) ? samples : [];
  if (catFilter !== 'all') list = list.filter(sample => sample.category === catFilter);
  if (ratingMin === -1) list = list.filter(sample => !sample.rating);
  else if (ratingMin > 0) list = list.filter(sample => (sample.rating || 0) >= ratingMin);
  if (String(search || '').trim()) {
    const query = String(search).toLowerCase();
    list = list.filter(
      sample =>
        (sample.title || '').toLowerCase().includes(query) ||
        sampleNamesText(sample).toLowerCase().includes(query) ||
        (sample.company || '').toLowerCase().includes(query) ||
        (sample.description || '').toLowerCase().includes(query) ||
        (sample.tags || '').toLowerCase().includes(query)
    );
  }
  return [...list].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
    // createdAt은 ISO 문자열 → 문자열 비교로 안정 정렬(누락 시 NaN으로 정렬 깨지던 문제 방지)
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

export function buildSampleCategoryCounts(samples) {
  const rows = Array.isArray(samples) ? samples : [];
  const counts = { all: rows.length };
  for (const sample of rows) counts[sample.category] = (counts[sample.category] || 0) + 1;
  return counts;
}

export function buildSampleRatingDist(samples) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, none: 0 };
  for (const sample of Array.isArray(samples) ? samples : []) {
    const rating = sample.rating || 0;
    if (rating >= 1 && rating <= 5) dist[rating] += 1;
    else dist.none += 1;
  }
  return dist;
}

export function buildSampleCalendarDays(calMonth) {
  return buildCalendarDays(calMonth, CALENDAR_CELLS);
}

export function buildSamplesByDate(samples) {
  const byDate = {};
  for (const sample of Array.isArray(samples) ? samples : []) {
    if (sample.testDate) (byDate[sample.testDate] ??= []).push(sample);
  }
  return byDate;
}
