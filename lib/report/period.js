import { asFiniteNumber } from '@/lib/ui/prop-guards';

export function safeYear(value, fallback = new Date().getFullYear()) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1900 || n > 2999) return fallback;
  return Math.floor(n);
}

export function safeMonth(value, fallback = new Date().getMonth() + 1) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1 || n > 12) return fallback;
  return Math.floor(n);
}

export function safeQuarter(value, fallback = Math.ceil((new Date().getMonth() + 1) / 3)) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1 || n > 4) return fallback;
  return Math.floor(n);
}

export function quarterOfMonth(month) {
  return Math.min(4, Math.max(1, Math.ceil(safeMonth(month, 1) / 3)));
}

/** 분기(1~4)에 속한 월 3개를 오름차순으로 반환한다. */
export function monthsOfQuarter(quarter) {
  const q = safeQuarter(quarter, 1);
  const start = (q - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

export function normalizeYearMonth(value) {
  const year = asFiniteNumber(value?.year, null);
  const month = asFiniteNumber(value?.month, null);
  if (year == null || month == null || year < 1900 || year > 2999 || month < 1 || month > 12) {
    return null;
  }
  return { year: Math.floor(year), month: Math.floor(month) };
}

export function safeQuantity(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

export function safePercentWidth(value, maxValue) {
  const max = Math.abs(safeQuantity(maxValue));
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.abs(safeQuantity(value)) / max) * 100));
}

const VALID_SCOPES = ['all', '피자', '1인피자', '사이드', '세트박스', '음료', '기타'];
const SCOPE_ALIASES = {
  pizza: '피자',
  side: '사이드',
  onePizza: '1인피자',
  singlePizza: '1인피자',
  setBox: '세트박스',
  drink: '음료',
  beverage: '음료',
  etc: '기타',
};

export function normalizeScope(value) {
  const text = String(value ?? '').trim();
  const normalized = SCOPE_ALIASES[text] || text;
  return VALID_SCOPES.includes(normalized) ? normalized : 'all';
}

export function normalizePeriodMode(value) {
  return ['month', 'quarter', 'year'].includes(value) ? value : 'month';
}

/**
 * periodMode(월/분기/년)에 따라 해당 기간에 속하는 {year, month} 목록을 오름차순으로 반환한다.
 * @param {'month'|'quarter'|'year'} periodMode
 * @param {number} year
 * @param {number|null} monthOrQuarter - month 모드면 월(1~12), quarter 모드면 분기(1~4), year 모드면 무시
 */
export function monthsInPeriod(periodMode, year, monthOrQuarter) {
  const y = safeYear(year);
  if (periodMode === 'year') {
    return Array.from({ length: 12 }, (_, i) => ({ year: y, month: i + 1 }));
  }
  if (periodMode === 'quarter') {
    return monthsOfQuarter(monthOrQuarter).map(month => ({ year: y, month }));
  }
  return [{ year: y, month: safeMonth(monthOrQuarter) }];
}

/**
 * periodMode에 따른 직전 기간의 { year, monthOrQuarter }를 반환한다.
 * month → 전월, quarter → 전분기, year → 전년.
 */
export function previousPeriod(periodMode, year, monthOrQuarter) {
  const y = safeYear(year);
  if (periodMode === 'year') return { year: y - 1, monthOrQuarter: null };
  if (periodMode === 'quarter') {
    const q = safeQuarter(monthOrQuarter);
    return q === 1 ? { year: y - 1, monthOrQuarter: 4 } : { year: y, monthOrQuarter: q - 1 };
  }
  const m = safeMonth(monthOrQuarter);
  return m === 1 ? { year: y - 1, monthOrQuarter: 12 } : { year: y, monthOrQuarter: m - 1 };
}

/** periodMode별 "직전 기간" 비교 라벨 (KPI 카드 등에서 사용) */
export function periodCompareLabel(periodMode) {
  if (periodMode === 'year') return '전년';
  if (periodMode === 'quarter') return '전분기';
  return '전월';
}

/** periodMode에 맞는 기간 표시 문자열 (예: "2026년", "2026년 2분기", "2026년 3월") */
export function formatPeriodLabel(periodMode, year, monthOrQuarter) {
  const y = safeYear(year);
  if (periodMode === 'year') return `${y}년`;
  if (periodMode === 'quarter') return `${y}년 ${safeQuarter(monthOrQuarter)}분기`;
  return `${y}년 ${safeMonth(monthOrQuarter)}월`;
}
