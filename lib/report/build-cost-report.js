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
} from '@/lib/menu-master/category-policy';

// 레시피 출력(presentation) 빌더는 ./recipe-print-rows로 분리 — 기존 import 경로 보존을 위해 re-export.
export { buildRecipePrintRows, buildRecipePrintMenus } from './recipe-print-rows';

const matchEdge = cat => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';
const stripName = s => (s || '').replace(/\s/g, '');

const detailComponentCost = (comps, unitPriceMap = new Map()) =>
  effectiveComponentsCost(comps, unitPriceMap);

function detailStoreFor(rawCat, maps) {
  if (isPersonalPizzaCategory(rawCat)) return maps.personal;
  if (isSetCategory(rawCat)) return maps.set;
  if (isSideCategory(rawCat) || isBeverageCategory(rawCat)) return maps.side;
  if (isPizzaCategory(rawCat, { includePersonal: false })) return maps.pizza;
  return null;
}

function defaultEdgeCostForSize(edges, size) {
  if (!Array.isArray(edges) || edges.length === 0) return 0;
  const match =
    edges.find(
      e => (!size || size === '단일' || e.size === size) && stripName(e.edgeType) === '석쇠'
    ) ||
    edges.find(e => !size || size === '단일' || e.size === size) ||
    edges[0];
  return match ? edgeTotalCost(match) : 0;
}

function costForPrice(p, ctx) {
  if (matchEdge(p.category)) {
    const name = stripName(p.menuName);
    const edge = ctx.edges.find(
      e => stripName(e.edgeType) === name && (!p.size || p.size === '단일' || e.size === p.size)
    );
    return edge ? edgeTotalCost(edge) : 0;
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
  if (ctx.includeEdge && isPizzaCategory(p.category)) {
    baseCost += defaultEdgeCostForSize(ctx.edges, p.size);
  }
  return baseCost;
}

/**
 * 원가계산 보고서용 카테고리별 메뉴 원가 데이터를 계산합니다.
 * @param {object[]} prices - getAllMenuPrices() 결과
 * @param {{ detailMaps, edges, upm }} ctx
 * @param {string[]} catKeys - 카테고리 순서
 * @param {object} catMeta - catKey → { id, color, label }
 * @returns {object} catMeta.id → { label, color, menus }, plus _diagnostics: 원가 미연결 메뉴 목록
 */
export function buildCostReportData(prices, ctx, catKeys, catMeta) {
  const updated = {};
  const unconnected = [];
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
      const cost = Math.round(costForPrice(p, ctx));
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
          name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
          category: p.category || '—',
          reason,
        });
      }
      return {
        code: p.menuCode || '',
        name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
        cost,
        sale,
        rate,
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
