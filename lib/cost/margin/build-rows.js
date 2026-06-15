/**
 * lib/cost/margin/build-rows.js — 원가마진표 행 빌더 순수 함수
 *
 * IO 없음, 사이드 이펙트 없음 → 단위 테스트 가능.
 * app/cost/margin/page.jsx load() 내 recipeRows·detailRows·derivedRows 생성 로직을 분리.
 */

import { calcCostBySizes } from '@/lib/recipe';
import { createDefaultGroupResolver } from '@/lib/cost/recipe-groups/apply';
import { hasDetailRecipeComponents } from '@/lib/cost/recipe-source-precedence';
import { componentSubtotal } from '@/lib/cost/shared/calc';
import { edgeTotalCost, defaultExpandInMargin, defaultMarginSuffix } from '@/lib/cost/edge-dough';

/** 판매가 정규화: 문자열 → 숫자/null */
export const toNum = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 레시피 목록에서 마진표용 행을 생성.
 * 공통묶음 그룹 원가 포함, 판매가 숫자 정규화.
 *
 * @param {object[]} recipes   - getAllRecipes() 결과
 * @param {Map}      upm       - buildUnitPriceMap() 결과
 * @param {object[]} allGroups - getAllRecipeGroups() 결과
 * @returns {object[]}
 */
export function buildRecipeRows(recipes, upm, allGroups) {
  const resolveDefaultGroupIds = createDefaultGroupResolver(allGroups);
  const groupById = new Map(allGroups.map(g => [g.id, g]));

  return recipes.map(r => {
    const baseCostMap = calcCostBySizes(r, upm);

    const activeGids =
      r.groupIds == null ? resolveDefaultGroupIds(r.menuCategory) : new Set(r.groupIds);

    const costMap = {};
    for (const s of r.sizes || []) {
      if (!s.label) continue;
      let total = baseCostMap[s.label] || 0;
      for (const gid of activeGids) {
        const g = groupById.get(gid);
        if (!g) continue;
        for (const ing of g.ingredients || []) {
          const info = upm.get(ing.productCode);
          if (!info?.unitPrice) continue;
          const qty = parseFloat(ing.quantities?.[s.label]) || 0;
          if (qty) total += info.unitPrice * qty;
        }
      }
      costMap[s.label] = total;
    }
    const sizes = (r.sizes || []).map(s => ({ ...s, sellingPrice: toNum(s.sellingPrice) }));
    return { ...r, sizes, costMap };
  });
}

/**
 * 메뉴 판매가 목록에서 디테일 스토어 기반 행을 생성.
 *
 * @param {object[]} allMenuPrices - getAllMenuPrices() 결과
 * @param {{ pizzaMap: Map, personalMap: Map, sideMap: Map, setMap: Map }} detailMaps
 * @returns {object[]}
 */
export function buildDetailRows(allMenuPrices, { pizzaMap, personalMap, sideMap, setMap }) {
  const DETAIL_STORE_MAP = {
    피자: pizzaMap,
    '피자/프리미엄 스페셜': pizzaMap,
    '피자/프리미엄': pizzaMap,
    '피자/오리지널': pizzaMap,
    '피자/하프앤하프': pizzaMap,
    '1인피자': personalMap,
    세트박스: setMap,
    사이드: sideMap,
    소스: sideMap,
    음료: sideMap,
    엣지: sideMap,
  };

  const calcComponentCost = components =>
    Array.isArray(components)
      ? Math.round(components.reduce((acc, c) => acc + componentSubtotal(c), 0))
      : 0;

  const menuGroups = new Map();
  for (const m of allMenuPrices) {
    if (!DETAIL_STORE_MAP[m.category]) continue;
    const key = `${m.menuName}||${m.category}`;
    if (!menuGroups.has(key))
      menuGroups.set(key, { menuName: m.menuName, category: m.category, entries: [] });
    menuGroups.get(key).entries.push({ menuCode: m.menuCode, size: m.size, price: m.price });
  }

  const detailRows = [];
  for (const { menuName, category, entries } of menuGroups.values()) {
    const recMap = DETAIL_STORE_MAP[category];
    const costMap = {};
    const detailComponentSizes = new Set();
    const sizes = [];
    for (const { menuCode, size, price } of entries) {
      sizes.push({ label: size, sellingPrice: price });
      const recipe = recMap?.get(menuCode);
      if (recipe) {
        if (hasDetailRecipeComponents(recipe)) detailComponentSizes.add(size);
        const cost = calcComponentCost(recipe.components);
        if (cost > 0) costMap[size] = cost;
      }
    }
    const repCode = entries.find(e => e.menuCode)?.menuCode || '';
    detailRows.push({
      id: `detail||${menuName}||${category}`,
      menuCode: repCode,
      menuName,
      menuCategory: category,
      sizes,
      costMap,
      detailComponentSizes,
      isDetailStore: true,
    });
  }
  return detailRows;
}

