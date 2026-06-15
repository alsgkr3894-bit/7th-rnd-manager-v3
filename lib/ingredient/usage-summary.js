import { getMenusForIngredient } from '@/lib/cost/ingredient-menu-map';
import { asDisplayText } from '@/lib/ui/prop-guards';

const CATEGORY_ORDER = new Map([
  ['피자', 1],
  ['1인피자', 2],
  ['사이드', 3],
  ['세트박스', 4],
]);

function categoryRank(category) {
  return CATEGORY_ORDER.get(asDisplayText(category).trim()) ?? 99;
}

function text(value, fallback = '') {
  return asDisplayText(value, fallback).trim();
}

function normalizeSource(source) {
  const type = text(source?.type, '직접') || '직접';
  const name = text(source?.name);
  return {
    type,
    name,
    label: name && name !== type ? `${type}: ${name}` : type,
  };
}

function uniqueSources(sources) {
  const map = new Map();
  for (const source of Array.isArray(sources) ? sources : []) {
    const normalized = normalizeSource(source);
    const key = `${normalized.type}__${normalized.name}`;
    if (!map.has(key)) map.set(key, normalized);
  }
  return [...map.values()];
}

export function buildIngredientUsageRows({ ingredientToMenus, productCode, ingredientName }) {
  const menus = getMenusForIngredient(ingredientToMenus, productCode, ingredientName);
  return [...menus.entries()]
    .map(([menuCode, menu]) => ({
      menuCode,
      menuName: text(menu?.menuName) || menuCode,
      category: text(menu?.category, '미분류') || '미분류',
      sources: uniqueSources(menu?.sources),
    }))
    .sort((a, b) => {
      const rank = categoryRank(a.category) - categoryRank(b.category);
      if (rank !== 0) return rank;
      return a.menuName.localeCompare(b.menuName, 'ko');
    });
}

export function ingredientUsageIdentity(row) {
  const productCode = text(row?.productCode);
  const ingredientName = text(row?.ingredientName || row?.displayName || row?.productName);
  return { productCode, ingredientName };
}
