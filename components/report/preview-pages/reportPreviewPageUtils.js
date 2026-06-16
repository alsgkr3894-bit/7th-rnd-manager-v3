import { asDisplayText } from '@/lib/ui/prop-guards';

export function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function formatReportDate(value, options) {
  if (value == null) return '—';
  const safeValue =
    typeof value === 'string' || typeof value === 'number' || value instanceof Date
      ? value
      : asDisplayText(value);
  const date = safeValue instanceof Date ? safeValue : new Date(safeValue);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ko-KR', options);
}
