/**
 * lib/cost/pizza-summary/calc.js — 피자 종합 원가표 계산
 *
 * 입력: 메뉴 판매가 + 피자 세부 레시피 + 엣지·도우 원가표
 * 출력: 메뉴별 (4종 엣지) 원가 매트릭스
 *
 * CLAUDE.md 정밀도 규칙:
 *   - 베이스 구성품 + 엣지 구성품의 원본 소수값을 모두 합산 후 마지막에만 반올림
 *   - 따라서 (round(base) + round(edge)) 가 아니라 round(rawBase + rawEdge)
 */

import { componentSubtotal } from '@/lib/cost/shared/calc';

/** 피자 종합 원가에서 다루는 4종 엣지 변형 */
export const PIZZA_EDGE_VARIANTS = [
  { key: '석쇠',             label: '석쇠',     useEdge: false },
  { key: '치즈크러스트',     label: '치즈크러스트', useEdge: true,  edgeType: '치즈크러스트' },
  { key: '골드스윗크러스트', label: '골드스윗', useEdge: true,  edgeType: '골드스윗크러스트' },
  { key: '씬도우',           label: '씬도우',   useEdge: true,  edgeType: '씬도우', onlyL: true },
];

/** 구성품 배열 → raw 소계 합 (반올림 없음) */
function rawSum(components) {
  if (!Array.isArray(components)) return 0;
  return components.reduce((acc, c) => acc + componentSubtotal(c), 0);
}

/**
 * 엣지·도우 records → { edgeType: { L: record, R: record } } 로 인덱싱
 */
function indexEdges(edges) {
  const out = {};
  for (const e of edges || []) {
    if (!e?.edgeType) continue;
    if (!out[e.edgeType]) out[e.edgeType] = {};
    out[e.edgeType][e.size] = e;
  }
  return out;
}

/**
 * 메뉴 1건 × 변형 1종에 대한 원가 계산.
 * @returns null  | { cost, rate?, available }
 */
function variantCost({ recipe, edgeIndex, size, variant, price }) {
  // 씬도우는 L만 (R 메뉴는 해당 없음)
  if (variant.onlyL && size !== 'L') {
    return { cost: null, rate: null, available: false };
  }

  const baseRaw = recipe ? rawSum(recipe.components) : 0;

  let edgeRaw = 0;
  if (variant.useEdge) {
    const edge = edgeIndex[variant.edgeType]?.[size];
    if (!edge) return { cost: null, rate: null, available: false }; // 엣지 미등록 → 계산 불가
    edgeRaw = rawSum(edge.components);
  }

  // 베이스 0이고 엣지 0이면 (= 데이터 없음) null 처리
  if (baseRaw === 0 && edgeRaw === 0) {
    return { cost: null, rate: null, available: true, empty: true };
  }

  const cost = Math.round(baseRaw + edgeRaw);
  const rate = (price && cost > 0) ? (cost / price * 100) : null;
  return { cost, rate, available: true, empty: false };
}

/**
 * 종합 원가 매트릭스 생성.
 *
 * @param {object} args
 * @param {object[]} args.menus       메뉴 판매가 (category='피자')
 * @param {Map<string,object>} args.recipeMap  menuCode → 피자 세부 레시피
 * @param {object[]} args.edges       엣지·도우 records
 * @returns {object[]} [{ menu, byVariant: { [key]: variantCost } }]
 */
export function buildPizzaSummary({ menus, recipeMap, edges }) {
  const edgeIndex = indexEdges(edges);
  return (menus || []).map(menu => {
    const recipe = recipeMap.get(menu.menuCode) || null;
    const byVariant = {};
    for (const v of PIZZA_EDGE_VARIANTS) {
      byVariant[v.key] = variantCost({
        recipe, edgeIndex, size: menu.size, variant: v, price: menu.price,
      });
    }
    return { menu, recipe, byVariant };
  });
}
