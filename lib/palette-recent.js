import { KEYS } from '@/lib/note/keys';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';

const MAX_RECENT_ITEMS = 5;

function normalizeRecentItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const href = typeof item.href === 'string' ? item.href.trim() : '';
  const label = typeof item.label === 'string' ? item.label.trim() : '';
  if (!href || !label) return null;
  const kind = typeof item.kind === 'string' ? item.kind.trim() : '';
  return {
    href,
    label,
    kind: kind || 'nav',
  };
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
