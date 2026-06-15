import { calcCostBySizes } from '@/lib/recipe';
import {
  buildActiveDetailRecipeKeySet,
  hasDetailRecipeComponents,
  recipeMatchesKeySet,
} from '@/lib/cost/recipe-source-precedence';
import { componentSubtotal } from '@/lib/cost/shared/calc';
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

const CATEGORY_TO_PATH = {
  피자: 'pizza',
  '1인피자': 'personal',
  사이드: 'side',
  세트박스: 'set',
  기타: 'recipe',
};

export function costPathFor(cat) {
  return CATEGORY_TO_PATH[cat] || 'recipe';
}

export function detailStoreFor(rawCat, maps) {
  const c = rawCat || '';
  if (c === '1인피자') return maps.personal;
  if (c === '세트박스') return maps.set;
  if (c === '사이드' || c === '소스' || c === '음료' || c === '엣지') return maps.side;
  if (c === '피자' || c.startsWith('피자/')) return maps.pizza;
  return null;
}

export function detailComponentCost(components) {
  return Array.isArray(components)
    ? Math.round(components.reduce((acc, c) => acc + componentSubtotal(c), 0))
    : 0;
}

export function buildRows(recipes, unitPriceMap, menuPrices, detailMaps) {
  const rows = [];
  const activeDetailKeys = buildActiveDetailRecipeKeySet(
    Object.values(detailMaps || {}).flatMap(map => (map instanceof Map ? [...map.values()] : []))
  );

  const recipeByName = new Map();
  for (const r of recipes) {
    if (r.menuName && !recipeByName.has(r.menuName)) recipeByName.set(r.menuName, r);
  }

  const byMenu = new Map();
  for (const mp of menuPrices) {
    if (!mp.menuName) continue;
    if (!byMenu.has(mp.menuName))
      byMenu.set(mp.menuName, { category: mp.category || '', entries: [] });
    const g = byMenu.get(mp.menuName);
    if (!g.category && mp.category) g.category = mp.category;
    g.entries.push({ menuCode: mp.menuCode, size: mp.size, price: mp.price });
  }

  const usedRecipeNames = new Set();

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
        cost = detailComponentCost(rec.components);
      }
    }

    const hasAuthoritativeDetail =
      detailMap &&
      entries.some(entry => hasDetailRecipeComponents(detailMap.get(entry.menuCode)));
    const hasAuthoritativeDetailByIdentity = recipeMatchesKeySet(
      { menuCode: firstEntry?.menuCode, menuName },
      activeDetailKeys
    );

    if (!hasAuthoritativeDetail && !hasAuthoritativeDetailByIdentity && !cost) {
      const lr = recipeByName.get(menuName);
      if (lr) {
        usedRecipeNames.add(menuName);
        const cm = calcCostBySizes(lr, unitPriceMap);
        const fs = lr.sizes?.[0];
        if (fs) {
          cost = cm[fs.label] || 0;
          if (sellingPrice == null) sellingPrice = fs.sellingPrice || null;
        }
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

  for (const recipe of recipes) {
    if (recipeMatchesKeySet(recipe, activeDetailKeys)) continue;
    if (byMenu.has(recipe.menuName) || usedRecipeNames.has(recipe.menuName)) continue;
    const firstSize = recipe.sizes?.[0];
    if (!firstSize) continue;
    const costMap = calcCostBySizes(recipe, unitPriceMap);
    const cost = costMap[firstSize.label] || 0;
    const sellingPrice = firstSize.sellingPrice || null;
    rows.push({
      id: recipe.id,
      menuName: recipe.menuName,
      rawCategory: recipe.menuCategory || '기타',
      category: normalizeCategory(recipe.menuCategory),
      cost: cost > 0 ? Math.round(cost) : null,
      sellingPrice,
      costRate: cost > 0 ? calcCostRate(cost, sellingPrice) : null,
      hasCost: cost > 0,
    });
  }

  return rows;
}
