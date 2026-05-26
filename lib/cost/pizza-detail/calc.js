/**
 * lib/cost/pizza-detail/calc.js — 피자 세부 원가 계산
 *
 * 정밀도: 중간값 반올림 금지, 최종만 Math.round (CLAUDE.md 규칙)
 */

/** 구성품 한 줄의 소계 (반올림 없음) */
export function componentSubtotal(c) {
  if (!c) return 0;
  const qty = Number(c.quantity) || 0;
  const price = Number(c.unitPrice) || 0;
  return qty * price;
}

/** 피자 1개의 베이스 원가 (엣지·도우 제외) */
export function pizzaBaseCost(recipe) {
  if (!recipe?.components?.length) return 0;
  const sum = recipe.components.reduce((acc, c) => acc + componentSubtotal(c), 0);
  return Math.round(sum);
}

/** 베이스 + 엣지 원가 합산 (종합 원가용) */
export function pizzaTotalCost(recipe, edgeRecord) {
  const baseSumRaw = (recipe?.components || []).reduce((acc, c) => acc + componentSubtotal(c), 0);
  const edgeSumRaw = (edgeRecord?.components || []).reduce((acc, c) => acc + componentSubtotal(c), 0);
  return Math.round(baseSumRaw + edgeSumRaw);
}

/** 레시피 한 건의 이슈 (단가/수량 미입력 등) */
export function pizzaIssues(recipe) {
  const out = [];
  if (!recipe?.components?.length) {
    out.push({ kind: 'empty', message: '구성품 미입력' });
    return out;
  }
  recipe.components.forEach((c, i) => {
    if (!c.ingredientName?.trim()) out.push({ kind: 'no-name', index: i });
    if (!Number(c.quantity)) out.push({ kind: 'no-qty', index: i, name: c.ingredientName });
    if (!Number(c.unitPrice)) out.push({ kind: 'no-price', index: i, name: c.ingredientName });
  });
  return out;
}
