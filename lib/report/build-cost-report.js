import { componentSubtotal } from '@/lib/cost/shared/calc';
import { edgeTotalCost } from '@/lib/cost/edge-dough';
import { calcCostBySizes } from '@/lib/recipe';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';

const matchEdge = cat => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';
const stripName = s => (s || '').replace(/\s/g, '');

const detailComponentCost = comps =>
  Array.isArray(comps) ? Math.round(comps.reduce((a, c) => a + componentSubtotal(c), 0)) : 0;

function detailStoreFor(rawCat, maps) {
  const c = rawCat || '';
  if (c === '1인피자') return maps.personal;
  if (c === '세트박스') return maps.set;
  if (c === '사이드' || c === '소스' || c === '음료') return maps.side;
  if (c === '피자' || c.startsWith('피자/')) return maps.pizza;
  return null;
}

function defaultEdgeCostForSize(edges, size) {
  if (!Array.isArray(edges) || edges.length === 0) return 0;
  const match = edges.find(e => (!size || size === '단일' || e.size === size) && stripName(e.edgeType) === '석쇠')
    || edges.find(e => !size || size === '단일' || e.size === size)
    || edges[0];
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
    if (rec) baseCost = detailComponentCost(rec.components);
  }
  if (!baseCost) {
    const lr = ctx.recipeByName.get(p.menuName);
    if (lr) {
      const cm = calcCostBySizes(lr, ctx.upm);
      baseCost = cm[p.size] || cm[lr.sizes?.[0]?.label] || 0;
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
 * @param {{ detailMaps, edges, recipeByName, upm }} ctx
 * @param {string[]} catKeys - 카테고리 순서
 * @param {object} catMeta - catKey → { id, color, label }
 * @returns {object} costByCategory — catMeta.id → { label, color, menus }
 */
export function buildCostReportData(prices, ctx, catKeys, catMeta) {
  const updated = {};
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
  return updated;
}
