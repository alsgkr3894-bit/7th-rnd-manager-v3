/**
 * lib/cost/price-rise.js — "단가가 올라 메뉴 원가가 오른 경우"를 찾는 순수 함수
 *
 * 제때 단가 업로드(이전 파일 → 새 파일)나 식자재 수동 단가 저장(저장 전 → 저장 후)처럼
 * 두 시점의 식자재 단가표(unitPriceMap)가 있으면, 같은 레시피를 두 단가표로 각각 계산해
 * 원가가 오른 메뉴와 그 원인 식자재를 뽑는다. 원가 수식은 다시 만들지 않는다 —
 * buildMenuRecipeSummaryMap / componentEffectiveUnitPrice 같은 원가 화면 공용 함수를 그대로 쓴다.
 * DB 접근 없음.
 */
import { buildMenuRecipeSummaryMap, recipeKindForMenu } from '@/lib/menu-master/recipe-summary';
import { buildEffectiveRecipeComponents } from '@/lib/cost/recipe-groups/effective';
import { componentEffectiveUnitPrice } from '@/lib/cost/shared/effective-cost';
import { diffMenuCostMaps } from '@/lib/cost/history/price-file-cost';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const EPSILON = 1e-9;

/**
 * 두 단가표에서 단가가 오른 식자재 목록.
 * @returns {Array<{key, name, beforeUnitPrice, afterUnitPrice, deltaPct}>} 상승률 내림차순
 */
export function diffIngredientUnitPriceRises(beforeMap, afterMap) {
  const rises = [];
  if (!(beforeMap instanceof Map) || !(afterMap instanceof Map)) return rises;
  for (const [key, after] of afterMap) {
    const before = beforeMap.get(key);
    const beforePrice = asFiniteNumber(before?.unitPrice, null);
    const afterPrice = asFiniteNumber(after?.unitPrice, null);
    if (beforePrice == null || afterPrice == null) continue;
    if (!(afterPrice > beforePrice + EPSILON)) continue;
    rises.push({
      key,
      name: asDisplayText(after?.ingredientName || before?.ingredientName),
      beforeUnitPrice: beforePrice,
      afterUnitPrice: afterPrice,
      deltaPct: beforePrice > 0 ? ((afterPrice - beforePrice) / beforePrice) * 100 : null,
    });
  }
  return rises.sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));
}

function costMapFor({ menus, recipeMaps, recipeGroups, unitPriceMap }) {
  const summaryMap = buildMenuRecipeSummaryMap(menus, recipeMaps, unitPriceMap, { recipeGroups });
  const result = new Map();
  for (const menu of asObjectArray(menus)) {
    const menuCode = asDisplayText(menu?.menuCode);
    const summary = summaryMap.get(menuCode);
    if (!menuCode || !summary?.hasRecipe) continue;
    result.set(menuCode, {
      menuCode,
      menuName: asDisplayText(menu?.menuName),
      totalCost: summary.totalCost,
      costRate: summary.costRate,
      sellingPrice: asFiniteNumber(menu?.price, null),
    });
  }
  return result;
}

/** 이 메뉴 원가를 올린 구성품(식자재)들 — 금액 큰 순 */
function causesForMenu({ menu, recipe, recipeGroups, beforeMap, afterMap }) {
  const components = buildEffectiveRecipeComponents(
    {
      menuCode: menu.menuCode,
      menuName: menu.menuName,
      category: menu.category,
      size: recipe?.size || menu.size,
    },
    recipe,
    recipeGroups
  );
  const byName = new Map();
  for (const component of components) {
    const quantity = asFiniteNumber(component?.quantity, null);
    if (quantity == null || quantity <= 0) continue;
    const before = componentEffectiveUnitPrice(component, beforeMap);
    const after = componentEffectiveUnitPrice(component, afterMap);
    if (before == null || after == null || !(after > before + EPSILON)) continue;
    const name = asDisplayText(component.ingredientName) || asDisplayText(component.productCode);
    const prev = byName.get(name) || {
      name,
      beforeUnitPrice: before,
      afterUnitPrice: after,
      deltaPct: before > 0 ? ((after - before) / before) * 100 : null,
      deltaCost: 0,
    };
    prev.deltaCost += quantity * (after - before);
    byName.set(name, prev);
  }
  return [...byName.values()]
    .map(item => ({ ...item, deltaCost: Math.round(item.deltaCost * 10) / 10 }))
    .sort((a, b) => b.deltaCost - a.deltaCost);
}

/**
 * 단가표 두 개로 원가가 오른 메뉴를 찾는다.
 *
 * @param {{ menus, recipeMaps, recipeGroups, beforeMap, afterMap, minDeltaAbs? }} args
 * @returns {{ items: Array, ingredientRises: Array }}
 *   items: 원가 상승 메뉴(상승 금액 큰 순) —
 *     { menuCode, menuName, beforeCost, afterCost, costDelta, costDeltaPct,
 *       beforeCostRate, afterCostRate, sellingPrice, causes[] }
 *   ingredientRises: 단가가 오른 식자재(상승률 큰 순)
 */
export function findMenuCostRises({
  menus,
  recipeMaps,
  recipeGroups,
  beforeMap,
  afterMap,
  minDeltaAbs = 1,
}) {
  const safeMenus = asObjectArray(menus).filter(menu => menu?.status !== 'discontinued');
  const before = costMapFor({
    menus: safeMenus,
    recipeMaps,
    recipeGroups,
    unitPriceMap: beforeMap,
  });
  const after = costMapFor({ menus: safeMenus, recipeMaps, recipeGroups, unitPriceMap: afterMap });
  const menuByCode = new Map(safeMenus.map(menu => [asDisplayText(menu.menuCode), menu]));

  const items = diffMenuCostMaps(before, after, { minDeltaAbs })
    .filter(item => item.costDelta > 0)
    .map(item => {
      const menu = menuByCode.get(item.menuCode);
      const kind = menu ? recipeKindForMenu(menu) : null;
      const recipe = kind ? recipeMaps?.[kind]?.get(item.menuCode) || null : null;
      const causes =
        menu && recipe ? causesForMenu({ menu, recipe, recipeGroups, beforeMap, afterMap }) : [];
      return { ...item, causes };
    })
    .sort((a, b) => b.costDelta - a.costDelta);

  return { items, ingredientRises: diffIngredientUnitPriceRises(beforeMap, afterMap) };
}
