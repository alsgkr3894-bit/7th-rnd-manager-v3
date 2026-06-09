export function isSampleSelectionId(id) {
  if (typeof id === 'number') return Number.isFinite(id);
  if (typeof id === 'string') return id.trim().length > 0;
  return false;
}

function asIterableValues(values) {
  if (!values || typeof values === 'string') return [];
  return typeof values[Symbol.iterator] === 'function' ? values : [];
}

function normalizeMaxSize(maxSize) {
  return Number.isFinite(maxSize) && maxSize >= 0 ? maxSize : Infinity;
}

export function toSampleSelectionIds(values) {
  return [...asIterableValues(values)].filter(isSampleSelectionId);
}

export function toggleSampleSelection(values, id, options = {}) {
  const next = new Set(asIterableValues(values));
  const maxSize = options && typeof options === 'object' ? options.maxSize : undefined;
  if (!isSampleSelectionId(id)) return next;

  if (next.has(id)) {
    next.delete(id);
    return next;
  }

  if (next.size < normalizeMaxSize(maxSize)) {
    next.add(id);
  }

  return next;
}
