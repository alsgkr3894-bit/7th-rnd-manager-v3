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

export function safeQuantity(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

export function safePercentWidth(value, maxValue) {
  const max = Math.abs(safeQuantity(maxValue));
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (Math.abs(safeQuantity(value)) / max) * 100));
}

export function normalizeScope(value) {
  return ['all', 'pizza', 'side'].includes(value) ? value : 'all';
}

export function normalizePeriodMode(value) {
  return ['month', 'year'].includes(value) ? value : 'month';
}
