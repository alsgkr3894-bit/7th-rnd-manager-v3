/**
 * lib/nutrition/label/fixed-beverages.js — 영양성분표 Beverage 블록 고정값
 *
 * 2026-09-22 주임님 지시: 음료는 입력 데이터와 무관하게 이 표를 그대로 쓴다(매장 양식 기준).
 * menuCode는 같은 음료끼리 묶기 위한 키(D-<음료>-<용량>)일 뿐 메뉴마스터 코드가 아니다.
 */
const rows = [
  ['코카-콜라', 'CC', 1250, 550, 138, 0, 0, 38],
  ['코카-콜라', 'CC', 500, 216, 54, 0, 0, 15],
  ['코카-콜라', 'CC', 355, 152, 38, 0, 0, 11],
  ['코카-콜라 제로', 'CZ', 1250, 0, 0, 0, 0, 75],
  ['코카-콜라 제로', 'CZ', 500, 0, 0, 0, 0, 30],
  ['코카-콜라 제로', 'CZ', 355, 0, 0, 0, 0, 22],
  ['스프라이트', 'SPR', 1500, 660, 165, 0, 0, 135],
  ['스프라이트', 'SPR', 500, 228, 57, 0, 0, 47],
  ['스프라이트', 'SPR', 355, 160, 40, 0, 0, 33],
  ['환타(오렌지)', 'FO', 355, 164, 41, 0, 0, 11],
  ['환타(포도)', 'FG', 355, 192, 48, 0, 0, 23],
  ['환타(파인)', 'FP', 355, 192, 48, 0, 0, 24],
  ['오렌지쥬스', 'OJ', 1500, 720, 158, 8, 8, 323],
];

export const FIXED_BEVERAGE_SHEET = Object.freeze(
  rows.map(([menuName, code, weight, kcal, sugar, protein, fat, sodium]) =>
    Object.freeze({
      menuName,
      menuCode: `D-${code}-${weight}`,
      weight,
      kcal,
      sugar,
      protein,
      fat,
      sodium,
      allergen: '',
      fixed: true,
    })
  )
);
