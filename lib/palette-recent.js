import { KEYS } from '@/lib/note/keys';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const MAX_RECENT_ITEMS = 5;
const MAX_FAVORITE_ITEMS = 8;

function normalizeRecentItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const href = typeof item.href === 'string' ? item.href.trim() : '';
  const label = typeof item.label === 'string' ? item.label.trim() : '';
  if (!href || !label) return null;
  const kind = typeof item.kind === 'string' ? item.kind.trim() : '';
  const normalized = {
    href,
    label,
    kind: kind || 'nav',
  };
  if (typeof item.sub === 'string' && item.sub.trim()) normalized.sub = item.sub.trim();
  if (typeof item.icon === 'string' && item.icon.trim()) normalized.icon = item.icon.trim();
  if (item.requiresEdit === true) normalized.requiresEdit = true;
  return normalized;
}

export function normalizeRecentItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeRecentItem).filter(Boolean).slice(0, MAX_RECENT_ITEMS);
}

export function getRecentPaletteItems() {
  return normalizeRecentItems(getJSONLS(KEYS.PALETTE_RECENT));
}

export function saveRecentPaletteItem(item) {
  const normalized = normalizeRecentItem(item);
  if (!normalized) return getRecentPaletteItems();

  const list = [
    normalized,
    ...getRecentPaletteItems().filter(recent => recent.href !== normalized.href),
  ].slice(0, MAX_RECENT_ITEMS);

  setJSONLS(KEYS.PALETTE_RECENT, list);
  return list;
}

export function normalizeFavoritePaletteItems(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const normalized = normalizeRecentItem(item);
    if (!normalized || seen.has(normalized.href)) continue;
    seen.add(normalized.href);
    result.push(normalized);
    if (result.length >= MAX_FAVORITE_ITEMS) break;
  }
  return result;
}

export function getFavoritePaletteItems() {
  return normalizeFavoritePaletteItems(getJSONLS(KEYS.PALETTE_FAVORITES));
}

export function isFavoritePaletteItem(item, favorites = getFavoritePaletteItems()) {
  const href = typeof item?.href === 'string' ? item.href.trim() : '';
  return Boolean(href && favorites.some(favorite => favorite.href === href));
}

export function toggleFavoritePaletteItem(item) {
  const normalized = normalizeRecentItem(item);
  if (!normalized) return getFavoritePaletteItems();

  const current = getFavoritePaletteItems();
  const exists = current.some(favorite => favorite.href === normalized.href);
  const list = exists
    ? current.filter(favorite => favorite.href !== normalized.href)
    : [normalized, ...current].slice(0, MAX_FAVORITE_ITEMS);

  setJSONLS(KEYS.PALETTE_FAVORITES, list);
  return list;
}
