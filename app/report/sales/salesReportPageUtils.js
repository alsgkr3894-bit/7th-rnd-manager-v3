export function normalizeViewMode(value) {
  return ['rank', 'compare'].includes(value) ? value : 'rank';
}
