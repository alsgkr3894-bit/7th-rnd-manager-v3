/**
 * lib/nutrition/menu-group.js — 영양성분 카테고리 그룹 헬퍼
 *
 * 그룹 순서: 피자(1인피자 포함) → 사이드(파스타/소스 포함) → 추가토핑
 *           → 세트박스 → 하프앤하프 → 음료 → 기타
 */

import {
  isBeverageCategory,
  isExtraToppingCategory,
  isHalfAndHalfCategory,
  isPersonalPizzaCategory,
  isPizzaCategory,
  isSetCategory,
  isSideCategory,
} from '@/lib/menu-master/category-policy';

export const NUTRITION_GROUP_ORDER = [
  '피자',
  '사이드',
  '추가토핑',
  '세트박스',
  '하프앤하프',
  '음료',
  '기타',
];

export const NUTRITION_CATEGORY_OPTIONS = ['피자', '추가토핑', '사이드', '음료'];

/**
 * menu_master 목록 → menuCode 조회 맵. 영양성분 메뉴는 사이즈 접미사(-L/-R)를 뗀 베이스
 * 코드(P-OR-006)로 저장되는데 메뉴마스터는 full 코드(P-OR-006-L)라, full 코드만 키로 잡으면
 * 피자 메뉴가 전부 조회에 실패해 카테고리·1인용 판정이 nutrition_menu_ref의 옛 복사본에
 * 의존하게 된다. full 코드와 베이스 코드를 모두 키로 넣는다(베이스 키는 먼저 만난 사이즈 행).
 * @param {Array<object>} masters
 * @returns {Record<string, object>}
 */
export function buildMasterByCode(masters) {
  const map = {};
  for (const master of Array.isArray(masters) ? masters : []) {
    const code = String(master?.menuCode ?? '').trim();
    if (!code) continue;
    if (!map[code]) map[code] = master;
    const base = code.replace(/-(?:L|R)$/i, '');
    if (base !== code && !map[base]) map[base] = master;
  }
  return map;
}

export function normalizeNutritionCategory(category, fallback = '피자') {
  const cat = category || '';
  if (isBeverageCategory(cat)) return '음료';
  if (isExtraToppingCategory(cat)) return '추가토핑';
  if (isSideCategory(cat)) return '사이드';
  if (isPizzaCategory(cat)) return '피자';
  return NUTRITION_CATEGORY_OPTIONS.includes(cat) ? cat : fallback;
}

export function isPersonalPizzaMenu(menu, masterByCode = {}) {
  const master = masterByCode?.[menu?.menuCode] || {};
  const cat = master.category || menu?.category || '';
  const code = String(menu?.menuCode || '');
  const name = String(menu?.menuName || '');
  return (
    menu?.personal === true ||
    isPersonalPizzaCategory(cat) ||
    code.startsWith('P-ONE') ||
    name.includes('1인용') ||
    name.includes('1인피자')
  );
}

/**
 * menu 레코드의 카테고리를 그룹명으로 변환.
 * @param {object} menu - nutrition_menu_ref 레코드 ({ menuCode, category, ... })
 * @param {object} masterByCode - menuCode → menu_master 레코드 맵 (없으면 {})
 * @returns {string} 그룹명
 */
export function resolveNutritionGroup(menu, masterByCode = {}) {
  const cat = masterByCode[menu.menuCode]?.category || menu.category || '';

  if (isBeverageCategory(cat)) return '음료';
  if (isHalfAndHalfCategory(cat)) return '하프앤하프';
  if (isSetCategory(cat)) return '세트박스';
  if (isExtraToppingCategory(cat)) return '추가토핑';
  if (isSideCategory(cat)) return '사이드';
  if (isPizzaCategory(cat)) return '피자';
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
