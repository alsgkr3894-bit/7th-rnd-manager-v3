/**
 * lib/report/price-cost-impact.js — 가격 변동이 메뉴 원가에 준 영향 (순수)
 *
 * 기준 파일 단가와 최신 파일 단가로 같은 레시피 원가를 두 번 계산해 달라진 메뉴만 돌려준다.
 * 원가 보고서·레시피 출력과 같은 계산(buildRecipePrintRows, edgeTotalCost)을 쓰므로 숫자가 같다.
 */
import { buildUnitPriceMap } from '@/lib/recipe';
import { buildRecipePrintRows } from '@/lib/report/recipe-print-rows';
import { edgeTotalCost } from '@/lib/cost/edge-dough/calc';
import { componentEffectiveUnitPrice } from '@/lib/cost/shared/effective-cost';
import { dedupePriceRowsByProductCode } from '@/lib/price/duplicates';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

/** price_rows → { productCode → { productCode, priceWithTax } } (buildUnitPriceMap 입력) */
export function priceRowMapFromRows(rows) {
  const map = new Map();
  for (const row of dedupePriceRowsByProductCode(asObjectArray(rows)).rows) {
    const productCode = asDisplayText(row?.productCode).trim();
    const priceWithTax = asFiniteNumber(row?.priceWithTax, null);
    if (productCode && priceWithTax != null) map.set(productCode, { productCode, priceWithTax });
  }
  return map;
}

function causesOf(beforeComponents, afterComponents) {
  const names = [];
  afterComponents.forEach((after, index) => {
    const before = beforeComponents[index];
    const a = asFiniteNumber(after?.unitPrice, null);
    const b = asFiniteNumber(before?.unitPrice, null);
    if ((a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9)) return;
    const name = asDisplayText(after?.ingredientName);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function rateOf(before, after) {
  return before > 0 ? ((after - before) / before) * 100 : 0;
}

/**
 * @param {{ baseRows, latestRows, ingredients, detailMaps, recipeGroups, edges, excludeMenuCodes }} input
 * @returns {{ menus: object[], up: number, down: number }} menus는 |변동액| 큰 순
 */
export function buildPriceCostImpact({
  baseRows,
  latestRows,
  ingredients,
  detailMaps,
  recipeGroups,
  edges,
  excludeMenuCodes,
} = {}) {
  const baseMap = buildUnitPriceMap(ingredients, priceRowMapFromRows(baseRows));
  const latestMap = buildUnitPriceMap(ingredients, priceRowMapFromRows(latestRows));
  const rowsFor = unitPriceMap =>
    buildRecipePrintRows({ detailMaps, unitPriceMap, recipeGroups, excludeMenuCodes });
  const beforeRows = rowsFor(baseMap);
  const afterRows = rowsFor(latestMap);

  const menus = [];
  afterRows.forEach((after, index) => {
    const before = beforeRows[index];
    if (!before || before.totalCost === after.totalCost) return;
    menus.push({
      category: after.categoryLabel,
      code: after.menuCode,
      name: after.menuName,
      size: after.size,
      before: before.totalCost,
      after: after.totalCost,
      diff: after.totalCost - before.totalCost,
      rate: rateOf(before.totalCost, after.totalCost),
      causes: causesOf(before.components, after.components),
    });
  });

  for (const edge of asObjectArray(edges)) {
    const before = Math.round(edgeTotalCost(edge, baseMap));
    const after = Math.round(edgeTotalCost(edge, latestMap));
    if (before === after) continue;
    const withPrices = unitPriceMap =>
      asObjectArray(edge?.components).map(c => ({
        ...c,
        unitPrice: componentEffectiveUnitPrice(c, unitPriceMap),
      }));
    const beforeComponents = withPrices(baseMap);
    const afterComponents = withPrices(latestMap);
    menus.push({
      category: '엣지',
      code: '',
      name: asDisplayText(edge?.edgeType, '엣지'),
      size: asDisplayText(edge?.size),
      before,
      after,
      diff: after - before,
      rate: rateOf(before, after),
      causes: causesOf(beforeComponents, afterComponents),
    });
  }

  menus.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.name.localeCompare(b.name, 'ko'));
  return {
    menus,
    up: menus.filter(m => m.diff > 0).length,
    down: menus.filter(m => m.diff < 0).length,
  };
}
