import { clampInteger } from './prop-guards';

export function normalizeSkeletonLength(value, fallback) {
  return typeof value === 'number' || typeof value === 'string' ? value : fallback;
}

export function normalizeSkeletonStyle(style) {
  return style && typeof style === 'object' && !Array.isArray(style) ? style : undefined;
}

export function normalizeSkeletonRowCount(rows) {
  return clampInteger(rows, { min: 0, max: 50, fallback: 5 });
}

export function normalizeSkeletonColumnCount(cols) {
  return clampInteger(cols, { min: 1, max: 20, fallback: 5 });
}

export function getSkeletonStyle({ width = '100%', height = 16, radius = 6, style } = {}) {
  return {
    width: normalizeSkeletonLength(width, '100%'),
    height: normalizeSkeletonLength(height, 16),
    borderRadius: normalizeSkeletonLength(radius, 6),
    background: 'var(--surface-2)',
    backgroundImage:
      'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    ...normalizeSkeletonStyle(style),
  };
}

export function getSkeletonTableCellWidth(columnIndex, columnCount) {
  const safeColumnIndex = clampInteger(columnIndex, { min: 0, fallback: 0 });
  const safeColumnCount = normalizeSkeletonColumnCount(columnCount);

  if (safeColumnIndex === 0) return '60%';
  if (safeColumnIndex === safeColumnCount - 1) return 40;
  return '85%';
}
