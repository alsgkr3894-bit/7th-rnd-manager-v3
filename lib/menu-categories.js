/**
 * lib/menu-categories.js — 메뉴 대분류 이름 상수 (단일 출처)
 *
 * 여러 페이지가 '피자'/'1인피자' 등 카테고리 문자열을 하드코딩하던 것을 모은다.
 * 각 페이지의 "목록·순서"는 용도가 달라 그대로 두되, 개별 이름은 이 상수를 참조한다.
 */

export const MENU_CATEGORY = {
  PIZZA: '피자',
  PERSONAL: '1인피자',
  SET: '세트박스',
  SIDE: '사이드',
  SAUCE: '소스',
  DRINK: '음료',
  EDGE: '엣지',
  ETC: '기타',
};

/**
 * 피자 대분류 + 중분류 변형 — 원가/마진표에서 "피자류" 판정에 사용.
 * (menu_prices.category가 '피자/프리미엄' 등 중분류로 들어올 수 있음)
 */
export const PIZZA_CATEGORY_VARIANTS = [
  '피자',
  '피자/프리미엄 스페셜',
  '피자/프리미엄',
  '피자/오리지널',
  '피자/하프앤하프',
];

/** category가 피자 대분류/변형이면 true */
export function isPizzaCategory(cat) {
  return typeof cat === 'string' && PIZZA_CATEGORY_VARIANTS.includes(cat.trim());
}

/**
 * 메뉴코드 기반 표준 정렬 순위.
 * 전역 기본값: PS→PR→OR→ONE→사이드→세트박스→HH→소스→음료→엣지
 */
export function getMenuCodeRank(menuCode) {
  if (!menuCode) return 999;
  const parts = String(menuCode).toUpperCase().split('-');
  const [seg0, seg1] = parts;

  if (seg0 === 'P') {
    if (seg1 === 'PS') return 1;
    if (seg1 === 'PR') return 2;
    if (seg1 === 'OR') return 3;
    if (seg1 === 'ONE') return 4;
    if (seg1 === 'HH') return 7;
    return 1;
  }
  if (seg0 === 'S') {
    if (seg1 === 'SAU') return 8;
    return 5;
  }
  if (seg0 === 'SET') return 6;
  if (seg0 === 'D') return 9;
  if (seg0 === 'OPT') return 10;
  return 999;
}
