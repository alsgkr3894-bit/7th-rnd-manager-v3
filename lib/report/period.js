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
  return ['month', 'year'].includes(value) ? value : 'month';
}
