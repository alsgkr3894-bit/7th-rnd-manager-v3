import { asDisplayText } from './prop-guards';

export function normalizeChipLabel(label) {
  return asDisplayText(label);
}

export function normalizeChipCount(count) {
  return typeof count === 'number' || typeof count === 'string' ? count : null;
}

export function normalizeChipActive(active) {
  return Boolean(active);
}

export function normalizeChipDim(dim) {
  return Boolean(dim);
}

export function normalizeChipColor(color, fallback = 'var(--text-2)') {
  return typeof color === 'string' && color ? color : fallback;
}

export function normalizeChipOnClick(onClick) {
  return typeof onClick === 'function' ? onClick : undefined;
}

export function getChipTextColor({ active, dim, color } = {}) {
  if (normalizeChipActive(active)) return '#fff';
  if (normalizeChipDim(dim)) return 'var(--text-4)';
  return normalizeChipColor(color);
}

export function getChipButtonStyle({ active, dim, color } = {}) {
  const isActive = normalizeChipActive(active);
  const isDim = normalizeChipDim(dim);

  return {
    cursor: 'pointer',
    border: 'none',
    background: isActive ? 'var(--accent)' : 'var(--surface-2)',
    color: getChipTextColor({ active: isActive, dim: isDim, color }),
    fontWeight: 600,
    opacity: isDim ? 0.7 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

export function getChipBadgeStyle(active) {
  const isActive = normalizeChipActive(active);

  return {
    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
    color: isActive ? '#fff' : 'var(--text-3)',
    padding: '1px 6px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
  };
}
