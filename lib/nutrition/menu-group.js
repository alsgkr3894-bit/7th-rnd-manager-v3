/**
 * lib/nutrition/menu-group.js — 영양성분 카테고리 그룹 헬퍼
 *
 * 그룹 순서: 피자(1인피자 포함) → 사이드(파스타/소스 포함) → 추가토핑
 *           → 세트박스 → 하프앤하프 → 음료 → 기타
 */

export const NUTRITION_GROUP_ORDER = [
  '피자',
  '사이드',
  '추가토핑',
  '세트박스',
  '하프앤하프',
  '음료',
  '기타',
];

/**
 * menu 레코드의 카테고리를 그룹명으로 변환.
 * @param {object} menu - nutrition_menu_ref 레코드 ({ menuCode, category, ... })
 * @param {object} masterByCode - menuCode → menu_master 레코드 맵 (없으면 {})
 * @returns {string} 그룹명
 */
export function resolveNutritionGroup(menu, masterByCode = {}) {
  const cat = masterByCode[menu.menuCode]?.category || menu.category || '';

  if (cat.includes('음료')) return '음료';
  if (cat.includes('하프앤하프')) return '하프앤하프';
  if (cat.includes('세트') || cat === '세트박스') return '세트박스';
  if (cat.includes('추가토핑')) return '추가토핑';
  if (cat === '소스' || cat.includes('사이드') || cat.includes('파스타')) return '사이드';
  if (cat === '1인피자' || cat.startsWith('피자')) return '피자';
  return '기타';
}

/**
 * menus 배열을 NUTRITION_GROUP_ORDER 순서로 그룹화.
 * @returns {Array<{ group: string, items: Array }>} 빈 그룹 제외
 */
export function groupMenusOrdered(menus, masterByCode = {}) {
  const buckets = {};
  NUTRITION_GROUP_ORDER.forEach(g => {
    buckets[g] = [];
  });

  menus.forEach(m => {
    const g = resolveNutritionGroup(m, masterByCode);
    buckets[g].push(m);
  });

  return NUTRITION_GROUP_ORDER.filter(g => buckets[g].length > 0).map(g => ({
    group: g,
    items: buckets[g],
  }));
}

/**
 * 엣지/크러스트 변형이 적용되는 피자 카테고리인지 판별.
 * 1인피자 포함. 사이드·음료·추가토핑 등은 false.
 */
export function isPizzaGroup(menu, masterByCode = {}) {
  return resolveNutritionGroup(menu, masterByCode) === '피자';
}
