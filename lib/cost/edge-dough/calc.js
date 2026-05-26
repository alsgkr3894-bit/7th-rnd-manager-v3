/**
 * lib/cost/edge-dough/calc.js — 엣지·도우 원가 계산
 *
 * CLAUDE.md 정밀도 규칙:
 *   - 중간값 반올림 금지, 최종만 Math.round
 *   - 0 수량 / null 단가는 0으로 처리
 */

/**
 * 구성품 한 줄의 소계.
 * subtotal = quantity × unitPrice (반올림 없이 반환)
 */
export function componentSubtotal(c) {
  if (!c) return 0;
  const qty = Number(c.quantity) || 0;
  const price = Number(c.unitPrice) || 0;
  return qty * price;
}

/** 엣지 한 건의 총 원가 (정수원 반올림) */
export function edgeTotalCost(edge) {
  if (!edge?.components?.length) return 0;
  const sum = edge.components.reduce((acc, c) => acc + componentSubtotal(c), 0);
  return Math.round(sum);
}

/**
 * 엣지 한 건의 issues — 미연동/단위미정 구성품 추출
 * (식자재 단가 미연동 등 향후 검증용)
 */
export function edgeIssues(edge) {
  const out = [];
  if (!edge?.components?.length) {
    out.push({ kind: 'empty', message: '구성품 미입력' });
    return out;
  }
  edge.components.forEach((c, i) => {
    if (!c.ingredientName?.trim()) out.push({ kind: 'no-name', index: i });
    if (!Number(c.quantity)) out.push({ kind: 'no-qty', index: i, name: c.ingredientName });
    if (!Number(c.unitPrice)) out.push({ kind: 'no-price', index: i, name: c.ingredientName });
  });
  return out;
}
