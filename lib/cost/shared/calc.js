/** 원가 계산 공통 유틸 — 모든 cost 모듈에서 재사용 */

export function componentSubtotal(c) {
  if (!c) return 0;
  return (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0);
}

export function simpleTotalCost(recipe) {
  if (!recipe?.components?.length) return 0;
  return Math.round(recipe.components.reduce((acc, c) => acc + componentSubtotal(c), 0));
}

export function recipeIssues(recipe) {
  if (!recipe?.components?.length) return [{ kind: 'empty', message: '구성품 미입력' }];
  return recipe.components.flatMap((c, i) => {
    const out = [];
    if (!c.ingredientName?.trim())          out.push({ kind: 'no-name', index: i });
    if (c.quantity == null || c.quantity === '') out.push({ kind: 'no-qty',  index: i, name: c.ingredientName });
    if (c.unitPrice == null || c.unitPrice === '') out.push({ kind: 'no-price',index: i, name: c.ingredientName });
    return out;
  });
}
