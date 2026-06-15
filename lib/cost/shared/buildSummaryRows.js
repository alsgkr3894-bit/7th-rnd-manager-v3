import { hasDetailRecipeComponents } from '@/lib/cost/recipe-source-precedence';
import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';
import { calcCostRate } from '@/lib/cost/rate-color';
import { MENU_CATEGORY } from '@/lib/menu-categories';
import {
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSetCategory,
  isSideCategory,
} from '@/lib/menu-master/category-policy';

export const CAT_ORDER = [
  MENU_CATEGORY.PIZZA,
  MENU_CATEGORY.PERSONAL,
  MENU_CATEGORY.SIDE,
  MENU_CATEGORY.SET,
  MENU_CATEGORY.ETC,
];

export function normalizeCategory(cat) {
  if (!cat) return '기타';
  if (isPizzaCategory(cat, { includePersonal: false })) return '피자';
  if (isPersonalPizzaCategory(cat)) return '1인피자';
  if (isSideCategory(cat) || cat === '음료' || cat === '엣지') return '사이드';
  if (isSetCategory(cat)) return '세트박스';
  return '기타';
}

export function catRank(cat) {
  const i = CAT_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

export function detailStoreFor(rawCat, maps) {
  const c = rawCat || '';
  if (c === '1인피자') return maps.personal;
  if (c === '세트박스') return maps.set;
  if (c === '사이드' || c === '소스' || c === '음료' || c === '엣지') return maps.side;
  if (c === '피자' || c.startsWith('피자/')) return maps.pizza;
  return null;
}

export function detailComponentCost(components, unitPriceMap = new Map()) {
  return effectiveComponentsCost(components, unitPriceMap);
}

export function buildRows(menuPrices, detailMaps, unitPriceMap = new Map()) {
  const rows = [];

  const byMenu = new Map();
  for (const mp of menuPrices) {
    if (!mp.menuName) continue;
    if (!byMenu.has(mp.menuName))
      byMenu.set(mp.menuName, { category: mp.category || '', entries: [] });
    const g = byMenu.get(mp.menuName);
    if (!g.category && mp.category) g.category = mp.category;
    g.entries.push({ menuCode: mp.menuCode, size: mp.size, price: mp.price });
  }

  for (const [menuName, { category, entries }] of byMenu) {
    const firstEntry = entries[0];
    const norm = normalizeCategory(category);
    const detailMap = detailStoreFor(category, detailMaps);

    let cost = 0;
    let sellingPrice = firstEntry?.price ?? null;

    if (detailMap) {
      const detailRecipes = entries.map(e => detailMap.get(e.menuCode)).filter(Boolean);
      const rec = detailRecipes.find(hasDetailRecipeComponents) || detailRecipes[0];
      if (hasDetailRecipeComponents(rec)) {
        cost = detailComponentCost(rec.components, unitPriceMap);
      }
    }

    const costRate = cost > 0 ? calcCostRate(cost, sellingPrice) : null;
    rows.push({
      id: `mp-${menuName}`,
      menuName,
      menuCode: firstEntry?.menuCode || '',
      rawCategory: category || '',
      category: norm,
      cost: cost > 0 ? Math.round(cost) : null,
      sellingPrice,
      costRate,
      hasCost: cost > 0,
    });
  }

  return rows;
}
