/**
 * lib/menu-master/category-policy.js — 메뉴 카테고리 판정 공통 정책
 */

function categoryText(category) {
  return String(category || '').trim();
}

export function isPersonalPizzaCategory(category) {
  const cat = categoryText(category);
  return cat === '1인피자' || cat.includes('1인피자');
}

export function isPizzaCategory(category, options = {}) {
  const includePersonal = options.includePersonal !== false;
  const cat = categoryText(category);
  return cat === '피자' || cat.startsWith('피자/') || (includePersonal && isPersonalPizzaCategory(cat));
}

export function isSideCategory(category) {
  const cat = categoryText(category);
  return cat === '소스' || cat.includes('사이드') || cat.includes('파스타');
}

export function isBeverageCategory(category) {
  return categoryText(category).includes('음료');
}

export function isExtraToppingCategory(category) {
  return categoryText(category).includes('추가토핑');
}

export function isSetCategory(category) {
  const cat = categoryText(category);
  return cat === '세트박스' || cat.includes('세트');
}

export function isHalfAndHalfCategory(category) {
  return categoryText(category).includes('하프앤하프');
}

export function resolveMenuCategoryGroup(category, options = {}) {
  if (isBeverageCategory(category)) return '음료';
  if (isHalfAndHalfCategory(category)) return '하프앤하프';
  if (isSetCategory(category)) return '세트박스';
  if (isExtraToppingCategory(category)) return '추가토핑';
  if (isSideCategory(category)) return '사이드';
  if (isPizzaCategory(category, options)) return '피자';
  return '기타';
}
