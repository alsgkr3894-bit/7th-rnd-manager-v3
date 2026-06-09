import { asDisplayText } from '@/lib/ui/prop-guards';

export function normalizeNumberSeries(data) {
  if (!Array.isArray(data)) return [];
  return data.map(value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  });
}

export function normalizeDonutItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    const base = item && typeof item === 'object' ? item : {};
    const value = Number(base.value);
    return {
      ...base,
      value: Number.isFinite(value) && value > 0 ? value : 0,
    };
  });
}

export function normalizeAreaSeries(series) {
  if (!Array.isArray(series)) return [];
  return series.map(item => {
    const base = item && typeof item === 'object' ? item : {};
    return {
      ...base,
      name: typeof base.name === 'string' ? base.name : '',
      data: normalizeNumberSeries(base.data),
    };
  });
}

export function normalizeChartLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map(label => asDisplayText(label));
}

export function normalizeChartDimension(value, fallback, { min = 1, max = 2000 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function normalizeChartColor(value, fallback = '#888') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function normalizeChartColors(colors, fallback = '#888') {
  if (!Array.isArray(colors)) return [];
  return colors.map(color => normalizeChartColor(color, fallback));
}

export function normalizeChartFormatter(formatter, fallback) {
  return typeof formatter === 'function' ? formatter : fallback;
}
