import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import {
  MENU_CODE_MODE,
  getMenuCodeBase,
  normalizeMenuCodeForModule,
} from '@/lib/menu-master/code-policy';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { asObjectArray } from '@/lib/ui/prop-guards';

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function sortMenuCodeOptions(a, b) {
  const ra = getMenuCodeRank(a.code);
  const rb = getMenuCodeRank(b.code);
  if (ra !== rb) return ra - rb;
  return a.code.localeCompare(b.code);
}

function buildMenuCodeOption(menu, code) {
  const size = asText(menu.size);
  return {
    code,
    menuName: asText(menu.menuName),
    subCategory: asText(menu.subCategory),
    category: asText(menu.category),
    sizes: size ? [size] : [],
  };
}

export function getBaseCode(menu) {
  return getMenuCodeBase(menu);
}

export function getMenuCodeMeta(code) {
  return parseCategoryFromCode(code);
}

export function buildMenuCodeDisplayList(menuMasters = [], { dedup = true, mode = null } = {}) {
  const active = asObjectArray(menuMasters).filter(
    menu => menu.status !== 'discontinued' && menu.menuCode
  );
  const effectiveMode = mode || (dedup ? MENU_CODE_MODE.BASE : MENU_CODE_MODE.FULL);

  if (effectiveMode === MENU_CODE_MODE.FULL) {
    return active
      .map(menu =>
        buildMenuCodeOption(menu, normalizeMenuCodeForModule(menu, { mode: MENU_CODE_MODE.FULL }))
      )
      .sort(sortMenuCodeOptions);
  }

  const seen = new Map();
  for (const menu of active) {
    const base = normalizeMenuCodeForModule(menu, { mode: MENU_CODE_MODE.BASE });
    const size = asText(menu.size);
    if (!seen.has(base)) {
      seen.set(base, buildMenuCodeOption(menu, base));
    } else if (size) {
      const bucket = seen.get(base);
      if (!bucket.sizes.includes(size)) bucket.sizes.push(size);
    }
  }

  return [...seen.values()].sort(sortMenuCodeOptions);
}

export function filterMenuCodeOptions(displayList = [], query = '', limit = 50) {
  const term = query.trim().toLowerCase();
  const source = Array.isArray(displayList) ? displayList : [];
  if (!term) return source.slice(0, limit);

  return source
    .filter(
      menu =>
        (menu.code || '').toLowerCase().includes(term) ||
        (menu.menuName || '').toLowerCase().includes(term) ||
        (menu.subCategory || '').toLowerCase().includes(term) ||
        (menu.category || '').toLowerCase().includes(term)
    )
    .slice(0, limit);
}

export function getNextMenuCodeActiveIndex(currentIndex, key, total) {
  if (!Number.isFinite(total) || total <= 0) return -1;
  if (key === 'ArrowDown') return Math.min(currentIndex + 1, total - 1);
  if (key === 'ArrowUp') return Math.max(currentIndex - 1, 0);
  return currentIndex;
}
