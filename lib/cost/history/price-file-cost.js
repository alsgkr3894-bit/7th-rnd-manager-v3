/**
 * lib/cost/history/price-file-cost.js — 특정 단가파일 시점 기준 메뉴 원가 재계산.
 *
 * 원가 변동 이력을 위한 새 스토어(menu_cost_history 등)는 만들지 않는다 — 레시피를
 * 수정하는 순간 과거 스토어 행이 전부 stale해지고, 백업 용량만 늘어난다. 대신
 * price_files/price_rows(그 시점 단가) + menu_recipes(현재 레시피)를 그대로
 * buildUnitPriceMap/buildMenuRecipeSummaryMap에 대입해 "그 단가였다면 원가가
 * 얼마였을지"를 즉석에서 재계산한다 — 원가 수식은 절대 재구현하지 않는다.
 *
 * DB 접근이 전혀 없는 순수 함수만 모아 node 테스트로 검증한다.
 */
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildMenuRecipeSummaryMap } from '@/lib/menu-master/recipe-summary';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

/** price_rows 배열 → productCode 기준 Map (buildUnitPriceMap이 기대하는 형태로 변환) */
export function buildPriceRowMap(rows) {
  const map = new Map();
  for (const row of asObjectArray(rows)) {
    const productCode = asDisplayText(row?.productCode);
    if (!productCode) continue;
    const priceWithTax = asFiniteNumber(row?.priceWithTax, null);
    if (priceWithTax == null) continue;
    map.set(productCode, { productCode, priceWithTax });
  }
  return map;
}

/**
 * 주어진 단가 시점(priceRowMap) 기준으로 레시피가 있는 전 메뉴의 원가/원가율을 계산한다.
 *
 * @param {{menus, recipeMaps, priceRowMap, ingredients, recipeGroups}} args
 * @returns {Map<string, {menuCode, menuName, totalCost, costRate, sellingPrice}>}
 */
export function buildMenuCostMap({ menus, recipeMaps, priceRowMap, ingredients, recipeGroups }) {
  const unitPriceMap = buildUnitPriceMap(asObjectArray(ingredients), priceRowMap ?? new Map());
  const summaryMap = buildMenuRecipeSummaryMap(menus, recipeMaps, unitPriceMap, { recipeGroups });

  const result = new Map();
  for (const menu of asObjectArray(menus)) {
    const menuCode = asDisplayText(menu?.menuCode);
    if (!menuCode) continue;
    const summary = summaryMap.get(menuCode);
    if (!summary?.hasRecipe) continue;
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

/**
 * 두 시점의 메뉴 원가 맵을 비교해 변동 목록을 만든다.
 * before/after 둘 다에 레시피가 있는 메뉴만 대상 — 한쪽에만 있으면 "그 사이 레시피가
 * 새로 생겼다/없어졌다"는 뜻이라 단가 변동과는 다른 이야기다.
 * |costDeltaPct| 내림차순, minDeltaAbs원 미만 변동은 제외(소수점 반올림 잡음 방지).
 *
 * @returns {Array<{menuCode, menuName, beforeCost, afterCost, costDelta, costDeltaPct,
 *   beforeCostRate, afterCostRate, costRateDelta, sellingPrice}>}
 */
export function diffMenuCostMaps(before, after, { minDeltaAbs = 1 } = {}) {
  const result = [];
  for (const [menuCode, afterEntry] of after) {
    const beforeEntry = before.get(menuCode);
    if (!beforeEntry) continue;

    const costDelta = afterEntry.totalCost - beforeEntry.totalCost;
    if (Math.abs(costDelta) < minDeltaAbs) continue;

    const costDeltaPct =
      beforeEntry.totalCost > 0 ? (costDelta / beforeEntry.totalCost) * 100 : null;
    const costRateDelta =
      beforeEntry.costRate != null && afterEntry.costRate != null
        ? afterEntry.costRate - beforeEntry.costRate
        : null;

    result.push({
      menuCode,
      menuName: afterEntry.menuName,
      beforeCost: beforeEntry.totalCost,
      afterCost: afterEntry.totalCost,
      costDelta,
      costDeltaPct,
      beforeCostRate: beforeEntry.costRate,
      afterCostRate: afterEntry.costRate,
      costRateDelta,
      sellingPrice: afterEntry.sellingPrice,
    });
  }

  result.sort((a, b) => Math.abs(b.costDeltaPct ?? 0) - Math.abs(a.costDeltaPct ?? 0));
  return result;
}
