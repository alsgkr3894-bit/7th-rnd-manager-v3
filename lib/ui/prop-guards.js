export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asStringArray(value) {
  return asArray(value).filter(item => typeof item === 'string');
}

export function asObjectArray(value) {
  return asArray(value).filter(item => item && typeof item === 'object' && !Array.isArray(item));
}

export function asDisplayText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return fallback;
}

export function asFiniteNumber(value, fallback = null) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asTimestamp(value, fallback = 0) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : fallback;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const text = asDisplayText(value);
  if (!text) return fallback;
  const time = new Date(text).getTime();
  return Number.isFinite(time) ? time : fallback;
}

export function clampInteger(
  value,
  { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min } = {}
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
