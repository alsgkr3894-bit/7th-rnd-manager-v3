import { pad } from '@/lib/format';

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const NOTE_DOT = {
  아이디어: '#9CA3AF',
  샘플테스트: '#D97706',
  메뉴테스트: '#4338CA',
  테스트중: 'var(--accent)', // 레거시
  재테스트: 'var(--warn)',
  보고예정: '#7C3AED',
  출시예정: '#0284C7',
  보류: '#9CA3AF',
  출시: 'var(--positive)',
  폐기: 'var(--negative)',
};

let _todayCache = '';
let _todayCacheNum = 0;

export const toKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function dayNumColor({ hasToday, dow, past }) {
  if (hasToday) return '#fff';
  if (dow === 0) return '#EF4444';
  if (dow === 6) return '#3B82F6';
  return past ? 'var(--text-4)' : 'var(--text-1)';
}

export function groupByDate(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

export function todayKey() {
  const t = new Date();
  const n = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  if (n !== _todayCacheNum) {
    _todayCacheNum = n;
    _todayCache = toKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }
  return _todayCache;
}

export function normalizeChecklistMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([date, items]) => [
        date,
        Array.isArray(items)
          ? items
              .filter(item => item && typeof item === 'object' && String(item.text || '').trim())
              .map(item => ({
                id: String(item.id || `${date}-${Math.random()}`),
                text: String(item.text || '').trim(),
                done: item.done === true,
              }))
          : [],
      ])
      .filter(([, items]) => items.length > 0)
  );
}

export function checklistJournalTitle(dateKey) {
  return `${dateKey} 체크리스트 완료`;
}

export function checklistJournalContent(doneItems) {
  if (!doneItems.length) return '완료 항목 없음';
  return ['완료 체크리스트', ...doneItems.map(item => `- ${item.text}`)].join('\n');
}

export function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

export function firstDow(y, m) {
  return new Date(y, m - 1, 1).getDay();
}

export const isPast = (key, today) => key < today;
export const isToday = (key, today) => key === today;
