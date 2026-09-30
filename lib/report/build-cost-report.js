import { effectiveComponentsCost } from '@/lib/cost/shared/effective-cost';
import { edgeTotalCost } from '@/lib/cost/edge-dough';
import { buildEffectiveRecipeComponents } from '@/lib/cost/recipe-groups/effective';
import { hasDetailRecipeComponents } from '@/lib/cost/recipe-source-precedence';
import { getMenuCodeRank } from '@/lib/menu-categories';
import {
  isPizzaCategory,
  isPersonalPizzaCategory,
  isSetCategory,
  isSideCategory,
  isBeverageCategory,
  isExtraToppingCategory,
} from '@/lib/menu-master/category-policy';
import { findEdgeForMenu } from '@/lib/cost/edge-dough/lookup';
import { getCostReportMenuDisplayInfo } from './cost-menu-display';
import {
  buildHalfHalfCostBySize,
  isHalfHalfBaseCategory,
  isHalfHalfCategory,
} from '@/lib/cost/half-half';

// 레시피 출력(presentation) 빌더는 ./recipe-print-rows로 분리 — 기존 import 경로 보존을 위해 re-export.
export {
  buildRecipePrintRows,
  buildRecipePrintMenus,
  RECIPE_PRINT_KINDS,
  recipeKindFromCategoryLabel,
  recipePrintMenuId,
} from './recipe-print-rows';

const matchEdge = cat => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';

const detailComponentCost = (comps, unitPriceMap = new Map()) =>
  effectiveComponentsCost(comps, unitPriceMap);

function detailStoreFor(rawCat, maps) {
  if (isPersonalPizzaCategory(rawCat)) return maps.personal;
  if (isSetCategory(rawCat)) return maps.set;
  // 추가토핑은 '사이드'라는 이름에 우연히 걸리지 않지만, recipeStoreKindForCategory
  // (lib/recipe-master/sync.js)와 판정 순서를 그대로 맞춰 kind 도출과 store 조회가
  // 항상 일치하게 유지한다(personal → set → topping → side → pizza).
  if (isExtraToppingCategory(rawCat)) return maps.topping;
  if (isSideCategory(rawCat) || isBeverageCategory(rawCat)) return maps.side;
  if (isPizzaCategory(rawCat, { includePersonal: false })) return maps.pizza;
  return null;
}

function costForPrice(p, ctx) {
  if (matchEdge(p.category)) {
    const edge = findEdgeForMenu(p, ctx.edges);
    return edge ? edgeTotalCost(edge, ctx.upm) : 0;
  }
  const map = detailStoreFor(p.category, ctx.detailMaps);
  let baseCost = 0;
  if (map && p.menuCode) {
    const rec = map.get(p.menuCode);
    if (rec) {
      const effectiveComponents = buildEffectiveRecipeComponents(
        {
          menuCode: p.menuCode,
          menuName: p.menuName,
          category: p.category,
          size: p.size,
        },
        rec,
        ctx.recipeGroups
      );
      if (hasDetailRecipeComponents(rec) || effectiveComponents.length > 0) {
        baseCost = detailComponentCost(effectiveComponents, ctx.upm);
      }
    }
  }
  return baseCost;
}

/**
 * 원가계산 보고서용 카테고리별 메뉴 원가 데이터를 계산합니다.
 * @param {object[]} prices - getAllMenuPrices() 결과
 * @param {{ detailMaps, edges, recipeGroups, upm, discontinuedCodes? }} ctx
 *   discontinuedCodes: 하프앤하프 원가 후보(오리지널 피자)에서 뺄 단종 메뉴코드 Set
 * @param {string[]} catKeys - 카테고리 순서
 * @param {object} catMeta - catKey → { id, color, label }
 * @returns {object} catMeta.id → { label, color, menus }, plus _diagnostics: 원가 미연결 메뉴 목록
 */
export function buildCostReportData(prices, ctx, catKeys, catMeta) {
  const updated = {};
  const unconnected = [];
  // 하프앤하프는 레시피 대신 오리지널 피자 (최대 원가 + 최소 원가) ÷ 2 (lib/cost/half-half.js)
  const discontinuedCodes = ctx.discontinuedCodes || new Set();
  const halfBySize = buildHalfHalfCostBySize(
    prices
      .filter(p => isHalfHalfBaseCategory(p.category) && !discontinuedCodes.has(p.menuCode))
      .map(p => ({
        menuCode: p.menuCode,
        menuName: p.menuName,
        size: p.size,
        cost: costForPrice(p, ctx),
      }))
  );
  for (const catLabel of catKeys) {
    const meta = catMeta[catLabel];
    if (!meta) continue;
    const catPrices = prices.filter(p =>
      catLabel === '엣지'
        ? matchEdge(p.category)
        : catLabel === '피자'
          ? isPizzaCategory(p.category, { includePersonal: false })
          : p.category === catLabel
    );
    const menus = catPrices.map(p => {
      const displayInfo = getCostReportMenuDisplayInfo(p);
      let cost = Math.round(costForPrice(p, ctx));
      const half = cost === 0 && isHalfHalfCategory(p.category) ? halfBySize[p.size] : null;
      if (half) cost = Math.round(half.cost);
      const halfHalf = half ? { max: half.max, min: half.min, count: half.count } : null;
      const sale = p.price || 0;
      const rate = cost > 0 && sale > 0 ? (cost / sale) * 100 : 0;
      if (cost === 0 && !matchEdge(p.category)) {
        const map = detailStoreFor(p.category, ctx.detailMaps);
        let reason;
        if (!map) reason = '분류 미매핑';
        else if (!p.menuCode) reason = '메뉴코드 없음';
        else if (!map.get(p.menuCode)) reason = '레시피 미등록';
        else reason = '레시피 원가 0';
        unconnected.push({
          catLabel: meta.label,
          code: p.menuCode || '—',
          name: displayInfo.name || p.menuName,
          category: p.category || '—',
          reason,
        });
      }
      return {
        code: p.menuCode || '',
        codeBase: displayInfo.codeBase,
        name: displayInfo.name || p.menuName,
        size: displayInfo.size,
        category: p.category || '',
        cost,
        sale,
        rate,
        ...(halfHalf ? { halfHalf } : {}),
      };
    });
    menus.sort(
      (a, b) =>
        getMenuCodeRank(a.code) - getMenuCodeRank(b.code) ||
        (a.code || '').localeCompare(b.code || '', 'ko')
    );
    updated[meta.id] = { label: meta.label, color: meta.color, menus };
  }
  return { ...updated, _diagnostics: unconnected };
}
