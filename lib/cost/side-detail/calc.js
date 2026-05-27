/**
 * lib/cost/side-detail/calc.js — 사이드 메뉴 세부 원가 계산
 * 1인피자와 동일 구조 (엣지 없음).
 */

export function componentSubtotal(c) {
  if (!c) return 0;
  const qty = Number(c.quantity) || 0;
  const price = Number(c.unitPrice) || 0;
  return qty * price;
}

export function sideTotalCost(recipe) {
  if (!recipe?.components?.length) return 0;
  const sum = recipe.components.reduce((acc, c) => acc + componentSubtotal(c), 0);
  return Math.round(sum);
}

export function sideIssues(recipe) {
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
