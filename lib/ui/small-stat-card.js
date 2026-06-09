import { asDisplayText } from './prop-guards';

export function normalizeSmallStatLabel(label) {
  return asDisplayText(label);
}

export function normalizeSmallStatValue(value) {
  return asDisplayText(value, '—');
}

export function normalizeSmallStatUnit(unit) {
  return asDisplayText(unit);
}

export function normalizeSmallStatValueColor(valueColor) {
  return typeof valueColor === 'string' && valueColor ? valueColor : undefined;
}

export function getSmallStatCardStyle() {
  return { padding: '12px 20px', flex: 1 };
}

export function getSmallStatLabelStyle() {
  return { fontSize: 12, color: 'var(--text-3)' };
}

export function getSmallStatValueStyle(valueColor) {
  return {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 2,
    color: normalizeSmallStatValueColor(valueColor),
  };
}

export function getSmallStatUnitStyle() {
  return { fontSize: 13, color: 'var(--text-3)', marginLeft: 4 };
}
