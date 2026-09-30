/**
 * lib/cost/edge-dough/lookup.js — 판매가 행(엣지 카테고리)에 맞는 cost_edge_dough 레코드 찾기 (순수)
 *
 * 원가 보고서·원가마진표가 같은 규칙으로 엣지 원가를 찾아야 두 화면의 숫자가 같다.
 * 패밀리(치즈크러스트·골드스윗·씬도우·석쇠)로 먼저 찾고, 못 찾으면 이름 정확 일치로 폴백한다.
 */
import { resolveMenuEdgeFamily } from '@/lib/menu-master/edge-family';

const stripName = s => String(s || '').replace(/\s/g, '');
const sizeMatches = (wanted, edge) => !wanted || wanted === '단일' || edge.size === wanted;

/**
 * @param {{ menuName?: string, category?: string, edgeKey?: string, size?: string }} menu
 * @param {object[]} edges - getAllEdges() 결과
 * @returns {object|null}
 */
export function findEdgeForMenu(menu, edges) {
  const list = Array.isArray(edges) ? edges : [];
  const size = String(menu?.size || '').trim();
  const family = resolveMenuEdgeFamily(menu);
  if (family?.costEdgeType) {
    const bySize = list.filter(e => e.edgeType === family.costEdgeType);
    return bySize.find(e => sizeMatches(size, e)) || null;
  }
  const name = stripName(menu?.menuName);
  return list.find(e => stripName(e.edgeType) === name && sizeMatches(size, e)) || null;
}