/**
 * 엣지 유형별 메타데이터 계산.
 *
 * @param {object[]} edges         - getAllEdges() 결과
 * @param {object[]} allMenuPrices - getAllMenuPrices() 결과
 * @returns {{ EXPAND_EDGES: string[], edgeSuffixByType: object, edgeCostByType: object, edgePriceByType: object }}
 */
export function buildEdgeMetadata(edges, allMenuPrices) {
  const isExpandEdge = e =>
    e.expandInMargin != null ? !!e.expandInMargin : defaultExpandInMargin(e.edgeType);

  const EXPAND_EDGES = [...new Set(edges.filter(isExpandEdge).map(e => e.edgeType))];

  const edgeSuffixByType = {};
  for (const e of edges) {
    if (!isExpandEdge(e)) continue;
    if (!edgeSuffixByType[e.edgeType]) {
      edgeSuffixByType[e.edgeType] =
        (e.marginSuffix || '').trim() || defaultMarginSuffix(e.edgeType);
    }
  }

  const edgeCostByType = {};
  for (const e of edges) {
    if (!isExpandEdge(e)) continue;
    if (!edgeCostByType[e.edgeType]) edgeCostByType[e.edgeType] = {};
    edgeCostByType[e.edgeType][e.size] = edgeTotalCost(e);
  }

  const edgePriceByType = {};
  for (const p of allMenuPrices) {
    if (p.category !== '엣지' || !p.price) continue;
    const name = (p.menuName || '').replace(/\s/g, '');
    for (const edgeType of EXPAND_EDGES) {
      if (name === edgeType.replace(/\s/g, '')) {
        edgePriceByType[edgeType] = p.price;
        break;
      }
    }
  }

  return { EXPAND_EDGES, edgeSuffixByType, edgeCostByType, edgePriceByType };
}

/**
 * 피자 베이스 행에 엣지를 합성해 파생 행을 생성.
 *
 * @param {object[]} pizzaSources - enrichedDetailRows + filteredRecipeRows 중 피자 카테고리
 * @param {{ EXPAND_EDGES: string[], edgeSuffixByType: object, edgeCostByType: object, edgePriceByType: object }} edgeMeta
 * @param {Set<string>} detailKeySet - `menuName||menuCategory` 키 세트 (중복 방지)
 * @returns {object[]}
 */
export function buildDerivedRows(pizzaSources, edgeMeta, detailKeySet) {
  const { EXPAND_EDGES, edgeSuffixByType, edgeCostByType, edgePriceByType } = edgeMeta;
  const derivedRows = [];
  for (const r of pizzaSources) {
    for (const edgeType of EXPAND_EDGES) {
      const edgeCosts = edgeCostByType[edgeType];
      if (!edgeCosts) continue;
      const newCostMap = {};
      for (const s of r.sizes || []) {
        if (!s.label) continue;
        newCostMap[s.label] = (r.costMap?.[s.label] || 0) + (edgeCosts[s.label] || 0);
      }
      const derivedName = `${r.menuName} ${edgeType}`;
      if (detailKeySet.has(`${derivedName}||${r.menuCategory}`)) continue;
      const edgePrice = edgePriceByType[edgeType] ?? null;
      const sfx = edgeSuffixByType[edgeType];
      derivedRows.push({
        id: `derived||${r.id}||${edgeType}`,
        menuCode: r.menuCode && sfx ? `${r.menuCode}-${sfx}` : '',
        menuName: derivedName,
        menuCategory: r.menuCategory,
        sizes: (r.sizes || []).map(s => ({
          ...s,
          sellingPrice: s.sellingPrice != null ? s.sellingPrice + (edgePrice ?? 0) : null,
        })),
        costMap: newCostMap,
      });
    }
  }
  return derivedRows;
}
