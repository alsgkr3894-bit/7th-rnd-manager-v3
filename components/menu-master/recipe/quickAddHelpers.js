// 레시피 "식자재 빠른 추가" 패널에서 쓰는 순수 헬퍼들.
// MenuRecipeSection.jsx / hooks/useMenuRecipeQuickAdd.js에서 공용으로 사용한다.

export function normalizeIngredientSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s/g, '');
}

export function ingredientSearchText(ingredient) {
  return normalizeIngredientSearchText(
    `${ingredient?.ingredientName || ''} ${ingredient?.productCode || ''}`
  );
}

export function formatQuickPrice(info) {
  if (info?.unitPrice == null) return '단가 없음';
  const unit = info.baseUnitType || 'g';
  return `${Number(info.unitPrice).toLocaleString()}원/${unit}`;
}

export function quickQuantityValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? text : '';
}
