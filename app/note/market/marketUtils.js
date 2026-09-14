/**
 * app/note/market/marketUtils.js — 시장조사 목록 그룹핑·검색·폼 기본값 (순수)
 */
import { MARKET_RESEARCH_TYPES } from '@/lib/note/market-research';
import { todayLocalDate } from '@/lib/date/local-date';

export const COMPETITOR_ID = '미지정';
// 경쟁사 이름을 안정적으로 색으로 매핑 — 매번 다른 순서로 렌더링돼도 같은 경쟁사는 같은 색.
const COMPETITOR_COLORS = [
  '#E1101F',
  '#2563EB',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
];

export function colorForCompetitor(label) {
  if (!label || label === COMPETITOR_ID) return 'var(--text-4)';
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return COMPETITOR_COLORS[hash % COMPETITOR_COLORS.length];
}

/** 경쟁사별로 묶어 카테고리처럼 보여준다. 미지정(빈 값)은 항상 맨 뒤. */
export function groupByCompetitor(rows) {
  const groups = new Map();
  for (const row of rows) {
    const label = String(row.competitor || '').trim() || COMPETITOR_ID;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  return [...groups.entries()]
    .map(([label, items]) => ({ label, items, color: colorForCompetitor(label) }))
    .sort((a, b) => {
      if (a.label === COMPETITOR_ID) return 1;
      if (b.label === COMPETITOR_ID) return -1;
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.label.localeCompare(b.label, 'ko');
    });
}

export const EMPTY_FORM = {
  id: null,
  type: MARKET_RESEARCH_TYPES[0],
  date: '',
  brand: '',
  title: '',
  competitor: '',
  marketTrend: '',
  referencePoint: '',
  developmentDirection: '',
  actionIdea: '',
  tags: '',
  photos: [],
};

export function withToday(value = {}) {
  return {
    ...EMPTY_FORM,
    ...value,
    date: value.date || todayLocalDate(),
    photos: Array.isArray(value.photos) ? value.photos : [],
  };
}

export function includesQuery(row, query) {
  if (!query) return true;
  const photoText = (Array.isArray(row?.photos) ? row.photos : [])
    .map(photo => [photo?.caption, photo?.name].filter(Boolean).join(' '))
    .join('\n');
  const haystack = [
    row.type,
    row.date,
    row.brand,
    row.title,
    row.competitor,
    row.marketTrend,
    row.referencePoint,
    row.developmentDirection,
    row.actionIdea,
    row.tags,
    photoText,
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function hasFormContent(form) {
  return Boolean(
    form.title.trim() ||
    form.marketTrend.trim() ||
    form.referencePoint.trim() ||
    form.developmentDirection.trim() ||
    (Array.isArray(form.photos) && form.photos.some(photo => photo?.data))
  );
}
